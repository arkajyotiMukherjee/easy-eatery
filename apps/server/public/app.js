import { copy } from './i18n.js';
const $ = id => document.getElementById(id);
let token = '';
let connected = false;
let dashboard = null;
let locale = 'es';
try { if (localStorage.getItem('easy-eatery-language') === 'en') locale = 'en'; } catch {}
const t = key => copy[locale][key];
const customerId = `demo-${crypto.randomUUID()}`;
const formatMoney = amount => new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);

async function api(path, body) {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST', signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${token}`, 'Accept-Language': locale, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
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
  $('provider').textContent = data ? `${t('provider')}: ${data.tenant.posProvider === 'fudo' ? 'Fudo' : 'Toteat'}` : '';
  if (!data?.orders.length) {
    const empty = element('div', '', 'empty');
    empty.append(element('span', '↗', 'empty-icon'), element('h3', t('emptyTitle')), element('p', t('emptyHint')));
    $('order-list').append(empty);
    return;
  }
  for (const order of data.orders) {
    const card = element('article', '', 'order-card');
    const heading = element('div', '', 'order-top');
    heading.append(element('h3', `#${order.id.slice(0, 8)}`), element('span', t('states')[order.status], 'badge'));
    card.append(heading, element('p', order.lines.map(line => `${line.quantity} × ${locale === 'en' ? line.nameEn : line.name}`).join(' · ')), element('strong', formatMoney(order.total)));
    card.append(element('p', `${new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit' }).format(new Date(order.createdAt))} · WhatsApp · ${order.posReference ? t('kitchenReceived') : t('kitchenPending')}`));
    const action = order.status === 'awaiting_payment' || order.status === 'paid' ? ['pay', 'pay', {}] :
      order.status === 'preparing' ? ['ready', 'status', { status: 'ready' }] :
      order.status === 'ready' ? ['collect', 'status', { status: 'collected' }] : null;
    if (action) {
      const button = element('button', t(action[0]));
      button.type = 'button';
      button.addEventListener('click', () => guard(async () => {
        button.disabled = true;
        try { await api(`/api/demo/orders/${order.id}/${action[1]}`, action[2]); await refresh(); }
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
