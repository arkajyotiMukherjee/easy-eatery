import { DomainError, MemoryStore, type OrderStatus } from './domain.ts';
import type { PaymentProvider, PosProvider } from '../integrations/contracts.ts';
import { isDeepStrictEqual } from 'node:util';

export class OrderingService {
  constructor(readonly store: MemoryStore, readonly payment: PaymentProvider, readonly pos: PosProvider) {}

  async confirm(customerId: string) {
    const session = this.store.session(customerId);
    if (session.orderId) return this.store.order(session.orderId);
    this.store.assertOrderingAvailable();
    this.store.quote(session.cart); // Availability and modifier/mapping checks before checkout.
    if (!session.quote || session.quote.catalogVersion !== this.store.catalog.version || session.quote.expiresAt <= this.store.now() || session.quote.cartKey !== this.store.cartKey(session.cart)) {
      this.store.review(customerId);
      throw new DomainError('quote_changed');
    }
    // Also catches direct catalog edits that did not go through the versioned service.
    const currentLines = this.store.quote(session.cart);
    if (!isDeepStrictEqual(currentLines, session.quote.lines)) {
      this.store.review(customerId);
      throw new DomainError('quote_changed');
    }
    const order = this.store.createOrder(customerId, session.cart);
    session.orderId = order.id;
    if (order.paymentMethod === 'pay_at_pickup' || order.paymentMethod === 'webpay_sandbox') return order;
    try {
      const checkout = await this.payment.createCheckout(order);
      order.paymentReference = checkout.reference;
      return order;
    } catch (error) {
      session.orderId = undefined;
      this.store.orders.delete(order.id);
      throw error;
    }
  }

  async simulatePayment(id: string) {
    const order = this.store.order(id);
    if (order.paymentMethod && order.paymentMethod !== 'simulation') throw new DomainError('transition');
    if (!order.posReference) this.store.assertOrderingAvailable();
    order.paymentState = 'simulated_paid';
    if (order.status === 'awaiting_payment') order.status = 'paid';
    if (!order.posReference) {
      const result = await this.pos.submitPaidPickup(structuredClone(order));
      order.posReference = result.reference;
      order.status = 'preparing';
    }
    return order;
  }

  acceptPickup(id: string) {
    const order = this.store.order(id);
    if (order.fulfillment !== 'local' || order.paymentMethod !== 'pay_at_pickup') throw new DomainError('transition');
    if (order.status !== 'awaiting_payment') return order;
    this.store.assertOrderingAvailable();
    order.status = 'preparing';
    return order;
  }

  recordStorePayment(id: string) {
    const order = this.store.order(id);
    if (order.paymentMethod !== 'pay_at_pickup' || !['ready', 'collected'].includes(order.status)) throw new DomainError('transition');
    order.paymentState = 'store_paid';
    return order;
  }

  transition(id: string, next: OrderStatus) {
    const order = this.store.order(id);
    if (order.paymentMethod === 'webpay_sandbox' && order.paymentState !== 'sandbox_authorized') throw new DomainError('transition');
    if (order.status === next) return order;
    const allowed: Partial<Record<OrderStatus, OrderStatus>> = { preparing: 'ready', ready: 'collected' };
    if (allowed[order.status] !== next) throw new DomainError('transition');
    if (next === 'collected' && order.paymentMethod === 'pay_at_pickup' && order.paymentState !== 'store_paid') throw new DomainError('transition');
    order.status = next;
    return order;
  }

  dashboard() {
    const orders = [...this.store.orders.values()].filter(o => o.tenantId === this.store.tenant.id && o.branchId === this.store.tenant.branchId);
    return {
      tenant: this.store.tenant,
      mode: this.store.tenant.sandboxCheckout ? 'sandbox_pickup' : this.store.tenant.payAtPickup ? 'local_pickup' : 'simulation',
      metrics: {
        orders: orders.length,
        storePaidRevenue: orders.filter(o => o.paymentState === 'store_paid').reduce((sum, o) => sum + o.total, 0),
        testAuthorizedRevenue: orders.filter(o => o.paymentState === 'sandbox_authorized').reduce((sum, o) => sum + o.total, 0),
        dueRevenue: orders.filter(o => o.paymentState === 'due').reduce((sum, o) => sum + o.total, 0),
        paidOrders: orders.filter(o => (o.paymentState === 'store_paid' || (!this.store.tenant.payAtPickup && o.paymentState === 'simulated_paid'))).length,
        collected: orders.filter(o => o.status === 'collected').length,
        paidRevenue: orders.filter(o => (o.paymentState === 'store_paid' || (!this.store.tenant.payAtPickup && o.paymentState === 'simulated_paid'))).reduce((sum, o) => sum + o.total, 0),
      },
      orders: orders.map(({ customerId: _customerId, ...order }) => order).reverse(),
    };
  }
}
