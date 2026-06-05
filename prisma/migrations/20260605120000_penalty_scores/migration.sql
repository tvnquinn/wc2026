-- AlterTable
ALTER TABLE "Match" ADD COLUMN "pkHomeScore" INTEGER;
ALTER TABLE "Match" ADD COLUMN "pkAwayScore" INTEGER;

-- AlterTable
ALTER TABLE "Prediction" ADD COLUMN "pkHomeScore" INTEGER;
ALTER TABLE "Prediction" ADD COLUMN "pkAwayScore" INTEGER;
