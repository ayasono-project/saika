// src/api/features/vcRecruitResource.ts
// VC募集設定リソース（enabled/mentionRoleIds + setups）。
// setups の差分に応じて Discord へパネルを投稿/除去する副作用を伴う。

import type {
  VcRecruitSettings as ContractVcRecruitSettings,
  VcRecruitSetup as ContractVcRecruitSetup,
} from "@ayasono/shared/api";
import type { BotClient } from "../../bot/client";
import { getBotVcRecruitSettingsService } from "../../bot/services/botCompositionRoot";
import type {
  VcRecruitSettings,
  VcRecruitSetup,
} from "../../shared/database/types/vcRecruitTypes";
import type { SettingsResource } from "../routes/settingsResource";
import type { ApiServerDeps } from "../types";

/** スレッド自動アーカイブの許容値 */
const ARCHIVE_VALUES: readonly number[] = [60, 1440, 4320, 10080];

/** archiveMinutes を許容値へ正規化（未知は 1440） */
function asArchive(minutes: number): VcRecruitSetup["threadArchiveDuration"] {
  return ARCHIVE_VALUES.includes(minutes)
    ? (minutes as VcRecruitSetup["threadArchiveDuration"])
    : 1440;
}

/** ドメイン setup → 契約（id は安定キーの panelChannelId） */
function toContractSetup(domain: VcRecruitSetup): ContractVcRecruitSetup {
  return {
    id: domain.panelChannelId,
    categoryId: domain.categoryId,
    panelChannelId: domain.panelChannelId,
    postChannelId: domain.postChannelId,
    archiveMinutes: domain.threadArchiveDuration,
  };
}

/** ドメイン設定 → 契約 */
export function toContractVcRecruit(
  domain: VcRecruitSettings,
): ContractVcRecruitSettings {
  return {
    enabled: domain.enabled,
    mentionRoleIds: domain.mentionRoleIds,
    setups: domain.setups.map(toContractSetup),
  };
}

/**
 * パネルをチャンネルへ投稿し messageId を返す（送信不可なら空文字）。
 * discord.js を多用するビルダーは投稿時のみ動的 import する。
 */
async function postVcPanel(
  client: BotClient,
  guildId: string,
  panelChannelId: string,
): Promise<string> {
  const channel = await client.channels.fetch(panelChannelId).catch(() => null);
  if (!channel?.isSendable()) return "";
  const { buildVcRecruitPanelComponents } = await import(
    "../../features/vc-recruit/commands/vcRecruitPanelEmbed"
  );
  const { embed, row } = await buildVcRecruitPanelComponents(
    guildId,
    panelChannelId,
  );
  const sent = await channel.send({ embeds: [embed], components: [row] });
  return sent.id;
}

/** パネルメッセージを削除する（best-effort） */
async function deleteVcPanel(
  client: BotClient,
  panelChannelId: string,
  panelMessageId: string,
): Promise<void> {
  if (!panelMessageId) return;
  const channel = await client.channels.fetch(panelChannelId).catch(() => null);
  if (!channel?.isTextBased()) return;
  await channel.messages
    .fetch(panelMessageId)
    .then((msg) => msg.delete())
    .catch(() => null);
}

/** 契約 setup のうち panel/post チャンネルが揃っているものだけ採用する */
function isValidSetup(
  s: ContractVcRecruitSetup,
): s is ContractVcRecruitSetup & {
  panelChannelId: string;
  postChannelId: string;
} {
  return Boolean(s.panelChannelId && s.postChannelId);
}

/**
 * 受信した setups と現在の setups を突き合わせ、追加パネルを投稿・削除パネルを除去し、
 * 反映後のドメイン setups 配列を返す。
 */
async function reconcileSetups(
  deps: ApiServerDeps,
  guildId: string,
  current: VcRecruitSetup[],
  incoming: ContractVcRecruitSetup[],
): Promise<VcRecruitSetup[]> {
  const currentByPanel = new Map(current.map((s) => [s.panelChannelId, s]));
  const valid = incoming.filter(isValidSetup);
  const incomingPanelIds = new Set(valid.map((s) => s.panelChannelId));

  // 受信に無くなった setup はパネルを除去
  for (const s of current) {
    if (!incomingPanelIds.has(s.panelChannelId)) {
      await deleteVcPanel(deps.client, s.panelChannelId, s.panelMessageId);
    }
  }

  const next: VcRecruitSetup[] = [];
  for (const s of valid) {
    const existing = currentByPanel.get(s.panelChannelId);
    if (existing) {
      // 既存はパネル再投稿せず可変フィールドのみ更新（messageId/createdVc は保持）
      next.push({
        ...existing,
        categoryId: s.categoryId,
        postChannelId: s.postChannelId,
        threadArchiveDuration: asArchive(s.archiveMinutes),
      });
    } else {
      // 新規はパネルを投稿して messageId を確定
      const panelMessageId = await postVcPanel(
        deps.client,
        guildId,
        s.panelChannelId,
      );
      next.push({
        categoryId: s.categoryId,
        panelChannelId: s.panelChannelId,
        postChannelId: s.postChannelId,
        panelMessageId,
        threadArchiveDuration: asArchive(s.archiveMinutes),
        createdVoiceChannelIds: [],
      });
    }
  }
  return next;
}

/** VC募集設定リソースを生成する（patch/reset は deps.client を使ってパネル副作用を行う） */
export function createVcRecruitResource(
  deps: ApiServerDeps,
): SettingsResource<ContractVcRecruitSettings> {
  return {
    path: "vc-recruit",
    async read(guildId) {
      return toContractVcRecruit(
        await getBotVcRecruitSettingsService().getVcRecruitSettingsOrDefault(
          guildId,
        ),
      );
    },
    async patch(guildId, body) {
      const repo = getBotVcRecruitSettingsService();
      const current = await repo.getVcRecruitSettingsOrDefault(guildId);
      const setups =
        body.setups !== undefined
          ? await reconcileSetups(deps, guildId, current.setups, body.setups)
          : current.setups;
      const next: VcRecruitSettings = {
        enabled: body.enabled ?? current.enabled,
        mentionRoleIds: body.mentionRoleIds ?? current.mentionRoleIds,
        setups,
      };
      await repo.saveVcRecruitSettings(guildId, next);
      return toContractVcRecruit(next);
    },
    async reset(guildId) {
      const repo = getBotVcRecruitSettingsService();
      const current = await repo.getVcRecruitSettingsOrDefault(guildId);
      // 投稿済みパネルを除去してから空設定で保存
      for (const s of current.setups) {
        await deleteVcPanel(deps.client, s.panelChannelId, s.panelMessageId);
      }
      const def: VcRecruitSettings = {
        enabled: false,
        mentionRoleIds: [],
        setups: [],
      };
      await repo.saveVcRecruitSettings(guildId, def);
      return toContractVcRecruit(def);
    },
  };
}
