-- AlterTable League: jackpot state
ALTER TABLE "League" ADD COLUMN "jackpotBalance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "League" ADD COLUMN "jackpotSeededAt" TIMESTAMP(3);

-- AlterTable User: lifetime jackpot winnings
ALTER TABLE "User" ADD COLUMN "jackpotWinnings" INTEGER NOT NULL DEFAULT 0;
