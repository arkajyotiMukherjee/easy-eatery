// Sandbox transport boundary only. Not wired to ordering, persistence, or payment authority.
// Contract: TransbankDevelopers/transbank-sdk-nodejs @ 52ad60075ce7d9eacf7f8cc42a795ae43bd483ff.
const origin = 'https://webpay3gint.transbank.cl';
const endpoint = `${origin}/rswebpaytransaction/api/webpay/v1.2/transactions`;
const checkoutUrl = `${origin}/webpayserver/initTransaction`;

export type SandboxPayment = Readonly<{ buyOrder: string; sessionId: string; amount: number; currency: 'CLP' }>;
export type SandboxAttempt = SandboxPayment & Readonly<{ token: string; environment: 'integration' }>;
export type SandboxStatus = Readonly<{
  environment: 'integration'; status: string; responseCode?: number; testAuthorized: boolean;
}>;

export class WebpaySandboxError extends Error {
  constructor(readonly outcome: 'unknown' | 'invalid_response') {
    // Never include gateway response bodies, tokens, URLs, credentials or original errors.
    super(`Webpay sandbox ${outcome}; reconcile before any further payment action.`);
  }
}

function text(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maximum && value.trim() === value && !/[\x00-\x1f\x7f]/.test(value);
}

function payment(value: SandboxPayment) {
  if (!text(value.buyOrder, 26) || !text(value.sessionId, 61) || value.currency !== 'CLP' || !Number.isSafeInteger(value.amount) || value.amount <= 0 || value.amount > 2_000_000_000) {
    throw new TypeError('Invalid immutable sandbox payment.');
  }
}

function token(value: unknown): value is string { return text(value, 64) && /^[a-zA-Z0-9_-]+$/.test(value); }

export class WebpaySandbox {
  private readonly commerceCode: string;
  private readonly apiKey: string;
  private readonly returnUrl: string;
  private readonly timeoutMs: number;
  private readonly fetcher: typeof fetch;
  get merchantCode() { return this.commerceCode; }

  constructor(options: { commerceCode: string; apiKey: string; returnUrl: string; timeoutMs?: number; fetcher?: typeof fetch }) {
    const url = new URL(options.returnUrl);
    if (!text(options.commerceCode, 12) || !/^\d+$/.test(options.commerceCode) || !text(options.apiKey, 256) || options.returnUrl.length > 255 || url.protocol !== 'https:' || url.username || url.password || url.hash) {
      throw new TypeError('Invalid sandbox configuration.');
    }
    this.timeoutMs = options.timeoutMs ?? 10_000;
    if (!Number.isInteger(this.timeoutMs) || this.timeoutMs < 1 || this.timeoutMs > 60_000) throw new TypeError('Invalid sandbox timeout.');
    this.commerceCode = options.commerceCode;
    this.apiKey = options.apiKey;
    this.returnUrl = url.href;
    this.fetcher = options.fetcher ?? fetch;
  }

  private async request(method: 'POST' | 'PUT' | 'GET', suffix = '', body?: object): Promise<Record<string, unknown>> {
    let response: Response;
    try {
      response = await this.fetcher(endpoint + suffix, {
        method, redirect: 'error', signal: AbortSignal.timeout(this.timeoutMs),
        headers: { 'Content-Type': 'application/json', 'Tbk-Api-Key-Id': this.commerceCode, 'Tbk-Api-Key-Secret': this.apiKey },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch { throw new WebpaySandboxError('unknown'); }
    // A non-JSON security page/HTTP error is not an authoritative payment rejection.
    if (!response.ok) throw new WebpaySandboxError('unknown');
    try {
      const raw = await response.text();
      if (raw.length > 65_536) throw new Error();
      const data: unknown = JSON.parse(raw);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
      return data as Record<string, unknown>;
    } catch { throw new WebpaySandboxError('invalid_response'); }
  }

  async create(expected: SandboxPayment): Promise<{ attempt: SandboxAttempt; handoff: { method: 'POST'; url: string; field: 'token_ws' } }> {
    payment(expected);
    // Copy before the await so mutable caller state cannot change the verified snapshot.
    const snapshot = { buyOrder: expected.buyOrder, sessionId: expected.sessionId, amount: expected.amount, currency: expected.currency };
    const data = await this.request('POST', '', { buy_order: snapshot.buyOrder, session_id: snapshot.sessionId, amount: snapshot.amount, return_url: this.returnUrl });
    if (!token(data.token) || data.url !== checkoutUrl) throw new WebpaySandboxError('invalid_response');
    return { attempt: Object.freeze({ ...snapshot, token: data.token, environment: 'integration' }), handoff: { method: 'POST', url: checkoutUrl, field: 'token_ws' } };
  }

  private async inspect(method: 'PUT' | 'GET', attempt: SandboxAttempt): Promise<SandboxStatus> {
    payment(attempt);
    if (attempt.environment !== 'integration' || !token(attempt.token)) throw new TypeError('Invalid sandbox attempt.');
    const snapshot = { ...attempt };
    const data = await this.request(method, `/${snapshot.token}`);
    const states = ['INITIALIZED', 'AUTHORIZED', 'REVERSED', 'FAILED', 'NULLIFIED', 'PARTIALLY_NULLIFIED', 'CAPTURED'];
    if (data.buy_order !== snapshot.buyOrder || data.session_id !== snapshot.sessionId || data.amount !== snapshot.amount || typeof data.status !== 'string' || !states.includes(data.status) || (data.response_code !== undefined && !Number.isInteger(data.response_code))) {
      throw new WebpaySandboxError('invalid_response');
    }
    // Browser returns/cancellation parameters never reach this authority boundary.
    // Integration authorization is test evidence, never revenue or proof of settlement.
    if (data.status === 'AUTHORIZED' && data.response_code !== 0) throw new WebpaySandboxError('invalid_response');
    return Object.freeze({ environment: 'integration', status: data.status, ...(data.response_code !== undefined ? { responseCode: data.response_code as number } : {}), testAuthorized: data.status === 'AUTHORIZED' && data.response_code === 0 });
  }

  commit(attempt: SandboxAttempt) { return this.inspect('PUT', attempt); }
  status(attempt: SandboxAttempt) { return this.inspect('GET', attempt); }
  async reverse(attempt: SandboxAttempt) {
    payment(attempt);
    if (attempt.environment !== 'integration' || !token(attempt.token)) throw new TypeError('Invalid sandbox attempt.');
    // Full amount only. Official SDK RefundRequest uses POST .../refunds {amount}.
    // The application still checks authoritative status after this response.
    const data = await this.request('POST', `/${attempt.token}/refunds`, { amount: attempt.amount });
    if (!['REVERSED','NULLIFIED'].includes(String(data.type))) throw new WebpaySandboxError('invalid_response');
  }
}
