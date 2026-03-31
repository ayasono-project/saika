// src/bot/types/discord.ts
// Discord関連の型定義

import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  type Client,
  type ClientEvents,
  Collection,
  SharedSlashCommand,
} from "discord.js";

export interface Command {
  data: SharedSlashCommand;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
  cooldown?: number;
}

export interface BotEvent<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute: (...args: ClientEvents[K]) => Promise<void>;
}

declare module "discord.js" {
  interface Client {
    commands: Collection<string, Command>;
  }
}

/**
 * BotEvent 定義を discord.js Client へ登録する
 * @param emitter イベント登録先クライアント
 * @param event 登録するイベント定義
 * @returns 実行完了
 */
export function registerBotEvent(
  emitter: Client,
  // biome-ignore lint/suspicious/noExplicitAny: イベントの型パラメータは動的
  event: BotEvent<any>,
): void {
  if (event.once) {
    emitter.once(event.name as never, event.execute as never);
  } else {
    emitter.on(event.name as never, event.execute as never);
  }
}
