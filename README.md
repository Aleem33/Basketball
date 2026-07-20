# Basketball Tournament Platform

A production-conscious, multi-tenant basketball tournament platform. The repository contains a NestJS API and BullMQ worker, an accessible Next.js administration portal, a Flutter public/fan app, shared contracts, PostgreSQL/Prisma persistence, Redis/Socket.IO realtime coordination, S3-compatible media storage, containers, CI, and operating documentation.

The project intentionally contains no production demo tenants, users, teams, or tournaments. The first administrator is created only by the explicit bootstrap command described below.

## Repository map

- `apps/api`: REST API, Socket.IO gateway, worker, Prisma schema/migrations, bootstrap and OpenAPI scripts.
- `apps/admin-web`: role-aware organizer, team, roster, scoring, request, export, and audit portal.
- `apps/mobile`: Flutter Android/iOS public browsing and authenticated fan application.
- `packages`: shared API contracts, types, validation, and configuration.
- `infrastructure`: Dockerfiles, Nginx, and backup/restore scripts.
- `docs`: architecture, API, security, release, operational, and handover material.

## Quick start with Docker

Requirements: Docker Engine with Compose v2 and PowerShell 7 for the supplied operational scripts.

1. Copy `.env.example` to `.env` and replace every `CHANGE_ME` value. Also set `JWT_ACCESS_SECRET`, `CSRF_SECRET`, `TOKEN_ENCRYPTION_KEY`, and the SMTP values referenced by `docker-compose.yml`.
2. Generate independent random secrets. `TOKEN_ENCRYPTION_KEY` must be a base64-encoded 32-byte key.
3. Run `docker compose build` and `docker compose up -d`.
4. Check `http://localhost:8080/api/v1/ready` and open `http://localhost:8080`.
5. Create the first administrator explicitly:

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL='owner@example.com'
$env:BOOTSTRAP_ADMIN_PASSWORD='<a unique password of at least 16 characters>'
$env:BOOTSTRAP_ADMIN_DISPLAY_NAME='Platform owner'
$env:BOOTSTRAP_ORGANIZATION_NAME='Client organization'
$env:BOOTSTRAP_ORGANIZATION_SLUG='client-organization'
pnpm bootstrap:admin
```

The one-time command refuses placeholder credentials and pre-existing email/organization identifiers, creates the initial organization membership, and records the bootstrap in the audit log. Never include bootstrap values in a committed file or shell history used for shared automation.

## Local toolchain

- Node.js 22 and pnpm 11.9
- PostgreSQL 16, Redis 7, and S3-compatible object storage
- Flutter 3.29.3 for the mobile client
- Docker Compose for the integrated environment

Install JavaScript dependencies with `pnpm install --frozen-lockfile`. Common checks are `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`. Database integration tests require `DATABASE_URL` and a migrated isolated test database.

See [Local development](docs/LOCAL_DEVELOPMENT.md), [Deployment](docs/DEPLOYMENT.md), [Security](SECURITY.md), and [Completion report](docs/COMPLETION_REPORT.md) before operating the system.

## Production boundaries

- PostgreSQL is authoritative. Redis interruption can reduce realtime/queue availability but cannot authorize or commit a score.
- Browser refresh credentials are secure HTTP-only cookies protected by origin checks and a signed double-submit CSRF token. Mobile refresh credentials belong in OS secure storage.
- Every organization-owned service query is scoped by organization and, where applicable, tournament/team/game assignment.
- Public endpoints return only published, non-archived data.
- Email uses SMTP. Push delivery is an explicit provider interface; the checked-in `noop` selection reports delivery as disabled and does not pretend to send.
- MinIO and non-TLS cookies in Compose are local-development choices, not a public production topology.

## Documentation index

- [Architecture](docs/ARCHITECTURE.md) · [API](docs/API.md) · [Database](docs/DATABASE.md)
- [Authentication](docs/AUTHENTICATION.md) · [Authorization matrix](docs/AUTHORIZATION_MATRIX.md)
- [Live scoring](docs/LIVE_SCORING.md) · [Competition rules](docs/COMPETITION_RULES.md)
- [CI/CD](docs/CI_CD.md) · [Backup/restore](docs/BACKUP_RESTORE.md)
- [Client handover](docs/CLIENT_HANDOVER.md) · [Android release](docs/GOOGLE_PLAY_RELEASE.md) · [iOS release](docs/APP_STORE_RELEASE.md)
- [Local validation](docs/LOCAL_VALIDATION_STATUS.md) · [Security policy](SECURITY.md)
