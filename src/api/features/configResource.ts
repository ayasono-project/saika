// ギルド共通設定（言語・エラー通知チャンネル）リソース

import type { GuildConfig, Locale } from "@ayasono/shared/api";
import type { PrismaClient } from "@prisma/client";
import { getBotGuildSettingsService } from "../../bot/services/botCompositionRoot";
import { getGuildCoreRepository } from "../../features/guild-settings/guildCoreRepository";
import type { GuildSettings } from "../../shared/database/types";
import { localeManager } from "../../shared/locale/localeManager";
import type { SettingsResource } from "../routes/settingsResource";

const SUPPORTED_LOCALES: readonly Locale[] = ["ja", "en"];
const DEFAULT_LOCALE: Locale = "ja";

/**
 * 非対応の locale 文字列はデフォルトへ丸める
 * @param locale DB に保存されている locale
 * @returns 契約で使える locale
 */
function normalizeLocale(locale: string): Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale)
    ? (locale as Locale)
    : DEFAULT_LOCALE;
}

/**
 * ドメインのギルド設定を API 契約の形へ変換する
 * @param domain ギルド設定（未作成時は null）
 * @returns API 契約のギルド共通設定
 */
export function toContractConfig(domain: GuildSettings | null): GuildConfig {
  return {
    locale: domain ? normalizeLocale(domain.locale) : DEFAULT_LOCALE,
    errorChannelId: domain?.errorChannelId ?? null,
  };
}

/**
 * ギルド共通設定リソースを生成する
 * @param prisma Prismaクライアント（コアリポジトリの初期化に使う）
 * @returns GET/PATCH/POST-reset を提供する設定リソース
 */
export function createConfigResource(
  prisma: PrismaClient,
): SettingsResource<GuildConfig> {
  const core = getGuildCoreRepository(prisma);

  return {
    path: "config",
    async read(guildId) {
      return toContractConfig(await core.getSettings(guildId));
    },
    async patch(guildId, body) {
      if (body.locale !== undefined) {
        await core.updateLocale(guildId, body.locale);
        // ロケール変更は即時反映のためキャッシュを無効化（GUILD_SETTINGS_SPEC 準拠）
        localeManager.invalidateLocaleCache(guildId);
      }
      if (body.errorChannelId !== undefined) {
        // null は「設定を消す」としてシリアライザーがそのまま DB へ渡す
        //（IGuildCoreRepository の型は Partial<GuildSettings> なので null を通すためにキャストする）
        const updates: Partial<GuildSettings> = {};
        (updates as { errorChannelId: string | null }).errorChannelId =
          body.errorChannelId;
        await core.updateSettings(guildId, updates);
      }
      return toContractConfig(await core.getSettings(guildId));
    },
    async reset(guildId) {
      await getBotGuildSettingsService().resetGuildSettings(guildId);
      localeManager.invalidateLocaleCache(guildId);
      return { locale: DEFAULT_LOCALE, errorChannelId: null };
    },
  };
}
