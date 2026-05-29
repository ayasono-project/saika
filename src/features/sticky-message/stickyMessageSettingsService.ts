// src/shared/features/sticky-message/stickyMessageSettingsService.ts
// スティッキーメッセージ設定サービス（Repositoryパターン準拠）

import type {
  IStickyMessageRepository,
  StickyEmbedData,
  StickyMessage,
} from "../../shared/database/types";

export type { StickyMessage };

/**
 * スティッキーメッセージの永続化アクセスを担当するサービス
 */
export class StickyMessageSettingsService {
  private readonly repository: IStickyMessageRepository;
  constructor(repository: IStickyMessageRepository) {
    this.repository = repository;
  }

  /**
   * チャンネル ID でスティッキーメッセージ設定を取得する
   */
  async findByChannel(channelId: string): Promise<StickyMessage | null> {
    return this.repository.findByChannel(channelId);
  }

  /**
   * ギルド内の全スティッキーメッセージ設定を取得する
   */
  async findAllByGuild(guildId: string): Promise<StickyMessage[]> {
    return this.repository.findAllByGuild(guildId);
  }

  /**
   * スティッキーメッセージ設定を新規作成する
   */
  async create(
    guildId: string,
    channelId: string,
    content: string,
    embedData?: StickyEmbedData,
    updatedBy?: string,
  ): Promise<StickyMessage> {
    return this.repository.create(
      guildId,
      channelId,
      content,
      embedData,
      updatedBy,
    );
  }

  /**
   * 最後に送信したメッセージ ID を更新する
   */
  async updateLastMessageId(id: string, lastMessageId: string): Promise<void> {
    return this.repository.updateLastMessageId(id, lastMessageId);
  }

  /**
   * スティッキーメッセージの内容を更新する
   */
  async updateContent(
    id: string,
    content: string,
    embedData: StickyEmbedData | null,
    updatedBy?: string,
  ): Promise<StickyMessage> {
    return this.repository.updateContent(id, content, embedData, updatedBy);
  }

  /**
   * スティッキーメッセージ設定を削除する
   */
  async delete(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  /**
   * チャンネルに紐づくスティッキーメッセージ設定を削除する
   */
  async deleteByChannel(channelId: string): Promise<number> {
    return this.repository.deleteByChannel(channelId);
  }
}

/**
 * IStickyMessageRepository からサービスを生成する
 */
export function createStickyMessageSettingsService(
  repository: IStickyMessageRepository,
): StickyMessageSettingsService {
  return new StickyMessageSettingsService(repository);
}
