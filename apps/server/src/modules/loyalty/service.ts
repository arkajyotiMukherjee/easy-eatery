import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export class LoyaltyError extends Error {
  constructor(public code: 'missing' | 'conflict' | 'balance' | 'used' | 'wallet' | 'invalid' | 'expired') { super(code); }
}
type Name = { es: string; en: string };
type Reward = { id: string; name: Name; cost: number; kind: 'item' | 'discount'; valueClp?: number };
type Member = { id: string; barcode: string; name: string; balance: number; loyaltyAcceptedAt: string; marketingConsent: false };
type Sale = { id: string; memberId: string; amountClp: number; tokens: number; clpPerToken: number; ruleVersion: number; source: 'simulated_paid_closed'; channel: 'pickup' | 'dine_in'; reversed: boolean };
type Redemption = { id: string; memberId: string; rewardId: string; rewardName: Name; cost: number; kind: Reward['kind']; valueClp?: number; status: 'issued' | 'used' | 'cancelled'; authorization: string; expiresAt: string; completion?: { reason: string; transactionReference: string; actor: 'local-demo-owner'; at: string }; cancellationReason?: string };
type Ledger = { id: string; memberId: string; kind: 'earn' | 'redeem' | 'reverse' | 'adjust' | 'cancel'; delta: number; reference: string; createdAt: string; reason?: string; actor: 'local-demo-owner' };
export type LoyaltyState = {
  version: 1; mode: 'simulation'; scope: 'synthetic-restaurant'; revision: number;
  program: { name: string; version: number; clpPerToken: number; rewards: Reward[] };
  ruleHistory: { version: number; clpPerToken: number; rewardCosts: { coffee: number; discount: number }; changedAt: string }[];
  members: Member[]; sales: Sale[]; redemptions: Redemption[]; ledger: Ledger[];
  wallets: { memberId: string; balance: number; revision: number; updatedAt: string }[]; walletAvailable: boolean;
  requests: Record<string, { fingerprint: string; result: unknown }>;
};
function seed(): LoyaltyState {
  return { version: 1, mode: 'simulation', scope: 'synthetic-restaurant', revision: 0,
    program: { name: 'Café Barrio · Demo', version: 1, clpPerToken: 1000, rewards: [
      { id: 'coffee', name: { es: 'Café de cortesía', en: 'Complimentary coffee' }, cost: 5, kind: 'item' },
      { id: 'discount', name: { es: '$2.000 de descuento', en: 'CLP 2,000 discount' }, cost: 10, kind: 'discount', valueClp: 2000 },
    ] }, ruleHistory: [{ version: 1, clpPerToken: 1000, rewardCosts: { coffee: 5, discount: 10 }, changedAt: new Date().toISOString() }], members: [{ id: 'demo-ana', barcode: randomUUID(), name: 'Ana · Demo', balance: 0, loyaltyAcceptedAt: new Date().toISOString(), marketingConsent: false }, { id: 'demo-alex', barcode: randomUUID(), name: 'Alex · Demo', balance: 0, loyaltyAcceptedAt: new Date().toISOString(), marketingConsent: false }],
    sales: [], redemptions: [], ledger: [], wallets: [], walletAvailable: true, requests: {} };
}
function integer(value: number, min: number, max: number) { if (!Number.isSafeInteger(value) || value < min || value > max) throw new LoyaltyError('invalid'); }
function key(value: string) { if (!/^[A-Za-z0-9_-]{1,100}$/.test(value)) throw new LoyaltyError('invalid'); }

