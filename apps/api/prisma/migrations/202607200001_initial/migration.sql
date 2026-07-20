-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'LOCKED', 'DELETION_REQUESTED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "public"."MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'LEFT');

-- CreateEnum
CREATE TYPE "public"."ScopeType" AS ENUM ('PLATFORM', 'ORGANIZATION', 'TOURNAMENT', 'TEAM', 'GAME');

-- CreateEnum
CREATE TYPE "public"."TournamentStatus" AS ENUM ('DRAFT', 'REGISTRATION', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."CompetitionFormat" AS ENUM ('MANUAL', 'SINGLE_ROUND_ROBIN', 'DOUBLE_ROUND_ROBIN', 'SINGLE_ELIMINATION', 'GROUPS_THEN_KNOCKOUT');

-- CreateEnum
CREATE TYPE "public"."RosterStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."SubmissionDecision" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "public"."GameStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'LIVE', 'PAUSED', 'FINAL', 'POSTPONED', 'CANCELLED', 'ABANDONED', 'FORFEITED');

-- CreateEnum
CREATE TYPE "public"."GameAssignmentType" AS ENUM ('SCOREKEEPER', 'TOURNAMENT_MANAGER', 'OFFICIAL');

-- CreateEnum
CREATE TYPE "public"."ScoreEventType" AS ENUM ('ADD_ONE', 'ADD_TWO', 'ADD_THREE', 'CORRECTION', 'TIMEOUT', 'NOTE');

-- CreateEnum
CREATE TYPE "public"."StateTransitionType" AS ENUM ('GAME_STARTED', 'PERIOD_STARTED', 'PERIOD_PAUSED', 'PERIOD_ENDED', 'OVERTIME_STARTED', 'GAME_ENDED', 'GAME_FINALIZED', 'GAME_REOPENED', 'STATUS_CHANGED');

-- CreateEnum
CREATE TYPE "public"."TeamMemberRole" AS ENUM ('COACH', 'TEAM_MANAGER', 'ASSISTANT_COACH');

-- CreateEnum
CREATE TYPE "public"."PlayerPosition" AS ENUM ('POINT_GUARD', 'SHOOTING_GUARD', 'SMALL_FORWARD', 'POWER_FORWARD', 'CENTER', 'UTILITY');

-- CreateEnum
CREATE TYPE "public"."Visibility" AS ENUM ('PRIVATE', 'MEMBERS', 'PUBLIC');

-- CreateEnum
CREATE TYPE "public"."RequestStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."MediaStatus" AS ENUM ('PENDING_UPLOAD', 'AVAILABLE', 'REPLACED', 'DELETION_PENDING', 'DELETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('QUEUED', 'ACTIVE', 'SUCCEEDED', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "public"."NotificationChannel" AS ENUM ('EMAIL', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "public"."NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'INVALID_TARGET', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "public"."DevicePlatform" AS ENUM ('ANDROID', 'IOS', 'WEB');

-- CreateEnum
CREATE TYPE "public"."DataRequestType" AS ENUM ('EXPORT', 'DELETION');

