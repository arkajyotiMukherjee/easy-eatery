import test from 'node:test';
import assert from 'node:assert/strict';
import { CloudWhatsAppTransport, WhatsAppDeliveryError } from '../apps/server/src/integrations/whatsapp.ts';

test('transport separates explicit provider rejections from ambiguous acceptance and keeps credentials out of errors', async t => {
 const original=globalThis.fetch;
 t.after(()=>{globalThis.fetch=original;});
 const transport=new CloudWhatsAppTransport({accessToken:'synthetic-private-token',phoneId:'123',version:'v25.0'});
 for(const [status,retryable] of [[401,false],[429,true],[500,true]] as const) {
   globalThis.fetch=async()=>new Response('untrusted provider text',{status});
   await assert.rejects(transport.sendText('synthetic-recipient','hello'),(error:unknown)=>error instanceof WhatsAppDeliveryError && error.retryable===retryable && !error.message.includes('synthetic-private-token'));
 }
 globalThis.fetch=async()=>Response.json({messages:[{id:'provider-reference'}]});
 assert.deepEqual(await transport.sendText('synthetic-recipient','hello'),{id:'provider-reference'});
 globalThis.fetch=async()=>Response.json({unexpected:true});
 await assert.rejects(transport.sendText('synthetic-recipient','hello'),error=>!(error instanceof WhatsAppDeliveryError));
 globalThis.fetch=async()=>{throw new Error('Synthetic timeout');};
 await assert.rejects(transport.sendText('synthetic-recipient','hello'),error=>!(error instanceof WhatsAppDeliveryError));
});
