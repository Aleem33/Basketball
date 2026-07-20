# Backup and Restore

## Scope and objectives

A complete recovery set includes PostgreSQL, object-storage objects and version metadata, deployment configuration references, image digests, and the exact application/migration version. Redis is reconstructible for queues/realtime only when durable outbox/database state is intact; do not treat a Redis snapshot as the business-system backup.

Set client-approved RPO/RTO before launch. A reasonable starting exercise is daily encrypted full database backups plus continuous WAL/managed point-in-time recovery, object versioning/replication, 30-day operational retention, and quarterly restore drills; client policy and legal requirements override these examples.

## Create a local/reference backup

Set `POSTGRES_USER`, `POSTGRES_DB`, and `APP_VERSION`, ensure Compose is healthy, then run:

```powershell
./infrastructure/scripts/backup.ps1 -OutputDirectory D:\approved-backups\tournament
```

The script creates a PostgreSQL custom-format dump and SHA-256 manifest. It deliberately does not export MinIO/S3: configure bucket versioning, encryption, lifecycle, cross-region/account replication, and a separately tested inventory/copy procedure. Encrypt backup media and restrict restore/decrypt permissions.

## Restore drill

1. Provision an isolated empty recovery environment with no public traffic.
2. Verify the manifest, file provenance, encryption, application version, and target identity.
3. Set `POSTGRES_USER`/`POSTGRES_DB`; run the destructive script only after approval:

```powershell
./infrastructure/scripts/restore.ps1 -BackupFile D:\approved-backups\tournament\postgres-YYYYMMDD-HHMMSS.dump -ExpectedSha256 '<manifest hash>' -ConfirmRestore
```

4. Restore the matching object-store version/inventory and validate a sample of checksums.
5. Run migrations only if the restored database version is behind the application, start one API/worker, and check readiness.
6. Reconcile tenant counts, users/memberships, tournaments/games, final scores/events, audit chain, pending outbox/jobs, media availability, and privacy export expiry.
7. Run authenticated smoke and tenant-isolation tests, document achieved RPO/RTO, then destroy the drill environment securely.

## Incident restore

Stop writes and workers, preserve forensic evidence, select the last verified recovery point, communicate the data-loss window, and obtain the incident owner's approval. `pg_restore --clean` is destructive. After restore, rotate possibly compromised secrets, invalidate sessions if token state may have diverged, reconcile external emails/notifications/object uploads, and do not reopen traffic until scoring/audit integrity is accepted.
