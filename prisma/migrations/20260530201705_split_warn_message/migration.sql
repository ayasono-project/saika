/*
  Warnings:

  - You are about to drop the column `warn_message` on the `guild_inactive_kick_settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "guild_inactive_kick_settings" DROP COLUMN "warn_message",
ADD COLUMN     "final_warn_message" TEXT,
ADD COLUMN     "week_warn_message" TEXT;
