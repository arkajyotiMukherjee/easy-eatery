import { randomUUID } from 'node:crypto';
import { errors, type ErrorCode, type Locale } from './i18n.ts';

export type OrderStatus = 'awaiting_payment' | 'paid' | 'preparing' | 'ready' | 'collected';
export type Product = { id: string; name: string; nameEn: string; price: number; available: boolean };
export type Line = { productId: string; name: string; nameEn: string; unitPrice: number; quantity: number };
export type Order = {
  id: string; tenantId: string; customerId: string; source: 'whatsapp';
  currency: 'CLP'; lines: Line[]; total: number; status: OrderStatus;
  createdAt: string; paymentReference?: string; posReference?: string; posProvider: 'toteat' | 'fudo';
};
export type Session = { cart: Map<string, number>; orderId?: string; expiresAt: number; locale: Locale };
export type Tenant = {
  id: string; name: string; timezone: string;
  modules: { whatsappOrdering: boolean; qrMenu: boolean };
  posProvider: 'toteat' | 'fudo';
};

export const demoTenant: Tenant = {
  id: 'santiago-demo', name: 'Mesa Sur', timezone: 'America/Santiago',
  modules: { whatsappOrdering: true, qrMenu: false }, posProvider: 'toteat',
};

export class DomainError extends Error {
  constructor(readonly code: ErrorCode) { super(errors.es[code]); }
}

// Only this repository is process-local. Replace it behind the service boundary in M2.
export class MemoryStore {
  tenant: Tenant = structuredClone(demoTenant);
  products: Product[] = [
    { id: '1', name: 'Completo italiano', nameEn: 'Italian-style completo', price: 4500, available: true },
    { id: '2', name: 'Empanada de pino', nameEn: 'Beef empanada', price: 3200, available: true },
    { id: '3', name: 'Limonada', nameEn: 'Lemonade', price: 2500, available: true },
  ];
  orders = new Map<string, Order>();
  sessions = new Map<string, Session>();
  inbox = new Map<string, string>();

  session(customerId: string): Session {
    const key = `${this.tenant.id}:${customerId}`;
    let session = this.sessions.get(key);
    if (!session || session.expiresAt < Date.now()) {
      session = { cart: new Map(), expiresAt: Date.now() + 24 * 60 * 60 * 1000, locale: 'es' };
      this.sessions.set(key, session);
    }
    return session;
  }

  quote(cart: Map<string, number>): Line[] {
    if (cart.size === 0) throw new DomainError('empty_cart');
    return [...cart].map(([id, quantity]) => {
      const product = this.products.find(p => p.id === id && p.available);
      if (!product) throw new DomainError('unavailable');
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new DomainError('quantity_limit');
      return { productId: id, name: product.name, nameEn: product.nameEn, unitPrice: product.price, quantity };
    });
  }

  createOrder(customerId: string, cart: Map<string, number>): Order {
    const lines = this.quote(cart);
    const order: Order = {
      id: randomUUID(), tenantId: this.tenant.id, customerId, source: 'whatsapp',
      currency: 'CLP', lines, total: lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
      status: 'awaiting_payment', createdAt: new Date().toISOString(), posProvider: this.tenant.posProvider,
    };
    this.orders.set(order.id, order);
    return order;
  }

  order(id: string): Order {
    const order = this.orders.get(id);
    if (!order || order.tenantId !== this.tenant.id) throw new DomainError('order_missing');
    return order;
  }
}

export const money = (amount: number, locale: Locale = 'es') => new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-CL', {
  style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
}).format(amount);
