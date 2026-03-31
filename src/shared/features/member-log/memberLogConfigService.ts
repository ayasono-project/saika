// src/shared/features/member-log/memberLogConfigService.ts
// メンバーログ設定サービス実装（Repositoryパターン準拠）

import { getMemberLogConfigRepository } from "../../database/repositories/memberLogConfigRepository";
import type {
  IMemberLogConfigRepository,
  MemberLogConfig,
} from "../../database/types";
import { createServiceGetter } from "../../utils/serviceFactory";
import {
  createDefaultMemberLogConfig,
  DEFAULT_MEMBER_LOG_CONFIG,
} from "./memberLogConfigDefaults";

export type { MemberLogConfig };
export { DEFAULT_MEMBER_LOG_CONFIG };

/**
 * メンバーログ設定の取得・更新を担当するサービス
 */
export class MemberLogConfigService {
  private readonly repository: IMemberLogConfigRepository;
  constructor(repository: IMemberLogConfigRepository) {
    this.repository = repository;
  }

  /**
   * メンバーログ設定を取得する
   * @param guildId 取得対象のギルドID
   * @returns メンバーログ設定（未設定時は null）
   */
  async getMemberLogConfig(guildId: string): Promise<MemberLogConfig | null> {
    // 永続化設定を取得し、未設定時は null を返す
    return this.repository.getMemberLogConfig(guildId);
  }

  /**
   * メンバーログ設定を取得する（未設定時は初期値を返す）
   * @param guildId 取得対象のギルドID
   * @returns メンバーログ設定（未設定時は既定値）
   */
  async getMemberLogConfigOrDefault(guildId: string): Promise<MemberLogConfig> {
    // 未設定時は既定値を返し、呼び出し側の null 判定を不要化
    const config = await this.getMemberLogConfig(guildId);
    if (!config) {
      return createDefaultMemberLogConfig();
    }
    return config;
  }

  /**
   * 現在の設定を読み込み、指定フィールドを上書きして保存する
   * @param guildId 設定対象のギルドID
   * @param partial 上書きするフィールド
   */
  private async updatePartial(
    guildId: string,
    partial: Partial<MemberLogConfig>,
  ): Promise<void> {
    const current = await this.getMemberLogConfigOrDefault(guildId);
    await this.repository.updateMemberLogConfig(guildId, {
      ...current,
      ...partial,
    });
  }

  /**
   * 通知チャンネルを設定する
   * @param guildId 設定対象のギルドID
   * @param channelId 通知先チャンネルID
   */
  async setChannelId(guildId: string, channelId: string): Promise<void> {
    await this.updatePartial(guildId, { channelId });
  }

  /**
   * 機能の有効/無効を切り替える
   * @param guildId 設定対象のギルドID
   * @param enabled 有効化するか
   */
  async setEnabled(guildId: string, enabled: boolean): Promise<void> {
    await this.updatePartial(guildId, { enabled });
  }

  /**
   * カスタム参加メッセージを設定する
   * @param guildId 設定対象のギルドID
   * @param message カスタム参加メッセージ文字列
   */
  async setJoinMessage(guildId: string, message: string): Promise<void> {
    await this.updatePartial(guildId, { joinMessage: message });
  }

  /**
   * カスタム退出メッセージを設定する
   * @param guildId 設定対象のギルドID
   * @param message カスタム退出メッセージ文字列
   */
  async setLeaveMessage(guildId: string, message: string): Promise<void> {
    await this.updatePartial(guildId, { leaveMessage: message });
  }

  /**
   * カスタム参加メッセージを削除する
   * @param guildId 設定対象のギルドID
   */
  async clearJoinMessage(guildId: string): Promise<void> {
    await this.updatePartial(guildId, { joinMessage: undefined });
  }

  /**
   * カスタム退出メッセージを削除する
   * @param guildId 設定対象のギルドID
   */
  async clearLeaveMessage(guildId: string): Promise<void> {
    await this.updatePartial(guildId, { leaveMessage: undefined });
  }

  /**
   * 通知チャンネルをクリアして機能を無効化する
   * ログチャンネルが削除されたときに呼び出す
   * @param guildId 設定対象のギルドID
   */
  async disableAndClearChannel(guildId: string): Promise<void> {
    await this.updatePartial(guildId, { channelId: undefined, enabled: false });
  }
}

/**
 * メンバーログ設定サービスを依存注入で生成する
 * @param repository 利用するリポジトリ実装
 * @returns MemberLogConfigService インスタンス
 */
export function createMemberLogConfigService(
  repository: IMemberLogConfigRepository,
): MemberLogConfigService {
  return new MemberLogConfigService(repository);
}

/**
 * メンバーログ設定サービスのシングルトンを取得する
 * @param repository 明示的に利用するリポジトリ（省略時は既定リポジトリ）
 * @returns MemberLogConfigService シングルトン
 */
export const getMemberLogConfigService: (
  repository?: IMemberLogConfigRepository,
) => MemberLogConfigService = createServiceGetter(
  createMemberLogConfigService,
  getMemberLogConfigRepository,
);
