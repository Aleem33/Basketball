# Authentication

## Registration and verification

Email is normalized and globally unique. Registration requires a display name, timezone, accepted legal choice at the client, and a strong password. Passwords are hashed with Argon2id. Verification/reset tokens are generated randomly; only hashes are stored, while the value needed for delivery is encrypted inside the transactional outbox payload. Responses to email-recovery requests are intentionally non-enumerating.

## Sessions

Access tokens are short-lived JWTs constrained by issuer, audience, expiry, subject, session, and token type. Refresh tokens are opaque and stored only as hashes. Every refresh rotates the token and increments a session counter. Reuse of an old token revokes its family so a copied token cannot silently coexist.

The browser receives the refresh token in a Secure, HTTP-only, SameSite cookie in production. Cookie refresh/mutations require an allowed origin plus a signed double-submit CSRF token. The access token stays in memory. Mobile receives the opaque refresh token in the response and stores it using `flutter_secure_storage`; access tokens stay in memory. Logging out revokes one session; logout-all and password change revoke all sessions.

## Abuse controls

Auth endpoints have a tighter rate limit than general APIs. Failed logins increment a counter and introduce bounded delay/temporary lockout. Error messages do not distinguish unknown accounts from wrong passwords. Correlation-aware audit events record sensitive success/failure without recording passwords, raw tokens, authorization headers, or CSRF values.

## Password and secret policy

Bootstrap requires at least 16 characters; user schema requires strong mixed-character passwords. Operators should use a password manager and client-approved breached-password/MFA controls before public launch. JWT/CSRF/encryption keys are separate random secrets, rotated under a rehearsed plan. Rotating token encryption requires draining or re-encrypting pending token-bearing outbox events.

## Account privacy controls

Authenticated users can request an export or deletion. Requests are durable, processed by idempotent background jobs, and exposed through a status endpoint. Export JSON is written privately with checksum/expiry and returned only by a signed URL to the same actor. Deletion revokes access immediately and pseudonymizes identity while preserving required audit/scoring integrity.

## Bootstrap

No default administrator exists. The explicit `bootstrap:admin` script requires supplied credentials and organization identity, rejects placeholders, provisions system permission definitions, and audits the action. Run it once from a controlled operator terminal, sign in, rotate the password, revoke unused sessions, and delete the supplied values.
