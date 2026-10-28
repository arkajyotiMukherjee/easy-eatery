import { DomainError, type MemoryStore, type Product } from './domain.ts';

export type ProviderMappings = { toteat?: string; fudo?: string };
export type Modifier = { id: string; name: string; nameEn: string; price: number; available: boolean; mappings?: ProviderMappings };
export type ServiceHours = { day: number; opens: string; closes: string };
export type Availability = { acceptingOrders: boolean; shiftOpen: boolean; hours: ServiceHours[]; maxAgeMinutes: number };
export type CatalogMeta = { version: number; source: 'seed' | 'manual'; updatedAt: string };
export type CatalogImport = { expectedVersion: number; manualApproved: true; products: Product[]; availability: Availability };

function record(value: unknown, keys: string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !keys.includes(k))) throw new DomainError('bad_catalog');
}
function text(value: unknown, max = 100): value is string {
  return typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= max && !/[\u0000-\u001f]/.test(value);
}
function integer(value: unknown, min: number, max: number): value is number { return Number.isInteger(value) && Number(value) >= min && Number(value) <= max; }
function mappings(value: unknown) {
  if (value === undefined) return;
  record(value, ['toteat', 'fudo']);
  for (const v of Object.values(value)) if (!text(v)) throw new DomainError('bad_catalog');
}
function item(value: unknown, modifier: boolean) {
  record(value, ['id', 'name', 'nameEn', 'price', 'available', 'mappings', ...(modifier ? [] : ['modifiers'])]);
  if (!text(value.id, 32) || !(modifier ? /^[a-z][a-z0-9_-]{0,31}$/ : /^[1-9]\d{0,3}$/).test(value.id) ||
      !text(value.name) || !text(value.nameEn) || !integer(value.price, 0, 1000000) || typeof value.available !== 'boolean') throw new DomainError('bad_catalog');
  mappings(value.mappings);
  if (!modifier && value.modifiers !== undefined) {
    if (!Array.isArray(value.modifiers) || value.modifiers.length > 5) throw new DomainError('bad_catalog');
    value.modifiers.forEach(m => item(m, true));
    if (new Set(value.modifiers.map(m => m.id)).size !== value.modifiers.length) throw new DomainError('bad_catalog');
  }
}

export function validateCatalogImport(value: unknown): asserts value is CatalogImport {
  record(value, ['expectedVersion', 'manualApproved', 'products', 'availability']);
  if (!integer(value.expectedVersion, 1, 2147483646) || value.manualApproved !== true || !Array.isArray(value.products) || value.products.length < 1 || value.products.length > 200) throw new DomainError('bad_catalog');
  value.products.forEach(p => item(p, false));
  if (new Set(value.products.map(p => p.id)).size !== value.products.length) throw new DomainError('bad_catalog');
  const availability = value.availability;
  record(availability, ['acceptingOrders', 'shiftOpen', 'hours', 'maxAgeMinutes']);
  if (typeof availability.acceptingOrders !== 'boolean' || typeof availability.shiftOpen !== 'boolean' || !integer(availability.maxAgeMinutes, 1, 10080) || !Array.isArray(availability.hours) || availability.hours.length > 21) throw new DomainError('bad_catalog');
  for (const hours of availability.hours) {
    record(hours, ['day', 'opens', 'closes']);
    if (!integer(hours.day, 0, 6) || !text(hours.opens, 5) || !text(hours.closes, 5) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hours.opens) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hours.closes) || hours.opens === hours.closes) throw new DomainError('bad_catalog');
  }
}

export class CatalogService {
  constructor(readonly store: MemoryStore) {}
  read() {
    let blockedReason: string | undefined;
    try { this.store.assertOrderingAvailable(); }
    catch (error) { if (!(error instanceof DomainError)) throw error; blockedReason = error.code; }
    return structuredClone({ ...this.store.catalog, products: this.store.products, availability: this.store.availability, canOrder: !blockedReason, blockedReason });
  }
  replace(input: unknown) {
    validateCatalogImport(input);
    this.version(input.expectedVersion);
    const incoming = structuredClone(input.products);
    // Retain historical product rows for existing order-line foreign keys.
    const retired = this.store.products.filter(p => !incoming.some(n => n.id === p.id)).map(p => ({ ...p, available: false }));
    if (incoming.length + retired.length > 200) throw new DomainError('bad_catalog');
    this.store.products = [...incoming, ...retired];
    this.store.availability = structuredClone(input.availability);
    this.store.catalog = { version: this.store.catalog.version + 1, source: 'manual', updatedAt: new Date(this.store.now()).toISOString() };
    return this.read();
  }
  stock(id: string, available: boolean, expectedVersion: number) {
    this.version(expectedVersion);
    if (typeof available !== 'boolean') throw new DomainError('bad_catalog');
    const product = this.store.products.find(p => p.id === id);
    if (!product) throw new DomainError('unavailable');
    product.available = available;
    this.store.catalog.version++;
    // Stock/shift toggles do not refresh stale prices or the manual review timestamp.
    return this.read();
  }
  service(acceptingOrders: boolean, shiftOpen: boolean, expectedVersion: number) {
    this.version(expectedVersion);
    if (typeof acceptingOrders !== 'boolean' || typeof shiftOpen !== 'boolean') throw new DomainError('bad_catalog');
    this.store.availability.acceptingOrders = acceptingOrders;
    this.store.availability.shiftOpen = shiftOpen;
    this.store.catalog.version++;
    return this.read();
  }
  private version(expected: number) {
    if (!Number.isInteger(expected) || expected !== this.store.catalog.version) throw new DomainError('catalog_conflict');
  }
}

export function withinHours(hours: ServiceHours[], timezone: string, timestamp: number): boolean {
  if (!hours.length) return true; // Explicit unrestricted demo/manual schedule.
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(timestamp);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(part('weekday'));
  const minute = Number(part('hour')) * 60 + Number(part('minute'));
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  return hours.some(h => {
    const start = minutes(h.opens), end = minutes(h.closes);
    return end > start ? h.day === day && minute >= start && minute < end :
      (h.day === day && minute >= start) || ((h.day + 1) % 7 === day && minute < end);
  });
}

export function cartSelection(key: string) {
  const [productId, ...modifierIds] = key.split('+');
  if (!/^[1-9]\d{0,3}$/.test(productId) || modifierIds.some(id => !/^[a-z][a-z0-9_-]{0,31}$/.test(id)) || new Set(modifierIds).size !== modifierIds.length) throw new DomainError('unsupported_modifier');
  return { productId, modifierIds: modifierIds.sort() };
}
