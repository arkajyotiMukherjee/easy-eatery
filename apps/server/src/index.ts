import { randomBytes } from 'node:crypto';
import { createApp } from './app.ts';
import { CloudWhatsAppTransport } from './integrations/whatsapp.ts';
import { databasePool, PostgresRepository } from './persistence/database.ts';

const env = process.env;
const host = env.HOST ?? '127.0.0.1';
const persistence = env.PERSISTENCE ?? 'memory';
if (!['memory', 'postgres'].includes(persistence)) throw new Error('PERSISTENCE must be memory or postgres.');
if (persistence === 'postgres' && !env.DATABASE_URL) throw new Error('DATABASE_URL is required for PostgreSQL mode.');
if (persistence === 'memory' && host !== '127.0.0.1' && host !== 'localhost' && !env.ADMIN_TOKEN) throw new Error('Set ADMIN_TOKEN before exposing the demo.');
const adminToken = env.ADMIN_TOKEN ?? randomBytes(24).toString('hex');
const mode = env.WHATSAPP_TRANSPORT ?? 'console';
if (!['cloud', 'console'].includes(mode)) throw new Error('WHATSAPP_TRANSPORT must be cloud or console.');
if (mode === 'cloud' && (!env.WHATSAPP_APP_SECRET || !env.WHATSAPP_VERIFY_TOKEN)) throw new Error('Cloud mode requires app secret and verify token.');
const transport = mode === 'cloud' ? new CloudWhatsAppTransport({
  accessToken: env.WHATSAPP_ACCESS_TOKEN ?? '', phoneId: env.WHATSAPP_PHONE_NUMBER_ID ?? '', version: env.WHATSAPP_GRAPH_VERSION ?? '',
}) : undefined;
const posProvider = env.POS_PROVIDER ?? 'toteat';
if (!['toteat', 'fudo'].includes(posProvider)) throw new Error('POS_PROVIDER must be toteat or fudo. Both are simulated.');
const pool = persistence === 'postgres' ? databasePool(env.DATABASE_URL!) : undefined;
const repository = pool ? new PostgresRepository(pool) : undefined;
if (pool) {
  // Fail on missing schema; startup never silently creates or overwrites data.
  await pool.query('SELECT name FROM schema_migrations LIMIT 1');
}
const { app, queue } = createApp({ payAtPickup: !repository && env.PAY_AT_PICKUP === 'true', adminToken: repository ? undefined : adminToken, repository, transport, appSecret: env.WHATSAPP_APP_SECRET, verifyToken: env.WHATSAPP_VERIFY_TOKEN, phoneId: env.WHATSAPP_PHONE_NUMBER_ID, posProvider: repository ? undefined : posProvider as 'toteat' | 'fudo' });
if (pool) app.addHook('onClose', async () => { await queue?.stop(); await pool.end(); });
queue?.start();
await app.listen({ host, port: Number(env.PORT ?? 3000) });
console.log(`Easy Eatery demo: http://${host}:${env.PORT ?? 3000}`);
if (!repository && !env.ADMIN_TOKEN) console.log(`Temporary local panel key: ${adminToken}`);
console.log(repository ? 'PostgreSQL storage enabled. Use an individual scoped staff token; ADMIN_TOKEN is ignored.' : 'Memory storage: data resets on restart.');
console.log('Use test data only. Payment and fulfillment follow branch settings: simulation or local pay at pickup; no online payment/POS integration.');
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.on(signal, async () => { await app.close(); process.exit(0); });
