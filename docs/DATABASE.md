# Database

PostgreSQL 16 is authoritative. Prisma defines the application model in `apps/api/prisma/schema.prisma`; ordered SQL migrations in `apps/api/prisma/migrations` are the deployable history. Generated client files are build artifacts and must be regenerated after schema changes.

## Domain model

Identity consists of users/profiles, token records, rotating sessions, organization memberships, roles, permissions, and scoped assignments. Competition consists of leagues, seasons, tournaments, divisions, stages, rule sets, teams, players, rosters/submissions, venues/courts, games/periods, score/state events, standings/snapshots, and bracket links. Operations consists of announcements, correction/team-application requests, media assets, invitations, preferences/devices/deliveries, data requests, scoring leases, outbox events, background jobs, and audit logs.

Every organization-owned table includes or derives an organization foreign key. Globally unique user identity does not confer membership. UUID primary keys, bounded string/text columns, timestamptz values, foreign keys, partial/check constraints, and tenant/query indexes make invalid states harder to represent.

## Lifecycle rules

- Archive/soft delete mutable business records that must remain referentially visible.
- Hard delete ephemeral tokens after expiry where allowed.
- Never mutate/delete audit logs or score events through application workflows; corrections are compensating events.
- Final scores and standings use explicit state transitions and snapshots.
- Account deletion revokes sessions/devices, removes preferences/favorites, pseudonymizes identity, and retains legally/operationally required attribution according to policy.

## Migration procedure

Create migrations against an isolated development database, inspect the SQL, and test from an empty database and a representative restored snapshot. Use expand/backfill/contract for breaking changes. Deploy with `prisma migrate deploy` once per environment before rolling application capacity. Never use `prisma db push` in staging/production and never edit an already deployed migration.

Indexes should match tenant-first access paths; review `EXPLAIN (ANALYZE, BUFFERS)` for high-volume public games, standings, audit, outbox, and notification queries. Monitor connection saturation, slow queries, lock waits, dead tuples, replication lag, disk, and backup freshness.

## Retention and recovery

`DATA_RETENTION_DAYS` is an operational input, not legal advice. The client must approve retention for audit, scoring, privacy exports, notification delivery, logs, and backups. Privacy export objects expire after seven days in application metadata and need a matching object-store lifecycle rule. Use `BACKUP_RESTORE.md` for checksummed dumps and full-system recovery; database backups do not include S3 objects or external provider state.
