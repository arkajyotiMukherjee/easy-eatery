// Credentials and checkout capabilities stay in memory and never enter storage/logs.
export function createSandboxActions({ api, guard, refresh, getLocale }) {
  return (order, role) => {
    const en = getLocale() === 'en';
    const node = (tag, text) => { const value = document.createElement(tag); value.textContent = text; return value; };
    const panel = node('div', '');
    panel.append(node('p', en ? 'Webpay sandbox · local kitchen · no real money received' : 'Webpay sandbox · cocina local · sin dinero real recibido'));
    panel.append(node('p', order.paymentState === 'sandbox_authorized' ? (en ? 'Test authorization confirmed' : 'Autorización de prueba confirmada') : order.paymentState === 'sandbox_review' ? (en ? 'Test reversal needs review; pickup is blocked' : 'La reversa de prueba requiere revisión; el retiro está bloqueado') : order.paymentState === 'sandbox_reversed' ? (en ? 'Test authorization reversed; staff review required' : 'Autorización de prueba reversada; requiere revisión') : (en ? 'Awaiting test authorization; keep this payment method' : 'Esperando autorización de prueba; conserva este método de pago')));
    const status = node('p', '');
    status.setAttribute('role', 'status');
    panel.append(status);
    if (role === 'viewer') return panel;
    const action = (label, work) => {
      const button = node('button', label);
      button.type = 'button';
      button.addEventListener('click', () => guard(async () => {
        button.disabled = true;
        try { await work(); } finally { button.disabled = false; }
      }));
      panel.append(button);
    };
    if (order.paymentState === 'due') action(en ? 'Issue sandbox checkout link' : 'Emitir enlace Webpay de prueba', async () => {
      const result = await api(`/api/sandbox/orders/${order.id}/checkout`, {});
      status.replaceChildren();
      if (result.checkoutPath) {
        // The server returns only same-origin opaque paths; do not follow arbitrary URLs.
        if (!/^\/sandbox\/checkout\/[\w-]{43}$/.test(result.checkoutPath)) throw new Error(en ? 'Invalid checkout link' : 'Enlace no válido');
        const link = node('a', en ? 'Open test checkout (share only with this test customer)' : 'Abrir pago de prueba (comparte solo con este cliente de prueba)');
        link.href = result.checkoutPath;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        status.append(link);
      } else status.textContent = en ? 'Attempt exists. Reconcile its status; do not start another payment.' : 'Ya existe un intento. Revisa su estado; no inicies otro pago.';
    });
    action(en ? 'Reconcile sandbox status' : 'Revisar estado Webpay de prueba', async () => {
      const result = await api('/api/sandbox/attempts');
      const attempt = result.attempts.find(value => value.orderId === order.id);
      if (!attempt) { status.textContent = en ? 'No sandbox attempt exists yet.' : 'Aún no existe un intento Webpay de prueba.'; return; }
      const observed = await api(`/api/sandbox/attempts/${attempt.id}/reconcile`, {});
      if (observed.state === 'authorized' || observed.state === 'reversed') await refresh();
      else status.textContent = en ? 'Test payment remains unpaid or needs review. No automatic retry or cash switch.' : 'El pago de prueba sigue pendiente o requiere revisión. Sin reintento ni cambio automático a efectivo.';
    });
    if(role==='owner'&&order.paymentState==='sandbox_authorized'&&order.status!=='collected') action(en?'Reverse full sandbox test authorization':'Reversar autorización de prueba completa',async()=>{
      const listed=await api('/api/sandbox/attempts');
      const attempt=listed.attempts.find(value=>value.orderId===order.id);
      if(!attempt||attempt.refundStarted) throw new Error(en?'Reversal already attempted or unavailable. Reconcile status.':'La reversa ya se intentó o no está disponible. Revisa el estado.');
      if(!window.confirm(en?'Reverse the full sandbox test authorization? No real money is involved. Uncertain outcomes require reconciliation; this action will not retry.':'¿Reversar toda la autorización de prueba? No hay dinero real. Los resultados inciertos requieren revisión; esta acción no se reintentará.')) return;
      await api(`/api/sandbox/attempts/${attempt.id}/reverse`,{expectedVersion:attempt.revision,confirmation:'reverse_sandbox_test_authorization'});
      await refresh();
    });
    if (order.paymentState === 'sandbox_authorized' && ['preparing','ready'].includes(order.status)) {
      const next = order.status === 'preparing' ? 'ready' : 'collected';
      action(next === 'ready' ? (en ? 'Mark ready' : 'Marcar listo') : (en ? 'Confirm test pickup' : 'Confirmar retiro de prueba'), async () => {
        await api(`/api/demo/orders/${order.id}/status`, { status: next });
        await refresh();
      });
    }
    return panel;
  };
}
