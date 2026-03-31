// src/bot/features/vc-recruit/repositories/vcRecruitRepository.ts
// VC募集機能向けの永続化アクセスリポジトリ

import {
  type VcRecruitConfig,
  type VcRecruitSetup,
} from "../../../../shared/database/types";
import { type VcRecruitConfigService } from "../../../../shared/features/vc-recruit/vcRecruitConfigService";

/**
 * VC募集機能が必要とする永続化アクセスの抽象
 */
export interface IVcRecruitRepository {
  getVcRecruitConfigOrDefault(guildId: string): Promise<VcRecruitConfig>;
  saveVcRecruitConfig(guildId: string, config: VcRecruitConfig): Promise<void>;
  addSetup(
    guildId: string,
    setup: Omit<VcRecruitSetup, "createdVoiceChannelIds">,
  ): Promise<VcRecruitConfig>;
  removeSetup(
    guildId: string,
    panelChannelId: string,
  ): Promise<VcRecruitConfig>;
  findSetupByCategoryId(
    guildId: string,
    categoryId: string | null,
  ): Promise<VcRecruitSetup | null>;
  findSetupByPanelChannelId(
    guildId: string,
    panelChannelId: string,
  ): Promise<VcRecruitSetup | null>;
  findSetupByPostChannelId(
    guildId: string,
    postChannelId: string,
  ): Promise<VcRecruitSetup | null>;
  updatePanelMessageId(
    guildId: string,
    panelChannelId: string,
    panelMessageId: string,
  ): Promise<VcRecruitConfig>;
  findSetupByCreatedVcId(
    guildId: string,
    voiceChannelId: string,
  ): Promise<VcRecruitSetup | null>;
  addCreatedVoiceChannelId(
    guildId: string,
    panelChannelId: string,
    voiceChannelId: string,
  ): Promise<VcRecruitConfig>;
  removeCreatedVoiceChannelId(
    guildId: string,
    voiceChannelId: string,
  ): Promise<VcRecruitConfig>;
  isCreatedVcRecruitChannel(
    guildId: string,
    voiceChannelId: string,
  ): Promise<boolean>;
  addMentionRoleId(
    guildId: string,
    roleId: string,
  ): Promise<"added" | "already_exists" | "limit_exceeded">;
  removeMentionRoleId(
    guildId: string,
    roleId: string,
  ): Promise<"removed" | "not_found">;
}

/**
 * VcRecruitConfigService を注入して VC募集リポジトリを生成する
 */
export function createVcRecruitRepository(
  service: VcRecruitConfigService,
): IVcRecruitRepository {
  return {
    getVcRecruitConfigOrDefault: (guildId) =>
      service.getVcRecruitConfigOrDefault(guildId),
    saveVcRecruitConfig: (guildId, config) =>
      service.saveVcRecruitConfig(guildId, config),
    addSetup: (guildId, setup) => service.addSetup(guildId, setup),
    removeSetup: (guildId, panelChannelId) =>
      service.removeSetup(guildId, panelChannelId),
    findSetupByCategoryId: (guildId, categoryId) =>
      service.findSetupByCategoryId(guildId, categoryId),
    findSetupByPanelChannelId: (guildId, panelChannelId) =>
      service.findSetupByPanelChannelId(guildId, panelChannelId),
    findSetupByPostChannelId: (guildId, postChannelId) =>
      service.findSetupByPostChannelId(guildId, postChannelId),
    updatePanelMessageId: (guildId, panelChannelId, panelMessageId) =>
      service.updatePanelMessageId(guildId, panelChannelId, panelMessageId),
    findSetupByCreatedVcId: (guildId, voiceChannelId) =>
      service.findSetupByCreatedVcId(guildId, voiceChannelId),
    addCreatedVoiceChannelId: (guildId, panelChannelId, voiceChannelId) =>
      service.addCreatedVoiceChannelId(guildId, panelChannelId, voiceChannelId),
    removeCreatedVoiceChannelId: (guildId, voiceChannelId) =>
      service.removeCreatedVoiceChannelId(guildId, voiceChannelId),
    isCreatedVcRecruitChannel: (guildId, voiceChannelId) =>
      service.isCreatedVcRecruitChannel(guildId, voiceChannelId),
    addMentionRoleId: (guildId, roleId) =>
      service.addMentionRoleId(guildId, roleId),
    removeMentionRoleId: (guildId, roleId) =>
      service.removeMentionRoleId(guildId, roleId),
  };
}

// シングルトンキャッシュ
let cachedRepository: IVcRecruitRepository | undefined;

/**
 * キャッシュ済みリポジトリを設定する
 */
export function setVcRecruitRepository(repo: IVcRecruitRepository): void {
  cachedRepository = repo;
}

/**
 * キャッシュ済みリポジトリを取得する
 */
export function getVcRecruitRepository(): IVcRecruitRepository {
  if (!cachedRepository) {
    throw new Error(
      "VcRecruitRepository is not initialized. Initialize in composition root first.",
    );
  }
  return cachedRepository;
}
