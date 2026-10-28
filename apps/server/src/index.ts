import { randomBytes } from 'node:crypto';
import { createApp } from './app.ts';
import { CloudWhatsAppTransport } from './integrations/whatsapp.ts';

const env = process.env;
const host = env.HOST ?? '127.0.0.1';
if (host !== '127.0.0.1' && host !== 'localhost' && !env.ADMIN_TOKEN) throw new Error('Set ADMIN_TOKEN before exposing the demo.');
const adminToken = env.ADMIN_TOKEN ?? randomBytes(24).toString('hex');
const mode = env.WHATSAPP_TRANSPORT ?? 'console';
if (!['cloud', 'console'].includes(mode)) throw new Error('WHATSAPP_TRANSPORT must be cloud or console.');
if (mode === 'cloud' && (!env.WHATSAPP_APP_SECRET || !env.WHATSAPP_VERIFY_TOKEN)) throw new Error('Cloud mode requires app secret and verify token.');
const transport = mode === 'cloud' ? new CloudWhatsAppTransport({
  accessToken: env.WHATSAPP_ACCESS_TOKEN ?? '', phoneId: env.WHATSAPP_PHONE_NUMBER_ID ?? '', version: env.WHATSAPP_GRAPH_VERSION ?? '',
}) : undefined;
const posProvider = env.POS_PROVIDER ?? 'toteat';
if (!['toteat', 'fudo'].includes(posProvider)) throw new Error('POS_PROVIDER must be toteat or fudo. Both are simulated.');
const { app } = createApp({ adminToken, transport, appSecret: env.WHATSAPP_APP_SECRET, verifyToken: env.WHATSAPP_VERIFY_TOKEN, phoneId: env.WHATSAPP_PHONE_NUMBER_ID, posProvider: posProvider as 'toteat' | 'fudo' });
await app.listen({ host, port: Number(env.PORT ?? 3000) });
console.log(`Easy Eatery demo: http://${host}:${env.PORT ?? 3000}`);
if (!env.ADMIN_TOKEN) console.log(`Temporary local panel key: ${adminToken}`);
console.log('Payment and POS are simulated. Data resets on restart. Use test data only.');
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.on(signal, async () => { await app.close(); process.exit(0); });
