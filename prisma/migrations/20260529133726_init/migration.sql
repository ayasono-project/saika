-- CreateTable
CREATE TABLE "guild_settings" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ja',
    "error_channel_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guild_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bump_reminders" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT,
    "panelMessageId" TEXT,
    "serviceName" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bump_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild_afk_settings" (
    "guild_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "channel_id" TEXT,

    CONSTRAINT "guild_afk_settings_pkey" PRIMARY KEY ("guild_id")
);

-- CreateTable
CREATE TABLE "guild_bump_reminder_settings" (
    "guild_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "channel_id" TEXT,
    "mention_role_id" TEXT,
    "mention_user_ids" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "guild_bump_reminder_settings_pkey" PRIMARY KEY ("guild_id")
);

-- CreateTable
CREATE TABLE "guild_vac_settings" (
    "guild_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "trigger_channel_ids" JSONB NOT NULL DEFAULT '[]',
    "created_channels" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "guild_vac_settings_pkey" PRIMARY KEY ("guild_id")
);

-- CreateTable
CREATE TABLE "guild_member_log_settings" (
    "guild_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "channel_id" TEXT,
    "join_message" TEXT,
    "leave_message" TEXT,

    CONSTRAINT "guild_member_log_settings_pkey" PRIMARY KEY ("guild_id")
);

-- CreateTable
CREATE TABLE "guild_vc_recruit_settings" (
    "guild_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "mention_role_ids" JSONB NOT NULL DEFAULT '[]',
    "setups" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "guild_vc_recruit_settings_pkey" PRIMARY KEY ("guild_id")
);

-- CreateTable
CREATE TABLE "sticky_messages" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embed_data" JSONB,
    "updated_by" TEXT,
    "last_message_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sticky_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild_ticket_settings" (
    "guild_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "staff_role_ids" JSONB NOT NULL DEFAULT '[]',
    "panel_channel_id" TEXT NOT NULL,
    "panel_message_id" TEXT NOT NULL,
    "panel_title" TEXT NOT NULL DEFAULT 'サポート',
    "panel_description" TEXT NOT NULL DEFAULT 'サポートが必要な場合は下のボタンからチケットを作成してください。',
    "panel_color" TEXT NOT NULL DEFAULT '#00A8F3',
    "auto_delete_days" INTEGER NOT NULL DEFAULT 7,
    "max_tickets_per_user" INTEGER NOT NULL DEFAULT 1,
    "ticket_counter" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "guild_ticket_settings_pkey" PRIMARY KEY ("guild_id","category_id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ticket_number" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "elapsed_delete_ms" INTEGER NOT NULL DEFAULT 0,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild_reaction_role_panels" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'toggle',
    "title" TEXT NOT NULL DEFAULT 'ロール選択',
    "description" TEXT NOT NULL DEFAULT 'ボタンを押してロールを取得・解除できます。',
    "color" TEXT NOT NULL DEFAULT '#00A8F3',
    "buttons" JSONB NOT NULL DEFAULT '[]',
    "button_counter" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guild_reaction_role_panels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guild_settings_guildId_key" ON "guild_settings"("guildId");

-- CreateIndex
CREATE INDEX "bump_reminders_guildId_idx" ON "bump_reminders"("guildId");

-- CreateIndex
CREATE INDEX "bump_reminders_status_scheduledAt_idx" ON "bump_reminders"("status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "sticky_messages_channel_id_key" ON "sticky_messages"("channel_id");

-- CreateIndex
CREATE INDEX "sticky_messages_guild_id_idx" ON "sticky_messages"("guild_id");

-- CreateIndex
CREATE INDEX "guild_ticket_settings_guild_id_idx" ON "guild_ticket_settings"("guild_id");

-- CreateIndex
CREATE INDEX "tickets_guild_id_idx" ON "tickets"("guild_id");

-- CreateIndex
CREATE INDEX "tickets_category_id_idx" ON "tickets"("category_id");

-- CreateIndex
CREATE INDEX "tickets_channel_id_idx" ON "tickets"("channel_id");

-- CreateIndex
CREATE INDEX "tickets_guild_id_category_id_user_id_status_idx" ON "tickets"("guild_id", "category_id", "user_id", "status");

-- CreateIndex
CREATE INDEX "guild_reaction_role_panels_guild_id_idx" ON "guild_reaction_role_panels"("guild_id");
