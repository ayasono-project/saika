-- CreateTable
CREATE TABLE "guild_unverified_kick_warns" (
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "warned_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guild_unverified_kick_warns_pkey" PRIMARY KEY ("guild_id","user_id")
);

-- CreateIndex
CREATE INDEX "guild_unverified_kick_warns_guild_id_idx" ON "guild_unverified_kick_warns"("guild_id");
