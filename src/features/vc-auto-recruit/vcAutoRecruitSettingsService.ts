// src/features/vc-auto-recruit/vcAutoRecruitSettingsService.ts
// VC自動募集設定サービス実装（Repositoryパターン準拠）

import type {
  IVcAutoRecruitSettingsRepository,
  VcAutoRecruitRef,
  VcAutoRecruitSettings,
} from "../../shared/database/types";
import { createServiceGetter } from "../../shared/utils/serviceFactory";
import {
  createDefaultVcAutoRecruitSettings,
  DEFAULT_VC_AUTO_RECRUIT_SETTINGS,
  normalizeVcAutoRecruitSettings,
} from "./vcAutoRecruitSettingsDefaults";
import { getVcAutoRecruitSettingsRepository } from "./vcAutoRecruitSettingsRepository";

export type { VcAutoRecruitSettings };
export { DEFAULT_VC_AUTO_RECRUIT_SETTINGS };

/**
 * VC自動募集設定の取得・更新を担当するサービス
 */
export class VcAutoRecruitSettingsService {
  private readonly repository: IVcAutoRecruitSettingsRepository;
  constructor(repository: IVcAutoRecruitSettingsRepository) {
    this.repository = repository;
  }

  /**
   * VC自動募集設定を取得する
   * @param guildId 取得対象のギルドID
   * @returns 設定（未設定時は null）
   */
  async getVcAutoRecruitSettings(
    guildId: string,
  ): Promise<VcAutoRecruitSettings | null> {
    // 永続化設定を取得し、未設定時は null を返す
    return this.repository.getVcAutoRecruitSettings(guildId);
  }

  /**
   * VC自動募集設定を取得する（未設定時は初期値を返す）
   * @param guildId 取得対象のギルドID
   * @returns 設定（未設定時は既定値）
   */
  async getVcAutoRecruitSettingsOrDefault(
    guildId: string,
  ): Promise<VcAutoRecruitSettings> {
    // 未設定時は既定値を返し、呼び出し側の null 判定を不要化
    const config = await this.getVcAutoRecruitSettings(guildId);
    if (!config) {
      return createDefaultVcAutoRecruitSettings();
    }
    // 配列参照が共有されないよう正規化して返す
    return normalizeVcAutoRecruitSettings(config);
  }

  /**
   * 現在の設定を読み込み、指定フィールドを上書きして保存する
   * @param guildId 設定対象のギルドID
   * @param partial 上書きするフィールド
   */
  private async updatePartial(
    guildId: string,
    partial: Partial<VcAutoRecruitSettings>,
  ): Promise<void> {
    const current = await this.getVcAutoRecruitSettingsOrDefault(guildId);
    await this.repository.updateVcAutoRecruitSettings(guildId, {
      ...current,
      ...partial,
    });
  }

  /**
   * 投稿先（通知）チャンネルを設定する
   * @param guildId 設定対象のギルドID
   * @param channelId 投稿先チャンネルID
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
   * カスタム募集メッセージを設定する
   * @param guildId 設定対象のギルドID
   * @param message カスタム募集メッセージ文字列
   */
  async setMessage(guildId: string, message: string): Promise<void> {
    await this.updatePartial(guildId, { message });
  }

  /**
   * カスタム募集メッセージを削除する
   * @param guildId 設定対象のギルドID
   */
  async clearMessage(guildId: string): Promise<void> {
    await this.updatePartial(guildId, { message: undefined });
  }

  /**
   * 募集 Embed の有効/無効を切り替える
   * @param guildId 設定対象のギルドID
   * @param embedEnabled Embed を投稿に含めるか
   */
  async setEmbedEnabled(guildId: string, embedEnabled: boolean): Promise<void> {
    await this.updatePartial(guildId, { embedEnabled });
  }

  /**
   * 投稿先チャンネルをクリアして機能を無効化する
   * 投稿先チャンネルが削除されたときに呼び出す
   * @param guildId 設定対象のギルドID
   */
  async disableAndClearChannel(guildId: string): Promise<void> {
    await this.updatePartial(guildId, { channelId: undefined, enabled: false });
  }

  /**
   * 募集対象カテゴリ（allowlist）を追加する
   * @param guildId 設定対象のギルドID
   * @param categoryKey 追加するカテゴリ ID（ルートは sentinel "TOP"）
   * @returns 新規追加できた場合 true、既に有効だった場合 false
   */
  async addEnabledCategory(
    guildId: string,
    categoryKey: string,
  ): Promise<boolean> {
    const current = await this.getVcAutoRecruitSettingsOrDefault(guildId);
    // 既に有効なら何もしない（冪等）
    if (current.enabledCategoryIds.includes(categoryKey)) {
      return false;
    }
    const enabledCategoryIds = [...current.enabledCategoryIds, categoryKey];
    await this.updatePartial(guildId, { enabledCategoryIds });
    return true;
  }

  /**
   * 募集対象カテゴリ（allowlist）を解除する
   * @param guildId 設定対象のギルドID
   * @param categoryKey 解除するカテゴリ ID（ルートは sentinel "TOP"）
   * @returns 解除できた場合 true、未登録だった場合 false
   */
  async removeEnabledCategory(
    guildId: string,
    categoryKey: string,
  ): Promise<boolean> {
    const current = await this.getVcAutoRecruitSettingsOrDefault(guildId);
    const enabledCategoryIds = current.enabledCategoryIds.filter(
      (id) => id !== categoryKey,
    );
    // 変化がない（未登録）場合は保存をスキップ
    if (enabledCategoryIds.length === current.enabledCategoryIds.length) {
      return false;
    }
    await this.updatePartial(guildId, { enabledCategoryIds });
    return true;
  }

