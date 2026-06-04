-- AlterTable
ALTER TABLE "guild_vc_invite_settings" ADD COLUMN     "enabled_category_ids" JSONB NOT NULL DEFAULT '[]';
