import { AccessError, type Identity, type PostgresRepository } from './database.ts';

const conflict = () => Object.assign(new Error('Delivery state changed or operation is not allowed.'), { statusCode: 409 });

// Deliberately exclude sender, message/response text, phone and provider identifiers.
// A resolution records staff review; it never asserts provider/device delivery.
export class WhatsAppRecovery {
  constructor(readonly repository: PostgresRepository) {}

  async list(identity: Identity) {
    return this.repository.transaction(identity, 'whatsapp.recovery.read', async (_state, client) => {
      const result = await client.query(`SELECT id::text,state,recovery_version AS version,attempts,error_code,created_at,available_at,completed_at
        FROM whatsapp_jobs WHERE tenant_id=$1 AND branch_id=$2 AND state IN ('failed','needs_attention')
        ORDER BY id LIMIT 100`, [identity.tenantId, identity.branchId]);
      return { jobs: result.rows, limit: 100 };
    });
  }

  async retry(identity: Identity, id: string, expectedVersion: number) {
    if (!identity.tokenId) throw new AccessError(403);
    return this.repository.transaction(identity, `whatsapp.recovery.retry:${id}`, async (_state, client) => {
      const result = await client.query(`UPDATE whatsapp_jobs SET
        state=CASE WHEN response IS NULL THEN 'pending' ELSE 'reply_pending' END,
        recovery_version=recovery_version+1,attempts=0,error_code=NULL,available_at=now(),lease_until=NULL,claim_id=NULL,completed_at=NULL
        WHERE id=$1 AND tenant_id=$2 AND branch_id=$3 AND state='failed' AND recovery_version=$4
        RETURNING id::text,state,recovery_version AS version`, [id, identity.tenantId, identity.branchId, expectedVersion]);
      if (!result.rowCount) throw conflict();
      return result.rows[0];
    });
  }

  async resolve(identity: Identity, id: string, expectedVersion: number) {
    if (!identity.tokenId) throw new AccessError(403);
    return this.repository.transaction(identity, `whatsapp.recovery.resolve:${id}`, async (_state, client) => {
      const result = await client.query(`UPDATE whatsapp_jobs SET state='resolved',recovery_version=recovery_version+1,completed_at=now(),lease_until=NULL,claim_id=NULL
        WHERE id=$1 AND tenant_id=$2 AND branch_id=$3 AND state='needs_attention' AND recovery_version=$4
        RETURNING id::text,state,recovery_version AS version`, [id, identity.tenantId, identity.branchId, expectedVersion]);
      if (!result.rowCount) throw conflict();
      return { ...result.rows[0], deliveryConfirmed: false, resent: false };
    });
  }
}
