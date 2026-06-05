-- Wipe existing users and predictions (fresh start for PIN auth)
DELETE FROM "Prediction";
DELETE FROM "User";

-- Add required password hash column
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '';
