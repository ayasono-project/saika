// src/features/inactive-kick/inactiveKickSettingsService.ts
// 非アクティブ自動キック設定サービス実装（Repositoryパターン準拠）

import type {
  IInactiveKickSettingsRepository,
  InactiveKickSettings,
  InactiveKickTier,
} from "../../shared/database/types";
import { createServiceGetter } from "../../shared/utils/serviceFactory";
import {
  createDefaultInactiveKickSettings,
  DEFAULT_INACTIVE_KICK_SETTINGS,
  normalizeInactiveKickTiers,
} from "./inactiveKickSettingsDefaults";
import { getInactiveKickSettingsRepository } from "./inactiveKickSettingsRepository";

export type { InactiveKickSettings };
export { DEFAULT_INACTIVE_KICK_SETTINGS };

/**
 * 非アクティブ自動キック設定の取得・更新を担当するサービス
 */
export class InactiveKickSettingsService {
  private readonly repository: IInactiveKickSettingsRepository;
  constructor(repository: IInactiveKickSettingsRepository) {
    this.repository = repository;
  }

  /**
   * 設定を取得する（未設定時は null）
   * @param guildId 取得対象のギルドID
   */
  async getSettings(guildId: string): Promise<InactiveKickSettings | null> {
    return this.repository.getInactiveKickSettings(guildId);
  }

  /**
   * 設定を取得する（未設定時は初期値を返す）
   * @param guildId 取得対象のギルドID
   */
  async getSettingsOrDefault(guildId: string): Promise<InactiveKickSettings> {
    const settings = await this.getSettings(guildId);
    if (!settings) {
      return createDefaultInactiveKickSettings();
    }
    return settings;
  }

  /**
   * 有効な全ギルドの設定を取得する（日次チェック用）
   */
  async getAllEnabled(): Promise<
    Array<InactiveKickSettings & { guildId: string }>
  > {
    return this.repository.getAllEnabled();
  }

  /**
   * 現在の設定を読み込み、指定フィールドを上書きして保存する
   * @param guildId 設定対象のギルドID
   * @param partial 上書きするフィールド
   */
  private async updatePartial(
    guildId: string,
    partial: Partial<InactiveKickSettings>,
  ): Promise<void> {
    const current = await this.getSettingsOrDefault(guildId);
    await this.repository.updateInactiveKickSettings(guildId, {
      ...current,
      ...partial,
    });
  }

  /**
   * 通知チャンネルを設定する
   */
  async setChannelId(guildId: string, channelId: string): Promise<void> {
    await this.updatePartial(guildId, { channelId });
  }

  /**
   * 在籍階層を1件追加・更新する（tenureDays が一致する既存階層は上書き）。
   * 活動種別トグル・アクティブ条件は省略時、既存階層があればその値を維持し、
   * 新規階層なら track* は true・アクティブ条件は未設定になる（部分更新セマンティクス）。
   * @param guildId 設定対象のギルドID
   * @param tenureDays この階層が適用される在籍日数の下限
   * @param updates 更新内容（しきい値は必須、他は省略可）
   */
  async setTier(
    guildId: string,
    tenureDays: number,
    updates: {
      thresholdDays: number;
      trackMessage?: boolean;
      trackVoice?: boolean;
      trackReaction?: boolean;
      minMessageCount?: number;
      minVoiceCount?: number;
      minReactionCount?: number;
      tenureDeadline?: boolean;
    },
  ): Promise<void> {
    const current = await this.getSettingsOrDefault(guildId);
    const existing = current.tiers.find((t) => t.tenureDays === tenureDays);
    const nextTier: InactiveKickTier = {
      tenureDays,
      thresholdDays: updates.thresholdDays,
      trackMessage: updates.trackMessage ?? existing?.trackMessage ?? true,
      trackVoice: updates.trackVoice ?? existing?.trackVoice ?? true,
      trackReaction: updates.trackReaction ?? existing?.trackReaction ?? true,
      minMessageCount: updates.minMessageCount ?? existing?.minMessageCount,
      minVoiceCount: updates.minVoiceCount ?? existing?.minVoiceCount,
      minReactionCount: updates.minReactionCount ?? existing?.minReactionCount,
      tenureDeadline: updates.tenureDeadline ?? existing?.tenureDeadline,
    };
    const nextTiers = normalizeInactiveKickTiers([
      ...current.tiers.filter((t) => t.tenureDays !== tenureDays),
      nextTier,
    ]);
    await this.updatePartial(guildId, { tiers: nextTiers });
  }

