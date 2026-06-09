// src/bot/shared/createSlashCommand.ts
// 彩加の全スラッシュコマンド共通のベース SlashCommandBuilder を生成するヘルパー

import { ApplicationIntegrationType, SlashCommandBuilder } from "discord.js";

/**
 * 彩加共通のベース SlashCommandBuilder を生成する。
 *
 * 彩加はサーバーへインストールして使う Bot のため、全コマンドの
 * integration_types を GuildInstall に固定する（ユーザーインストールは非対応）。
 * これを明示しないとプロフィールのコマンド一覧へ正しく掲載されない。
 * コマンドを使用できる場所（contexts）はコマンドごとの意味に依存するため、
 * 呼び出し側で `.setContexts()` を明示すること。
 *
 * @returns integration_types を GuildInstall に設定済みの SlashCommandBuilder
 */
export function createSlashCommand(): SlashCommandBuilder {
  return new SlashCommandBuilder().setIntegrationTypes(
    ApplicationIntegrationType.GuildInstall,
  );
}
