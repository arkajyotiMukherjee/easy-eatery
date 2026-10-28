import { readFile, stat } from 'node:fs/promises';
import { databasePool, PostgresRepository } from '../apps/server/src/persistence/database.ts';
import { CatalogService } from '../apps/server/src/platform/catalog.ts';

const filename = process.argv[2];
if (!process.env.DATABASE_URL || !process.env.CATALOG_STAFF_TOKEN || !filename) throw new Error('Set DATABASE_URL and CATALOG_STAFF_TOKEN, then run npm run db:import-catalog -- <catalog.json>');
if ((await stat(filename)).size > 128 * 1024) throw new Error('Catalog file must not exceed 128 KiB');
const document: unknown = JSON.parse(await readFile(filename, 'utf8'));
const pool = databasePool(process.env.DATABASE_URL);
try {
  const repository = new PostgresRepository(pool);
  const identity = await repository.authenticate(process.env.CATALOG_STAFF_TOKEN);
  if (!identity) throw new Error('A valid owner credential is required');
  const result = await repository.transaction(identity, 'catalog.replace', state => new CatalogService(state).replace(document));
  console.log(`Catalog version ${result.version} saved for the authenticated branch.`);
} finally { await pool.end(); }
