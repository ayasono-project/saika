// src/api/features/memberLogResource.ts
// メンバーログ設定リソース（リポジトリ upsert で全体置換）

import type { MemberLogSettings as ContractMemberLogSettings } from "@ayasono/shared/api";
import type { PrismaClient } from "@prisma/client";
import { getMemberLogSettingsRepository } from "../../features/member-log/memberLogSettingsRepository";
import type { MemberLogSettings } from "../../shared/database/types";
import type { SettingsResource } from "../routes/settingsResource";

/** 未設定時のデフォルト */
const DEFAULT_MEMBER_LOG: MemberLogSettings = {
  enabled: false,
  channelId: undefined,
  joinMessage: undefined,
  leaveMessage: undefined,
};

/** ドメイン → 契約（未設定メッセージは空文字） */
export function toContractMemberLog(
  domain: MemberLogSettings,
): ContractMemberLogSettings {
  return {
    enabled: domain.enabled,
    channelId: domain.channelId ?? null,
    joinMessage: domain.joinMessage ?? "",
    leaveMessage: domain.leaveMessage ?? "",
  };
}

/** 契約の部分更新を適用する（空文字はクリア扱い） */
export function applyMemberLogPatch(
  current: MemberLogSettings,
  patch: Partial<ContractMemberLogSettings>,
): MemberLogSettings {
  return {
    enabled: patch.enabled ?? current.enabled,
    channelId:
      patch.channelId === undefined
        ? current.channelId
        : (patch.channelId ?? undefined),
    joinMessage:
      patch.joinMessage === undefined
        ? current.joinMessage
        : patch.joinMessage || undefined,
    leaveMessage:
      patch.leaveMessage === undefined
        ? current.leaveMessage
        : patch.leaveMessage || undefined,
  };
}

/** メンバーログ設定リソースを生成する */
export function createMemberLogResource(
  prisma: PrismaClient,
): SettingsResource<ContractMemberLogSettings> {
  const repo = getMemberLogSettingsRepository(prisma);
  const readDomain = async (guildId: string): Promise<MemberLogSettings> =>
    (await repo.getMemberLogSettings(guildId)) ?? DEFAULT_MEMBER_LOG;

  return {
    path: "member-log",
    async read(guildId) {
      return toContractMemberLog(await readDomain(guildId));
    },
    async patch(guildId, body) {
      const next = applyMemberLogPatch(await readDomain(guildId), body);
      await repo.updateMemberLogSettings(guildId, next);
      return toContractMemberLog(next);
    },
    async reset(guildId) {
      await repo.updateMemberLogSettings(guildId, DEFAULT_MEMBER_LOG);
      return toContractMemberLog(DEFAULT_MEMBER_LOG);
    },
  };
}
