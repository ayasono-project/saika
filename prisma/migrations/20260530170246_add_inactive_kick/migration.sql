-- CreateTable
CREATE TABLE "guild_inactive_kick_settings" (
    "guild_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "enabled_at" TIMESTAMP(3),
    "channel_id" TEXT,
    "threshold_days" INTEGER NOT NULL DEFAULT 30,
    "warn_message" TEXT,
    "kick_message" TEXT,
    "marker_role_id" TEXT,
    "whitelist_role_ids" JSONB NOT NULL DEFAULT '[]',
    "whitelist_user_ids" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "guild_inactive_kick_settings_pkey" PRIMARY KEY ("guild_id")
);

-- CreateTable
CREATE TABLE "member_activities" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "last_activity_at" TIMESTAMP(3) NOT NULL,
    "warn_stage" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "member_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_activities_guild_id_idx" ON "member_activities"("guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_activities_guild_id_user_id_key" ON "member_activities"("guild_id", "user_id");
