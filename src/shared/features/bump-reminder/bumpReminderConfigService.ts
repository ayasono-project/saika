// src/shared/features/bump-reminder/bumpReminderConfigService.ts
// Bumpリマインダー設定サービス実装（Repositoryパターン準拠）

import { getBumpReminderConfigRepository } from "../../database/repositories/bumpReminderConfigRepository";
import {
  BUMP_REMINDER_MENTION_CLEAR_RESULT,
  BUMP_REMINDER_MENTION_ROLE_RESULT,
  BUMP_REMINDER_MENTION_USER_ADD_RESULT,
  BUMP_REMINDER_MENTION_USER_REMOVE_RESULT,
  BUMP_REMINDER_MENTION_USERS_CLEAR_RESULT,
  type BumpReminderConfig,
  type BumpReminderMentionClearResult,
  type BumpReminderMentionRoleResult,
  type BumpReminderMentionUserAddResult,
  type BumpReminderMentionUserRemoveResult,
  type BumpReminderMentionUsersClearResult,
  type IBumpReminderConfigRepository,
} from "../../database/types";
import { createServiceGetter } from "../../utils/serviceFactory";
import {
  createDefaultBumpReminderConfig,
  DEFAULT_BUMP_REMINDER_CONFIG,
  normalizeBumpReminderConfig,
} from "./bumpReminderConfigDefaults";

export type {
  BumpReminderConfig,
  BumpReminderMentionClearResult,
  BumpReminderMentionRoleResult,
  BumpReminderMentionUserAddResult,
  BumpReminderMentionUserRemoveResult,
  BumpReminderMentionUsersClearResult,
};
export {
  BUMP_REMINDER_MENTION_CLEAR_RESULT,
  BUMP_REMINDER_MENTION_ROLE_RESULT,
  BUMP_REMINDER_MENTION_USER_ADD_RESULT,
  BUMP_REMINDER_MENTION_USER_REMOVE_RESULT,
  BUMP_REMINDER_MENTION_USERS_CLEAR_RESULT,
  DEFAULT_BUMP_REMINDER_CONFIG,
};

/**
 * Bumpリマインダー設定の取得・更新を担当するサービス
 */
export class BumpReminderConfigService {
  private readonly guildConfigRepository: IBumpReminderConfigRepository;
  constructor(guildConfigRepository: IBumpReminderConfigRepository) {
    this.guildConfigRepository = guildConfigRepository;
  }

  /**
   * Bumpリマインダー設定を取得する
   */
  async getBumpReminderConfig(
    guildId: string,
  ): Promise<BumpReminderConfig | null> {
    // 永続化設定を取得
    const config =
      await this.guildConfigRepository.getBumpReminderConfig(guildId);
    // 未設定時は null を返し、呼び出し側に初期化判断を委ねる
    if (!config) {
      return null;
    }
    // 配列参照共有を避けるため正規化して返す
    return normalizeBumpReminderConfig(config);
  }

  /**
   * Bumpリマインダー設定を取得（未設定時は初期値を返す）
   */
  async getBumpReminderConfigOrDefault(
    guildId: string,
  ): Promise<BumpReminderConfig> {
    // 設定がなければ既定値を返し、呼び出し側の null 判定を不要化
    const config = await this.getBumpReminderConfig(guildId);
    if (!config) {
      return createDefaultBumpReminderConfig();
    }
    return config;
  }

  /**
   * Bumpリマインダー設定を永続化する
   */
  async saveBumpReminderConfig(
    guildId: string,
    config: BumpReminderConfig,
  ): Promise<void> {
    // 保存前に正規化して副作用のある参照共有を防止
    await this.guildConfigRepository.updateBumpReminderConfig(
      guildId,
      normalizeBumpReminderConfig(config),
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
    await this.guildConfigRepository.setBumpReminderEnabled(
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
    return this.guildConfigRepository.setBumpReminderMentionRole(
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
    return this.guildConfigRepository.addBumpReminderMentionUser(
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
    return this.guildConfigRepository.removeBumpReminderMentionUser(
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
    return this.guildConfigRepository.clearBumpReminderMentionUsers(guildId);
  }

  /**
   * ロール・ユーザー両方のメンション設定をクリアする
   */
  async clearBumpReminderMentions(
    guildId: string,
  ): Promise<BumpReminderMentionClearResult> {
    return this.guildConfigRepository.clearBumpReminderMentions(guildId);
  }
}

/**
 * Bumpリマインダー設定サービスを依存注入で生成する
 */
export function createBumpReminderConfigService(
  repository: IBumpReminderConfigRepository,
): BumpReminderConfigService {
  return new BumpReminderConfigService(repository);
}

/**
 * Bumpリマインダー設定サービスのシングルトンを取得する
 */
export const getBumpReminderConfigService: (
  repository?: IBumpReminderConfigRepository,
) => BumpReminderConfigService = createServiceGetter(
  createBumpReminderConfigService,
  getBumpReminderConfigRepository,
);
