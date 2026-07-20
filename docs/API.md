# API

## Conventions

The base path is `/api/v1`. JSON success responses use `{ "success": true, "data": ..., "meta": { "correlationId", "timestamp" } }`. Errors use `{ "success": false, "error": { "code", "message", "details?" }, "meta": ... }`. Send or retain `x-correlation-id` as a UUID for support tracing. Timestamps are ISO 8601 UTC; display conversion belongs to clients.

Bearer access tokens authorize mobile and API requests. The browser keeps refresh credentials in an HTTP-only cookie and sends its CSRF header for cookie-authenticated mutations. Tenant-protected calls include the route `organizationId`; the server does not trust a header to grant tenant access. Optimistic mutations carry `expectedVersion`; safely retried commands carry an idempotency key.

The generated machine-readable specification is `docs/openapi.json`; `/api/v1/docs` is enabled outside production. Zod schemas in each module remain the authoritative runtime validation boundary.

## Endpoint groups

- `auth`: registration, email verification, login/refresh, password reset/change, logout/all, export/deletion request and request status.
- `public`: paginated tournaments/games/leagues/venues/announcements, team/game/tournament details, standings, brackets, and search.
- `me`: access projection, assigned scoring games, favorites, notification preferences, and device registrations.
- `management/organizations/:organizationId`: dashboard; league/season/tournament/division/stage/venue/court/team/player/roster lifecycle; applications; corrections; announcements; CSV exports; audit projections.
- `organizations/:organizationId`: games, scheduling/brackets/standings, scorekeeper assignments, game state, media upload lifecycle, and live scoring.
- `invitations`: scoped invitation issuance/acceptance and role assignment.
- `health`, `ready`, `version`, `metrics`, `operations/queues`: operations surfaces; sensitive operations surfaces require authorization.

## Pagination and filtering

Collection endpoints use bounded `limit` and opaque/record cursors where implemented. Public tournaments accept search/status/historical filters; games accept status/tournament/team/date/venue filters. Clients must not assume a stable total or request unbounded lists. Search requires a meaningful query and returns categorized public results.

## Example: score command

```http
POST /api/v1/organizations/{organizationId}/games/{gameId}/scoring/events
Authorization: Bearer <short-lived-access-token>
X-Scoring-Lease-Token: <opaque-lease-token>
X-Correlation-Id: <uuid>
Content-Type: application/json

{
  "scoringSessionId": "<uuid>",
  "idempotencyKey": "<uuid>",
  "expectedVersion": 14,
  "occurredAt": "2026-07-20T12:34:56.000Z",
  "period": 3,
  "teamId": "<uuid>",
  "type": "ADD_TWO"
}
```

A duplicate key returns the already committed result without a second event. A stale version returns `STALE_GAME_VERSION`; refetch the game and require an operator decision before resubmitting a semantically new command.

## CSV and media

Exports use `text/csv`, UTF-8, quoted fields, and spreadsheet-formula neutralization. Signed media uploads are two-phase: request a tenant/purpose-scoped object key and headers, upload directly, then complete with asset ID and checksum. The server validates creator, scope, media type/size, and resource version before attaching a logo. Private exports use time-limited signed download URLs.

## Compatibility

`x-mobile-app-version` is compared with `MOBILE_MINIMUM_VERSION`; unsupported clients receive HTTP 426. Additive fields are backward compatible. Breaking behavior requires a new API version and a store adoption window. Use `/version` during incident triage.
