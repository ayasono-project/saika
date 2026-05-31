// src/features/unverified-kick/unverifiedKickSettingsService.ts
// 未承認ユーザー自動キック設定サービス実装（Repositoryパターン準拠）

import type {
  IUnverifiedKickSettingsRepository,
  UnverifiedKickSettings,
} from "../../shared/database/types";
import { createServiceGetter } from "../../shared/utils/serviceFactory";
import {
  createDefaultUnverifiedKickSettings,
  DEFAULT_UNVERIFIED_KICK_SETTINGS,
} from "./unverifiedKickSettingsDefaults";
import { getUnverifiedKickSettingsRepository } from "./unverifiedKickSettingsRepository";

export type { UnverifiedKickSettings };
export { DEFAULT_UNVERIFIED_KICK_SETTINGS };

/**
 * 未承認ユーザー自動キック設定の取得・更新を担当するサービス
 */
export class UnverifiedKickSettingsService {
  private readonly repository: IUnverifiedKickSettingsRepository;
  constructor(repository: IUnverifiedKickSettingsRepository) {
    this.repository = repository;
  }

  /**
   * 設定を取得する（未設定時は null）
   * @param guildId 取得対象のギルドID
   */
  async getSettings(guildId: string): Promise<UnverifiedKickSettings | null> {
    return this.repository.getUnverifiedKickSettings(guildId);
  }

  /**
   * 設定を取得する（未設定時は初期値を返す）
   * @param guildId 取得対象のギルドID
   */
  async getSettingsOrDefault(guildId: string): Promise<UnverifiedKickSettings> {
    const settings = await this.getSettings(guildId);
    if (!settings) {
      return createDefaultUnverifiedKickSettings();
    }
    return settings;
  }

  /**
   * 有効な全ギルドの設定を取得する（日次チェック用）
   */
  async getAllEnabled(): Promise<
    Array<UnverifiedKickSettings & { guildId: string }>
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
    partial: Partial<UnverifiedKickSettings>,
  ): Promise<void> {
    const current = await this.getSettingsOrDefault(guildId);
    await this.repository.updateUnverifiedKickSettings(guildId, {
      ...current,
      ...partial,
    });
  }

  /**
   * 認証ロールを設定する
   */
  async setVerifiedRole(guildId: string, roleId: string): Promise<void> {
    await this.updatePartial(guildId, { verifiedRoleId: roleId });
  }

  /**
   * 猶予日数を設定する
   */
  async setGraceDays(guildId: string, days: number): Promise<void> {
    await this.updatePartial(guildId, { graceDays: days });
  }

  /**
   * 警告日数（事前警告を送る参加経過日数）を設定する
   */
  async setWarnDays(guildId: string, days: number): Promise<void> {
    await this.updatePartial(guildId, { warnDays: days });
  }

  /**
   * 警告日数を解除する（事前警告を無効化）
   */
  async clearWarnDays(guildId: string): Promise<void> {
    await this.updatePartial(guildId, { warnDays: undefined });
  }

  /**
   * 通知チャンネル（キック予告）を設定する
   */
  async setNotifyChannel(guildId: string, channelId: string): Promise<void> {
    await this.updatePartial(guildId, { notifyChannelId: channelId });
  }

  /**
   * 通知チャンネルを解除する
   */
  async clearNotifyChannel(guildId: string): Promise<void> {
    await this.updatePartial(guildId, { notifyChannelId: undefined });
  }

  /**
   * ログチャンネル（監査）を設定する
   */
  async setLogChannel(guildId: string, channelId: string): Promise<void> {
    await this.updatePartial(guildId, { logChannelId: channelId });
  }

  /**
   * ログチャンネルを解除する
   */
  async clearLogChannel(guildId: string): Promise<void> {
    await this.updatePartial(guildId, { logChannelId: undefined });
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
   * カスタム警告 DM 本文を設定する
   */
  async setDmTemplate(guildId: string, template: string): Promise<void> {
    await this.updatePartial(guildId, { dmTemplate: template });
  }

  /**
   * カスタム警告 DM 本文を削除する
   */
  async clearDmTemplate(guildId: string): Promise<void> {
    await this.updatePartial(guildId, { dmTemplate: undefined });
  }

  /**
   * カスタムキック予告本文（通知チャンネル）を設定する
   */
  async setNotifyTemplate(guildId: string, template: string): Promise<void> {
    await this.updatePartial(guildId, { notifyTemplate: template });
  }

  /**
   * カスタムキック予告本文（通知チャンネル）を削除する
   */
  async clearNotifyTemplate(guildId: string): Promise<void> {
    await this.updatePartial(guildId, { notifyTemplate: undefined });
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
   * バリデーション失敗等で機能を無効化する（日次チェックの自動無効化時）
   */
  async disableInvalid(guildId: string): Promise<void> {
    await this.updatePartial(guildId, { enabled: false });
  }

  /**
   * 除外ロールを追加する（冪等）
   * @returns 追加したら true、既に存在すれば false
   */
  async addExemptRole(guildId: string, roleId: string): Promise<boolean> {
    const current = await this.getSettingsOrDefault(guildId);
    if (current.exemptRoleIds.includes(roleId)) return false;
    await this.repository.updateUnverifiedKickSettings(guildId, {
      ...current,
      exemptRoleIds: [...current.exemptRoleIds, roleId],
    });
    return true;
  }

  /**
   * 除外ロールを複数まとめて削除する（単一更新）
   * @param guildId 設定対象のギルドID
   * @param roleIds 削除するロールID一覧
   * @returns 実際に削除した件数
   */
  async removeExemptRoles(guildId: string, roleIds: string[]): Promise<number> {
    const current = await this.getSettingsOrDefault(guildId);
    const roleSet = new Set(roleIds);
    const nextRoleIds = current.exemptRoleIds.filter((id) => !roleSet.has(id));
    const removed = current.exemptRoleIds.length - nextRoleIds.length;
    if (removed === 0) return 0;
    await this.repository.updateUnverifiedKickSettings(guildId, {
      ...current,
      exemptRoleIds: nextRoleIds,
    });
    return removed;
  }

  /**
   * 設定をデフォルトへリセットする（冪等）
   */
  async reset(guildId: string): Promise<void> {
    await this.repository.updateUnverifiedKickSettings(
      guildId,
      createDefaultUnverifiedKickSettings(),
    );
  }
}

/**
 * 未承認ユーザー自動キック設定サービスを依存注入で生成する
 */
export function createUnverifiedKickSettingsService(
  repository: IUnverifiedKickSettingsRepository,
): UnverifiedKickSettingsService {
  return new UnverifiedKickSettingsService(repository);
}

/**
 * 未承認ユーザー自動キック設定サービスのシングルトンを取得する
 */
export const getUnverifiedKickSettingsService: (
  repository?: IUnverifiedKickSettingsRepository,
) => UnverifiedKickSettingsService = createServiceGetter(
  createUnverifiedKickSettingsService,
  getUnverifiedKickSettingsRepository,
);
