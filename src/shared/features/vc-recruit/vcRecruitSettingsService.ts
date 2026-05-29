// src/shared/features/vc-recruit/vcRecruitSettingsService.ts
// VC募集設定のサービス実装（Repositoryパターン準拠）

import {
  type IVcRecruitSettingsRepository,
  VC_RECRUIT_MENTION_ROLE_ADD_RESULT,
  VC_RECRUIT_MENTION_ROLE_REMOVE_RESULT,
  type VcRecruitMentionRoleAddResult,
  type VcRecruitMentionRoleRemoveResult,
  type VcRecruitSettings,
  type VcRecruitSetup,
} from "../../database/types";
import { tDefault } from "../../locale/localeManager";
import { executeWithDatabaseError } from "../../utils/errorHandling";
import {
  createDefaultVcRecruitSettings,
  DEFAULT_THREAD_ARCHIVE_DURATION,
  DEFAULT_VC_RECRUIT_SETTINGS,
  MAX_MENTION_ROLES,
  normalizeVcRecruitSettings,
} from "./vcRecruitSettingsDefaults";

export { DEFAULT_VC_RECRUIT_SETTINGS };

/**
 * VC募集設定の取得・更新を担当するサービス
 */
export class VcRecruitSettingsService {
  private readonly vcRecruitRepository: IVcRecruitSettingsRepository;
  constructor(vcRecruitRepository: IVcRecruitSettingsRepository) {
    this.vcRecruitRepository = vcRecruitRepository;
  }

  /**
   * VC募集設定を取得（未設定時は初期値を返す）
   */
  async getVcRecruitSettingsOrDefault(
    guildId: string,
  ): Promise<VcRecruitSettings> {
    const config = await this.vcRecruitRepository.getVcRecruitSettings(guildId);
    if (!config) {
      return createDefaultVcRecruitSettings();
    }
    return normalizeVcRecruitSettings(config);
  }

  /**
   * VC募集設定を永続化する
   */
  async saveVcRecruitSettings(
    guildId: string,
    config: VcRecruitSettings,
  ): Promise<void> {
    await this.vcRecruitRepository.updateVcRecruitSettings(
      guildId,
      normalizeVcRecruitSettings(config),
    );
  }

  /**
   * セットアップを追加する
   */
  async addSetup(
    guildId: string,
    setup: Omit<VcRecruitSetup, "createdVoiceChannelIds">,
  ): Promise<VcRecruitSettings> {
    return executeWithDatabaseError(async () => {
      const config = await this.getVcRecruitSettingsOrDefault(guildId);
      const newSetup: VcRecruitSetup = {
        ...setup,
        createdVoiceChannelIds: [],
      };
      const updated: VcRecruitSettings = {
        ...config,
        enabled: true,
        setups: [...config.setups, newSetup],
      };
      await this.saveVcRecruitSettings(guildId, updated);
      return updated;
    }, tDefault("vcRecruit:log.database_setup_add_failed"));
  }

  /**
   * パネルメッセージIDを更新する
   */
  async updatePanelMessageId(
    guildId: string,
    panelChannelId: string,
    panelMessageId: string,
  ): Promise<VcRecruitSettings> {
    return executeWithDatabaseError(async () => {
      const config = await this.getVcRecruitSettingsOrDefault(guildId);
      const updated: VcRecruitSettings = {
        ...config,
        setups: config.setups.map((s) =>
          s.panelChannelId === panelChannelId ? { ...s, panelMessageId } : s,
        ),
      };
      await this.saveVcRecruitSettings(guildId, updated);
      return updated;
    }, tDefault("vcRecruit:log.database_panel_message_update_failed"));
  }

  /**
   * セットアップを削除する（panelChannelId で特定）
   */
  async removeSetup(
    guildId: string,
    panelChannelId: string,
  ): Promise<VcRecruitSettings> {
    return executeWithDatabaseError(async () => {
      const config = await this.getVcRecruitSettingsOrDefault(guildId);
      const updated: VcRecruitSettings = {
        ...config,
        setups: config.setups.filter(
          (s) => s.panelChannelId !== panelChannelId,
        ),
      };
      await this.saveVcRecruitSettings(guildId, updated);
      return updated;
    }, tDefault("vcRecruit:log.database_setup_remove_failed"));
  }

  /**
   * カテゴリーIDでセットアップを検索する
   */
  async findSetupByCategoryId(
    guildId: string,
    categoryId: string | null,
  ): Promise<VcRecruitSetup | null> {
    const config = await this.getVcRecruitSettingsOrDefault(guildId);
    return config.setups.find((s) => s.categoryId === categoryId) ?? null;
  }

  /**
   * パネルチャンネルIDでセットアップを検索する
   */
  async findSetupByPanelChannelId(
    guildId: string,
    panelChannelId: string,
  ): Promise<VcRecruitSetup | null> {
    const config = await this.getVcRecruitSettingsOrDefault(guildId);
    return (
      config.setups.find((s) => s.panelChannelId === panelChannelId) ?? null
    );
  }

