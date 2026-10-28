import { databasePool, issueStaffToken, migrate, seedBranch, type Role } from '../apps/server/src/persistence/database.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const pool = databasePool(url);
try {
  const command = process.argv[2];
  if (command === 'migrate') {
    await migrate(pool);
    console.log('Database migrations applied.');
  } else if (command === 'seed') {
    const tenantId = process.env.SEED_TENANT_ID ?? 'santiago-demo';
    const branchId = process.env.SEED_BRANCH_ID ?? 'main';
    const provider = process.env.SEED_POS_PROVIDER ?? 'toteat';
    if (provider !== 'toteat' && provider !== 'fudo') throw new Error('SEED_POS_PROVIDER must be toteat or fudo');
    await seedBranch(pool, { tenantId, branchId }, process.env.SEED_RESTAURANT_NAME ?? 'Mesa Sur', provider, process.env.SEED_WHATSAPP_PHONE_ID);
    console.log('Branch and sample catalog seeded. Existing rows were preserved.');
  } else if (command === 'staff') {
    const [tenantId, branchId, role, ...name] = process.argv.slice(3);
    if (!tenantId || !branchId || !['owner', 'operator', 'viewer'].includes(role) || !name.length) throw new Error('Usage: npm run db:staff -- <tenant> <branch> <owner|operator|viewer> <display name>');
    const result = await issueStaffToken(pool, { tenantId, branchId }, name.join(' '), role as Role);
    console.log('Save this scoped staff token securely; only its hash is stored. It expires in 7 days.');
    console.log(JSON.stringify(result));
  } else if (command === 'revoke') {
    const tokenId = process.argv[3];
    if (!tokenId || !/^[\da-f-]{36}$/i.test(tokenId)) throw new Error('Usage: npm run db:revoke -- <token-id>');
    const result = await pool.query('UPDATE access_tokens SET revoked_at=now() WHERE id=$1 AND revoked_at IS NULL', [tokenId]);
    console.log(`Revoked ${result.rowCount} token(s).`);
  } else throw new Error('Unknown database command');
} finally { await pool.end(); }
