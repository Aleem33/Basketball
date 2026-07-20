# Client Handover

## Client-owned inputs

Before launch the client must supply and approve: legal entity/product name, logos/colors/icons/splash assets, production domains and deep links, support/privacy/terms URLs and content, retention/privacy process, bundle/application identifiers, Apple/Google developer accounts, signing ownership, SMTP domain/authentication, push provider credentials, S3/database/Redis hosting, observability/error tracking, on-call contacts, RPO/RTO, and store listing text/screenshots.

Place secrets in the selected secret manager and store consoles, never in this repository. Replace the neutral product label and example identifiers through supported build/deployment configuration. Review accessibility, localization, date/timezone behavior, competition bylaws, and public player privacy with product/legal owners.

## Technical acceptance

- Run all CI workflows from a clean clone and resolve security findings.
- Rehearse deployment, migration, rollback, backup, and restore in staging.
- Bootstrap a staging administrator explicitly; verify role matrices with representative organizer/team/scorekeeper/fan accounts.
- Exercise registration/verification/reset, tournament publishing, team application, roster approval/correction, scheduling, assigned live scoring/concurrency/reconnect, final standings/bracket, media, notifications, CSV export, and account export/deletion.
- Validate Android/iOS release builds on supported physical devices and poor/interrupted networks.
- Confirm monitoring for availability, latency/errors, database/Redis/storage, queue age/failure/dead letters, email/provider failures, auth abuse/reuse, backup freshness, and certificate/domain expiry.

## Operating ownership

Assign named owners for production deploy approval, database migrations, secret/signing rotation, store releases, incident command, privacy/data-subject requests, content moderation/public player visibility, backup restore, dependency patching, and security disclosure. Record vendor account recovery and break-glass procedures outside the repository.

## Handover package

Deliver the reviewed source commit/tag, lockfile, migration/OpenAPI artifacts, image digests/SBOM/signatures, CI results, environment-variable inventory without values, architecture/security/threat review, restore drill evidence, store build numbers, signing custody record, known-risk register, support escalation tree, and all documents in this folder.

The checked-in `noop` notification provider is an honest disabled transport. Production push requires the client-selected FCM/APNs provider implementation and credentials, device-level consent testing, invalid-token cleanup, and store privacy disclosures. Error tracking is also configuration/interface-ready but not activated without a client DSN and privacy approval.
