# Authorization Matrix

Authentication identifies a user; it never selects a tenant or grants a role. An active organization membership plus an unexpired role assignment must match the requested resource scope. Tournament roles are accepted only for resources derived from that tournament, team roles only for that team and its registered tournaments/rosters, and scorekeeper roles only for their assigned game. Organization IDs from the route are always included in database predicates.

| Capability                     | Platform super admin | Organization admin | Tournament manager              | Team manager / coach     | Scorekeeper                 | Fan / anonymous         |
| ------------------------------ | -------------------- | ------------------ | ------------------------------- | ------------------------ | --------------------------- | ----------------------- |
| Cross-tenant operations        | Explicit, audited    | No                 | No                              | No                       | No                          | No                      |
| Organization/access management | All / all            | Own org            | No                              | No                       | No                          | No                      |
| Competition structure          | All                  | Own org            | Assigned tournament             | View assigned/registered | View assigned game          | Published only          |
| Teams/players                  | All                  | Own org            | Assigned tournament             | Assigned team            | View published              | Published only          |
| Roster edit/submit             | All                  | Own org            | Assigned tournament             | Assigned team            | No                          | No                      |
| Roster approve/corrections     | All                  | Own org            | Assigned tournament             | Request only             | No                          | No                      |
| Schedule/game management       | All                  | Own org            | Assigned tournament             | View                     | Assigned game view          | Published only          |
| Commit live score              | All                  | No by default      | No by default                   | No                       | Assigned game + valid lease | No                      |
| Standings override             | All                  | Own org            | Assigned tournament             | No                       | No                          | Published view          |
| Announcements                  | All                  | Own org            | Assigned tournament             | View                     | View                        | Published view          |
| Media                          | All                  | Own org            | Assigned tournament             | Assigned team/purpose    | No                          | Public media only       |
| Audit/export                   | All                  | Own org            | Assigned tournament export only | No                       | No                          | Own privacy export only |
| Favorites/preferences          | Own account          | Own account        | Own account                     | Own account              | Own account                 | Authenticated fan only  |

## System permissions

`organization.manage`, `access.manage`, `tournament.manage`, `team.manage`, `roster.manage`, `roster.approve`, `game.manage`, `game.score`, `standing.manage`, `announcement.manage`, `audit.read`, `export.create`, `media.manage`, and `notification.manage` are composable permission keys. The checked-in system roles map these keys to platform, organization, tournament, team, or game scope. A permission match without a scope match is denied.

Organization administrators intentionally do not inherit `game.score`. Assign a game-scoped scorekeeper role and `GameAssignment` so scoring accountability remains explicit. Platform super-administrator actions use a dedicated guard, require the deliberate target organization context, and write audit records; the flag must not be used for ordinary tenant work.

## Enforcement rules

- Controllers validate UUIDs and inputs before services execute.
- `JwtAuthGuard` requires an active, non-revoked session; `PermissionGuard` resolves current assignments and resource ancestry.
- Team workspaces return only directly authorized teams; an arbitrary `teamId` cannot expand access.
- Role assignment/invitation accepts only known system roles and validates target resources belong to the organization.
- Public services independently require publication and non-archived state; public visibility is not inferred from staff access.
- Sensitive mutations write audit or immutable domain events with actor and correlation ID.

Authorization changes need unit and database integration tests for positive access, unrelated resource denial, inactive membership, expired role, and cross-tenant identifiers.
