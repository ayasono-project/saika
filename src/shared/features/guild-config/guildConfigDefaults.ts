// src/shared/features/guild-config/guildConfigDefaults.ts
// ギルド設定のデフォルト値定義

/** ギルド設定のデフォルトロケール */
export const DEFAULT_GUILD_LOCALE = "ja";

/** エクスポートJSON のスキーマバージョン */
export const EXPORT_SCHEMA_VERSION = 1;

/** エクスポートJSON の構造型 */
export interface GuildConfigExportData {
  version: number;
  exportedAt: string;
  guildId: string;
  config: Record<string, unknown>;
}
