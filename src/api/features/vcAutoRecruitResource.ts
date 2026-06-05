// src/api/features/vcAutoRecruitResource.ts
// VC自動募集 設定リソース + アクティブ募集一覧

import type {
  ActiveInvite,
  VcAutoRecruitSettings as ContractVcAutoRecruitSettings,
} from "@ayasono/shared/api";
import type { PrismaClient } from "@prisma/client";
import type { Guild as DiscordGuild } from "discord.js";
import type { BotClient } from "../../bot/client";
import { getBotVcAutoRecruitSettingsService } from "../../bot/services/botCompositionRoot";
import { createDefaultVcAutoRecruitSettings } from "../../features/vc-auto-recruit/vcAutoRecruitSettingsDefaults";
import { getVcAutoRecruitSettingsRepository } from "../../features/vc-auto-recruit/vcAutoRecruitSettingsRepository";
import type {
  VcAutoRecruitRef,
  VcAutoRecruitSettings,
} from "../../shared/database/types";
import { tDefault } from "../../shared/locale/localeManager";
import { ApiHttpError } from "../lib/httpError";
import { relativeLabel } from "../lib/time";
import type { SettingsResource } from "../routes/settingsResource";

/** ドメイン → 契約（message 未設定は空文字） */
export function toContractVcAutoRecruit(
  domain: VcAutoRecruitSettings,
): ContractVcAutoRecruitSettings {
  return {
    enabled: domain.enabled,
    channelId: domain.channelId ?? null,
    message: domain.message ?? "",
    embedEnabled: domain.embedEnabled,
    enabledCategoryIds: domain.enabledCategoryIds,
  };
}

/** 契約の部分更新を適用する（activeInvites は実行時データのため保持） */
export function applyVcAutoRecruitPatch(
  current: VcAutoRecruitSettings,
  patch: Partial<ContractVcAutoRecruitSettings>,
): VcAutoRecruitSettings {
  return {
    enabled: patch.enabled ?? current.enabled,
    channelId:
      patch.channelId === undefined
        ? current.channelId
        : (patch.channelId ?? undefined),
    message:
      patch.message === undefined
        ? current.message
        : patch.message || undefined,
    embedEnabled: patch.embedEnabled ?? current.embedEnabled,
    enabledCategoryIds: patch.enabledCategoryIds ?? current.enabledCategoryIds,
    activeInvites: current.activeInvites,
  };
}

/** VC自動募集 設定リソースを生成する */
export function createVcAutoRecruitResource(
  prisma: PrismaClient,
): SettingsResource<ContractVcAutoRecruitSettings> {
  // repo は prisma で即時解決可。サービスは Composition Root 初期化後にしか
  // 取得できないため、各メソッド内で遅延取得する。
  const repo = getVcAutoRecruitSettingsRepository(prisma);

  return {
    path: "vc-auto-recruit",
    async read(guildId) {
      return toContractVcAutoRecruit(
        await getBotVcAutoRecruitSettingsService().getVcAutoRecruitSettingsOrDefault(
          guildId,
        ),
      );
    },
    async patch(guildId, body) {
      const next = applyVcAutoRecruitPatch(
        await getBotVcAutoRecruitSettingsService().getVcAutoRecruitSettingsOrDefault(
          guildId,
        ),
        body,
      );
      await repo.updateVcAutoRecruitSettings(guildId, next);
      return toContractVcAutoRecruit(next);
    },
    async reset(guildId) {
      const current =
        await getBotVcAutoRecruitSettingsService().getVcAutoRecruitSettingsOrDefault(
          guildId,
        );
      const def: VcAutoRecruitSettings = {
        ...createDefaultVcAutoRecruitSettings(),
        activeInvites: current.activeInvites,
      };
      await repo.updateVcAutoRecruitSettings(guildId, def);
      return toContractVcAutoRecruit(def);
    },
  };
}

/** 追跡中の募集を契約 ActiveInvite へ変換する */
export function toActiveInvite(
  ref: VcAutoRecruitRef,
  guild: DiscordGuild,
): ActiveInvite {
  const vc = guild.channels.cache.get(ref.voiceChannelId);
  const post = guild.channels.cache.get(ref.postChannelId);
  return {
    id: ref.voiceChannelId,
    vcName: vc?.name ?? ref.voiceChannelId,
    channelName: post?.name ?? ref.postChannelId,
    startedLabel: relativeLabel(ref.createdAt),
  };
}

/** VC自動募集が投稿中の募集一覧を返す */
export async function listActiveInvites(
  client: BotClient,
  guildId: string,
): Promise<ActiveInvite[]> {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    throw ApiHttpError.notFound(tDefault("system:web.bot_not_in_guild"));
  }
  const settings =
    await getBotVcAutoRecruitSettingsService().getVcAutoRecruitSettingsOrDefault(
      guildId,
    );
  return settings.activeInvites.map((ref) => toActiveInvite(ref, guild));
}
