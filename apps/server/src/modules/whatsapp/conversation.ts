import { DomainError, money, type Product, type Line } from '../../platform/domain.ts';
import { errors, type Locale } from '../../platform/i18n.ts';
import type { OrderingService } from '../../platform/ordering.ts';
import { cartSelection } from '../../platform/catalog.ts';

export class Conversation {
  private queues = new Map<string, Promise<unknown>>();
  constructor(readonly ordering: OrderingService) {}

  menu(locale: Locale = 'es') {
    const name = this.ordering.store.tenant.name;
    const greeting = locale === 'es' ? `¡Hola! Bienvenido a ${name}. Retiro en el local.` : `Hi! Welcome to ${name}. Pickup at the restaurant.`;
    const disclaimer = this.ordering.store.tenant.sandboxCheckout ? (locale === 'en' ? 'Webpay sandbox test only; no real charge. Staff provides a test checkout link; local kitchen.' : 'Solo prueba Webpay sandbox; sin cobro real. El personal entrega el enlace de prueba; cocina local.') : this.ordering.store.tenant.payAtPickup ? (locale === 'en' ? 'Pay at pickup. Staff will accept your order in Easy Eatery.' : 'Paga en el local. El personal aceptará tu pedido en Easy Eatery.') : (locale === 'en' ? 'Payment and kitchen are simulated.' : 'Pago y cocina simulados.');
    return greeting + '\n\n' + this.ordering.store.products.filter(p => p.available)
      .map(p => `${p.id}. ${this.name(p, locale)} — ${money(p.price, locale)}` + (p.modifiers?.filter(m => m.available).map(m => `\n  +${m.id}: ${locale === 'en' ? m.nameEn : m.name} (${money(m.price, locale)})`).join('') ?? '')).join('\n') + '\n\n' +
      (locale === 'es' ? `Escribe el número y cantidad, por ejemplo: 1 x 2.\nPara extras: 1+queso x 2 (usa el código del menú).\nEscribe carrito, quitar 1, vaciar o confirmar.\nPrecios finales en CLP. ${disclaimer}\nFor English, type English.` :
        `Type the item number and quantity, for example: 1 x 2.\nFor extras: 1+cheese x 2 (use the code shown in the menu).\nType cart, remove 1, clear or confirm.\nFinal prices in CLP. ${disclaimer}\nPara español, escribe Español.`);
  }

  private name(item: Product | Line, locale: Locale) { return locale === 'en' ? item.nameEn : item.name; }

  async receive(customerId: string, messageId: string, text: string, locale?: Locale) {
    const previous = this.queues.get(customerId) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(() => this.process(customerId, messageId, text, locale));
    this.queues.set(customerId, next);
    try { return await next; }
    finally { if (this.queues.get(customerId) === next) this.queues.delete(customerId); }
  }

  private async process(customerId: string, messageId: string, text: string, requestedLocale?: Locale) {
    const { store } = this.ordering;
    const session = store.session(customerId);
    if (requestedLocale) session.locale = requestedLocale;
    const command = text.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    if (['english', 'ingles'].includes(command)) session.locale = 'en';
    if (['spanish', 'espanol'].includes(command)) session.locale = 'es';
    if (!store.tenant.modules.whatsappOrdering) throw new DomainError('module_disabled');
    const key = `${store.tenant.id}:${customerId}:${messageId}`;
    const cached = store.inbox.get(key);
    if (cached) return cached;
    let response: string;
    try { response = await this.handle(customerId, command); }
    catch (error) {
      if (!(error instanceof DomainError)) throw error;
      response = errors[session.locale][error.code];
      if (error.code === 'quote_changed') response += '\n\n' + this.cartSummary(customerId);
    }
    store.inbox.set(key, response);
    return response;
  }

