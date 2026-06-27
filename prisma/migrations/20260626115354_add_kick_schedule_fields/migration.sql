-- AlterTable
ALTER TABLE "guild_inactive_kick_settings" ADD COLUMN     "last_run_date" TEXT,
ADD COLUMN     "mention_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "run_hour" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo';

-- AlterTable
ALTER TABLE "guild_unverified_kick_settings" ADD COLUMN     "last_run_date" TEXT,
ADD COLUMN     "mention_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "run_hour" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo';
