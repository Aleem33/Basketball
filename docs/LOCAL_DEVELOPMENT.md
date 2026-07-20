# Local Development

## Prerequisites

Install Node.js 22, pnpm 11.9, Docker Compose v2, and Flutter 3.29.3 when working on mobile. On Windows use PowerShell 7. iOS builds require macOS, Xcode, CocoaPods, and an Apple developer account for signing.

## JavaScript workspace

```powershell
corepack enable
corepack prepare pnpm@11.9.0 --activate
pnpm install --frozen-lockfile
pnpm db:generate
```

Copy `.env.example` to `.env` for Compose. For direct API execution, export every variable validated by `apps/api/src/config/environment.ts`; the Compose `api` environment is a reference. Never reuse CI test secrets outside CI.

Start infrastructure with `docker compose up -d postgres redis minio minio-init`, apply migrations with `pnpm db:migrate`, then use `pnpm dev`. Alternatively start the complete stack with `docker compose up --build`.

## Database and tests

Use a dedicated test database. Never point test commands at production or a developer database containing needed data.

```powershell
pnpm db:validate
pnpm --filter @tournament/api test
pnpm --filter @tournament/api test:integration
pnpm --filter @tournament/admin-web test
pnpm --filter @tournament/admin-web test:e2e
```

Integration tests create uniquely named records and require the checked-in migrations. Apply `prisma migrate deploy`; do not use `db push` in shared environments. Regenerate and commit `docs/openapi.json` after route/contract changes with `pnpm --filter @tournament/api openapi:generate`.

## Mobile

From `apps/mobile`, complete deterministic scaffolding on a machine with Flutter, then fetch dependencies:

```powershell
flutter create --platforms=android,ios --org=com.client --project-name=tournament_mobile .
flutter pub get
dart format lib test integration_test
flutter analyze --fatal-infos
flutter test --coverage
flutter run --dart-define=API_URL=http://10.0.2.2:8080/api/v1 --dart-define=WEBSOCKET_URL=http://10.0.2.2:8080/live
```

Use `localhost` rather than `10.0.2.2` for an iOS simulator. Physical devices need a routable HTTPS development host and platform network permissions.

## Safe administrator bootstrap

The bootstrap script requires an email, display name, strong password, organization name, and slug supplied deliberately. It creates/upserts system roles and permissions, creates a new organization membership, and creates the first platform administrator. It refuses pre-existing user/organization identifiers and never runs during API startup. Rotate the bootstrap password after first sign-in and remove the environment values.

## Before opening a pull request

Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`; run the relevant integration, browser, and Flutter suites. Review migrations for tenant keys, indexes, destructive changes, and restore implications. Update the OpenAPI artifact and any affected operating documentation.
