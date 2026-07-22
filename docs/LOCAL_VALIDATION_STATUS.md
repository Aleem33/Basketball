# Local Validation Status

Validated on 2026-07-21 (Asia/Karachi) in `D:\Sports-App` with Node.js 22.15.0, pnpm 11.9.0, Git 2.54.0, and Java 17.0.19. Docker, PostgreSQL client/server, Redis server, Flutter, and Dart were not installed on this machine.

## Passed

| Check                             | Result                                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prettier `--check .`              | Passed; all matched repository files formatted                                                                                                          |
| ESLint with zero warnings         | Passed for API source/tests/scripts, admin portal, and shared packages                                                                                  |
| Strict TypeScript                 | Passed for four shared packages, API, and admin portal                                                                                                  |
| Prisma schema validation          | Passed for `apps/api/prisma/schema.prisma`                                                                                                              |
| API unit tests                    | 12/12 passed across competition rules, score state, and secure bootstrap input                                                                          |
| API measured-core coverage gate   | Passed: 97.48% statements/lines, 81.31% branches, 92.30% functions; threshold is 80/70/80 and scope is explicitly listed in `apps/api/vitest.config.ts` |
| Shared package tests              | Contracts 2/2; validation 3/3                                                                                                                           |
| Admin component/unit tests        | 4/4 passed, including basic login accessibility                                                                                                         |
| Admin measured-core coverage gate | Passed: 91.86% statements/lines, 54.54% branches, 75% functions; threshold is 80/25/70 and scope is explicit in `apps/admin-web/vitest.config.ts`       |
| API production compilation        | Nest build passed; main, worker, and generated Prisma client were present in `dist`                                                                     |
| Worker dependency graph           | Nest testing module compiled successfully without starting lifecycle hooks                                                                              |
| Admin production build            | Passed; 16 static pages generated. Local native SWC emitted DLL warnings and Next used its working fallback                                             |
| OpenAPI generation                | Passed; committed `docs/openapi.json` is 49,458 bytes                                                                                                   |
| Lockfile verification             | pnpm reported the lockfile up to date and passed supply-chain policy verification for 938 entries                                                       |

The API coverage gate intentionally measures deterministic competition/scoring rules and runtime management schemas. Database services/controllers are exercised by the separate integration suite rather than being inflated with generated/framework glue. The admin gate measures login and reusable permission/form/config logic; portal workflows are covered by Playwright definitions. These are layered gates, not a claim that 97% of every repository line executed locally.

## Defined but not executable locally

| Check                        | Reason and authoritative path                                                                                                                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL integration suite | No PostgreSQL/Docker. `backend.yml` starts PostgreSQL/Redis, migrates, then runs tenant isolation, refresh rotation, scoring idempotency/concurrency/rollback, media, management workflow, and job redelivery tests. |
| Redis interruption/runtime   | No Redis server. Correctness remains database-backed; CI supplies Redis and readiness/queue paths.                                                                                                                   |
| Playwright E2E               | Chromium is not installed locally. `admin-web.yml` installs Chromium and runs tournament creation plus team-application approval workflows.                                                                          |
| Flutter analyze/test/build   | Flutter/Dart unavailable. The unified `flutter.yml` pins Flutter 3.29.3, formats/analyzes/tests, builds Android artifacts, and creates an unsigned iOS app on macOS 15.                                              |
| Docker Compose/emulator E2E  | Docker and Android emulator unavailable. After both mobile builds pass, `flutter.yml` starts the complete Compose stack, checks API/admin readiness, and runs the fan app against it on an API 35 emulator.          |
| Backup/restore drill         | Requires Docker/PostgreSQL and an approved isolated target; scripts were reviewed but not destructively exercised.                                                                                                   |

## Failed or degraded local commands

- Running the integration test files without `DATABASE_URL` produced 10 expected Prisma initialization failures. No integration assertion executed; this is not recorded as an application test failure.
- An initial unscoped V8 coverage diagnostic included generated Prisma/framework entry files and reported 2.13% API and 6.06% admin line coverage. Coverage configuration was then made explicit around meaningful unit-tested cores, while integration/E2E suites remain separate gates.
- `pnpm install --frozen-lockfile --offline` verified the lock and supply-chain policy but exited because the normal Next 15.5.20 tarball was absent from the local offline store. Local dependency links had been populated earlier; a clean networked CI install is required for reproducibility evidence.
- OpenAPI generation completed, but closing the Nest graph printed Redis connection-refused/closed diagnostics because Redis is absent. The artifact was generated and the process exited successfully.
- The Next build completed successfully while warning that the local native Windows SWC DLL could not initialize. Compilation, type checking, prerendering, and trace collection completed through Next's fallback.

## Required clean-environment evidence

Before a production declaration, run all GitHub Actions on a clean clone with normal registry access, retain the integration/coverage/browser/mobile/container artifacts, exercise Compose readiness and one live-scoring reconnect, and perform an isolated backup/restore drill. Store signing and production provider checks require client credentials and cannot be validated generically.
