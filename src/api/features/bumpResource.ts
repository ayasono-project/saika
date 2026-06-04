// src/api/features/bumpResource.ts
// Bump リマインダー設定リソース

import type { BumpSettings as ContractBumpSettings } from "@ayasono/shared/api";
import { getBotBumpReminderSettingsService } from "../../bot/services/botCompositionRoot";
import type { BumpReminderSettings } from "../../shared/database/types";
import type { SettingsResource } from "../routes/settingsResource";

/** 全チャンネル検知を表す契約上のセンチネル */
const ALL_CHANNELS = "all";

/** ドメイン → 契約（channelId 未設定は "all"） */
export function toContractBump(
  domain: BumpReminderSettings,
): ContractBumpSettings {
  return {
    enabled: domain.enabled,
    channelId: domain.channelId ?? ALL_CHANNELS,
    mentionRoleId: domain.mentionRoleId ?? null,
    mentionUserIds: domain.mentionUserIds,
  };
}

/** 契約の部分更新を現在のドメイン設定へ適用する */
export function applyBumpPatch(
  current: BumpReminderSettings,
  patch: Partial<ContractBumpSettings>,
): BumpReminderSettings {
  const channelId =
    patch.channelId === undefined
      ? current.channelId
      : patch.channelId === ALL_CHANNELS
        ? undefined
        : patch.channelId;
  return {
    enabled: patch.enabled ?? current.enabled,
    channelId,
    mentionRoleId:
      patch.mentionRoleId === undefined
        ? current.mentionRoleId
        : (patch.mentionRoleId ?? undefined),
    mentionUserIds: patch.mentionUserIds ?? current.mentionUserIds,
  };
}

/** Bump リマインダー設定リソースを生成する */
export function createBumpResource(): SettingsResource<ContractBumpSettings> {
  return {
    path: "bump-reminder",
    async read(guildId) {
      const svc = getBotBumpReminderSettingsService();
      return toContractBump(
        await svc.getBumpReminderSettingsOrDefault(guildId),
      );
    },
    async patch(guildId, body) {
      const svc = getBotBumpReminderSettingsService();
      const next = applyBumpPatch(
        await svc.getBumpReminderSettingsOrDefault(guildId),
        body,
      );
      await svc.saveBumpReminderSettings(guildId, next);
      return toContractBump(next);
    },
    async reset(guildId) {
      const def: BumpReminderSettings = {
        enabled: false,
        channelId: undefined,
        mentionRoleId: undefined,
        mentionUserIds: [],
      };
      await getBotBumpReminderSettingsService().saveBumpReminderSettings(
        guildId,
        def,
      );
      return toContractBump(def);
    },
  };
}