/** Single-process synthetic restaurant repository. Serialize and atomically persist before publishing state. */
export class LoyaltyDemo {
  private tail: Promise<unknown> = Promise.resolve();
  private constructor(private state: LoyaltyState, private file?: string, private now: () => number = Date.now) {}
  static async open(file?: string, now: () => number = Date.now) {
    let state = seed();
    if (file) {
      try {
        state = JSON.parse(await readFile(file, 'utf8'));
        if (state.version !== 1 || state.mode !== 'simulation' || state.scope !== 'synthetic-restaurant' || !Array.isArray(state.ledger)) throw new Error('Invalid loyalty demo snapshot; restore a trusted demo backup.');
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
    return new LoyaltyDemo(state, file, now);
  }
  async read() { await this.tail; const { requests, ...view } = structuredClone(this.state); return view; }
  private change<T>(work: (state: LoyaltyState) => T): Promise<T> {
    const next = this.tail.then(async () => {
      const draft = structuredClone(this.state);
      const result = work(draft);
      if (JSON.stringify(draft) === JSON.stringify(this.state)) return structuredClone(result);
      draft.revision++;
      if (this.file) {
        await mkdir(dirname(this.file), { recursive: true, mode: 0o700 });
        await writeFile(`${this.file}.tmp`, JSON.stringify(draft), { mode: 0o600 });
        await rename(`${this.file}.tmp`, this.file);
      }
      this.state = draft;
      return structuredClone(result);
    });
    this.tail = next.catch(() => {});
    return next;
  }
  private once<T>(s: LoyaltyState, namespace: string, id: string, payload: unknown, action: () => T): T {
    key(id);
    const requestKey = `${namespace}:${id}`;
    const fingerprint = JSON.stringify(payload);
    const previous = s.requests[requestKey];
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw new LoyaltyError('conflict');
      return previous.result as T;
    }
    const result = action();
    s.requests[requestKey] = { fingerprint, result: structuredClone(result) };
    return result;
  }
  private member(s: LoyaltyState, id: string) {
    const m = s.members.find(m => m.id === id); if (!m) throw new LoyaltyError('missing'); return m;
  }
  private entry(s: LoyaltyState, member: Member, kind: Ledger['kind'], delta: number, reference: string, reason?: string) {
    integer(member.balance + delta, -100_000_000, 100_000_000);
    member.balance += delta;
    s.ledger.push({ id: randomUUID(), memberId: member.id, kind, delta, reference, createdAt: new Date(this.now()).toISOString(), reason, actor: 'local-demo-owner' });
    // The simulated provider may lag; ledger truth never depends on the projection.
    if (s.walletAvailable && s.wallets.some(w => w.memberId === member.id)) this.project(s, member);
  }
  private project(s: LoyaltyState, member: Member) {
    const wallet = { memberId: member.id, balance: member.balance, revision: s.revision + 1, updatedAt: new Date(this.now()).toISOString() };
    s.wallets = [...s.wallets.filter(w => w.memberId !== member.id), wallet]; return wallet;
  }
  enroll(name: string, requestId: string, loyaltyAccepted: boolean) {
    if (loyaltyAccepted !== true) throw new LoyaltyError('invalid');
    const cleaned = name.trim(); if (cleaned.length < 1 || cleaned.length > 60) throw new LoyaltyError('invalid');
    return this.change(s => this.once(s, 'enroll', requestId, [cleaned], () => {
      const member: Member = { id: randomUUID(), barcode: randomUUID(), name: cleaned, balance: 0, loyaltyAcceptedAt: new Date(this.now()).toISOString(), marketingConsent: false }; s.members.push(member); return member;
    }));
  }
  sale(input: { memberId: string; amountClp: number; eventId: string; channel: 'pickup' | 'dine_in' }) {
    integer(input.amountClp, 1, 10_000_000);
    if (!['pickup', 'dine_in'].includes(input.channel)) throw new LoyaltyError('invalid');
    return this.change(s => this.once(s, 'sale', input.eventId, [input.memberId, input.amountClp, input.channel], () => {
      const member = this.member(s, input.memberId);
      const sale: Sale = { id: input.eventId, memberId: member.id, amountClp: input.amountClp, tokens: Math.floor(input.amountClp / s.program.clpPerToken), clpPerToken: s.program.clpPerToken, ruleVersion: s.program.version, source: 'simulated_paid_closed', channel: input.channel, reversed: false };
      s.sales.push(sale); this.entry(s, member, 'earn', sale.tokens, sale.id); return sale;
    }));
  }
  redeem(memberId: string, rewardId: string, requestId: string) {
    return this.change(s => this.once(s, 'redeem', requestId, [memberId, rewardId], () => {
      const member = this.member(s, memberId); const reward = s.program.rewards.find(r => r.id === rewardId);
      if (!reward) throw new LoyaltyError('missing');
      if (member.balance < reward.cost) throw new LoyaltyError('balance');
      const redemption: Redemption = { id: randomUUID(), memberId, rewardId, rewardName: reward.name, cost: reward.cost, kind: reward.kind, valueClp: reward.valueClp, status: 'issued', authorization: randomUUID(), expiresAt: new Date(this.now() + 10 * 60_000).toISOString() };
      this.entry(s, member, 'redeem', -reward.cost, redemption.id); s.redemptions.push(redemption); return redemption;
    }));
  }
  use(id: string, requestId: string, authorization: string, reason: string, transactionReference: string) {
    this.reason(reason); key(transactionReference);
    return this.change(s => this.once(s, 'use', requestId, [id, authorization, reason, transactionReference], () => {
      const redemption = s.redemptions.find(r => r.id === id); if (!redemption) throw new LoyaltyError('missing');
      if (redemption.status !== 'issued') throw new LoyaltyError('used');
      if (redemption.authorization !== authorization) throw new LoyaltyError('invalid');
      if (Date.parse(redemption.expiresAt) <= this.now()) throw new LoyaltyError('expired');
      redemption.status = 'used';
      redemption.completion = { reason, transactionReference, actor: 'local-demo-owner', at: new Date(this.now()).toISOString() };
      return redemption;
    }));
  }
  cancel(id: string, requestId: string, reason: string) {
    this.reason(reason);
    return this.change(s => this.once(s, 'cancel', requestId, [id, reason], () => {
      const redemption = s.redemptions.find(r => r.id === id); if (!redemption) throw new LoyaltyError('missing');
      if (redemption.status === 'used') throw new LoyaltyError('used');
      if (redemption.status === 'issued') {
        this.entry(s, this.member(s, redemption.memberId), 'cancel', redemption.cost, redemption.id, reason);
        redemption.status = 'cancelled'; redemption.cancellationReason = reason;
      }
      return redemption;
    }));
  }
  private reason(reason: string) { if (reason.trim().length < 5 || reason.length > 200) throw new LoyaltyError('invalid'); }
  adjust(memberId: string, delta: number, reason: string, requestId: string) {
    integer(delta, -1000, 1000); if (delta === 0) throw new LoyaltyError('invalid'); this.reason(reason);
    return this.change(s => this.once(s, 'adjust', requestId, [memberId, delta, reason], () => {
      const member = this.member(s, memberId); this.entry(s, member, 'adjust', delta, requestId, reason); return member;
    }));
  }
  revokeBarcode(memberId: string, requestId: string) {
    return this.change(s => this.once(s, 'barcode', requestId, [memberId], () => {
      const member = this.member(s, memberId); member.barcode = randomUUID(); return member;
    }));
  }
  reverse(id: string, requestId: string) {
    return this.change(s => this.once(s, 'reverse', requestId, [id], () => {
      const sale = s.sales.find(sale => sale.id === id); if (!sale) throw new LoyaltyError('missing');
      if (!sale.reversed) {
        this.entry(s, this.member(s, sale.memberId), 'reverse', -sale.tokens, sale.id); sale.reversed = true;
      }
      return sale;
    }));
  }
  sync(memberId: string) { return this.change(s => {
    const member = this.member(s, memberId); if (!s.walletAvailable) throw new LoyaltyError('wallet');
    const existing = s.wallets.find(w => w.memberId === memberId);
    return existing?.balance === member.balance ? existing : this.project(s, member);
  }); }
  configure(clpPerToken: number, expectedRevision: number, rewardCosts?: { coffee: number; discount: number }) {
    integer(clpPerToken, 1, 1_000_000);
    if (rewardCosts) { integer(rewardCosts.coffee, 1, 100_000); integer(rewardCosts.discount, 1, 100_000); }
    return this.change(s => {
      if (expectedRevision !== s.revision) throw new LoyaltyError('conflict');
      s.program.clpPerToken = clpPerToken; s.program.version++;
      if (rewardCosts) for (const reward of s.program.rewards) reward.cost = rewardCosts[reward.id as keyof typeof rewardCosts];
      s.ruleHistory.push({ version: s.program.version, clpPerToken, rewardCosts: { coffee: s.program.rewards[0].cost, discount: s.program.rewards[1].cost }, changedAt: new Date(this.now()).toISOString() });
      return s.program;
    });
  }
  availability(available: boolean) { return this.change(s => { s.walletAvailable = available; return { available }; }); }
  reset() { return this.change(s => { const next = seed(); Object.assign(s, next, { revision: s.revision }); return { reset: true }; }); }
}
