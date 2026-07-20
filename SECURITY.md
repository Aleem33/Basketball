# Security Policy

## Reporting a vulnerability

Do not open a public issue containing an exploit, credential, personal data, or tenant identifier. The deploying client must replace this section with its monitored security contact and disclosure SLA before launch. Until then, report privately to the repository owner through the approved internal incident channel.

Include affected version/commit, impact, minimal reproduction, correlation IDs with tokens removed, and suggested mitigation. Do not access other users' data, disrupt live games, run denial-of-service tests, or retain data beyond what is necessary to report.

## Security architecture

- Argon2id password hashes; hashed opaque refresh/verification/reset/invitation tokens; short-lived JWT access tokens.
- Refresh rotation with token-family reuse revocation, explicit logout/all, lockout delay, auth rate limiting, secure cookies, origin allowlist, and signed double-submit CSRF.
- Tenant and resource-scoped RBAC with exceptional audited platform administration.
- Zod validation, bounded pagination/uploads, parameterized Prisma access, CSP/Helmet/security headers, correlation-aware structured logs, and stable error envelopes.
- Transactional scoring/idempotency/version locks, append-only event/audit evidence, and a durable outbox/idempotent jobs.
- Tenant-prefixed server-generated S3 keys, signed upload/download expiry, checksum/metadata validation, private-by-default exports, and orphan cleanup.
- CI dependency review, CodeQL, Gitleaks, container scanning, frozen lockfile, and least-privilege workflow tokens.

## Deployment requirements

Run only supported Node/PostgreSQL/Redis/Flutter versions; patch on a defined cadence. Use TLS everywhere, `COOKIE_SECURE=true`, managed secrets, network isolation, encryption at rest, least-privilege database/S3/SMTP/CI identities, centralized redacted logging, monitored backups, WAF/rate limits, and tested incident response. Never expose PostgreSQL, Redis, MinIO administration, metrics, queue operations, or API docs publicly without explicit controls.

Production secrets must be unique, randomly generated, rotated with owners, and absent from source/images/logs. Review every new dependency and migration. Treat raw JWTs, refresh/CSRF/lease tokens, SMTP/storage credentials, signing keys, personal/player data, private exports, dumps, and logs as sensitive.

## Supported versions

Security fixes are provided on the current deployed mainline release unless the client establishes an LTS policy. Store and retain immutable release manifests so affected deployments can be identified quickly. The neutral repository has not been independently penetration-tested or certified; conduct threat modeling, SAST/DAST, dependency/container review, restore drill, and an independent test before public launch.

## Incident priorities

Contain access, preserve audit/evidence, revoke affected sessions/leases/keys, pause scoring or external delivery if integrity is uncertain, assess tenant/privacy scope, notify the designated incident/privacy owners, remediate, restore/reconcile, and write a post-incident review. Never repair scoring by deleting or directly rewriting immutable events.
