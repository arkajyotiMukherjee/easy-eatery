import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDeliveryStatuses, parseMessages } from '../apps/server/src/integrations/whatsapp.ts';

const payload = (statuses: unknown[], phone = '701') => ({ object: 'whatsapp_business_account', entry: [{ changes: [{
  field: 'messages', value: { metadata: { phone_number_id: phone }, statuses },
}] }] });

test('status normalization filters receiving account, bounds fields and excludes customer/provider descriptions', () => {
  const status = { id: 'synthetic-1', status: 'failed', timestamp: '1793200000', recipient_id: 'private-contact',
    errors: [{ code: 131026, title: 'private provider description', error_data: { details: 'private text' } }] };
  assert.deepEqual(parseDeliveryStatuses(payload([status]), '701'), [{ id: 'synthetic-1', status: 'failed', timestamp: 1793200000, errorCode: 131026 }]);
  assert.deepEqual(parseDeliveryStatuses(payload([status], '702'), '701'), []);
  assert.deepEqual(parseMessages(payload([status]), '701'), []);
  assert.deepEqual(parseDeliveryStatuses(payload([
    null, { ...status, id: '' }, { ...status, id: 'a'.repeat(513) }, { ...status, status: 'unrecognized' },
    { ...status, timestamp: -1 }, { ...status, timestamp: 'NaN' }, { ...status, timestamp: '99999999999' },
  ]), '701'), []);
  assert.deepEqual(parseDeliveryStatuses(payload([{ ...status, errors: [{ code: -1 }] }]), '701')[0], {
    id: 'synthetic-1', status: 'failed', timestamp: 1793200000,
  });
  assert.equal(parseDeliveryStatuses(payload(Array.from({ length: 150 }, (_, i) => ({ ...status, id: `s${i}` }))), '701').length, 100);
});


test('inbound timestamp is optional and future/malformed values cannot open a service window', () => {
  const now = Math.floor(Date.now() / 1000);
  const input = (timestamp?: unknown) => ({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: {
    metadata: { phone_number_id: '701' }, messages: [{ id: 'inbound', from: 'fixture-contact', type: 'text', text: { body: 'hello' }, ...(timestamp === undefined ? {} : { timestamp }) }],
  } }] }] });
  assert.deepEqual(parseMessages(input(), '701'), [{ id: 'inbound', from: 'fixture-contact', text: 'hello' }]);
  assert.equal(parseMessages(input(String(now - 30)), '701')[0].timestamp, now - 30);
  for (const invalid of [String(now + 3600), 'invalid', '-1', '99999999999', now]) {
    const message = parseMessages(input(invalid), '701')[0];
    assert.equal(message.text, 'hello');
    assert.equal(message.timestamp, undefined);
  }
});


test('unsupported customer media requests handoff instead of interpreting an attachment', () => {
  const body = { object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: {
    metadata: { phone_number_id: '701' }, messages: [{ id: 'attachment', from: 'fixture-contact', type: 'image', image: { caption: 'private content' } }],
  } }] }] };
  assert.deepEqual(parseMessages(body, '701'), [{ id: 'attachment', from: 'fixture-contact', text: 'help' }]);
});
