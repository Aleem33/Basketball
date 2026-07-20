# Deployment

## Required services

Provision PostgreSQL 16, Redis 7 with persistence/auth/TLS, private S3-compatible storage with encryption/versioning/lifecycle rules, SMTP, a secret manager, TLS ingress, DNS, centralized logs/metrics, and backup storage in a separate failure domain. MinIO in Compose is for local development only.

## Configuration

Provide every variable validated by `apps/api/src/config/environment.ts`. High-value settings include `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `CSRF_SECRET`, base64 32-byte `TOKEN_ENCRYPTION_KEY`, trusted/admin/public/websocket URLs, SMTP credentials, S3 credentials/bucket, cookie domain/security, rate limits, minimum mobile version, maintenance mode, and retention days.

Set `NODE_ENV=production`, `COOKIE_SECURE=true`, HTTPS URLs, a restrictive `TRUSTED_ORIGINS` list, and secret-manager references. Use independent random values for JWT, CSRF, encryption, database, Redis, SMTP, and S3 credentials. Do not place them in an image, repository, build log, or `NEXT_PUBLIC_*` value.

The portal requires build-time `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WEBSOCKET_URL`, product name, and primary color. Mobile release builds require API/websocket URLs, legal URLs, support email, app name/version, and deep-link scheme through `--dart-define`.

## Release sequence

1. Create and test database and object-storage backups; record restoration time.
2. Build immutable API, worker, and portal images from a reviewed commit; scan and sign them.
3. Apply `prisma migrate deploy` as a single controlled migration job. Take an expand/migrate/contract approach for breaking schema evolution.
4. Deploy workers, API instances, portal, and ingress. Keep old API capacity until new readiness passes.
5. Check `/api/v1/health`, `/ready`, `/version`, and authenticated critical workflows. Confirm outbox/queue metrics and Socket.IO connection.
6. Increase traffic gradually and watch error rates, latency, database locks/connections, queue age/failures, refresh-token reuse alerts, and object-storage errors.
7. Mark the release and retain provenance, migration output, image digests, and approval evidence.

## Rollback

Application rollback means redeploying the prior immutable images. Database rollback is not automatic: prefer forward-compatible migrations and corrective forward migrations. Restore from backup only for verified data-loss/corruption incidents, with traffic stopped and the destructive restore approved. A rollback must not reintroduce code that cannot read the expanded schema.

## Scaling and hardening

Run at least two API replicas across failure domains, separate worker deployments, connection pooling, conservative queue concurrency, autoscaling based on HTTP/queue signals, and PodDisruptionBudgets or equivalent. Before horizontally scaling live websockets, configure and test a Socket.IO Redis adapter. Configure ingress body limits consistent with `MAX_UPLOAD_BYTES`, HSTS, modern TLS, upstream timeouts, and denial of direct database/Redis/S3 administration ports.

## Production acceptance

Require green CI, an empty secret scan, reviewed dependency/container findings, migration rehearsal, backup restore drill, tenant-isolation and live-scoring concurrency tests, legal/branding inputs, provider credentials, signed mobile artifacts, monitoring alerts, on-call ownership, and a documented rollback decision-maker.
