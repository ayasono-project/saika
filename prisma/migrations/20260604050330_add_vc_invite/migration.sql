-- CreateTable
CREATE TABLE "guild_vc_invite_settings" (
    "guild_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "channel_id" TEXT,
    "message" TEXT,
    "embed_enabled" BOOLEAN NOT NULL DEFAULT true,
    "active_invites" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "guild_vc_invite_settings_pkey" PRIMARY KEY ("guild_id")
);
