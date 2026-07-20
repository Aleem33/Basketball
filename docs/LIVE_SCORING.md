# Live Scoring

## Invariants

PostgreSQL is authoritative. Each game has a snapshot (`status`, period, home/away totals, version) and append-only score/state events. A scorekeeper must have an active organization membership, a game-scoped role/assignment, and a live non-final game. Scores cannot become negative, correction events must reference an existing event and include a reason, and finalized games reject ordinary scoring.

## Lease and command flow

1. The client fetches the assigned game and requests a scoring lease with its expected game version.
2. The API verifies assignment and game state, then issues an opaque token whose hash is stored with a short expiry. Heartbeats extend only the matching actor/session lease.
3. Every command includes scoring session ID, UUID idempotency key, expected game version, occurrence time, and the lease token header.
4. The service opens a database transaction, takes a game-scoped advisory/row lock, revalidates tenant/assignment/lease/version, checks for an existing idempotency key, validates basketball constraints, appends an event, updates the snapshot/period, writes audit and outbox entries, and commits.
5. Only after commit does Socket.IO emit `game.updated` to the game room.

Duplicate delivery returns the previously committed command result. Two different commands targeting the same version cannot both succeed. A stale command is never rebased automatically because doing so could change the operator's meaning.

## State transitions

Supported transitions include game/period start, pause/end, overtime, game end, finalization, and controlled reopen. Finalization triggers asynchronous deterministic standings/bracket processing through the outbox. Reopen and manual standings overrides require authorized management paths, reasons, and audit evidence.

## Reconnect and offline behavior

The live screen subscribes to a game room and tracks versions. After transport loss it reconnects, refetches the REST game snapshot, discards events at or below the known version, and renders only a monotonic newer version. The app does not queue scoring commands for unattended offline replay. If acknowledgement is uncertain, it retries only the identical command/idempotency key and then reconciles from the server.

## Redis interruption

Redis is used for queue/realtime coordination and is helpful for lease contention, but the durable database lease and locked/versioned transaction remain mandatory. With Redis unavailable, new realtime delivery/queue work may pause and lease acquisition may degrade; a request cannot bypass assignment, durable lease hash, idempotency, or database version checks. Readiness exposes the degradation so operators can stop live sessions if observability is insufficient.

## Incident recovery

Pause the game, preserve correlation/session/idempotency IDs, inspect the game snapshot and immutable event sequence, verify queue/outbox state, and reconcile period totals. Never edit score-event rows. Use an authorized correction or controlled reopen, record a human-readable reason, then recalculate standings. Escalate suspected concurrent writers or token compromise and revoke the scoring lease/session.