-- CreateTable
CREATE TABLE "public"."Organization" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "status" "public"."UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "emailVerifiedAt" TIMESTAMPTZ(6),
    "platformSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lastFailedLoginAt" TIMESTAMPTZ(6),
    "lockedUntil" TIMESTAMPTZ(6),
    "passwordChangedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "displayName" VARCHAR(120) NOT NULL,
    "givenName" VARCHAR(80),
    "familyName" VARCHAR(80),
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
    "locale" VARCHAR(16) NOT NULL DEFAULT 'en',
    "publicPlayerProfile" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "refreshTokenHash" VARCHAR(128) NOT NULL,
    "userAgentHash" VARCHAR(128),
    "ipAddress" INET,
    "rotationCounter" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),
    "revokeReason" VARCHAR(160),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailVerificationToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "usedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PasswordResetToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "usedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrganizationMembership" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "public"."MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "joinedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Role" (
    "id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "scopeType" "public"."ScopeType" NOT NULL,
    "system" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Permission" (
    "id" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RolePermission" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "public"."MembershipRole" (
    "id" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "tournamentId" UUID,
    "teamId" UUID,
    "gameId" UUID,
    "grantedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(6),

    CONSTRAINT "MembershipRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."League" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Season" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "leagueId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "startsAt" TIMESTAMPTZ(6) NOT NULL,
    "endsAt" TIMESTAMPTZ(6) NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tournament" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "leagueId" UUID,
    "seasonId" UUID,
    "name" VARCHAR(180) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "status" "public"."TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "registrationAt" TIMESTAMPTZ(6),
    "registrationEnd" TIMESTAMPTZ(6),
    "startsAt" TIMESTAMPTZ(6) NOT NULL,
    "endsAt" TIMESTAMPTZ(6) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Division" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Division_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CompetitionStage" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "divisionId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "format" "public"."CompetitionFormat" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CompetitionStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CompetitionRuleSet" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "regulationPeriods" INTEGER NOT NULL,
    "periodDurationSeconds" INTEGER NOT NULL,
    "overtimeDurationSeconds" INTEGER NOT NULL,
    "allowDraws" BOOLEAN NOT NULL DEFAULT false,
    "winPoints" INTEGER NOT NULL DEFAULT 2,
    "lossPoints" INTEGER NOT NULL DEFAULT 0,
    "drawPoints" INTEGER NOT NULL DEFAULT 1,
    "forfeitWinPoints" INTEGER NOT NULL DEFAULT 2,
    "forfeitScoreFor" INTEGER NOT NULL DEFAULT 20,
    "forfeitScoreAgainst" INTEGER NOT NULL DEFAULT 0,
    "tieBreakers" JSONB NOT NULL,
    "advancementRules" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CompetitionRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Venue" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "addressLine1" VARCHAR(180) NOT NULL,
    "addressLine2" VARCHAR(180),
    "city" VARCHAR(100) NOT NULL,
    "region" VARCHAR(100),
    "postalCode" VARCHAR(32),
    "countryCode" CHAR(2) NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Court" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "venueId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Court_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Team" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "shortName" VARCHAR(32),
    "description" TEXT,
    "logoAssetId" UUID,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TournamentTeam" (
    "tournamentId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "seed" INTEGER,
    "approvedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentTeam_pkey" PRIMARY KEY ("tournamentId","teamId")
);

