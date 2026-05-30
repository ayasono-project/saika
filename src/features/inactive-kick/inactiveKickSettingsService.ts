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
   * カスタム事前通知メッセージを設定する
   */
  async setWarnMessage(guildId: string, message: string): Promise<void> {
    await this.updatePartial(guildId, { warnMessage: message });
  }

  /**
   * カスタム事前通知メッセージを削除する
   */
  async clearWarnMessage(guildId: string): Promise<void> {
    await this.updatePartial(guildId, { warnMessage: undefined });
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
