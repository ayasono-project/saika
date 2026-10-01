// AFK 設定リソース（ドメイン ↔ 契約のマッピング + 永続化）

import type { AfkSettings as ContractAfkSettings } from "@ayasono/shared/api";
import { getBotAfkSettingsService } from "../../bot/services/botCompositionRoot";
import type { AfkSettings } from "../../shared/database/types";
import type { SettingsResource } from "../routes/settingsResource";

/** ドメイン → 契約 */
export function toContractAfk(domain: AfkSettings): ContractAfkSettings {
  return { enabled: domain.enabled, channelId: domain.channelId ?? null };
}

/** 契約の部分更新を現在のドメイン設定へ適用する */
export function applyAfkPatch(
  current: AfkSettings,
  patch: Partial<ContractAfkSettings>,
): AfkSettings {
  return {
    enabled: patch.enabled ?? current.enabled,
    channelId:
      patch.channelId === undefined
        ? current.channelId
        : (patch.channelId ?? undefined),
  };
}

/** AFK 設定リソースを生成する */
export function createAfkResource(): SettingsResource<ContractAfkSettings> {
  return {
    path: "afk",
    async read(guildId) {
      const svc = getBotAfkSettingsService();
      return toContractAfk(await svc.getAfkSettingsOrDefault(guildId));
    },
    async patch(guildId, body) {
      const svc = getBotAfkSettingsService();
      const next = applyAfkPatch(
        await svc.getAfkSettingsOrDefault(guildId),
        body,
      );
      await svc.saveAfkSettings(guildId, next);
      return toContractAfk(next);
    },
    async reset(guildId) {
      const def: AfkSettings = { enabled: false, channelId: undefined };
      await getBotAfkSettingsService().saveAfkSettings(guildId, def);
      return toContractAfk(def);
    },
  };
}
