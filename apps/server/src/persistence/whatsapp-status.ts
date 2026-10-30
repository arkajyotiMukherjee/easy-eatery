import { AccessError, type Identity, type PostgresRepository } from './database.ts';
import type { DeliveryStatus } from '../integrations/whatsapp.ts';

export class WhatsAppStatuses {
  constructor(readonly repository: PostgresRepository, readonly phoneId: string) {}

  async record(identity: Identity, statuses: DeliveryStatus[]) {
    if (identity.phoneId !== this.phoneId) throw new AccessError(403);
    return this.repository.transaction(identity, 'whatsapp.status.record', async (_state, client) => {
      // Signed provider input is still bounded. Store no recipient or raw payload.
      for (const status of statuses.slice(0, 100)) {
        await client.query(`INSERT INTO whatsapp_status_events
          (tenant_id,branch_id,phone_id,provider_message_id,status,provider_timestamp,error_code)
          VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        [identity.tenantId, identity.branchId, this.phoneId, status.id, status.status, status.timestamp, status.errorCode ?? null]);
      }
    });
  }

  async list(identity: Identity) {
    return this.repository.transaction(identity, 'whatsapp.status.read', async (_state, client) => {
      const result = await client.query(`WITH accepted AS (
        SELECT 'reply' AS source,id,tenant_id,branch_id,phone_id,provider_message_id,state FROM whatsapp_jobs WHERE provider_message_id IS NOT NULL
        UNION ALL
        SELECT 'notification' AS source,id,tenant_id,branch_id,phone_id,provider_message_id,state FROM whatsapp_notifications WHERE provider_message_id IS NOT NULL
      ) SELECT j.source,j.id::text,j.state AS queue_state,
        true AS provider_accepted,
        COALESCE(bool_or(s.status='sent'),false) AS provider_sent,
        COALESCE(bool_or(s.status IN ('delivered','read')),false) AS device_delivered,
        COALESCE(bool_or(s.status='read'),false) AS device_read,
        COALESCE(bool_or(s.status='failed'),false) AS provider_failed,
        CASE WHEN bool_or(s.status='read') THEN 'read'
          WHEN bool_or(s.status='delivered') THEN 'delivered'
          WHEN bool_or(s.status='failed') THEN 'failed'
          WHEN bool_or(s.status='sent') THEN 'sent' ELSE 'unknown' END AS delivery_status,
        max(s.provider_timestamp)::text AS latest_provider_timestamp
        FROM accepted j LEFT JOIN whatsapp_status_events s ON
          s.tenant_id=j.tenant_id AND s.branch_id=j.branch_id AND s.phone_id=j.phone_id
          AND s.provider_message_id=j.provider_message_id
        WHERE j.tenant_id=$1 AND j.branch_id=$2 AND j.provider_message_id IS NOT NULL
        GROUP BY j.source,j.id,j.state ORDER BY j.id DESC,j.source LIMIT 100`, [identity.tenantId, identity.branchId]);
      return { receipts: result.rows, limit: 100 };
    });
  }
}
