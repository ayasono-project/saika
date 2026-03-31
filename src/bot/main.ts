// src/bot/main.ts
// Discord Bot エントリーポイント

import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import { Routes } from "discord.js";
import { resolve } from "path";
import { env } from "../shared/config/env";
import {
  setupGlobalErrorHandlers,
  setupGracefulShutdown,
} from "../shared/errors/errorHandler";
import {
  localeManager,
  logPrefixed,
  tDefault,
} from "../shared/locale/localeManager";
import { logger } from "../shared/utils/logger";
import { setPrismaClient } from "../shared/utils/prisma";
import { createBotClient } from "./client";
import { initializeBotCompositionRoot } from "./services/botCompositionRoot";
import { registerBotEvents } from "./services/botEventRegistration";
import type { Command } from "./types/discord";
import { loadCommands } from "./utils/commandLoader";
import { loadEvents } from "./utils/eventLoader";

// コマンド登録先（ギルド/グローバル）をログ表示で識別するための定数
const COMMAND_REGISTRATION_SCOPE = {
  GUILD: "Guild",
  GLOBAL: "Global",
} as const;

// 起動失敗時に使用するプロセス終了コード定数
const PROCESS_EXIT_CODE = {
  FAILURE: 1,
} as const;

/**
 * 登録されたコマンド名を列挙してログ出力する
 * @param commands 登録したコマンド一覧
 * @param scope 登録スコープ（guild / global）
 */
function logRegisteredCommands(commands: Command[], scope: string): void {
  for (const command of commands) {
    logger.info(
      tDefault("system:bot.commands.command_registered", {
        name: command.data.name,
      }),
    );
  }
  logger.info(
    `${logPrefixed("system:log_prefix.bot", "system:bot.commands.registered")} (${scope})`,
  );
}

/**
 * Bot 起動シーケンスを実行するエントリー関数
 * DB接続、コマンド登録、イベント登録、ログインまでを担当する
 */
async function startBot() {
  // Prisma クライアントを adapter 経由で初期化して接続
  const adapter = new PrismaLibSql({
    url: env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  // Prismaクライアントをモジュール内に登録（イベントハンドラーからアクセス可能にする）
  setPrismaClient(prisma);

  // Bot層の依存解決を初期化（Composition Root）
  initializeBotCompositionRoot(prisma);

  // LocaleManagerを初期化
  await localeManager.initialize();

  logger.info(logPrefixed("system:log_prefix.bot", "system:bot.starting"));

  // Discord クライアント生成（command/cooldown など含む）
  const client = createBotClient();

  // グレースフルシャットダウンを設定
  setupGracefulShutdown(async () => {
    await client.shutdown();
    await prisma.$disconnect();
  });

  try {
    // RESTクライアントにトークンを設定
    client.rest.setToken(env.DISCORD_TOKEN);

    // commands/ ディレクトリから自動スキャンしてコマンドをロード
    // tsup の splitting で chunk ファイルに移動しても正しいパスになるよう
    // import.meta.dirname（= dist/bot/）を基準にパスを渡す
    const commands = await loadCommands(
      resolve(import.meta.dirname, "commands"),
    );
    // events/ ディレクトリから自動スキャンしてイベントをロード
    // tsup の splitting で chunk ファイルに移動しても正しいパスになるよう
    // import.meta.dirname（= dist/bot/）を基準にパスを渡す
    const events = await loadEvents(resolve(import.meta.dirname, "events"));

    // ローカルレジストリへコマンド登録
    logger.info(
      logPrefixed("system:log_prefix.bot", "system:bot.commands.registering", {
        count: commands.length,
      }),
    );

    for (const command of commands) {
      client.commands.set(command.data.name, command);
    }

    // コマンドをDiscord APIに登録
    // 開発中はギルドコマンド（即座に反映）、本番はグローバルコマンド（反映に最大1時間）
    if (env.DISCORD_GUILD_ID) {
      // ギルドコマンドとして登録（開発用）
      await client.rest.put(
        Routes.applicationGuildCommands(
          env.DISCORD_APP_ID,
          env.DISCORD_GUILD_ID,
        ),
        {
          body: commands.map((cmd) => cmd.data.toJSON()),
        },
      );
      logRegisteredCommands(commands, COMMAND_REGISTRATION_SCOPE.GUILD);
    } else {
      // グローバルコマンドとして登録（本番用）
      await client.rest.put(Routes.applicationCommands(env.DISCORD_APP_ID), {
        body: commands.map((cmd) => cmd.data.toJSON()),
      });
      logRegisteredCommands(commands, COMMAND_REGISTRATION_SCOPE.GLOBAL);
    }

    // Discord イベントをクライアントへ登録
    registerBotEvents(client, events);

    // Discord Gateway へログイン
    await client.login(env.DISCORD_TOKEN);
  } catch (error) {
    // 起動途中エラー時は DB 接続を閉じて非0終了
    logger.error(
      logPrefixed("system:log_prefix.bot", "system:bot.startup.error"),
      error,
    );
    await prisma.$disconnect();
    process.exit(PROCESS_EXIT_CODE.FAILURE);
  }
}

// グローバルエラーハンドラーを設定
setupGlobalErrorHandlers();

// 起動
startBot().catch((error) => {
  // 予期しない起動例外の最終防波堤
  logger.error(
    logPrefixed("system:log_prefix.bot", "system:bot.startup.failed"),
    error,
  );
  process.exit(PROCESS_EXIT_CODE.FAILURE);
});
