ALTER TABLE "Invitation" ADD COLUMN "teamId" UUID;
ALTER TABLE "Invitation" ADD COLUMN "gameId" UUID;
ALTER TABLE "DataRequest" ADD COLUMN "resultObjectKey" VARCHAR(512);
ALTER TABLE "DataRequest" ADD COLUMN "resultChecksum" VARCHAR(128);

CREATE INDEX "Invitation_teamId_idx" ON "Invitation"("teamId");
CREATE INDEX "Invitation_gameId_idx" ON "Invitation"("gameId");
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_gameId_fkey"
  FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_scope_valid" CHECK (
  (CASE WHEN "teamId" IS NULL THEN 0 ELSE 1 END)
  + (CASE WHEN "tournamentId" IS NULL THEN 0 ELSE 1 END)
  + (CASE WHEN "gameId" IS NULL THEN 0 ELSE 1 END) <= 1
);
