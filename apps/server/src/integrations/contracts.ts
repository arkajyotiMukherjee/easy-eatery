import type { Order } from '../platform/domain.ts';

// Connectors own provider-specific fields. Shared ordering owns prices and state.
export interface PaymentProvider {
  createCheckout(order: Order): Promise<{ reference: string; url: string }>;
}
export interface PosProvider {
  submitPaidPickup(order: Order): Promise<{ reference: string }>;
}
export interface WhatsAppTransport {
  sendText(to: string, text: string): Promise<void>;
}

export class DemoPaymentProvider implements PaymentProvider {
  async createCheckout(order: Order) {
    return { reference: `demo-payment-${order.id}`, url: `/#payment=${order.id}` };
  }
}

export class DemoPosProvider implements PosProvider {
  readonly accepted = new Map<string, string>();
  async submitPaidPickup(order: Order) {
    // Demonstrates local idempotency only; real timeout reconciliation is an M3 gate.
    const reference = this.accepted.get(order.id) ?? `demo-kitchen-${order.posProvider}-${order.id}`;
    this.accepted.set(order.id, reference);
    return { reference };
  }
}
