# Assumptions

## Product and tenancy

- The initial deployment may contain one organization, but all organization-owned rows and application services are tenant-scoped from day one.
- Public data is available only when both the parent competition and resource are published and not archived/deleted.
- Platform super administrators are exceptional operators. Cross-tenant activity requires an explicit organization context and produces an audit entry.
- Users may hold multiple roles through organization, tournament, team, and game assignments. The narrowest resource scope wins; a role name alone never grants access to an unrelated resource.
- Records with regulatory, scoring, financial, or audit value are archived or soft-deleted. Immutable audit and score-event records are never user-deleted.

## Basketball rules

- A default rule set is application-level configuration offered when an organizer creates a competition; it is not inserted as production seed data.
- Regulation periods, period duration, overtime duration, standings points, and tie-break order are stored per rule set.
- A final or forfeited authoritative result is the only input to standings. Abandoned games count only when an organizer supplies an authoritative result under the selected rules.
- Manual ranking overrides require a reason, author, and audit record and are applied after deterministic tie-break calculations.
- Bracket advancement writes explicit match links so bracket reconstruction does not depend on display labels.

## Identity and security

- Email addresses are globally unique after case normalization. A single identity can join multiple organizations.
- Access tokens are short-lived bearer JWTs for mobile/API clients. Browser refresh tokens are opaque values held in secure, HTTP-only cookies; mobile refresh tokens are returned only to the authenticated device and must be kept in OS secure storage.
- Only hashes of refresh, verification, reset, and invitation tokens are persisted.
- CSRF protection uses a signed double-submit token for cookie-authenticated mutations in addition to same-site cookies and an origin allowlist.
- The first platform administrator is created only through a deliberate bootstrap CLI invocation with an email and password supplied through environment variables or command arguments.

## Integrations

- PostgreSQL 16, Redis 7, and an S3-compatible service are deployment dependencies. MinIO is local-development infrastructure only.
- SMTP is the default email transport. A console transport is permitted only in the test environment and must never print raw authentication tokens in production logs.
- Notification delivery is provider-independent. FCM and APNs adapters are deployment options requiring client-owned credentials; no Firebase application dependency is introduced.
- Object keys are server generated and tenant-prefixed. Clients never choose arbitrary storage keys.

## Branding and legal content

- The neutral default product label is `Tournament Platform`; it is configuration, not an invented client brand.
- Privacy policy, terms, support email, organization logo, colors, domains, bundle identifiers, and store listings are client-provided deployment configuration.
- The software provides privacy and security foundations but makes no assertion of legal or compliance certification.

## Tooling

- The repository is initially empty, so the requested technology stack is authoritative.
- pnpm workspaces are used for JavaScript/TypeScript packages; Node.js 22 is the pinned runtime.
- Flutter is pinned in CI. Native Flutter platform folders are checked in as source configuration even though Flutter is unavailable on this machine.
- Local absence of Docker, PostgreSQL, Redis, Flutter, Dart, and Apple tooling is not treated as feature removal; CI owns those validation paths.
