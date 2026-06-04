// src/api/types.ts
// API 層で共有する型定義

import type { PrismaClient } from "@prisma/client";
import type { BotClient } from "../bot/client";

/**
 * API サーバー構築時に注入する依存。
 * Bot と同一プロセスで起動するため、discord.js クライアントと Prisma を共有する。
 */
export interface ApiServerDeps {
  /** Discord クライアント（ギルド/チャンネル/ロール等のライブ参照に使用） */
  client: BotClient;
  /** Prisma クライアント（設定データ層） */
  prisma: PrismaClient;
}
