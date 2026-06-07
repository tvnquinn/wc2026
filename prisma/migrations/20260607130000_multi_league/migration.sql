-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "adminPasswordHash" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "useGlobalResults" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueResultOverride" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "homeScore" INTEGER NOT NULL,
    "awayScore" INTEGER NOT NULL,
    "pkHomeScore" INTEGER,
    "pkAwayScore" INTEGER,
    "isFinished" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LeagueResultOverride_pkey" PRIMARY KEY ("id")
);

-- Default league for existing data
INSERT INTO "League" ("id", "slug", "name", "adminPasswordHash", "isPublic", "useGlobalResults")
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'sleepwell',
    'Sleepwell Family Pool',
    'pending-migration-set-on-first-boot',
    true,
    true
);

-- AlterTable Match: add matchNum
ALTER TABLE "Match" ADD COLUMN "matchNum" TEXT;

-- AlterTable User: add leagueId
ALTER TABLE "User" ADD COLUMN "leagueId" TEXT;
UPDATE "User" SET "leagueId" = '00000000-0000-0000-0000-000000000001' WHERE "leagueId" IS NULL;
ALTER TABLE "User" ALTER COLUMN "leagueId" SET NOT NULL;

-- DropIndex
DROP INDEX IF EXISTS "User_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "League_slug_key" ON "League"("slug");
CREATE UNIQUE INDEX "Match_matchNum_key" ON "Match"("matchNum");
CREATE UNIQUE INDEX "User_leagueId_name_key" ON "User"("leagueId", "name");
CREATE UNIQUE INDEX "LeagueResultOverride_leagueId_matchId_key" ON "LeagueResultOverride"("leagueId", "matchId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeagueResultOverride" ADD CONSTRAINT "LeagueResultOverride_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeagueResultOverride" ADD CONSTRAINT "LeagueResultOverride_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
