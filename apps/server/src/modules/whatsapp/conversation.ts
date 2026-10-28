import { DomainError, money, type Product, type Line } from '../../platform/domain.ts';
import { errors, type Locale } from '../../platform/i18n.ts';
import type { OrderingService } from '../../platform/ordering.ts';

export class Conversation {
  private queues = new Map<string, Promise<unknown>>();
  constructor(readonly ordering: OrderingService) {}

  menu(locale: Locale = 'es') {
    const name = this.ordering.store.tenant.name;
    const greeting = locale === 'es' ? `¡Hola! Bienvenido a ${name}. Retiro en el local.` : `Hi! Welcome to ${name}. Pickup at the restaurant.`;
    return greeting + '\n\n' + this.ordering.store.products.filter(p => p.available)
      .map(p => `${p.id}. ${this.name(p, locale)} — ${money(p.price, locale)}`).join('\n') + '\n\n' +
      (locale === 'es' ? 'Escribe el número y cantidad, por ejemplo: 1 x 2.\nEscribe carrito, quitar 1, vaciar o confirmar.\nPrecios finales en CLP. Pago y cocina simulados.\nFor English, type English.' :
        'Type the item number and quantity, for example: 1 x 2.\nType cart, remove 1, clear or confirm.\nFinal prices in CLP. Payment and kitchen are simulated.\nPara español, escribe Español.');
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
        return pick('Hay un pedido pendiente de pago. Escribe confirmar para recuperar su enlace.', 'You have an unpaid order. Type confirm to recover its link.');
      }
      session.orderId = undefined;
      session.cart.clear();
      return this.menu(locale);
    }
    if (text === 'confirmar') {
      const order = await this.ordering.confirm(customerId);
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
    if (text === 'vaciar') session.cart.clear();
    else if (/^quitar [123]$/.test(text)) session.cart.delete(text.split(' ')[1]);
    else {
      const match = /^([123])(?:\s*x\s*(\d+))?$/.exec(text);
      if (match) {
        const quantity = Number(match[2] ?? 1) + (session.cart.get(match[1]) ?? 0);
        if (quantity < 1 || quantity > 20) throw new DomainError('quantity_limit');
        if (!store.products.find(p => p.id === match[1] && p.available)) throw new DomainError('unavailable');
        session.cart.set(match[1], quantity);
      } else if (text !== 'carrito') return this.menu(locale);
    }
    if (!session.cart.size) return pick('Tu carrito está vacío.\n\n', 'Your cart is empty.\n\n') + this.menu(locale);
    const lines = store.quote(session.cart);
    return lines.map(l => `${l.quantity} × ${this.name(l, locale)} — ${money(l.quantity * l.unitPrice, locale)}`).join('\n') +
      `\nTotal: ${money(lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0), locale)}.\n` +
      pick('Escribe confirmar para continuar o agrega otro producto.', 'Type confirm to continue or add another item.');
  }
}
