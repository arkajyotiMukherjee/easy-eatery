import { createHmac, timingSafeEqual } from 'node:crypto';
import type { WhatsAppTransport } from './contracts.ts';

export function validSignature(raw: string, signature: string | undefined, secret: string) {
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  return timingSafeEqual(Buffer.from(signature.slice(7), 'hex'), Buffer.from(expected, 'hex'));
}

export class CloudWhatsAppTransport implements WhatsAppTransport {
  constructor(readonly config: { accessToken: string; phoneId: string; version: string }) {
    if (!/^v\d+\.\d+$/.test(config.version) || !/^\d+$/.test(config.phoneId) || !config.accessToken) {
      throw new Error('Configure valid WhatsApp Cloud API credentials and Graph version.');
    }
  }

  async sendText(to: string, text: string) {
    const result = await fetch(`https://graph.facebook.com/${this.config.version}/${this.config.phoneId}/messages`, {
      method: 'POST', signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${this.config.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
    });
    if (!result.ok) throw new Error(`WhatsApp delivery failed (${result.status}); retry required.`);
  }
}

export type Inbound = { id: string; from: string; text: string };
// Provider payloads are untrusted. Ignore statuses and unmapped receiving numbers.
export function parseMessages(payload: unknown, phoneId: string): Inbound[] {
  const body = payload as any;
  if (body?.object !== 'whatsapp_business_account' || !Array.isArray(body.entry)) return [];
  const messages: Inbound[] = [];
  for (const entry of body.entry) {
    if (!Array.isArray(entry?.changes)) continue;
    for (const change of entry.changes) {
      const value = change?.value;
      if (change?.field !== 'messages' || value?.metadata?.phone_number_id !== phoneId || !Array.isArray(value?.messages)) continue;
      for (const message of value.messages) {
        if (typeof message?.id !== 'string' || typeof message?.from !== 'string') continue;
        const text = message.type === 'text' ? message.text?.body :
          message.interactive?.list_reply?.id ?? message.interactive?.button_reply?.id ?? 'menú';
        messages.push({ id: message.id, from: message.from, text: typeof text === 'string' ? text.slice(0, 1000) : 'menú' });
      }
    }
  }
  return messages;
}
