// src/shared/features/bump-reminder/bumpReminderSettingsService.ts
// Bumpリマインダー設定サービス実装（Repositoryパターン準拠）

import {
  BUMP_REMINDER_MENTION_CLEAR_RESULT,
  BUMP_REMINDER_MENTION_ROLE_RESULT,
  BUMP_REMINDER_MENTION_USER_ADD_RESULT,
  BUMP_REMINDER_MENTION_USER_REMOVE_RESULT,
  BUMP_REMINDER_MENTION_USERS_CLEAR_RESULT,
  type BumpReminderMentionClearResult,
  type BumpReminderMentionRoleResult,
  type BumpReminderMentionUserAddResult,
  type BumpReminderMentionUserRemoveResult,
  type BumpReminderMentionUsersClearResult,
  type BumpReminderSettings,
  type IBumpReminderSettingsRepository,
} from "../../shared/database/types";
import { createServiceGetter } from "../../shared/utils/serviceFactory";
import {
  createDefaultBumpReminderSettings,
  DEFAULT_BUMP_REMINDER_SETTINGS,
  normalizeBumpReminderSettings,
} from "./bumpReminderSettingsDefaults";
import { getBumpReminderSettingsRepository } from "./bumpReminderSettingsRepository";

export type {
  BumpReminderMentionClearResult,
  BumpReminderMentionRoleResult,
  BumpReminderMentionUserAddResult,
  BumpReminderMentionUserRemoveResult,
  BumpReminderMentionUsersClearResult,
  BumpReminderSettings,
};
export {
  BUMP_REMINDER_MENTION_CLEAR_RESULT,
  BUMP_REMINDER_MENTION_ROLE_RESULT,
  BUMP_REMINDER_MENTION_USER_ADD_RESULT,
  BUMP_REMINDER_MENTION_USER_REMOVE_RESULT,
  BUMP_REMINDER_MENTION_USERS_CLEAR_RESULT,
  DEFAULT_BUMP_REMINDER_SETTINGS,
};

/**
 * Bumpリマインダー設定の取得・更新を担当するサービス
 */
export class BumpReminderSettingsService {
  private readonly guildSettingsRepository: IBumpReminderSettingsRepository;
  constructor(guildSettingsRepository: IBumpReminderSettingsRepository) {
    this.guildSettingsRepository = guildSettingsRepository;
  }

  /**
   * Bumpリマインダー設定を取得する
   */
  async getBumpReminderSettings(
    guildId: string,
  ): Promise<BumpReminderSettings | null> {
    // 永続化設定を取得
    const config =
      await this.guildSettingsRepository.getBumpReminderSettings(guildId);
    // 未設定時は null を返し、呼び出し側に初期化判断を委ねる
    if (!config) {
      return null;
    }
    // 配列参照共有を避けるため正規化して返す
    return normalizeBumpReminderSettings(config);
  }

  /**
   * Bumpリマインダー設定を取得（未設定時は初期値を返す）
   */
  async getBumpReminderSettingsOrDefault(
    guildId: string,
  ): Promise<BumpReminderSettings> {
    // 設定がなければ既定値を返し、呼び出し側の null 判定を不要化
    const config = await this.getBumpReminderSettings(guildId);
    if (!config) {
      return createDefaultBumpReminderSettings();
    }
    return config;
  }

  /**
   * Bumpリマインダー設定を永続化する
   */
  async saveBumpReminderSettings(
    guildId: string,
    config: BumpReminderSettings,
  ): Promise<void> {
    // 保存前に正規化して副作用のある参照共有を防止
    await this.guildSettingsRepository.updateBumpReminderSettings(
      guildId,
      normalizeBumpReminderSettings(config),
    );
  }

  /**
   * Bumpリマインダー機能の有効状態を更新する
   */
  async setBumpReminderEnabled(
    guildId: string,
    enabled: boolean,
    channelId?: string,
  ): Promise<void> {
    // enabled と channelId の更新責務は repository 実装へ委譲
    await this.guildSettingsRepository.setBumpReminderEnabled(
      guildId,
      enabled,
      channelId,
    );
  }

  /**
   * メンション対象ロールを設定する
   */
  async setBumpReminderMentionRole(
    guildId: string,
    roleId: string | undefined,
  ): Promise<BumpReminderMentionRoleResult> {
    return this.guildSettingsRepository.setBumpReminderMentionRole(
      guildId,
      roleId,
    );
  }

  /**
   * メンション対象ユーザーを追加する
   */
  async addBumpReminderMentionUser(
    guildId: string,
    userId: string,
  ): Promise<BumpReminderMentionUserAddResult> {
    return this.guildSettingsRepository.addBumpReminderMentionUser(
      guildId,
      userId,
    );
  }

  /**
   * メンション対象ユーザーを削除する
   */
  async removeBumpReminderMentionUser(
    guildId: string,
    userId: string,
  ): Promise<BumpReminderMentionUserRemoveResult> {
    return this.guildSettingsRepository.removeBumpReminderMentionUser(
      guildId,
      userId,
    );
  }

  /**
   * メンション対象ユーザー一覧をクリアする
   */
  async clearBumpReminderMentionUsers(
    guildId: string,
  ): Promise<BumpReminderMentionUsersClearResult> {
    return this.guildSettingsRepository.clearBumpReminderMentionUsers(guildId);
  }

  /**
   * ロール・ユーザー両方のメンション設定をクリアする
   */
  async clearBumpReminderMentions(
    guildId: string,
  ): Promise<BumpReminderMentionClearResult> {
    return this.guildSettingsRepository.clearBumpReminderMentions(guildId);
  }
}

/**
 * Bumpリマインダー設定サービスを依存注入で生成する
 */
export function createBumpReminderSettingsService(
  repository: IBumpReminderSettingsRepository,
): BumpReminderSettingsService {
  return new BumpReminderSettingsService(repository);
}

/**
 * Bumpリマインダー設定サービスのシングルトンを取得する
 */
export const getBumpReminderSettingsService: (
  repository?: IBumpReminderSettingsRepository,
) => BumpReminderSettingsService = createServiceGetter(
  createBumpReminderSettingsService,
  getBumpReminderSettingsRepository,
);
