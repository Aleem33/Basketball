# Competition Rules

Rules are explicit per competition stage and versioned. The system does not silently assume a production league's bylaws. Organizers configure regulation/overtime duration, draw allowance, standings points, forfeit score/points, tie-break order, and advancement rules before publishing fixtures.

## Scheduling

Single and double round-robin generation uses a deterministic circle algorithm. A bye is introduced for an odd number of teams, no team appears twice in a round, home/away ordering is balanced deterministically, and reruns use stable matchup keys to avoid duplicate fixtures. Manual format leaves fixture construction to an authorized organizer. Venues/courts and timestamps remain explicit scheduling inputs; timezone conversion occurs at display boundaries.

Single-elimination brackets use explicit rounds and source/winner/loser links. Byes and non-power-of-two sizes are represented in the bracket graph, not inferred from labels. Groups-then-knockout combines independent stage rule sets and explicit advancement configuration.

## Standings

Only authoritative `FINAL` or `FORFEITED` results contribute. The calculator derives played/won/lost/drawn, points for/against/difference, and standings points from the stored rule set. Default tie-break candidates are configurable and may include standings points, head-to-head, point difference, points for, wins, and a stable final ordering.

Tie-break evaluation records an explanation/snapshot so a displayed ranking can be reproduced. Mini-league/head-to-head evaluation uses only eligible tied teams. If all configured criteria remain equal, the final deterministic key prevents non-repeatable order; it is not represented as a sporting advantage.

## Exceptional outcomes

- Forfeit: use configured forfeit score and points, preserving the reason and actor.
- Postponed/cancelled: excluded until rescheduled/finalized; notify affected followers.
- Abandoned: excluded unless an organizer supplies an authoritative outcome allowed by the competition rules.
- Draw: rejected when `allowDraws=false`; start overtime instead.
- Correction/reopen: never rewrite the event history; append correction/state evidence, then regenerate derived standings/bracket state.

Manual ranking overrides require `standing.manage`, an explicit reason, author, timestamp, and audit record. They are visually/operationally exceptional and should be reconciled against published competition bylaws before use.
