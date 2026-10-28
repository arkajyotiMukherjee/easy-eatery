export type Locale = 'es' | 'en';
export const errors = {
  es: {
    empty_cart: 'Tu carrito está vacío. Escribe menú.',
    unavailable: 'Un producto ya no está disponible. Escribe vaciar y elige otra opción.',
    quantity_limit: 'El máximo es 20 unidades por producto.',
    order_missing: 'Pedido no encontrado.',
    transition: 'El pedido no puede avanzar a ese estado.',
    module_disabled: 'Pedidos por WhatsApp no disponibles.',
    unauthorized: 'Ingresa la clave del panel para continuar.',
    invalid_request: 'Revisa los datos e intenta nuevamente.',
    internal: 'No se pudo completar la operación. Intenta nuevamente.',
  },
  en: {
    empty_cart: 'Your cart is empty. Type menu.',
    unavailable: 'An item is no longer available. Type clear and choose another item.',
    quantity_limit: 'The maximum is 20 units per item.',
    order_missing: 'Order not found.',
    transition: 'The order cannot move to that status.',
    module_disabled: 'WhatsApp ordering is unavailable.',
    unauthorized: 'Enter the panel key to continue.',
    invalid_request: 'Check the submitted details and try again.',
    internal: 'Unable to complete the operation. Please try again.',
  },
} as const;
export type ErrorCode = keyof typeof errors.es;
export const localeFrom = (value: unknown): Locale => typeof value === 'string' && value.toLowerCase().startsWith('en') ? 'en' : 'es';
