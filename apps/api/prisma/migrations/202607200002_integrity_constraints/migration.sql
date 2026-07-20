-- Domain constraints that Prisma cannot express directly.
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_dates_valid" CHECK ("endsAt" > "startsAt");
ALTER TABLE "Season" ADD CONSTRAINT "Season_dates_valid" CHECK ("endsAt" > "startsAt");
ALTER TABLE "CompetitionRuleSet" ADD CONSTRAINT "CompetitionRuleSet_periods_valid" CHECK (
  "regulationPeriods" > 0 AND "periodDurationSeconds" > 0 AND "overtimeDurationSeconds" > 0
  AND "winPoints" >= 0 AND "lossPoints" >= 0 AND "drawPoints" >= 0
  AND "forfeitScoreFor" >= 0 AND "forfeitScoreAgainst" >= 0
);
ALTER TABLE "Player" ADD CONSTRAINT "Player_defaultJersey_valid" CHECK ("defaultJersey" IS NULL OR "defaultJersey" BETWEEN 0 AND 99);
ALTER TABLE "RosterPlayer" ADD CONSTRAINT "RosterPlayer_jerseyNumber_valid" CHECK ("jerseyNumber" BETWEEN 0 AND 99);
ALTER TABLE "Game" ADD CONSTRAINT "Game_scores_nonnegative" CHECK ("homeScore" >= 0 AND "awayScore" >= 0);
ALTER TABLE "Game" ADD CONSTRAINT "Game_period_version_valid" CHECK (
  "currentPeriod" >= 0 AND "regulationPeriods" > 0 AND "version" >= 0 AND "lastEventSequence" >= 0
);
ALTER TABLE "Game" ADD CONSTRAINT "Game_distinct_teams" CHECK (
  "homeTeamId" IS NULL OR "awayTeamId" IS NULL OR "homeTeamId" <> "awayTeamId"
);
ALTER TABLE "Game" ADD CONSTRAINT "Game_forfeit_winner_participates" CHECK (
  "forfeitWinnerId" IS NULL OR "forfeitWinnerId" = "homeTeamId" OR "forfeitWinnerId" = "awayTeamId"
);
ALTER TABLE "GamePeriod" ADD CONSTRAINT "GamePeriod_values_valid" CHECK (
  "periodNumber" > 0 AND "homeScore" >= 0 AND "awayScore" >= 0
);
ALTER TABLE "GameScoreEvent" ADD CONSTRAINT "GameScoreEvent_sequence_valid" CHECK (
  "sequence" > 0 AND "resultingGameVersion" > 0 AND "period" > 0
);
ALTER TABLE "GameScoreEvent" ADD CONSTRAINT "GameScoreEvent_correction_valid" CHECK (
  ("type" = 'CORRECTION' AND "correctionOfEventId" IS NOT NULL AND "pointsDelta" < 0 AND "correctionReason" IS NOT NULL)
  OR ("type" <> 'CORRECTION' AND "correctionOfEventId" IS NULL AND "pointsDelta" >= 0)
);
ALTER TABLE "Standing" ADD CONSTRAINT "Standing_values_nonnegative" CHECK (
  "played" >= 0 AND "wins" >= 0 AND "losses" >= 0 AND "draws" >= 0
  AND "pointsFor" >= 0 AND "pointsAgainst" >= 0 AND "standingPoints" >= 0 AND "rank" > 0
);
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_sizes_valid" CHECK (
  "expectedBytes" > 0 AND ("actualBytes" IS NULL OR "actualBytes" >= 0)
);
ALTER TABLE "Session" ADD CONSTRAINT "Session_expiry_valid" CHECK ("expiresAt" > "createdAt" AND "rotationCounter" >= 0);
ALTER TABLE "ScoringLease" ADD CONSTRAINT "ScoringLease_expiry_valid" CHECK ("expiresAt" > "createdAt");

-- An expired lease is revoked during acquisition before a replacement is inserted.
CREATE UNIQUE INDEX "ScoringLease_one_active_per_game" ON "ScoringLease"("gameId") WHERE "revokedAt" IS NULL;

-- Security and scoring evidence is append-only at the database boundary.
CREATE OR REPLACE FUNCTION reject_immutable_record_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'immutable record cannot be changed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditLog_immutable"
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();

CREATE TRIGGER "GameScoreEvent_immutable"
  BEFORE UPDATE OR DELETE ON "GameScoreEvent"
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();

CREATE TRIGGER "GameStateTransition_immutable"
  BEFORE UPDATE OR DELETE ON "GameStateTransition"
  FOR EACH ROW EXECUTE FUNCTION reject_immutable_record_change();
