// src/api/features/unverifiedKickResource.ts
// 未承認ユーザー自動キック 設定リソース

import type { UnverifiedKickSettings as ContractUnverifiedKickSettings } from "@ayasono/shared/api";
import type { PrismaClient } from "@prisma/client";
import { createDefaultUnverifiedKickSettings } from "../../features/unverified-kick/unverifiedKickSettingsDefaults";
import { getUnverifiedKickSettingsRepository } from "../../features/unverified-kick/unverifiedKickSettingsRepository";
import type { UnverifiedKickSettings } from "../../shared/database/types";
import type { SettingsResource } from "../routes/settingsResource";

/** ドメイン → 契約（未設定メッセージ・warnDays は 0/空文字で表現・enabledAt は非公開） */
export function toContractUnverifiedKick(
  domain: UnverifiedKickSettings,
): ContractUnverifiedKickSettings {
  return {
    enabled: domain.enabled,
    verifiedRoleId: domain.verifiedRoleId ?? null,
    graceDays: domain.graceDays,
    warnDays: domain.warnDays ?? 0,
    notifyChannelId: domain.notifyChannelId ?? null,
    logChannelId: domain.logChannelId ?? null,
    markerRoleId: domain.markerRoleId ?? null,
    dmTemplate: domain.dmTemplate ?? "",
    notifyTemplate: domain.notifyTemplate ?? "",
    exemptRoleIds: domain.exemptRoleIds,
  };
}

/**
 * 契約の部分更新を適用する。
 * 有効化時のみ enabledAt を now に更新する（有効化直後の無警告一斉キックを防ぐ起算基準）。
 * warnDays は 0 を「警告なし（未設定）」として扱う。
 */
export function applyUnverifiedKickPatch(
  current: UnverifiedKickSettings,
  patch: Partial<ContractUnverifiedKickSettings>,
  now: Date,
): UnverifiedKickSettings {
  let enabled = current.enabled;
  let enabledAt = current.enabledAt;
  if (patch.enabled !== undefined && patch.enabled !== current.enabled) {
    enabled = patch.enabled;
    if (patch.enabled) enabledAt = now;
  }
  return {
    enabled,
    enabledAt,
    verifiedRoleId:
      patch.verifiedRoleId === undefined
        ? current.verifiedRoleId
        : (patch.verifiedRoleId ?? undefined),
    graceDays: patch.graceDays ?? current.graceDays,
    warnDays:
      patch.warnDays === undefined
        ? current.warnDays
        : patch.warnDays > 0
          ? patch.warnDays
          : undefined,
    notifyChannelId:
      patch.notifyChannelId === undefined
        ? current.notifyChannelId
        : (patch.notifyChannelId ?? undefined),
    logChannelId:
      patch.logChannelId === undefined
        ? current.logChannelId
        : (patch.logChannelId ?? undefined),
    markerRoleId:
      patch.markerRoleId === undefined
        ? current.markerRoleId
        : (patch.markerRoleId ?? undefined),
    dmTemplate:
      patch.dmTemplate === undefined
        ? current.dmTemplate
        : patch.dmTemplate || undefined,
    notifyTemplate:
      patch.notifyTemplate === undefined
        ? current.notifyTemplate
        : patch.notifyTemplate || undefined,
    exemptRoleIds: patch.exemptRoleIds ?? current.exemptRoleIds,
  };
}

/** 未承認ユーザー自動キック 設定リソースを生成する */
export function createUnverifiedKickResource(
  prisma: PrismaClient,
): SettingsResource<ContractUnverifiedKickSettings> {
  const repo = getUnverifiedKickSettingsRepository(prisma);
  const readDomain = async (guildId: string): Promise<UnverifiedKickSettings> =>
    (await repo.getUnverifiedKickSettings(guildId)) ??
    createDefaultUnverifiedKickSettings();

  return {
    path: "unverified-kick",
    async read(guildId) {
      return toContractUnverifiedKick(await readDomain(guildId));
    },
    async patch(guildId, body) {
      const next = applyUnverifiedKickPatch(
        await readDomain(guildId),
        body,
        new Date(),
      );
      await repo.updateUnverifiedKickSettings(guildId, next);
      return toContractUnverifiedKick(next);
    },
    async reset(guildId) {
      const def = createDefaultUnverifiedKickSettings();
      await repo.updateUnverifiedKickSettings(guildId, def);
      return toContractUnverifiedKick(def);
    },
  };
}
