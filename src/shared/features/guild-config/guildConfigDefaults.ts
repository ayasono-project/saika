// src/shared/features/guild-config/guildConfigDefaults.ts
// ギルド設定のデフォルト値・エクスポート JSON スキーマ定義

import type {
  AfkConfig,
  BumpReminderConfig,
  FullGuildState,
  MemberLogConfig,
  VacConfig,
  VcRecruitConfig,
} from "../../database/types";

/** ギルド設定のデフォルトロケール */
export const DEFAULT_GUILD_LOCALE = "ja";

/** エクスポートJSON のスキーマバージョン */
export const EXPORT_SCHEMA_VERSION = 1;

/** エクスポート JSON の config セクション（設定系） */
export interface GuildConfigExportConfig {
  locale: string;
  errorChannelId?: string;
  afk?: AfkConfig;
  bumpReminder?: BumpReminderConfig;
  vac?: Pick<VacConfig, "enabled" | "triggerChannelIds">;
  memberLog?: MemberLogConfig;
  vcRecruit?: VcRecruitConfig;
}

/** エクスポートJSON の構造型（v1） */
export interface GuildConfigExportData {
  version: number;
  exportedAt: string;
  guildId: string;
  config: GuildConfigExportConfig;
  /** stateful データ。v0 互換のためオプショナル（不在時は空構造として扱う） */
  state?: FullGuildState;
}
