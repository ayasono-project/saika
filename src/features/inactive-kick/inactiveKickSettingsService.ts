// src/features/inactive-kick/inactiveKickSettingsService.ts
// 非アクティブ自動キック設定サービス実装（Repositoryパターン準拠）

import type {
  IInactiveKickSettingsRepository,
  InactiveKickSettings,
} from "../../shared/database/types";
import { createServiceGetter } from "../../shared/utils/serviceFactory";
import {
  createDefaultInactiveKickSettings,
  DEFAULT_INACTIVE_KICK_SETTINGS,
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
   * しきい値（非アクティブ判定日数）を設定する
   */
  async setThresholdDays(guildId: string, days: number): Promise<void> {
    await this.updatePartial(guildId, { thresholdDays: days });
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
