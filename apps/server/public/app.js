import { copy } from './i18n.js';
import { createCatalogPanel } from './catalog-ui.js';
const $ = id => document.getElementById(id);
let token = '';
let connected = false;
let dashboard = null;
let locale = 'es';
try { if (localStorage.getItem('easy-eatery-language') === 'en') locale = 'en'; } catch {}
const t = key => copy[locale][key];
let customerId = `demo-${crypto.randomUUID()}`;
const formatMoney = amount => new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
const catalogPanel = createCatalogPanel({ api, t, guard, getRole: () => dashboard?.role, getLocale: () => locale });

async function api(path, body) {
  const requestToken = token;
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST', signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${requestToken}`, 'Accept-Language': locale, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  if (requestToken !== token) throw new Error(t('error'));
  if (!response.ok) throw new Error(result.error ?? t('error'));
  return result;
}
function element(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}
async function guard(task) {
  $('error').textContent = '';
  try { await task(); } catch (error) { $('error').textContent = error.name === 'TimeoutError' ? t('error') : error.message; }
}
function bubble(text, customer = false, language = locale) {
  $('messages').querySelector('.chat-hint')?.remove();
  const node = element('div', text, `bubble${customer ? ' customer' : ''}`);
  node.lang = language;
  $('messages').append(node);
  $('messages').scrollTop = $('messages').scrollHeight;
}
function renderDashboard() {
  $('order-list').replaceChildren();
  const data = dashboard;
  $('orders-count').textContent = data?.metrics.orders ?? 0;
  $('paid-count').textContent = data?.metrics.paidOrders ?? 0;
  $('revenue').textContent = formatMoney(data?.metrics.paidRevenue ?? 0);
  $('collected-count').textContent = data?.metrics.collected ?? 0;
  $('connection').textContent = t(connected ? 'connected' : 'disconnected');
  if (data?.role === 'viewer') $('connection').textContent += ` · ${t('readOnly')}`;
  $('restaurant-heading').textContent = data ? `${data.tenant.name} · ${data.tenant.branchId}` : 'EASY EATERY · CHILE';
  $('restaurant-name').textContent = data?.tenant.name ?? 'Easy Eatery';
  $('restaurant-avatar').textContent = (data?.tenant.name ?? 'Easy Eatery').split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase();
  $('persistence-note').textContent = !data ? t('storageUnknown') : t(data.persistence === 'postgres' ? 'postgresStorage' : 'demoReset');
  document.querySelectorAll('[data-message], #chat-form button').forEach(button => { button.disabled = data?.role === 'viewer'; });
  $('message').readOnly = data?.role === 'viewer';
  const local = data?.mode === 'local_pickup';
  for (const key of ['demoPayments', 'operationsHint', 'simulated', 'mappingHint']) {
    const node = document.querySelector(`[data-i18n="${key}"]`);
    if (node) node.textContent = local ? t(key === 'operationsHint' ? 'localHint' : key === 'mappingHint' ? 'localMappingHint' : 'localKitchen') : t(key);
  }
  $('provider').textContent = local ? t('localKitchen') : data ? `${t('provider')}: ${data.tenant.posProvider === 'fudo' ? 'Fudo' : 'Toteat'}` : '';
  if (!data?.orders.length) {
    const empty = element('div', '', 'empty');
    empty.append(element('span', '↗', 'empty-icon'), element('h3', t('emptyTitle')), element('p', t('emptyHint')));
    $('order-list').append(empty);
    return;
  }
  for (const order of data.orders) {
    const card = element('article', '', 'order-card');
    const heading = element('div', '', 'order-top');
    heading.append(element('h3', `#${order.id.slice(0, 8)}`), element('span', order.fulfillment === 'local' && order.status === 'awaiting_payment' ? t('awaitingStaff') : t('states')[order.status], 'badge'));
    card.append(heading, element('p', order.lines.map(line => `${line.quantity} × ${locale === 'en' ? line.nameEn : line.name}`).join(' · ')), element('strong', formatMoney(order.total)));
    card.append(element('p', `${new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit' }).format(new Date(order.createdAt))} · WhatsApp · ${order.fulfillment === 'local' && order.status !== 'awaiting_payment' ? t('localKitchen') : order.posReference ? t('kitchenReceived') : t('kitchenPending')}`));
    const pickup = order.fulfillment === 'local';
    if (pickup) card.append(element('p', t(order.paymentState === 'store_paid' ? 'storePaid' : 'paymentDue')));
    const action = pickup && order.status === 'awaiting_payment' ? ['acceptPickup', 'accept', {}] :
      pickup && order.status === 'ready' && order.paymentState !== 'store_paid' ? ['recordStorePayment', 'record-store-payment', {}] : order.status === 'awaiting_payment' || order.status === 'paid' ? ['pay', 'pay', {}] :
      order.status === 'preparing' ? ['ready', 'status', { status: 'ready' }] :
      order.status === 'ready' ? ['collect', 'status', { status: 'collected' }] : null;
    if (action && data.role !== 'viewer') {
      const button = element('button', t(action[0]));
      button.type = 'button';
      button.addEventListener('click', () => guard(async () => {
        button.disabled = true;
        try { await api(`/api/${['accept','record-store-payment'].includes(action[1]) ? 'pickup' : 'demo'}/orders/${order.id}/${action[1]}`, action[2]); await refresh(); }
        finally { button.disabled = false; }
      }));
      card.append(button);
    }
    $('order-list').append(card);
  }
}
function translatePage() {
  document.documentElement.lang = locale === 'en' ? 'en' : 'es-CL';
  document.title = t('title');
  $('language').value = locale;
  document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
  document.querySelectorAll('[data-placeholder]').forEach(node => { node.placeholder = t(node.dataset.placeholder); });
  document.querySelectorAll('[data-aria]').forEach(node => { node.setAttribute('aria-label', t(node.dataset.aria)); });
  $('error').textContent = '';
  renderDashboard();
  catalogPanel.render();
}
async function refresh() { dashboard = await api('/api/dashboard'); connected = true; renderDashboard(); }
async function send(text) {
  if (!token) throw new Error(t('accessFirst'));
  const language = locale;
  const result = await api('/api/demo/messages', { customerId, messageId: crypto.randomUUID(), text, locale: language });
  bubble(text, true, language);
  bubble(result.reply, false, language);
  await refresh();
}
$('access-form').addEventListener('submit', event => {
  event.preventDefault();
  token = $('key').value;
  catalogPanel.clear();
  connected = false;
  dashboard = null;
  customerId = `demo-${crypto.randomUUID()}`;
  $('messages').replaceChildren(element('p', t('chatHint'), 'chat-hint'));
  renderDashboard();
  guard(async () => { await refresh(); $('key').value = ''; $('message').focus(); });
});
$('chat-form').addEventListener('submit', event => {
  event.preventDefault();
  const text = $('message').value;
  const button = event.submitter;
  guard(async () => {
    button.disabled = true;
    try { await send(text); $('message').value = ''; $('message').focus(); }
    finally { button.disabled = false; }
  });
});
document.querySelectorAll('[data-message]').forEach(button => button.addEventListener('click', () => guard(() => send(t('commands')[button.dataset.message]))));
$('refresh').addEventListener('click', () => guard(refresh));
$('language').addEventListener('change', () => {
  locale = $('language').value === 'en' ? 'en' : 'es';
  try { localStorage.setItem('easy-eatery-language', locale); } catch {}
  translatePage();
  if ($('messages').querySelector('.bubble')) bubble(t('languageChanged'));
});
translatePage();
