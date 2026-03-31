// src/bot/handlers/interactionCreate/ui/types.ts
// UI interaction ハンドラ型定義

import type {
  ButtonInteraction,
  ModalSubmitInteraction,
  RoleSelectMenuInteraction,
  StringSelectMenuInteraction,
  UserSelectMenuInteraction,
} from "discord.js";

/**
 * customId ベースの UI ハンドラ共通型
 *
 * `matches` で対象判定し、`execute` で処理を実行する。
 * ボタン・モーダル・各種セレクトメニューで共有する汎用インターフェース。
 */
export interface InteractionHandler<T> {
  /**
   * customId がこのハンドラの対象かを判定する
   * @param customId 対象 interaction の customId
   * @returns 対象の場合 true
   */
  matches: (customId: string) => boolean;
  /**
   * 対象 interaction の処理本体
   * @param interaction 対象インタラクション
   */
  execute: (interaction: T) => Promise<void>;
}

/** ボタンインタラクションハンドラ */
export type ButtonHandler = InteractionHandler<ButtonInteraction>;
/** モーダル送信インタラクションハンドラ */
export type ModalHandler = InteractionHandler<ModalSubmitInteraction>;
/** ユーザーセレクトメニューハンドラ */
export type UserSelectHandler = InteractionHandler<UserSelectMenuInteraction>;
/** 文字列セレクトメニューハンドラ */
export type StringSelectHandler =
  InteractionHandler<StringSelectMenuInteraction>;
/** ロールセレクトメニューハンドラ */
export type RoleSelectHandler = InteractionHandler<RoleSelectMenuInteraction>;
