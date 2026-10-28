import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../apps/server/src/app.ts';

test('local pickup has no fake POS/payment; preparing and ready remain unpaid until staff records payment', async t => {
 const {app,store}=createApp({adminToken:'pickup-test-token-12345',payAtPickup:true});
 t.after(()=>app.close());
 const headers={authorization:'Bearer pickup-test-token-12345'};
 store.catalog.source='manual'; // No POS codes needed for the local kitchen.
 for(const text of ['English','1','confirm']) {
   const r=await app.inject({method:'POST',url:'/api/demo/messages',headers,payload:{customerId:'person',messageId:text,text}});
   assert.equal(r.statusCode,200);
   if(text==='confirm') assert.match(r.json().reply,/Pay at pickup/);
 }
 const order=[...store.orders.values()][0];
 assert.equal(order.paymentState,'due');
 assert.equal(order.paymentReference,undefined);
 const action=(suffix:string)=>app.inject({method:'POST',url:`/api/pickup/orders/${order.id}/${suffix}`,headers});
 assert.equal((await action('record-store-payment')).statusCode,409);
 await Promise.all([action('accept'),action('accept')]);
 assert.equal(store.orders.size,1); assert.equal(order.posReference,undefined);
 assert.equal((await app.inject({method:'POST',url:`/api/demo/orders/${order.id}/pay`,headers})).statusCode,409);
 const status=(status:string)=>app.inject({method:'POST',url:`/api/demo/orders/${order.id}/status`,headers,payload:{status}});
 await status('ready');
 assert.equal((await status('collected')).statusCode,409);
 let metrics=(await app.inject({url:'/api/dashboard',headers})).json().metrics;
 assert.equal(metrics.paidRevenue,0); assert.equal(metrics.dueRevenue,4500);
 await Promise.all([action('record-store-payment'),action('record-store-payment')]);
 await status('collected');
 metrics=(await app.inject({url:'/api/dashboard',headers})).json().metrics;
 assert.equal(metrics.storePaidRevenue,4500); assert.equal(metrics.collected,1);
 assert.equal((await app.inject({method:'POST',url:`/api/pickup/orders/${order.id}/accept`})).statusCode,401);
 store.tenant.payAtPickup=false; store.catalog.source='seed';
 await app.inject({method:'POST',url:'/api/demo/messages',headers,payload:{customerId:'simulation-person',text:'1',messageId:'s1'}});
 await app.inject({method:'POST',url:'/api/demo/messages',headers,payload:{customerId:'simulation-person',text:'confirm',messageId:'s2'}});
 const simulated=[...store.orders.values()][1];
 await app.inject({method:'POST',url:`/api/demo/orders/${simulated.id}/pay`,headers});
 store.tenant.payAtPickup=true;
 metrics=(await app.inject({url:'/api/dashboard',headers})).json().metrics;
 assert.equal(metrics.paidRevenue,4500); assert.equal(metrics.paidOrders,1);
});
