// A small staff editor; all prices, mappings, permissions and versions are checked server-side.
export function createCatalogPanel({ api, t, guard, getRole, getLocale }) {
  const $ = id => document.getElementById(id);
  let catalog = null;
  let draft = null;
  let dirty = false;
  let sequence = 0;
  const node = (tag, text, className) => {
    const result = document.createElement(tag);
    if (text) result.textContent = text;
    if (className) result.className = className;
    return result;
  };
  const button = (label, action) => {
    const result = node('button', label, 'secondary'); result.type = 'button';
    result.addEventListener('click', () => guard(async () => { result.disabled = true; try { await action(); } finally { result.disabled = false; } }));
    return result;
  };
  const field = (parent, label, value, onChange, type = 'text', options = {}) => {
    const wrapper = node('div', '', 'catalog-field');
    const input = document.createElement('input'); input.type = type; input.id = `catalog-field-${++sequence}`; input.name = input.id;
    if (type === 'checkbox') input.checked = value; else input.value = value;
    Object.assign(input, options);
    const caption = node('label', label); caption.htmlFor = input.id;
    input.addEventListener('input', () => { onChange(type === 'checkbox' ? input.checked : type === 'number' ? Number(input.value) : input.value); dirty = true; });
    wrapper.append(caption, input); parent.append(wrapper); return input;
  };
  const clean = () => { if (dirty) throw new Error(t('catalogUnsaved')); };
  function received(data) { catalog = data; draft = structuredClone(data); dirty = false; render(); }
  async function load(discard = false) { if (!discard) clean(); received(await api('/api/catalog')); }
  async function mutate(path, body) { clean(); received(await api(path, body)); }
  function editItem(item, parent, modifier = false, remove) {
    const box = node('fieldset', '', 'catalog-item');
    box.append(node('legend', modifier ? t('modifier') : `${t('item')} ${item.id}`));
    const grid = node('div', '', 'catalog-grid');
    field(grid, t('itemCode'), item.id, value => { item.id = value; }, 'text', { required: true, pattern: modifier ? '[a-z][a-z0-9_-]{0,31}' : '[1-9][0-9]{0,3}', maxLength: 32 });
    field(grid, t('spanishName'), item.name, value => { item.name = value; }, 'text', { required: true, maxLength: 100 });
    field(grid, t('englishName'), item.nameEn, value => { item.nameEn = value; }, 'text', { required: true, maxLength: 100 });
    field(grid, t('priceClp'), item.price, value => { item.price = value; }, 'number', { required: true, min: 0, max: 1000000, step: 1 });
    for (const provider of ['toteat', 'fudo']) field(grid, `${provider === 'toteat' ? 'Toteat' : 'Fudo'} · ${t('providerCode')}`, item.mappings?.[provider] ?? '', value => {
      item.mappings ??= {}; if (value) item.mappings[provider] = value; else delete item.mappings[provider];
    }, 'text', { maxLength: 100 });
    field(grid, t('available'), item.available, value => { item.available = value; }, 'checkbox');
    box.append(grid, button(t('removeItem'), () => { remove(); dirty = true; render(); }));
    if (!modifier) {
      for (const extra of item.modifiers ?? []) editItem(extra, box, true, () => { item.modifiers = item.modifiers.filter(m => m !== extra); });
      if ((item.modifiers?.length ?? 0) < 5) box.append(button(t('addModifier'), () => {
        item.modifiers ??= [];
        let next = 1; while (item.modifiers.some(m => m.id === `extra${next}`)) next++;
        item.modifiers.push({ id: `extra${next}`, name: '', nameEn: '', price: 0, available: true, mappings: {} });
        dirty = true; render();
      }));
    }
    parent.append(box);
  }
  function render() {
    const root = $('catalog-controls'); root.replaceChildren();
    $('catalog-status').textContent = '';
    if (!catalog) return;
    const viewer = getRole() === 'viewer';
    $('catalog-status').textContent = `v${catalog.version} · ${t(catalog.source === 'seed' ? 'sampleCatalog' : 'manualCatalog')} · ${t(catalog.canOrder ? 'orderingOpen' : catalog.blockedReason === 'catalog_stale' ? 'reviewRequired' : 'orderingClosed')}`;
    if (!viewer) {
      const service = node('div', '', 'service-controls');
      service.append(button(t(catalog.availability.acceptingOrders ? 'pauseOrders' : 'resumeOrders'), () => mutate('/api/catalog/service', { expectedVersion: catalog.version, acceptingOrders: !catalog.availability.acceptingOrders, shiftOpen: catalog.availability.shiftOpen })),
        button(t(catalog.availability.shiftOpen ? 'closeShift' : 'openShift'), () => mutate('/api/catalog/service', { expectedVersion: catalog.version, acceptingOrders: catalog.availability.acceptingOrders, shiftOpen: !catalog.availability.shiftOpen })));
      root.append(service);
    }
    const stock = node('div', '', 'stock-list');
    for (const product of catalog.products) {
      const row = node('div', '', 'stock-row');
      const price = new Intl.NumberFormat(getLocale() === 'en' ? 'en-US' : 'es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(product.price);
      row.append(node('span', `${product.id}. ${getLocale() === 'en' ? product.nameEn : product.name} · ${price} · ${t(product.available ? 'available' : 'soldOut')}`));
      if (!viewer) row.append(button(t(product.available ? 'markSoldOut' : 'restoreItem'), () => mutate(`/api/catalog/products/${encodeURIComponent(product.id)}/availability`, { expectedVersion: catalog.version, available: !product.available })));
      stock.append(row);
    }
    root.append(stock);
    if (getRole() !== 'owner') return;
    const details = node('details'); details.open = dirty; details.append(node('summary', t('editCatalog')));
    const form = node('form'); form.method = 'post'; form.action = '/api/catalog';
    form.append(node('p', t('mappingHint'), 'muted'));
    for (const product of draft.products) editItem(product, form, false, () => { draft.products = draft.products.filter(p => p !== product); });
    if (draft.products.length < 200) form.append(button(t('addItem'), () => {
      let next = 1; while (draft.products.some(p => p.id === String(next))) next++;
      const id = String(next);
      draft.products.push({ id, name: '', nameEn: '', price: 0, available: true, mappings: {}, modifiers: [] }); dirty = true; render();
    }));
    const availability = node('fieldset'); availability.append(node('legend', t('serviceHours')));
    field(availability, t('maxAge'), draft.availability.maxAgeMinutes, value => { draft.availability.maxAgeMinutes = value; }, 'number', { required: true, min: 1, max: 10080, step: 1 });
    availability.append(node('p', t('hoursHint'), 'muted'));
    for (const hours of draft.availability.hours) {
      const row = node('div', '', 'catalog-grid');
      const label = node('label', t('weekday')); const select = document.createElement('select'); select.id = `catalog-weekday-${++sequence}`; select.name = select.id; label.htmlFor = select.id;
      t('days').forEach((day, index) => { const option = node('option', day); option.value = index; select.append(option); }); select.value = hours.day;
      select.addEventListener('change', () => { hours.day = Number(select.value); dirty = true; });
      const wrapper = node('div', '', 'catalog-field'); wrapper.append(label, select); row.append(wrapper);
      field(row, t('opens'), hours.opens, value => { hours.opens = value; }, 'time', { required: true });
      field(row, t('closes'), hours.closes, value => { hours.closes = value; }, 'time', { required: true });
      row.append(button(t('removeItem'), () => { draft.availability.hours = draft.availability.hours.filter(h => h !== hours); dirty = true; render(); })); availability.append(row);
    }
    if (draft.availability.hours.length < 21) availability.append(button(t('addHours'), () => { draft.availability.hours.push({ day: 1, opens: '11:00', closes: '22:00' }); dirty = true; render(); }));
    form.append(availability);
    field(form, t('reviewCatalog'), false, () => {}, 'checkbox', { required: true });
    const save = node('button', t('saveCatalog')); save.type = 'submit';
    form.append(save, button(t('discardEdits'), () => load(true)));
    form.addEventListener('submit', event => {
      event.preventDefault();
      guard(async () => {
        save.disabled = true;
        try { received(await api('/api/catalog', { expectedVersion: catalog.version, manualApproved: true, products: draft.products, availability: draft.availability })); }
        finally { save.disabled = false; }
      });
    });
    details.append(form); root.append(details);
  }
  $('load-catalog').addEventListener('click', () => guard(() => load()));
  return { render, load, clear() { catalog = null; draft = null; dirty = false; render(); } };
}
