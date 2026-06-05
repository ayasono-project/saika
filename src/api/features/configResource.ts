// src/api/features/configResource.ts
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

/** 非対応の locale 文字列はデフォルトへ丸める */
function normalizeLocale(locale: string): Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale)
    ? (locale as Locale)
    : DEFAULT_LOCALE;
}

/** ドメイン → 契約 */
export function toContractConfig(domain: GuildSettings | null): GuildConfig {
  return {
    locale: domain ? normalizeLocale(domain.locale) : DEFAULT_LOCALE,
    errorChannelId: domain?.errorChannelId ?? null,
  };
}

/** ギルド共通設定リソースを生成する */
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
        // usecase 側で `?? null` によりクリアされるため null も渡せる
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
