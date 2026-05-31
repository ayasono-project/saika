-- CreateTable
CREATE TABLE "guild_unverified_kick_settings" (
    "guild_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "enabled_at" TIMESTAMP(3),
    "verified_role_id" TEXT,
    "grace_days" INTEGER NOT NULL DEFAULT 7,
    "warn_days" INTEGER,
    "notify_channel_id" TEXT,
    "log_channel_id" TEXT,
    "marker_role_id" TEXT,
    "dm_template" TEXT,
    "exempt_role_ids" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "guild_unverified_kick_settings_pkey" PRIMARY KEY ("guild_id")
);
