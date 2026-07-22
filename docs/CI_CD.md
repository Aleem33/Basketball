# CI/CD

GitHub Actions contains two service validation pipelines, a unified mobile/full-stack pipeline, and a security pipeline.

| Workflow        | Primary checks                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend.yml`   | Frozen install, Prisma generation/validation/migration, formatting, lint, typecheck, unit/integration tests, build, committed OpenAPI drift |
| `admin-web.yml` | Lint, typecheck, coverage, production build, Chromium Playwright workflow                                                                   |
| `flutter.yml`   | Android validation/build, unsigned iOS build on macOS, complete Docker stack readiness, and Android-emulator integration against that stack |
| `security.yml`  | Dependency review, CodeQL, Gitleaks, API image build and Trivy HIGH/CRITICAL gate                                                           |

## Mobile full-stack gate

`flutter.yml` can be started manually with `workflow_dispatch` and also runs for relevant pull requests and pushes to `main`. Its Android and macOS/iOS build jobs run in parallel. The full-stack job starts only after both succeed, builds the complete Compose application, checks the API readiness endpoint and admin frontend, then launches an API 35 Android emulator and runs `integration_test/docker_app_test.dart` against the Docker API through `10.0.2.2`.

Successful runs retain the unsigned Android App Bundle, emulator APK, coverage file, and unsigned iOS application archive for 14 days. Failed full-stack runs retain Compose logs for seven days. All Compose resources and volumes created by the runner are removed in the final cleanup step.

Protect `main` and require all applicable checks, at least one independent review, current branch status, conversation resolution, and signed commits/tags according to client policy. GitHub environments should gate staging and production with designated approvers; workflows in this repository validate and build but intentionally do not invent a hosting target or deploy credentials.

Publish immutable artifacts identified by commit SHA and digest. Generate an SBOM and sign images in the client delivery pipeline. Store signing keys, store API keys, registry credentials, and deployment credentials only in environment-scoped secret storage with least privilege and rotation ownership.

The deployment stage should: verify artifact provenance; back up; run one migration job; deploy canary capacity; run readiness/smoke checks; promote gradually; and automatically stop promotion on error-budget, queue, or database regression. Rollback is an explicit image redeploy decision; schema changes follow the forward-compatible policy in `DEPLOYMENT.md`.

Retain coverage, browser evidence, security SARIF, mobile unsigned artifacts, migration output, approvals, and deployment logs according to client retention policy. Never upload `.env`, signing files, provisioning profiles, database dumps, raw user exports, or access tokens as CI artifacts.
