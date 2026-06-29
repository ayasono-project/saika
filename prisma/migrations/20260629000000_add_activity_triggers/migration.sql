-- AlterTable
ALTER TABLE "guild_inactive_kick_settings"
  ADD COLUMN "track_message"  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "track_voice"    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "track_reaction" BOOLEAN NOT NULL DEFAULT true;
