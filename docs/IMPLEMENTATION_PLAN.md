# Implementation Plan

## Objective

Build a production-conscious, tenant-aware basketball tournament platform as a pnpm monorepo with a NestJS API and worker, a Next.js administration portal, a Flutter mobile client, PostgreSQL/Prisma persistence, Redis/BullMQ coordination, Socket.IO realtime updates, S3-compatible media storage, automated tests, containers, CI workflows, and operating documentation.

## Phases

1. Establish the workspace, strict shared TypeScript configuration, contracts, validation, linting, formatting, and environment conventions.
2. Model the normalized PostgreSQL domain in Prisma, check in an explicit SQL migration, and provide an administrator bootstrap command that requires supplied credentials.
3. Implement authentication, rotating refresh sessions, email verification, password reset, account controls, audit records, tenant scoping, and resource-level permissions.
4. Implement organizations, competitions, venues, teams, rosters, games, announcements, correction requests, media metadata, public discovery, pagination, filtering, and publishing controls.
5. Implement deterministic scheduling, standings explanations, bracket generation/progression, and authoritative final-result processing.
6. Implement transactional, idempotent live scoring with optimistic concurrency, assignment checks, scoring leases, correction events, an outbox, Socket.IO recovery, and Redis-degraded correctness.
7. Implement BullMQ workers, provider-independent email/notification/storage adapters, signed uploads, retry/dead-letter visibility, and operational endpoints.
8. Implement the accessible role-aware Next.js portal and the Flutter public/fan application with honest loading, empty, error, offline, authentication, favorite, and live-score states.
9. Add unit, integration, authorization, concurrency, component, widget, navigation, and end-to-end tests without production seed data.
10. Add production-conscious Dockerfiles, Compose services, Nginx, backup/restore scripts, GitHub Actions for all toolchains and security checks, and complete operating/security/handover documentation.
11. Run every validation supported by installed local tools, record exact results, and create the completion report with limitations and external requirements.

## Engineering Gates

- TypeScript and Dart code use strict analysis and explicit boundary DTOs.
- Every organization-owned query is tenant-scoped; elevated cross-tenant access is explicit and audited.
- PostgreSQL remains the source of truth. Redis loss may degrade delivery or leases but cannot corrupt committed scoring state.
- Production startup never creates demo records or implicit administrators.
- Sensitive mutations are authorized, validated, audited, and idempotent where retries are expected.
- Required external configuration fails fast in production and examples contain non-usable placeholders.
- Documentation and completion claims match commands actually executed.

## Local Validation Strategy

Node-based formatting, linting, type checking, unit tests, and builds will be run locally after dependency installation. Database/Redis integration suites, container validation, and Flutter Android/iOS builds will be defined in GitHub Actions because Docker, PostgreSQL, Redis, Flutter, and Dart are not installed locally. The exact outcomes will be maintained in `docs/LOCAL_VALIDATION_STATUS.md` and `docs/COMPLETION_REPORT.md`.
