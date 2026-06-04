// src/shared/features/guild-settings/guildSettingsDefaults.ts
// ギルド設定のデフォルト値・エクスポート JSON スキーマ定義

import type {
  AfkSettings,
  BumpReminderSettings,
  FullGuildState,
  InactiveKickSettings,
  MemberLogSettings,
  UnverifiedKickSettings,
  VacSettings,
  VcAutoRecruitSettings,
  VcRecruitSettings,
} from "../../shared/database/types";

/** ギルド設定のデフォルトロケール */
export const DEFAULT_GUILD_LOCALE = "ja";

/** エクスポートJSON のスキーマバージョン */
export const EXPORT_SCHEMA_VERSION = 1;

/** エクスポート JSON の settings セクション（設定系） */
export interface GuildSettingsExportSettings {
  locale: string;
  errorChannelId?: string;
  afk?: AfkSettings;
  bumpReminder?: BumpReminderSettings;
  vac?: Pick<VacSettings, "enabled" | "triggerChannelIds">;
  memberLog?: MemberLogSettings;
  vcRecruit?: VcRecruitSettings;
  vcAutoRecruit?: VcAutoRecruitSettings;
  inactiveKick?: InactiveKickSettings;
  unverifiedKick?: UnverifiedKickSettings;
}

/** エクスポートJSON の構造型（v1） */
export interface GuildSettingsExportData {
  version: number;
  exportedAt: string;
  guildId: string;
  settings: GuildSettingsExportSettings;
  /** stateful データ。v0 互換のためオプショナル（不在時は空構造として扱う） */
  state?: FullGuildState;
}
