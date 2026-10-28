import { randomUUID } from 'node:crypto';
import { errors, type ErrorCode, type Locale } from './i18n.ts';
import { cartSelection, withinHours, type Availability, type CatalogMeta, type Modifier, type ProviderMappings } from './catalog.ts';

export type OrderStatus = 'awaiting_payment' | 'paid' | 'preparing' | 'ready' | 'collected';
export type Product = { id: string; name: string; nameEn: string; price: number; available: boolean; mappings?: ProviderMappings; modifiers?: Modifier[] };
export type Line = { productId: string; name: string; nameEn: string; unitPrice: number; quantity: number; providerProductId?: string; modifiers?: { id: string; name: string; nameEn: string; price: number; providerId?: string }[] };
export type Quote = { catalogVersion: number; expiresAt: number; cartKey: string; lines: Line[]; total: number };
export type Order = {
  id: string; tenantId: string; branchId: string; customerId: string; source: 'whatsapp';
  currency: 'CLP'; lines: Line[]; total: number; status: OrderStatus;
  createdAt: string; paymentReference?: string; posReference?: string; posProvider: 'toteat' | 'fudo'; catalogVersion?: number;
};
export type Session = { cart: Map<string, number>; orderId?: string; expiresAt: number; locale: Locale; quote?: Quote };
export type Tenant = {
  id: string; branchId: string; name: string; timezone: string;
  modules: { whatsappOrdering: boolean; qrMenu: boolean };
  posProvider: 'toteat' | 'fudo';
};

export const demoTenant: Tenant = {
  id: 'santiago-demo', branchId: 'main', name: 'Mesa Sur', timezone: 'America/Santiago',
  modules: { whatsappOrdering: true, qrMenu: false }, posProvider: 'toteat',
};

export class DomainError extends Error {
  constructor(readonly code: ErrorCode) { super(errors.es[code]); }
}

// Only this repository is process-local. Replace it behind the service boundary in M2.
export class MemoryStore {
  now = () => Date.now();
  catalog: CatalogMeta = { version: 1, source: 'seed', updatedAt: new Date().toISOString() };
  availability: Availability = { acceptingOrders: true, shiftOpen: true, hours: [], maxAgeMinutes: 1440 };
  tenant: Tenant = structuredClone(demoTenant);
  products: Product[] = [
    { id: '1', name: 'Completo italiano', nameEn: 'Italian-style completo', price: 4500, available: true },
    { id: '2', name: 'Empanada de pino', nameEn: 'Beef empanada', price: 3200, available: true },
    { id: '3', name: 'Limonada', nameEn: 'Lemonade', price: 2500, available: true },
  ];
  orders = new Map<string, Order>();
  sessions = new Map<string, Session>();
  inbox = new Map<string, string>();
  delivered = new Set<string>();

  session(customerId: string): Session {
    const key = `${this.tenant.id}:${customerId}`;
    let session = this.sessions.get(key);
    if (!session || session.expiresAt < this.now()) {
      session = { cart: new Map(), expiresAt: this.now() + 24 * 60 * 60 * 1000, locale: 'es' };
      this.sessions.set(key, session);
    }
    return session;
  }

  quote(cart: Map<string, number>): Line[] {
    if (cart.size === 0) throw new DomainError('empty_cart');
    return [...cart].map(([key, quantity]) => {
      const { productId, modifierIds } = cartSelection(key);
      const product = this.products.find(p => p.id === productId && p.available);
      if (!product) throw new DomainError('unavailable');
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new DomainError('quantity_limit');
      const modifiers = modifierIds.map(id => {
        const modifier = product.modifiers?.find(m => m.id === id && m.available);
        if (!modifier) throw new DomainError('unsupported_modifier');
        return { id: modifier.id, name: modifier.name, nameEn: modifier.nameEn, price: modifier.price, ...(modifier.mappings?.[this.tenant.posProvider] ? { providerId: modifier.mappings[this.tenant.posProvider] } : {}) };
      });
      const providerProductId = product.mappings?.[this.tenant.posProvider];
      if (this.catalog.source === 'manual' && (!providerProductId || modifiers.some(m => !m.providerId))) throw new DomainError('mapping_missing');
      return {
        productId, name: [product.name, ...modifiers.map(m => m.name)].join(' + '), nameEn: [product.nameEn, ...modifiers.map(m => m.nameEn)].join(' + '),
        unitPrice: product.price + modifiers.reduce((sum, m) => sum + m.price, 0), quantity,
        ...(providerProductId ? { providerProductId } : {}), ...(modifiers.length ? { modifiers } : {}),
      };
    });
  }

  review(customerId: string): Quote {
    const session = this.session(customerId);
    const lines = this.quote(session.cart);
    const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    if (!Number.isSafeInteger(total) || total > 2000000000) throw new DomainError('quantity_limit');
    session.quote = { catalogVersion: this.catalog.version, expiresAt: this.now() + 5 * 60 * 1000, cartKey: this.cartKey(session.cart), lines, total };
    return session.quote;
  }

  cartKey(cart: Map<string, number>) { return JSON.stringify([...cart].sort(([a], [b]) => a.localeCompare(b))); }

  assertOrderingAvailable() {
    if (!this.availability.acceptingOrders || !this.availability.shiftOpen || !withinHours(this.availability.hours, this.tenant.timezone, this.now())) throw new DomainError('restaurant_closed');
    if (this.now() - Date.parse(this.catalog.updatedAt) >= this.availability.maxAgeMinutes * 60 * 1000) throw new DomainError('catalog_stale');
  }

  createOrder(customerId: string, cart: Map<string, number>): Order {
    const lines = this.quote(cart);
    const order: Order = {
      id: randomUUID(), tenantId: this.tenant.id, branchId: this.tenant.branchId, customerId, source: 'whatsapp',
      currency: 'CLP', lines, total: lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
      status: 'awaiting_payment', createdAt: new Date(this.now()).toISOString(), posProvider: this.tenant.posProvider, catalogVersion: this.catalog.version,
    };
    this.orders.set(order.id, order);
    return order;
  }

  order(id: string): Order {
    const order = this.orders.get(id);
    if (!order || order.tenantId !== this.tenant.id || order.branchId !== this.tenant.branchId) throw new DomainError('order_missing');
    return order;
  }
}

export const money = (amount: number, locale: Locale = 'es') => new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-CL', {
  style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
}).format(amount);
