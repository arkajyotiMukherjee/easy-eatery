# Security, Privacy & Chile Compliance Checklist

**Not legal advice.** Have Chilean counsel/accountant review actual data flows, controller/processor roles, contracts, tax treatment and marketing consent before production. This document turns known risk areas into engineering requirements.

## 1. Chile-specific timing

Chile Law 21.719 reforms the personal-data protection framework and establishes a Personal Data Protection Agency. The official consolidated-law source states its entry into force is **December 1, 2026**: <https://www.bcn.cl/leychile/Navegar?idNorma=1209272&idVersion=2026-12-01>. Since development and onboarding may overlap this date, design to the upcoming regime before first launch rather than retrofit later. Validate the law's final current text and implementing interpretation with Chilean counsel.

## 2. Data inventory and purposes

Maintain a table/record of:
- data category, purpose, source and lawful basis/consent as applicable;
- controller/processor roles and subprocessors;
- where data is hosted and transferred;
- retention period and deletion/archive behavior;
- customer rights workflow;
- whether data is required operationally or optional marketing data.

Separate order fulfilment, transactional notifications, loyalty program operation, analytics and marketing purposes. Never make marketing consent a precondition for buying food or requesting a catering quote unless local legal advice confirms a necessary basis.

## 3. Consent and suppression

- Consent is a first-class append-only record: purpose, channel, status, text/notice version, capture source/time, evidence and withdrawal time.
- Marketing consent defaults to false unless legal/product validation establishes an appropriate basis.
- Unsubscribe/opt-out applies immediately to unsent scheduled messages and all future campaigns for that purpose/channel.
- Do not let CRM segment membership override suppression.
- Store proof of consent/withdrawal in a minimal auditable record.

## 4. Data minimization

- Anonymous POS transactions are valid financial/aggregate events; don't create fake customer records.
- Customer identity linking must use verified/explicit signals, not name-only fuzzy match.
- Avoid storing complete WhatsApp text forever; configure retention and allow operational access only when needed.
- Do not store cardholder data or sensitive payment details.
- Loyalty barcode contains an opaque token, not phone/email/balance.
- Logs never include API secrets, access tokens, full message bodies by default, or unnecessary PII.

## 5. Customer rights and lifecycle

Build admin workflow for access/export, correction, deletion/erasure where applicable, restriction/withdrawal, and request audit. Deleting a customer profile must not silently delete legally required financial/transaction records; separate identity from financial record and pseudonymize/anonymize where legally appropriate. Establish tenant support SLA and escalation process with counsel.

## 6. Security controls

- TLS for all endpoints, encryption at rest through cloud provider, least-privilege service identities.
- Secrets in Secret Manager, not `.env` in repository; local dev `.env.example` contains placeholders only.
- Separate production and staging service accounts/secrets/projects.
- Role and tenant/branch checks on every API; automated cross-tenant isolation tests.
- Secure sessions, MFA for owners if supported by auth solution, rate limits and account lockout protection.
- Webhook signatures/authentication where provider supports it; replay/deduplication defenses.
- Immutable audit of role changes, integration credential changes, manual loyalty adjustment, refunds, exports and campaign approvals.
- Dependency and container scanning; regular backups and restore tests.
- Incident response runbook: isolate credentials, revoke/rotate, preserve audit evidence, assess notification duties with legal counsel.

## 7. Chile operational/commercial checks

- Determine whether platform or restaurant is controller for each flow and document processor terms.
- Review cross-border transfer rules and subprocessor contracts even if primary database is in Santiago; provider systems may process data elsewhere.
- Review WhatsApp/Meta terms and consent/opt-out requirements.
- Review Google Wallet issuer/program requirements.
- Verify SII electronic receipt/invoice requirements. Do not imply that Webpay/Mercado Pago payment confirmation emits a compliant boleta/factura; fiscal documents need a separate confirmed integration or manual process.
- Review consumer-facing pricing/cancellation/refund rules and restaurant-to-customer quote terms.
- Get written permission for POS data use and external integration from restaurant owner/provider.

## 8. Security acceptance checklist

- No secret in client bundle or logs.
- Cross-tenant queries fail closed in automated tests.
- Opt-out stops the next campaign worker before send.
- Data export and deletion request can be tracked to completion.
- Backups encrypted and a restore test recorded.
- Production error payloads do not reveal internal stack traces or provider credentials.
- Privacy notice and contracts are reviewed and versioned before public launch.
