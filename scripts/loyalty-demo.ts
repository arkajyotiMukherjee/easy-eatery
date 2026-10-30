import { randomBytes } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createApp } from '../apps/server/src/app.ts';
import { LoyaltyDemo } from '../apps/server/src/modules/loyalty/service.ts';

// Deliberately never load .env, database configuration or external providers.
const file = resolve(process.env.LOYALTY_DEMO_FILE ?? '.demo/loyalty.json');
const lock = `${file}.lock`;
await mkdir(resolve(file, '..'), { recursive: true, mode: 0o700 });
try { await mkdir(lock); }
catch (error) {
  if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error(`Another demo may own ${file}. Stop it first. After an unclean shutdown, verify it is stopped before removing ${lock}.`);
  throw error;
}
try {
  const demo = await LoyaltyDemo.open(file);
  const token = process.env.LOYALTY_DEMO_TOKEN ?? randomBytes(24).toString('hex');
  const { app } = createApp({ adminToken: token, loyaltyDemo: demo });
  app.addHook('onClose', async () => { await rm(lock, { recursive: true }); });
  await app.listen({ host: '127.0.0.1', port: Number(process.env.LOYALTY_DEMO_PORT ?? 3001) });
  console.log(`Loyalty demo: http://127.0.0.1:${process.env.LOYALTY_DEMO_PORT ?? 3001}/loyalty`);
  if (!process.env.LOYALTY_DEMO_TOKEN) console.log(`Temporary local panel key: ${token}`);
  console.log('Synthetic restaurant only. Wallet and POS simulated. Local state survives restart. Views share owner access.');
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, async () => { await app.close(); process.exit(0); });
} catch (error) { await rm(lock, { recursive: true }); throw error; }
