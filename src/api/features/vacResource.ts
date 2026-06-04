// src/api/features/vacResource.ts
// VAC（VC自動作成）設定リソース + アクティブ VC 一覧

import type {
  ActiveVac,
  VacSettings as ContractVacSettings,
} from "@ayasono/shared/api";
import type { Guild as DiscordGuild } from "discord.js";
import type { BotClient } from "../../bot/client";
import { getBotVacSettingsService } from "../../bot/services/botCompositionRoot";
import type { VacChannelPair, VacSettings } from "../../shared/database/types";
import { tDefault } from "../../shared/locale/localeManager";
import { ApiHttpError } from "../lib/httpError";
import { relativeLabel } from "../lib/time";
import type { SettingsResource } from "../routes/settingsResource";

/** ドメイン → 契約（createdChannels は state 側のため除外） */
export function toContractVac(domain: VacSettings): ContractVacSettings {
  return {
    enabled: domain.enabled,
    triggerChannelIds: domain.triggerChannelIds,
  };
}

/** 契約の部分更新を適用する（createdChannels は実行時データのため保持） */
export function applyVacPatch(
  current: VacSettings,
  patch: Partial<ContractVacSettings>,
): VacSettings {
  return {
    enabled: patch.enabled ?? current.enabled,
    triggerChannelIds: patch.triggerChannelIds ?? current.triggerChannelIds,
    createdChannels: current.createdChannels,
  };
}

/** VAC 設定リソースを生成する */
export function createVacResource(): SettingsResource<ContractVacSettings> {
  return {
    path: "vac",
    async read(guildId) {
      return toContractVac(
        await getBotVacSettingsService().getVacSettingsOrDefault(guildId),
      );
    },
    async patch(guildId, body) {
      const svc = getBotVacSettingsService();
      const next = applyVacPatch(
        await svc.getVacSettingsOrDefault(guildId),
        body,
      );
      await svc.saveVacSettings(guildId, next);
      return toContractVac(next);
    },
    async reset(guildId) {
      const svc = getBotVacSettingsService();
      const current = await svc.getVacSettingsOrDefault(guildId);
      const def: VacSettings = {
        enabled: false,
        triggerChannelIds: [],
        createdChannels: current.createdChannels,
      };
      await svc.saveVacSettings(guildId, def);
      return toContractVac(def);
    },
  };
}

/** 追跡中の作成済み VC を契約 ActiveVac へ変換する */
export function toActiveVac(
  pair: VacChannelPair,
  guild: DiscordGuild,
): ActiveVac {
  const channel = guild.channels.cache.get(pair.voiceChannelId);
  const owner = guild.members.cache.get(pair.ownerId);
  return {
    id: pair.voiceChannelId,
    name: channel?.name ?? pair.voiceChannelId,
    owner: owner?.displayName ?? pair.ownerId,
    createdLabel: relativeLabel(pair.createdAt),
  };
}

/** VAC が作成・追跡している VC の一覧を返す */
export async function listActiveVacs(
  client: BotClient,
  guildId: string,
): Promise<ActiveVac[]> {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    throw ApiHttpError.notFound(tDefault("system:web.bot_not_in_guild"));
  }
  const settings =
    await getBotVacSettingsService().getVacSettingsOrDefault(guildId);
  return settings.createdChannels.map((pair) => toActiveVac(pair, guild));
}