  private async handle(customerId: string, input: string): Promise<string> {
    const { store } = this.ordering;
    const session = store.session(customerId);
    const locale = session.locale;
    const pick = (es: string, en: string) => locale === 'en' ? en : es;
    if (['english', 'ingles', 'spanish', 'espanol'].includes(input)) return this.menu(locale);
    const commands: Record<string, string> = { new: 'nuevo', confirm: 'confirmar', cart: 'carrito', clear: 'vaciar', hello: 'hola' };
    const text = commands[input] ?? input.replace(/^remove /, 'quitar ');
    if (text === 'nuevo') {
      if (session.orderId && store.order(session.orderId).status === 'awaiting_payment') {
        if (store.order(session.orderId).paymentMethod === 'pay_at_pickup') return pick('Tu pedido espera aceptación del personal. Escribe confirmar para ver su estado.', 'Your order is awaiting staff acceptance. Type confirm to review its status.');
        return pick('Hay un pedido pendiente de pago. Escribe confirmar para recuperar su enlace.', 'You have an unpaid order. Type confirm to recover its link.');
      }
      session.orderId = undefined;
      session.cart.clear();
      session.quote = undefined;
      return this.menu(locale);
    }
    if (text === 'confirmar') {
      const order = await this.ordering.confirm(customerId);
      const pickupStatus = ({ awaiting_payment: pick('esperando aceptación', 'awaiting staff acceptance'), paid: pick('pago recibido', 'payment received'), preparing: pick('en preparación', 'preparing'), ready: pick('listo para retirar', 'ready for pickup'), collected: pick('retirado', 'collected') })[order.status];
      if (order.paymentMethod === 'webpay_sandbox') return pick(
        `Pedido de prueba ${order.id.slice(0, 8)} confirmado. Total CLP: ${money(order.total, locale)}. Webpay sandbox: ${order.paymentState === 'sandbox_authorized' ? 'autorización de prueba confirmada' : order.paymentState === 'sandbox_reversed' ? 'reversado; solicita ayuda al personal' : 'pendiente; solicita el enlace de prueba al personal'}. No se recibió dinero real. Cocina local: ${order.status === 'awaiting_payment' ? 'esperando autorización de prueba' : pickupStatus}.`,
        `Test order ${order.id.slice(0, 8)} confirmed. CLP total: ${money(order.total, locale)}. Webpay sandbox: ${order.paymentState === 'sandbox_authorized' ? 'test authorization confirmed' : order.paymentState === 'sandbox_reversed' ? 'reversed; ask staff for help' : 'pending; ask staff for the test checkout link'}. No real money received. Local kitchen: ${order.status === 'awaiting_payment' ? 'awaiting test authorization' : pickupStatus}.`);
      if (order.paymentMethod === 'pay_at_pickup') return pick(
        `Pedido ${order.id.slice(0, 8)} confirmado. Total: ${money(order.total, locale)}. Paga en el local. Estado: ${pickupStatus}. Pago: ${order.paymentState === 'store_paid' ? 'registrado' : 'pendiente'}.`,
        `Order ${order.id.slice(0, 8)} confirmed. Total: ${money(order.total, locale)}. Pay at pickup. Status: ${pickupStatus}. Payment: ${order.paymentState === 'store_paid' ? 'recorded' : 'due'}.`);
      if (order.status !== 'awaiting_payment') return pick(`Pedido ${order.id.slice(0, 8)} pagado. Escribe nuevo para otro pedido.`, `Order ${order.id.slice(0, 8)} paid. Type new for another order.`);
      return pick(`Pedido ${order.id.slice(0, 8)} confirmado.`, `Order ${order.id.slice(0, 8)} confirmed.`) +
        `\n${order.lines.map(l => `${l.quantity} × ${this.name(l, locale)}`).join('\n')}\n` +
        pick('Total final: ', 'Final total: ') + money(order.total, locale) + '\n' +
        pick('Pago SIMULADO: ', 'SIMULATED payment: ') + `/#payment=${order.id}\n` +
        pick('En el panel, usa Simular pago. Aún no se ha enviado a cocina.', 'In the dashboard, use Simulate payment. This order has not reached the kitchen yet.');
    }
    if (session.orderId && !['menu', 'hola', 'hi', 'carrito'].includes(text)) {
      return pick('Tu pedido ya está confirmado. Escribe confirmar para ver su estado o nuevo para otro pedido después del pago.',
        'Your order is already confirmed. Type confirm to review it, or new for another order after payment.');
    }
    if (text === 'vaciar') { session.cart.clear(); session.quote = undefined; }
    else if (text.startsWith('quitar ')) {
      const selected = cartSelection(text.slice(7));
      session.cart.delete([selected.productId, ...selected.modifierIds].join('+'));
    }
    else {
      const match = /^([1-9]\d{0,3}(?:\+[a-z][a-z0-9_-]{0,31})*)(?:\s*x\s*(\d+))?$/.exec(text);
      if (match) {
        const selected = cartSelection(match[1]);
        const key = [selected.productId, ...selected.modifierIds].join('+');
        const requested = Number(match[2] ?? 1);
        if (requested < 1 || requested > 20) throw new DomainError('quantity_limit');
        const quantity = requested + (session.cart.get(key) ?? 0);
        if (quantity < 1 || quantity > 20) throw new DomainError('quantity_limit');
        // Validate a candidate cart before mutating the saved cart.
        const candidate = new Map(session.cart);
        candidate.set(key, quantity);
        store.quote(candidate);
        session.cart.set(key, quantity);
      } else if (/^\d/.test(text)) throw new DomainError('unsupported_modifier');
      else if (text !== 'carrito') return this.menu(locale);
    }
    if (!session.cart.size) return pick('Tu carrito está vacío.\n\n', 'Your cart is empty.\n\n') + this.menu(locale);
    return this.cartSummary(customerId);
  }

  private cartSummary(customerId: string) {
    const { store } = this.ordering;
    const locale = store.session(customerId).locale;
    const lines = store.review(customerId).lines;
    return lines.map(l => `${l.quantity} × ${this.name(l, locale)} — ${money(l.quantity * l.unitPrice, locale)}`).join('\n') +
      `\nTotal: ${money(lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0), locale)}.\n` +
      (locale === 'es' ? 'Escribe confirmar para continuar o agrega otro producto.' : 'Type confirm to continue or add another item.');
  }
}