  /**
   * 在籍階層を1件削除する（最後の1件は削除できない）
   * @param guildId 設定対象のギルドID
   * @param tenureDays 削除対象階層の在籍日数
   * @returns 実際に削除できたら true（未登録・最後の1件なら false）
   */
  async removeTier(guildId: string, tenureDays: number): Promise<boolean> {
    const current = await this.getSettingsOrDefault(guildId);
    if (!current.tiers.some((t) => t.tenureDays === tenureDays)) return false;
    if (current.tiers.length <= 1) return false;
    const nextTiers = current.tiers.filter((t) => t.tenureDays !== tenureDays);
    await this.updatePartial(guildId, { tiers: nextTiers });
    return true;
  }

  /**
   * 在籍階層を複数件まとめて削除する（最低1件は残す）。
   * 選択範囲が全件に及ぶ場合は、在籍日数が最小の階層を残して削除する。
   * @param guildId 設定対象のギルドID
   * @param tenureDaysList 削除対象階層の在籍日数一覧
   * @returns 実際に削除できた件数
   */
  async removeTiers(
    guildId: string,
    tenureDaysList: number[],
  ): Promise<number> {
    const current = await this.getSettingsOrDefault(guildId);
    const toRemove = new Set(tenureDaysList);
    let nextTiers = current.tiers.filter((t) => !toRemove.has(t.tenureDays));
    if (nextTiers.length === 0) {
      const [keep] = normalizeInactiveKickTiers(current.tiers);
      nextTiers = keep ? [keep] : current.tiers;
    }
    const removed = current.tiers.length - nextTiers.length;
    if (removed === 0) return 0;
    await this.updatePartial(guildId, { tiers: nextTiers });
    return removed;
  }

  /**
   * 在籍階層一覧を一括設定する（web ダッシュボードからの patch 用）
   */
  async setTiers(guildId: string, tiers: InactiveKickTier[]): Promise<void> {
    await this.updatePartial(guildId, {
      tiers: normalizeInactiveKickTiers(tiers),
    });
  }

  /**
   * 機能を有効化し、enabledAt を現在時刻に更新する（キック起算をリセット）
   * @param guildId 設定対象のギルドID
   * @param now 有効化時刻
   */
  async enable(guildId: string, now: Date): Promise<void> {
    await this.updatePartial(guildId, { enabled: true, enabledAt: now });
  }

  /**
   * 機能を無効化する（enabledAt は据え置き）
   */
  async disable(guildId: string): Promise<void> {
    await this.updatePartial(guildId, { enabled: false });
  }

  /**
   * 通知チャンネル消失等で機能を無効化する（日次チェックのバリデーション失敗時）
   */
  async disableInvalid(guildId: string): Promise<void> {
    await this.updatePartial(guildId, { enabled: false });
  }

  /**
   * カスタム事前通知メッセージ（1週間前）を設定する
   */
  async setWeekWarnMessage(guildId: string, message: string): Promise<void> {
    await this.updatePartial(guildId, { weekWarnMessage: message });
  }

  /**
   * カスタム事前通知メッセージ（1週間前）を削除する
   */
  async clearWeekWarnMessage(guildId: string): Promise<void> {
    await this.updatePartial(guildId, { weekWarnMessage: undefined });
  }

  /**
   * カスタム事前通知メッセージ（最終警告）を設定する
   */
  async setFinalWarnMessage(guildId: string, message: string): Promise<void> {
    await this.updatePartial(guildId, { finalWarnMessage: message });
  }

  /**
   * カスタム事前通知メッセージ（最終警告）を削除する
   */
  async clearFinalWarnMessage(guildId: string): Promise<void> {
    await this.updatePartial(guildId, { finalWarnMessage: undefined });
  }

  /**
   * カスタムキック通知メッセージを設定する
   */
  async setKickMessage(guildId: string, message: string): Promise<void> {
    await this.updatePartial(guildId, { kickMessage: message });
  }

  /**
   * カスタムキック通知メッセージを削除する
   */
  async clearKickMessage(guildId: string): Promise<void> {
    await this.updatePartial(guildId, { kickMessage: undefined });
  }

  /**
   * 対象ロール（警告対象へ自動付与）を設定する
   */
  async setMarkerRole(guildId: string, roleId: string): Promise<void> {
    await this.updatePartial(guildId, { markerRoleId: roleId });
  }

  /**
   * 対象ロール連携を解除する（既存付与ロールは一括剥奪しない）
   */
  async clearMarkerRole(guildId: string): Promise<void> {
    await this.updatePartial(guildId, { markerRoleId: undefined });
  }

  /**
   * IANA タイムゾーンを設定する
   */
  async setTimezone(guildId: string, timezone: string): Promise<void> {
    await this.updatePartial(guildId, { timezone });
  }

