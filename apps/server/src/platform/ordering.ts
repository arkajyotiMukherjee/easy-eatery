import { DomainError, MemoryStore, type OrderStatus } from './domain.ts';
import type { PaymentProvider, PosProvider } from '../integrations/contracts.ts';

export class OrderingService {
  constructor(readonly store: MemoryStore, readonly payment: PaymentProvider, readonly pos: PosProvider) {}

  async confirm(customerId: string) {
    const session = this.store.session(customerId);
    if (session.orderId) return this.store.order(session.orderId);
    const order = this.store.createOrder(customerId, session.cart);
    session.orderId = order.id;
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
    if (order.status === 'awaiting_payment') order.status = 'paid';
    if (!order.posReference) {
      const result = await this.pos.submitPaidPickup(structuredClone(order));
      order.posReference = result.reference;
      order.status = 'preparing';
    }
    return order;
  }

  transition(id: string, next: OrderStatus) {
    const order = this.store.order(id);
    if (order.status === next) return order;
    const allowed: Partial<Record<OrderStatus, OrderStatus>> = { preparing: 'ready', ready: 'collected' };
    if (allowed[order.status] !== next) throw new DomainError('transition');
    order.status = next;
    return order;
  }

  dashboard() {
    const orders = [...this.store.orders.values()].filter(o => o.tenantId === this.store.tenant.id);
    return {
      tenant: this.store.tenant,
      mode: 'simulation',
      metrics: {
        orders: orders.length,
        paidOrders: orders.filter(o => o.status !== 'awaiting_payment').length,
        collected: orders.filter(o => o.status === 'collected').length,
        paidRevenue: orders.filter(o => o.status !== 'awaiting_payment').reduce((sum, o) => sum + o.total, 0),
      },
      orders: orders.map(({ customerId: _customerId, ...order }) => order).reverse(),
    };
  }
}
