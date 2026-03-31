// src/shared/features/ticket/ticketConfigService.ts
// チケット設定サービス（Repositoryパターン準拠）

import type {
  GuildTicketConfig,
  IGuildTicketConfigRepository,
} from "../../database/types";

/**
 * チケット設定の永続化アクセスを担当するサービス
 */
export class TicketConfigService {
  private readonly repository: IGuildTicketConfigRepository;

  /**
   * TicketConfigService を初期化する
   * @param repository チケット設定リポジトリ
   */
  constructor(repository: IGuildTicketConfigRepository) {
    this.repository = repository;
  }

  /**
   * ギルドとカテゴリで設定を取得する
   * @param guildId ギルドID
   * @param categoryId カテゴリID
   * @returns チケット設定（未設定時は null）
   */
  async findByGuildAndCategory(
    guildId: string,
    categoryId: string,
  ): Promise<GuildTicketConfig | null> {
    return this.repository.findByGuildAndCategory(guildId, categoryId);
  }

  /**
   * ギルド内の全設定を取得する
   * @param guildId ギルドID
   * @returns チケット設定の配列
   */
  async findAllByGuild(guildId: string): Promise<GuildTicketConfig[]> {
    return this.repository.findAllByGuild(guildId);
  }

  /**
   * 設定を新規作成する
   * @param config 作成するチケット設定
   * @returns 作成されたチケット設定
   */
  async create(config: GuildTicketConfig): Promise<GuildTicketConfig> {
    return this.repository.create(config);
  }

  /**
   * 設定を更新する
   * @param guildId ギルドID
   * @param categoryId カテゴリID
   * @param data 更新データ
   * @returns 更新後のチケット設定
   */
  async update(
    guildId: string,
    categoryId: string,
    data: Partial<GuildTicketConfig>,
  ): Promise<GuildTicketConfig> {
    return this.repository.update(guildId, categoryId, data);
  }

  /**
   * 設定を削除する
   * @param guildId ギルドID
   * @param categoryId カテゴリID
   */
  async delete(guildId: string, categoryId: string): Promise<void> {
    return this.repository.delete(guildId, categoryId);
  }

  /**
   * ギルドの全設定を削除する
   * @param guildId ギルドID
   * @returns 削除された設定数
   */
  async deleteAllByGuild(guildId: string): Promise<number> {
    return this.repository.deleteAllByGuild(guildId);
  }

  /**
   * チケットカウンターをインクリメントして新しい値を返す
   * @param guildId ギルドID
   * @param categoryId カテゴリID
   * @returns インクリメント後のカウンター値
   */
  async incrementCounter(guildId: string, categoryId: string): Promise<number> {
    return this.repository.incrementCounter(guildId, categoryId);
  }
}

/**
 * IGuildTicketConfigRepository からサービスを生成する
 * @param repository チケット設定リポジトリ
 * @returns TicketConfigService インスタンス
 */
export function createTicketConfigService(
  repository: IGuildTicketConfigRepository,
): TicketConfigService {
  return new TicketConfigService(repository);
}
