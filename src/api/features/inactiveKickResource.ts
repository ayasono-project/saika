// src/api/features/inactiveKickResource.ts
// 非アクティブ自動キック 設定リソース

import type { InactiveKickSettings as ContractInactiveKickSettings } from "@ayasono/shared/api";
import type { PrismaClient } from "@prisma/client";
import { createDefaultInactiveKickSettings } from "../../features/inactive-kick/inactiveKickSettingsDefaults";
import { getInactiveKickSettingsRepository } from "../../features/inactive-kick/inactiveKickSettingsRepository";
import type { InactiveKickSettings } from "../../shared/database/types";
import type { SettingsResource } from "../routes/settingsResource";

/** ドメイン → 契約（未設定メッセージは空文字・enabledAt は非公開） */
export function toContractInactiveKick(
  domain: InactiveKickSettings,
): ContractInactiveKickSettings {
  return {
    enabled: domain.enabled,
    thresholdDays: domain.thresholdDays,
    channelId: domain.channelId ?? null,
    markerRoleId: domain.markerRoleId ?? null,
    weekWarnMessage: domain.weekWarnMessage ?? "",
    finalWarnMessage: domain.finalWarnMessage ?? "",
    kickMessage: domain.kickMessage ?? "",
    whitelistRoleIds: domain.whitelistRoleIds,
    whitelistUserIds: domain.whitelistUserIds,
  };
}

/**
 * 契約の部分更新を適用する。
 * 有効化時のみ enabledAt を now に更新する（有効化直後の無警告一斉キックを防ぐ起算基準）。
 */
export function applyInactiveKickPatch(
  current: InactiveKickSettings,
  patch: Partial<ContractInactiveKickSettings>,
  now: Date,
): InactiveKickSettings {
  let enabled = current.enabled;
  let enabledAt = current.enabledAt;
  if (patch.enabled !== undefined && patch.enabled !== current.enabled) {
    enabled = patch.enabled;
    if (patch.enabled) enabledAt = now;
  }
  return {
    enabled,
    enabledAt,
    thresholdDays: patch.thresholdDays ?? current.thresholdDays,
    channelId:
      patch.channelId === undefined
        ? current.channelId
        : (patch.channelId ?? undefined),
    markerRoleId:
      patch.markerRoleId === undefined
        ? current.markerRoleId
        : (patch.markerRoleId ?? undefined),
    weekWarnMessage:
      patch.weekWarnMessage === undefined
        ? current.weekWarnMessage
        : patch.weekWarnMessage || undefined,
    finalWarnMessage:
      patch.finalWarnMessage === undefined
        ? current.finalWarnMessage
        : patch.finalWarnMessage || undefined,
    kickMessage:
      patch.kickMessage === undefined
        ? current.kickMessage
        : patch.kickMessage || undefined,
    whitelistRoleIds: patch.whitelistRoleIds ?? current.whitelistRoleIds,
    whitelistUserIds: patch.whitelistUserIds ?? current.whitelistUserIds,
  };
}

/** 非アクティブ自動キック 設定リソースを生成する */
export function createInactiveKickResource(
  prisma: PrismaClient,
): SettingsResource<ContractInactiveKickSettings> {
  const repo = getInactiveKickSettingsRepository(prisma);
  const readDomain = async (guildId: string): Promise<InactiveKickSettings> =>
    (await repo.getInactiveKickSettings(guildId)) ??
    createDefaultInactiveKickSettings();

  return {
    path: "inactive-kick",
    async read(guildId) {
      return toContractInactiveKick(await readDomain(guildId));
    },
    async patch(guildId, body) {
      const next = applyInactiveKickPatch(
        await readDomain(guildId),
        body,
        new Date(),
      );
      await repo.updateInactiveKickSettings(guildId, next);
      return toContractInactiveKick(next);
    },
    async reset(guildId) {
      const def = createDefaultInactiveKickSettings();
      await repo.updateInactiveKickSettings(guildId, def);
      return toContractInactiveKick(def);
    },
  };
}