  /**
   * 実行時刻（0〜23）を設定する
   */
  async setRunHour(guildId: string, runHour: number): Promise<void> {
    await this.updatePartial(guildId, { runHour });
  }

  /**
   * 個別ユーザーメンション通知の有無を設定する
   */
  async setMentionEnabled(
    guildId: string,
    mentionEnabled: boolean,
  ): Promise<void> {
    await this.updatePartial(guildId, { mentionEnabled });
  }

  /**
   * 最終実行日を更新する（スイープ重複防止）
   */
  async updateLastRunDate(guildId: string, date: string): Promise<void> {
    await this.repository.updateLastRunDate(guildId, date);
  }

  /**
   * ホワイトリストにロールを追加する（冪等）
   */
  async addWhitelistRole(guildId: string, roleId: string): Promise<boolean> {
    const current = await this.getSettingsOrDefault(guildId);
    if (current.whitelistRoleIds.includes(roleId)) return false;
    await this.repository.updateInactiveKickSettings(guildId, {
      ...current,
      whitelistRoleIds: [...current.whitelistRoleIds, roleId],
    });
    return true;
  }

  /**
   * ホワイトリストからロールを削除する
   */
  async removeWhitelistRole(guildId: string, roleId: string): Promise<boolean> {
    const current = await this.getSettingsOrDefault(guildId);
    if (!current.whitelistRoleIds.includes(roleId)) return false;
    await this.repository.updateInactiveKickSettings(guildId, {
      ...current,
      whitelistRoleIds: current.whitelistRoleIds.filter((id) => id !== roleId),
    });
    return true;
  }

  /**
   * ホワイトリストから複数のロール／ユーザーを一括削除する（単一更新）。
   * @param guildId 設定対象のギルドID
   * @param roleIds 削除するロールID一覧
   * @param userIds 削除するユーザーID一覧
   * @returns 実際に削除した件数
   */
  async removeFromWhitelist(
    guildId: string,
    roleIds: string[],
    userIds: string[],
  ): Promise<number> {
    const current = await this.getSettingsOrDefault(guildId);
    const roleSet = new Set(roleIds);
    const userSet = new Set(userIds);
    const nextRoleIds = current.whitelistRoleIds.filter(
      (id) => !roleSet.has(id),
    );
    const nextUserIds = current.whitelistUserIds.filter(
      (id) => !userSet.has(id),
    );
    const removed =
      current.whitelistRoleIds.length -
      nextRoleIds.length +
      (current.whitelistUserIds.length - nextUserIds.length);
    if (removed === 0) return 0;
    await this.repository.updateInactiveKickSettings(guildId, {
      ...current,
      whitelistRoleIds: nextRoleIds,
      whitelistUserIds: nextUserIds,
    });
    return removed;
  }

  /**
   * ホワイトリストにユーザーを追加する（冪等）
   */
  async addWhitelistUser(guildId: string, userId: string): Promise<boolean> {
    const current = await this.getSettingsOrDefault(guildId);
    if (current.whitelistUserIds.includes(userId)) return false;
    await this.repository.updateInactiveKickSettings(guildId, {
      ...current,
      whitelistUserIds: [...current.whitelistUserIds, userId],
    });
    return true;
  }

  /**
   * ホワイトリストからユーザーを削除する
   */
  async removeWhitelistUser(guildId: string, userId: string): Promise<boolean> {
    const current = await this.getSettingsOrDefault(guildId);
    if (!current.whitelistUserIds.includes(userId)) return false;
    await this.repository.updateInactiveKickSettings(guildId, {
      ...current,
      whitelistUserIds: current.whitelistUserIds.filter((id) => id !== userId),
    });
    return true;
  }

  /**
   * 設定をデフォルトへリセットする（冪等）
   */
  async reset(guildId: string): Promise<void> {
    await this.repository.updateInactiveKickSettings(
      guildId,
      createDefaultInactiveKickSettings(),
    );
  }
}

/**
 * 非アクティブ自動キック設定サービスを依存注入で生成する
 */
export function createInactiveKickSettingsService(
  repository: IInactiveKickSettingsRepository,
): InactiveKickSettingsService {
  return new InactiveKickSettingsService(repository);
}

/**
 * 非アクティブ自動キック設定サービスのシングルトンを取得する
 */
export const getInactiveKickSettingsService: (
  repository?: IInactiveKickSettingsRepository,
) => InactiveKickSettingsService = createServiceGetter(
  createInactiveKickSettingsService,
  getInactiveKickSettingsRepository,
);
