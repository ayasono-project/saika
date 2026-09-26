// Bump リマインダー設定リソース

import type { BumpSettings as ContractBumpSettings } from "@ayasono/shared/api";
import type { Client } from "discord.js";
import { getBotBumpReminderSettingsService } from "../../bot/services/botCompositionRoot";
import { cancelGuildBumpReminders } from "../../features/bump-reminder/handlers/usecases/cancelGuildBumpReminders";
import { resetBumpReminderSettings } from "../../features/bump-reminder/handlers/usecases/resetBumpReminderSettings";
import type { BumpReminderSettings } from "../../shared/database/types";
import type { SettingsResource } from "../routes/settingsResource";

/** 全チャンネル検知を表す契約上のセンチネル */
const ALL_CHANNELS = "all";

/**
 * ドメイン → 契約（channelId 未設定は "all"）
 * @param domain ドメインの Bump リマインダー設定
 * @returns 契約（API レスポンス）の Bump 設定
 */
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

/**
 * 契約の部分更新を現在のドメイン設定へ適用する
 * @param current 現在のドメイン設定
 * @param patch 契約の部分更新（未指定の項目は現在値を保つ）
 * @returns 更新後のドメイン設定
 */
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

/**
 * Bump リマインダー設定リソースを生成する
 * @param client Discord クライアント（無効化・リセット時に予約のパネルメッセージを消すのに使う）
 * @returns Bump リマインダー設定リソース
 */
export function createBumpResource(
  client: Client,
): SettingsResource<ContractBumpSettings> {
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

      // 無効の状態で保存したら、コマンドの disable と同じく進行中の予約とパネルを取り消す
      // （残すと、予定時刻の前に有効へ戻したとき無効化前の予約が発火する）
      if (!next.enabled) {
        await cancelGuildBumpReminders(client, guildId);
      }
      return toContractBump(next);
    },
    async reset(guildId) {
      // コマンドの reset と同じ初期状態に戻す（機能は有効のまま）
      return toContractBump(await resetBumpReminderSettings(client, guildId));
    },
  };
}