-- CreateTable
CREATE TABLE "public"."TeamMembership" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "public"."TeamMemberRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMPTZ(6),

    CONSTRAINT "TeamMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Player" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "givenName" VARCHAR(80) NOT NULL,
    "familyName" VARCHAR(80) NOT NULL,
    "dateOfBirth" DATE,
    "position" "public"."PlayerPosition",
    "defaultJersey" INTEGER,
    "publicVisibility" "public"."Visibility" NOT NULL DEFAULT 'PRIVATE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Roster" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "seasonId" UUID,
    "status" "public"."RosterStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "public"."Visibility" NOT NULL DEFAULT 'PRIVATE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Roster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RosterPlayer" (
    "id" UUID NOT NULL,
    "rosterId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "jerseyNumber" INTEGER NOT NULL,
    "position" "public"."PlayerPosition",
    "captain" BOOLEAN NOT NULL DEFAULT false,
    "addedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RosterPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RosterSubmission" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "rosterId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "decidedById" UUID,
    "decision" "public"."SubmissionDecision" NOT NULL DEFAULT 'SUBMITTED',
    "message" TEXT,
    "submittedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMPTZ(6),

    CONSTRAINT "RosterSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Game" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "divisionId" UUID,
    "stageId" UUID,
    "venueId" UUID,
    "courtId" UUID,
    "homeTeamId" UUID,
    "awayTeamId" UUID,
    "scheduledAt" TIMESTAMPTZ(6) NOT NULL,
    "status" "public"."GameStatus" NOT NULL DEFAULT 'DRAFT',
    "currentPeriod" INTEGER NOT NULL DEFAULT 0,
    "regulationPeriods" INTEGER NOT NULL DEFAULT 4,
    "homeScore" INTEGER NOT NULL DEFAULT 0,
    "awayScore" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "lastEventSequence" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "resultExplanation" JSONB,
    "forfeitWinnerId" UUID,
    "startedAt" TIMESTAMPTZ(6),
    "finalizedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GameAssignment" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "public"."GameAssignmentType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(6),

    CONSTRAINT "GameAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GamePeriod" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "isOvertime" BOOLEAN NOT NULL DEFAULT false,
    "homeScore" INTEGER NOT NULL DEFAULT 0,
    "awayScore" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMPTZ(6),
    "endedAt" TIMESTAMPTZ(6),

    CONSTRAINT "GamePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GameScoreEvent" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "scoringSessionId" UUID NOT NULL,
    "idempotencyKey" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "resultingGameVersion" INTEGER NOT NULL,
    "period" INTEGER NOT NULL,
    "teamId" UUID,
    "type" "public"."ScoreEventType" NOT NULL,
    "pointsDelta" INTEGER NOT NULL DEFAULT 0,
    "correctionOfEventId" UUID,
    "correctionReason" VARCHAR(500),
    "note" TEXT,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameScoreEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GameStateTransition" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "idempotencyKey" UUID NOT NULL,
    "type" "public"."StateTransitionType" NOT NULL,
    "fromStatus" "public"."GameStatus" NOT NULL,
    "toStatus" "public"."GameStatus" NOT NULL,
    "period" INTEGER,
    "reason" VARCHAR(500),
    "resultingGameVersion" INTEGER NOT NULL,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameStateTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Standing" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "played" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "pointsFor" INTEGER NOT NULL DEFAULT 0,
    "pointsAgainst" INTEGER NOT NULL DEFAULT 0,
    "pointDifference" INTEGER NOT NULL DEFAULT 0,
    "standingPoints" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL,
    "tieBreakExplanation" JSONB NOT NULL,
    "manualRankOverride" INTEGER,
    "manualOverrideReason" VARCHAR(500),
    "manualOverrideById" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "calculatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Standing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StandingSnapshot" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "sourceVersion" INTEGER NOT NULL,
    "rows" JSONB NOT NULL,
    "explanation" JSONB NOT NULL,
    "checksum" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StandingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Bracket" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Bracket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BracketRound" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "bracketId" UUID NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "BracketRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BracketMatchLink" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "roundId" UUID NOT NULL,
    "sourceGameId" UUID NOT NULL,
    "targetGameId" UUID,
    "targetSlot" VARCHAR(16),
    "sourceOutcome" VARCHAR(16) NOT NULL,

    CONSTRAINT "BracketMatchLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FavoriteTeam" (
    "userId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteTeam_pkey" PRIMARY KEY ("userId","teamId")
);

-- CreateTable
CREATE TABLE "public"."FavoriteTournament" (
    "userId" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteTournament_pkey" PRIMARY KEY ("userId","tournamentId")
);

-- CreateTable
CREATE TABLE "public"."NotificationPreference" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "scopeKey" VARCHAR(40) NOT NULL DEFAULT 'global',
    "userId" UUID NOT NULL,
    "type" VARCHAR(80) NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "quietHours" JSONB,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
    "consentedAt" TIMESTAMPTZ(6),
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeviceRegistration" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "userId" UUID NOT NULL,
    "platform" "public"."DevicePlatform" NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "encryptedToken" TEXT NOT NULL,
    "deviceLabel" VARCHAR(100),
    "appVersion" VARCHAR(32) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invalidatedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NotificationDelivery" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "userId" UUID NOT NULL,
    "deviceRegistrationId" UUID,
    "deduplicationKey" VARCHAR(180) NOT NULL,
    "notificationType" VARCHAR(80) NOT NULL,
    "channel" "public"."NotificationChannel" NOT NULL,
    "status" "public"."NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMPTZ(6),
    "sentAt" TIMESTAMPTZ(6),
    "lastErrorCode" VARCHAR(80),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Announcement" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "tournamentId" UUID,
    "authorUserId" UUID NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "body" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishAt" TIMESTAMPTZ(6),
    "expiresAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CorrectionRequest" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "requestedById" UUID NOT NULL,
    "resolvedById" UUID,
    "resourceType" VARCHAR(64) NOT NULL,
    "resourceId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "proposedChanges" JSONB,
    "status" "public"."RequestStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "resolvedAt" TIMESTAMPTZ(6),

    CONSTRAINT "CorrectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MediaAsset" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "objectKey" VARCHAR(512) NOT NULL,
    "bucket" VARCHAR(100) NOT NULL,
    "contentType" VARCHAR(100) NOT NULL,
    "expectedBytes" INTEGER NOT NULL,
    "actualBytes" INTEGER,
    "checksum" VARCHAR(128),
    "visibility" "public"."Visibility" NOT NULL DEFAULT 'PRIVATE',
    "status" "public"."MediaStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "uploadedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "actorUserId" UUID,
    "impersonatedUserId" UUID,
    "correlationId" UUID NOT NULL,
    "action" VARCHAR(120) NOT NULL,
    "resourceType" VARCHAR(64) NOT NULL,
    "resourceId" UUID,
    "outcome" VARCHAR(32) NOT NULL,
    "changes" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" INET,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OutboxEvent" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "aggregateType" VARCHAR(80) NOT NULL,
    "aggregateId" UUID NOT NULL,
    "eventType" VARCHAR(120) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "public"."OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMPTZ(6),
    "publishedAt" TIMESTAMPTZ(6),
    "lastError" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BackgroundJobRecord" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "queueName" VARCHAR(80) NOT NULL,
    "jobKey" VARCHAR(180) NOT NULL,
    "jobType" VARCHAR(120) NOT NULL,
    "status" "public"."JobStatus" NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" VARCHAR(1000),
    "startedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "BackgroundJobRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invitation" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "tournamentId" UUID,
    "sentById" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "roleKey" VARCHAR(80) NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(6),
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DataRequest" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "userId" UUID NOT NULL,
    "type" "public"."DataRequestType" NOT NULL,
    "status" "public"."RequestStatus" NOT NULL DEFAULT 'OPEN',
    "requestedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(6),
    "expiresAt" TIMESTAMPTZ(6),
    "resultAssetId" UUID,

    CONSTRAINT "DataRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScoringLease" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "leaseTokenHash" VARCHAR(128) NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "lastHeartbeatAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoringLease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamApplication" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "decidedById" UUID,
    "status" "public"."RequestStatus" NOT NULL DEFAULT 'OPEN',
    "message" TEXT,
    "decisionReason" TEXT,
    "submittedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMPTZ(6),

    CONSTRAINT "TeamApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "public"."Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_archivedAt_idx" ON "public"."Organization"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_status_lockedUntil_idx" ON "public"."User"("status", "lockedUntil");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "public"."User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "public"."UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshTokenHash_key" ON "public"."Session"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_revokedAt_idx" ON "public"."Session"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "Session_familyId_idx" ON "public"."Session"("familyId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "public"."Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "public"."EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_expiresAt_idx" ON "public"."EmailVerificationToken"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "public"."PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "public"."PasswordResetToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "OrganizationMembership_userId_status_idx" ON "public"."OrganizationMembership"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_key" ON "public"."OrganizationMembership"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_key_key" ON "public"."Role"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "public"."Permission"("key");

-- CreateIndex
CREATE INDEX "MembershipRole_membershipId_roleId_idx" ON "public"."MembershipRole"("membershipId", "roleId");

-- CreateIndex
CREATE INDEX "MembershipRole_tournamentId_idx" ON "public"."MembershipRole"("tournamentId");

-- CreateIndex
CREATE INDEX "MembershipRole_teamId_idx" ON "public"."MembershipRole"("teamId");

-- CreateIndex
CREATE INDEX "MembershipRole_gameId_idx" ON "public"."MembershipRole"("gameId");

-- CreateIndex
CREATE INDEX "League_organizationId_published_archivedAt_idx" ON "public"."League"("organizationId", "published", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "League_organizationId_slug_key" ON "public"."League"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "Season_organizationId_startsAt_endsAt_idx" ON "public"."Season"("organizationId", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Season_leagueId_name_key" ON "public"."Season"("leagueId", "name");

-- CreateIndex
CREATE INDEX "Tournament_organizationId_published_status_startsAt_idx" ON "public"."Tournament"("organizationId", "published", "status", "startsAt");

-- CreateIndex
CREATE INDEX "Tournament_archivedAt_idx" ON "public"."Tournament"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_organizationId_slug_key" ON "public"."Tournament"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "Division_organizationId_published_idx" ON "public"."Division"("organizationId", "published");

-- CreateIndex
CREATE UNIQUE INDEX "Division_tournamentId_name_key" ON "public"."Division"("tournamentId", "name");

-- CreateIndex
CREATE INDEX "CompetitionStage_organizationId_published_idx" ON "public"."CompetitionStage"("organizationId", "published");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionStage_divisionId_sequence_key" ON "public"."CompetitionStage"("divisionId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionRuleSet_stageId_key" ON "public"."CompetitionRuleSet"("stageId");

-- CreateIndex
CREATE INDEX "CompetitionRuleSet_organizationId_idx" ON "public"."CompetitionRuleSet"("organizationId");

-- CreateIndex
CREATE INDEX "Venue_organizationId_published_archivedAt_idx" ON "public"."Venue"("organizationId", "published", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_organizationId_name_key" ON "public"."Venue"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Court_organizationId_published_archivedAt_idx" ON "public"."Court"("organizationId", "published", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Court_venueId_name_key" ON "public"."Court"("venueId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Team_logoAssetId_key" ON "public"."Team"("logoAssetId");

-- CreateIndex
CREATE INDEX "Team_organizationId_published_archivedAt_idx" ON "public"."Team"("organizationId", "published", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Team_organizationId_name_key" ON "public"."Team"("organizationId", "name");

-- CreateIndex
CREATE INDEX "TournamentTeam_teamId_idx" ON "public"."TournamentTeam"("teamId");

-- CreateIndex
CREATE INDEX "TeamMembership_organizationId_userId_active_idx" ON "public"."TeamMembership"("organizationId", "userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMembership_teamId_userId_role_key" ON "public"."TeamMembership"("teamId", "userId", "role");

-- CreateIndex
CREATE INDEX "Player_organizationId_teamId_archivedAt_idx" ON "public"."Player"("organizationId", "teamId", "archivedAt");

-- CreateIndex
CREATE INDEX "Roster_organizationId_status_archivedAt_idx" ON "public"."Roster"("organizationId", "status", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Roster_teamId_tournamentId_key" ON "public"."Roster"("teamId", "tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "RosterPlayer_rosterId_playerId_key" ON "public"."RosterPlayer"("rosterId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "RosterPlayer_rosterId_jerseyNumber_key" ON "public"."RosterPlayer"("rosterId", "jerseyNumber");

-- CreateIndex
CREATE INDEX "RosterSubmission_organizationId_decision_submittedAt_idx" ON "public"."RosterSubmission"("organizationId", "decision", "submittedAt");

-- CreateIndex
CREATE INDEX "Game_organizationId_status_scheduledAt_idx" ON "public"."Game"("organizationId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Game_tournamentId_published_scheduledAt_idx" ON "public"."Game"("tournamentId", "published", "scheduledAt");

-- CreateIndex
CREATE INDEX "Game_homeTeamId_scheduledAt_idx" ON "public"."Game"("homeTeamId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Game_awayTeamId_scheduledAt_idx" ON "public"."Game"("awayTeamId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Game_deletedAt_idx" ON "public"."Game"("deletedAt");

-- CreateIndex
CREATE INDEX "GameAssignment_organizationId_userId_active_idx" ON "public"."GameAssignment"("organizationId", "userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "GameAssignment_gameId_userId_type_key" ON "public"."GameAssignment"("gameId", "userId", "type");

-- CreateIndex
CREATE INDEX "GamePeriod_organizationId_gameId_idx" ON "public"."GamePeriod"("organizationId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "GamePeriod_gameId_periodNumber_key" ON "public"."GamePeriod"("gameId", "periodNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GameScoreEvent_correctionOfEventId_key" ON "public"."GameScoreEvent"("correctionOfEventId");

-- CreateIndex
CREATE INDEX "GameScoreEvent_organizationId_gameId_createdAt_idx" ON "public"."GameScoreEvent"("organizationId", "gameId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameScoreEvent_gameId_idempotencyKey_key" ON "public"."GameScoreEvent"("gameId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "GameScoreEvent_gameId_sequence_key" ON "public"."GameScoreEvent"("gameId", "sequence");

-- CreateIndex
CREATE INDEX "GameStateTransition_organizationId_gameId_occurredAt_idx" ON "public"."GameStateTransition"("organizationId", "gameId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameStateTransition_gameId_idempotencyKey_key" ON "public"."GameStateTransition"("gameId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Standing_organizationId_stageId_rank_idx" ON "public"."Standing"("organizationId", "stageId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "Standing_stageId_teamId_key" ON "public"."Standing"("stageId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Standing_stageId_rank_key" ON "public"."Standing"("stageId", "rank");

-- CreateIndex
CREATE INDEX "StandingSnapshot_organizationId_createdAt_idx" ON "public"."StandingSnapshot"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StandingSnapshot_stageId_sourceVersion_key" ON "public"."StandingSnapshot"("stageId", "sourceVersion");

-- CreateIndex
CREATE INDEX "Bracket_organizationId_published_idx" ON "public"."Bracket"("organizationId", "published");

-- CreateIndex
CREATE UNIQUE INDEX "Bracket_stageId_name_key" ON "public"."Bracket"("stageId", "name");

-- CreateIndex
CREATE INDEX "BracketRound_organizationId_idx" ON "public"."BracketRound"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "BracketRound_bracketId_roundNumber_key" ON "public"."BracketRound"("bracketId", "roundNumber");

-- CreateIndex
CREATE INDEX "BracketMatchLink_organizationId_roundId_idx" ON "public"."BracketMatchLink"("organizationId", "roundId");

-- CreateIndex
CREATE UNIQUE INDEX "BracketMatchLink_sourceGameId_sourceOutcome_key" ON "public"."BracketMatchLink"("sourceGameId", "sourceOutcome");

-- CreateIndex
CREATE INDEX "NotificationPreference_organizationId_type_idx" ON "public"."NotificationPreference"("organizationId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_scopeKey_type_key" ON "public"."NotificationPreference"("userId", "scopeKey", "type");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceRegistration_tokenHash_key" ON "public"."DeviceRegistration"("tokenHash");

-- CreateIndex
CREATE INDEX "DeviceRegistration_userId_active_idx" ON "public"."DeviceRegistration"("userId", "active");

-- CreateIndex
CREATE INDEX "DeviceRegistration_organizationId_active_idx" ON "public"."DeviceRegistration"("organizationId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDelivery_deduplicationKey_key" ON "public"."NotificationDelivery"("deduplicationKey");

-- CreateIndex
CREATE INDEX "NotificationDelivery_organizationId_status_nextAttemptAt_idx" ON "public"."NotificationDelivery"("organizationId", "status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_userId_createdAt_idx" ON "public"."NotificationDelivery"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Announcement_organizationId_published_publishAt_idx" ON "public"."Announcement"("organizationId", "published", "publishAt");

-- CreateIndex
CREATE INDEX "Announcement_tournamentId_published_idx" ON "public"."Announcement"("tournamentId", "published");

-- CreateIndex
CREATE INDEX "CorrectionRequest_organizationId_status_createdAt_idx" ON "public"."CorrectionRequest"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "CorrectionRequest_resourceType_resourceId_idx" ON "public"."CorrectionRequest"("resourceType", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_objectKey_key" ON "public"."MediaAsset"("objectKey");

-- CreateIndex
CREATE INDEX "MediaAsset_organizationId_status_createdAt_idx" ON "public"."MediaAsset"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "public"."AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "public"."AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "public"."AuditLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_correlationId_idx" ON "public"."AuditLog"("correlationId");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_availableAt_idx" ON "public"."OutboxEvent"("status", "availableAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_organizationId_aggregateType_aggregateId_idx" ON "public"."OutboxEvent"("organizationId", "aggregateType", "aggregateId");

-- CreateIndex
CREATE UNIQUE INDEX "BackgroundJobRecord_jobKey_key" ON "public"."BackgroundJobRecord"("jobKey");

-- CreateIndex
CREATE INDEX "BackgroundJobRecord_queueName_status_createdAt_idx" ON "public"."BackgroundJobRecord"("queueName", "status", "createdAt");

-- CreateIndex
CREATE INDEX "BackgroundJobRecord_organizationId_status_idx" ON "public"."BackgroundJobRecord"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "public"."Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_organizationId_email_expiresAt_idx" ON "public"."Invitation"("organizationId", "email", "expiresAt");

-- CreateIndex
CREATE INDEX "DataRequest_userId_status_requestedAt_idx" ON "public"."DataRequest"("userId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "DataRequest_organizationId_type_status_idx" ON "public"."DataRequest"("organizationId", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringLease_sessionId_key" ON "public"."ScoringLease"("sessionId");

-- CreateIndex
CREATE INDEX "ScoringLease_gameId_expiresAt_revokedAt_idx" ON "public"."ScoringLease"("gameId", "expiresAt", "revokedAt");

-- CreateIndex
CREATE INDEX "ScoringLease_organizationId_userId_idx" ON "public"."ScoringLease"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "TeamApplication_organizationId_status_submittedAt_idx" ON "public"."TeamApplication"("organizationId", "status", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TeamApplication_tournamentId_teamId_key" ON "public"."TeamApplication"("tournamentId", "teamId");

-- AddForeignKey
ALTER TABLE "public"."UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MembershipRole" ADD CONSTRAINT "MembershipRole_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "public"."OrganizationMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MembershipRole" ADD CONSTRAINT "MembershipRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MembershipRole" ADD CONSTRAINT "MembershipRole_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "public"."Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MembershipRole" ADD CONSTRAINT "MembershipRole_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MembershipRole" ADD CONSTRAINT "MembershipRole_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."League" ADD CONSTRAINT "League_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Season" ADD CONSTRAINT "Season_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Season" ADD CONSTRAINT "Season_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "public"."League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tournament" ADD CONSTRAINT "Tournament_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tournament" ADD CONSTRAINT "Tournament_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "public"."League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tournament" ADD CONSTRAINT "Tournament_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "public"."Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Division" ADD CONSTRAINT "Division_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Division" ADD CONSTRAINT "Division_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "public"."Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompetitionStage" ADD CONSTRAINT "CompetitionStage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompetitionStage" ADD CONSTRAINT "CompetitionStage_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "public"."Division"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompetitionRuleSet" ADD CONSTRAINT "CompetitionRuleSet_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompetitionRuleSet" ADD CONSTRAINT "CompetitionRuleSet_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "public"."CompetitionStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Venue" ADD CONSTRAINT "Venue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Court" ADD CONSTRAINT "Court_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Court" ADD CONSTRAINT "Court_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "public"."Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Team" ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Team" ADD CONSTRAINT "Team_logoAssetId_fkey" FOREIGN KEY ("logoAssetId") REFERENCES "public"."MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TournamentTeam" ADD CONSTRAINT "TournamentTeam_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "public"."Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TournamentTeam" ADD CONSTRAINT "TournamentTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamMembership" ADD CONSTRAINT "TeamMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamMembership" ADD CONSTRAINT "TeamMembership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamMembership" ADD CONSTRAINT "TeamMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Player" ADD CONSTRAINT "Player_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Roster" ADD CONSTRAINT "Roster_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Roster" ADD CONSTRAINT "Roster_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Roster" ADD CONSTRAINT "Roster_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "public"."Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Roster" ADD CONSTRAINT "Roster_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "public"."Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RosterPlayer" ADD CONSTRAINT "RosterPlayer_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "public"."Roster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RosterPlayer" ADD CONSTRAINT "RosterPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RosterSubmission" ADD CONSTRAINT "RosterSubmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RosterSubmission" ADD CONSTRAINT "RosterSubmission_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "public"."Roster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RosterSubmission" ADD CONSTRAINT "RosterSubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RosterSubmission" ADD CONSTRAINT "RosterSubmission_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Game" ADD CONSTRAINT "Game_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Game" ADD CONSTRAINT "Game_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "public"."Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Game" ADD CONSTRAINT "Game_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "public"."Division"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Game" ADD CONSTRAINT "Game_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "public"."CompetitionStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Game" ADD CONSTRAINT "Game_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "public"."Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Game" ADD CONSTRAINT "Game_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "public"."Court"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Game" ADD CONSTRAINT "Game_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "public"."Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Game" ADD CONSTRAINT "Game_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "public"."Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameAssignment" ADD CONSTRAINT "GameAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameAssignment" ADD CONSTRAINT "GameAssignment_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameAssignment" ADD CONSTRAINT "GameAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GamePeriod" ADD CONSTRAINT "GamePeriod_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GamePeriod" ADD CONSTRAINT "GamePeriod_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameScoreEvent" ADD CONSTRAINT "GameScoreEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameScoreEvent" ADD CONSTRAINT "GameScoreEvent_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameScoreEvent" ADD CONSTRAINT "GameScoreEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameScoreEvent" ADD CONSTRAINT "GameScoreEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameScoreEvent" ADD CONSTRAINT "GameScoreEvent_correctionOfEventId_fkey" FOREIGN KEY ("correctionOfEventId") REFERENCES "public"."GameScoreEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameStateTransition" ADD CONSTRAINT "GameStateTransition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameStateTransition" ADD CONSTRAINT "GameStateTransition_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GameStateTransition" ADD CONSTRAINT "GameStateTransition_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Standing" ADD CONSTRAINT "Standing_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Standing" ADD CONSTRAINT "Standing_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "public"."CompetitionStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Standing" ADD CONSTRAINT "Standing_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Standing" ADD CONSTRAINT "Standing_manualOverrideById_fkey" FOREIGN KEY ("manualOverrideById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StandingSnapshot" ADD CONSTRAINT "StandingSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StandingSnapshot" ADD CONSTRAINT "StandingSnapshot_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "public"."CompetitionStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bracket" ADD CONSTRAINT "Bracket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bracket" ADD CONSTRAINT "Bracket_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "public"."CompetitionStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BracketRound" ADD CONSTRAINT "BracketRound_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BracketRound" ADD CONSTRAINT "BracketRound_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "public"."Bracket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BracketMatchLink" ADD CONSTRAINT "BracketMatchLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BracketMatchLink" ADD CONSTRAINT "BracketMatchLink_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "public"."BracketRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BracketMatchLink" ADD CONSTRAINT "BracketMatchLink_sourceGameId_fkey" FOREIGN KEY ("sourceGameId") REFERENCES "public"."Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BracketMatchLink" ADD CONSTRAINT "BracketMatchLink_targetGameId_fkey" FOREIGN KEY ("targetGameId") REFERENCES "public"."Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FavoriteTeam" ADD CONSTRAINT "FavoriteTeam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FavoriteTeam" ADD CONSTRAINT "FavoriteTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FavoriteTournament" ADD CONSTRAINT "FavoriteTournament_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FavoriteTournament" ADD CONSTRAINT "FavoriteTournament_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "public"."Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationPreference" ADD CONSTRAINT "NotificationPreference_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeviceRegistration" ADD CONSTRAINT "DeviceRegistration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeviceRegistration" ADD CONSTRAINT "DeviceRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_deviceRegistrationId_fkey" FOREIGN KEY ("deviceRegistrationId") REFERENCES "public"."DeviceRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Announcement" ADD CONSTRAINT "Announcement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Announcement" ADD CONSTRAINT "Announcement_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "public"."Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Announcement" ADD CONSTRAINT "Announcement_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CorrectionRequest" ADD CONSTRAINT "CorrectionRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CorrectionRequest" ADD CONSTRAINT "CorrectionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CorrectionRequest" ADD CONSTRAINT "CorrectionRequest_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MediaAsset" ADD CONSTRAINT "MediaAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MediaAsset" ADD CONSTRAINT "MediaAsset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_impersonatedUserId_fkey" FOREIGN KEY ("impersonatedUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OutboxEvent" ADD CONSTRAINT "OutboxEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BackgroundJobRecord" ADD CONSTRAINT "BackgroundJobRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invitation" ADD CONSTRAINT "Invitation_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "public"."Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invitation" ADD CONSTRAINT "Invitation_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DataRequest" ADD CONSTRAINT "DataRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DataRequest" ADD CONSTRAINT "DataRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScoringLease" ADD CONSTRAINT "ScoringLease_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScoringLease" ADD CONSTRAINT "ScoringLease_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScoringLease" ADD CONSTRAINT "ScoringLease_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamApplication" ADD CONSTRAINT "TeamApplication_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamApplication" ADD CONSTRAINT "TeamApplication_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "public"."Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamApplication" ADD CONSTRAINT "TeamApplication_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamApplication" ADD CONSTRAINT "TeamApplication_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamApplication" ADD CONSTRAINT "TeamApplication_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