  /**
   * 募集対象カテゴリ（allowlist）を複数まとめて追加する
   * @param guildId 設定対象のギルドID
   * @param categoryKeys 追加するカテゴリ ID 群（ルートは sentinel "TOP"）
   * @returns 実際に新規追加できたカテゴリ ID の配列（既に追加済みのものは含まない）
   */
  async addEnabledCategories(
    guildId: string,
    categoryKeys: string[],
  ): Promise<string[]> {
    const current = await this.getVcAutoRecruitSettingsOrDefault(guildId);
    // 既に登録済みのものを除いた新規分だけを追加対象として確定する（重複・冪等）
    const existing = new Set(current.enabledCategoryIds);
    const added = [...new Set(categoryKeys)].filter((id) => !existing.has(id));
    // 変化がない場合は保存をスキップ
    if (added.length === 0) {
      return [];
    }
    const enabledCategoryIds = [...current.enabledCategoryIds, ...added];
    await this.updatePartial(guildId, { enabledCategoryIds });
    return added;
  }

  /**
   * 募集対象カテゴリ（allowlist）を複数まとめて解除する
   * @param guildId 設定対象のギルドID
   * @param categoryKeys 解除するカテゴリ ID 群（ルートは sentinel "TOP"）
   * @returns 実際に解除できたカテゴリ ID の配列（未登録だったものは含まない）
   */
  async removeEnabledCategories(
    guildId: string,
    categoryKeys: string[],
  ): Promise<string[]> {
    const current = await this.getVcAutoRecruitSettingsOrDefault(guildId);
    // 現在登録済みのものだけを解除対象として確定する（未登録は無視）
    const targets = new Set(categoryKeys);
    const removed = current.enabledCategoryIds.filter((id) => targets.has(id));
    // 変化がない場合は保存をスキップ
    if (removed.length === 0) {
      return [];
    }
    const removedSet = new Set(removed);
    const enabledCategoryIds = current.enabledCategoryIds.filter(
      (id) => !removedSet.has(id),
    );
    await this.updatePartial(guildId, { enabledCategoryIds });
    return removed;
  }

  /**
   * 設定をデフォルト状態へリセットする（追跡中の募集も破棄）
   * @param guildId 設定対象のギルドID
   */
  async resetToDefault(guildId: string): Promise<void> {
    await this.repository.updateVcAutoRecruitSettings(
      guildId,
      createDefaultVcAutoRecruitSettings(),
    );
  }

  /**
   * 追跡対象の募集メッセージ参照を追加する（同一 VC は置き換え）
   * @param guildId 設定対象のギルドID
   * @param ref 追加する募集メッセージ参照
   */
  async addActiveInvite(guildId: string, ref: VcAutoRecruitRef): Promise<void> {
    const current = await this.getVcAutoRecruitSettingsOrDefault(guildId);
    // 同一 VC の古い参照を除去してから追加（取りこぼし防止）
    const activeInvites = current.activeInvites.filter(
      (item) => item.voiceChannelId !== ref.voiceChannelId,
    );
    activeInvites.push(ref);
    await this.updatePartial(guildId, { activeInvites });
  }

  /**
   * 指定 VC の追跡対象募集メッセージ参照を取得する
   * @param guildId 設定対象のギルドID
   * @param voiceChannelId 対象のボイスチャンネルID
   * @returns 募集メッセージ参照（未登録時は undefined）
   */
  async getActiveInvite(
    guildId: string,
    voiceChannelId: string,
  ): Promise<VcAutoRecruitRef | undefined> {
    const current = await this.getVcAutoRecruitSettingsOrDefault(guildId);
    return current.activeInvites.find(
      (item) => item.voiceChannelId === voiceChannelId,
    );
  }

  /**
   * 指定 VC の追跡対象募集メッセージ参照を削除する
   * @param guildId 設定対象のギルドID
   * @param voiceChannelId 対象のボイスチャンネルID
   */
  async removeActiveInvite(
    guildId: string,
    voiceChannelId: string,
  ): Promise<void> {
    const current = await this.getVcAutoRecruitSettingsOrDefault(guildId);
    const activeInvites = current.activeInvites.filter(
      (item) => item.voiceChannelId !== voiceChannelId,
    );
    // 変化がない場合は保存をスキップ
    if (activeInvites.length === current.activeInvites.length) {
      return;
    }
    await this.updatePartial(guildId, { activeInvites });
  }
}

/**
 * VC自動募集設定サービスを依存注入で生成する
 * @param repository 利用するリポジトリ実装
 * @returns VcAutoRecruitSettingsService インスタンス
 */
export function createVcAutoRecruitSettingsService(
  repository: IVcAutoRecruitSettingsRepository,
): VcAutoRecruitSettingsService {
  return new VcAutoRecruitSettingsService(repository);
}

/**
 * VC自動募集設定サービスのシングルトンを取得する
 * @param repository 明示的に利用するリポジトリ（省略時は既定リポジトリ）
 * @returns VcAutoRecruitSettingsService シングルトン
 */
export const getVcAutoRecruitSettingsService: (
  repository?: IVcAutoRecruitSettingsRepository,
) => VcAutoRecruitSettingsService = createServiceGetter(
  createVcAutoRecruitSettingsService,
  getVcAutoRecruitSettingsRepository,
);