  /**
   * 投稿チャンネルIDでセットアップを検索する
   */
  async findSetupByPostChannelId(
    guildId: string,
    postChannelId: string,
  ): Promise<VcRecruitSetup | null> {
    const config = await this.getVcRecruitSettingsOrDefault(guildId);
    return config.setups.find((s) => s.postChannelId === postChannelId) ?? null;
  }

  /**
   * createdVoiceChannelIds にVCを追加する
   */
  async addCreatedVoiceChannelId(
    guildId: string,
    panelChannelId: string,
    voiceChannelId: string,
  ): Promise<VcRecruitSettings> {
    return executeWithDatabaseError(async () => {
      const config = await this.getVcRecruitSettingsOrDefault(guildId);
      const updated: VcRecruitSettings = {
        ...config,
        setups: config.setups.map((s) =>
          s.panelChannelId === panelChannelId
            ? {
                ...s,
                createdVoiceChannelIds: [
                  ...s.createdVoiceChannelIds,
                  voiceChannelId,
                ],
              }
            : s,
        ),
      };
      await this.saveVcRecruitSettings(guildId, updated);
      return updated;
    }, tDefault("vcRecruit:log.database_vc_add_failed"));
  }

  /**
   * createdVoiceChannelIds からVCを削除する
   */
  async removeCreatedVoiceChannelId(
    guildId: string,
    voiceChannelId: string,
  ): Promise<VcRecruitSettings> {
    return executeWithDatabaseError(async () => {
      const config = await this.getVcRecruitSettingsOrDefault(guildId);
      const updated: VcRecruitSettings = {
        ...config,
        setups: config.setups.map((s) => ({
          ...s,
          createdVoiceChannelIds: s.createdVoiceChannelIds.filter(
            (id) => id !== voiceChannelId,
          ),
        })),
      };
      await this.saveVcRecruitSettings(guildId, updated);
      return updated;
    }, tDefault("vcRecruit:log.database_vc_remove_failed"));
  }

  /**
   * voiceChannelId を含むセットアップを返す（見つからければ null）
   */
  async findSetupByCreatedVcId(
    guildId: string,
    voiceChannelId: string,
  ): Promise<VcRecruitSetup | null> {
    const config = await this.getVcRecruitSettingsOrDefault(guildId);
    return (
      config.setups.find((s) =>
        s.createdVoiceChannelIds.includes(voiceChannelId),
      ) ?? null
    );
  }

  /**
   * 指定VCがVC募集で作成されたVCか判定する
   */
  async isCreatedVcRecruitChannel(
    guildId: string,
    voiceChannelId: string,
  ): Promise<boolean> {
    const setup = await this.findSetupByCreatedVcId(guildId, voiceChannelId);
    return setup !== null;
  }

  /**
   * メンションロールを追加する
   */
  async addMentionRoleId(
    guildId: string,
    roleId: string,
  ): Promise<VcRecruitMentionRoleAddResult> {
    return executeWithDatabaseError(async () => {
      const config = await this.getVcRecruitSettingsOrDefault(guildId);
      if (config.mentionRoleIds.includes(roleId))
        return VC_RECRUIT_MENTION_ROLE_ADD_RESULT.ALREADY_EXISTS;
      if (config.mentionRoleIds.length >= MAX_MENTION_ROLES)
        return VC_RECRUIT_MENTION_ROLE_ADD_RESULT.LIMIT_EXCEEDED;
      const updated: VcRecruitSettings = {
        ...config,
        mentionRoleIds: [...config.mentionRoleIds, roleId],
      };
      await this.saveVcRecruitSettings(guildId, updated);
      return VC_RECRUIT_MENTION_ROLE_ADD_RESULT.ADDED;
    }, tDefault("vcRecruit:log.database_role_add_failed"));
  }

  /**
   * メンションロールを削除する
   */
  async removeMentionRoleId(
    guildId: string,
    roleId: string,
  ): Promise<VcRecruitMentionRoleRemoveResult> {
    return executeWithDatabaseError(async () => {
      const config = await this.getVcRecruitSettingsOrDefault(guildId);
      if (!config.mentionRoleIds.includes(roleId))
        return VC_RECRUIT_MENTION_ROLE_REMOVE_RESULT.NOT_FOUND;
      const updated: VcRecruitSettings = {
        ...config,
        mentionRoleIds: config.mentionRoleIds.filter((id) => id !== roleId),
      };
      await this.saveVcRecruitSettings(guildId, updated);
      return VC_RECRUIT_MENTION_ROLE_REMOVE_RESULT.REMOVED;
    }, tDefault("vcRecruit:log.database_role_remove_failed"));
  }

  /** デフォルトのスレッドアーカイブ時間 */
  static readonly DEFAULT_THREAD_ARCHIVE_DURATION: typeof DEFAULT_THREAD_ARCHIVE_DURATION =
    DEFAULT_THREAD_ARCHIVE_DURATION;
}

/**
 * VcRecruitSettingsService インスタンスを生成する
 */
export function createVcRecruitSettingsService(
  repository: IVcRecruitSettingsRepository,
): VcRecruitSettingsService {
  return new VcRecruitSettingsService(repository);
}
