// src/shared/features/reaction-role/reactionRolePanelConfigService.ts
// リアクションロールパネル設定サービス（Repositoryパターン準拠）

import type {
  GuildReactionRolePanel,
  IReactionRolePanelRepository,
} from "../../database/types";

/**
 * リアクションロールパネルの永続化アクセスを担当するサービス
 */
export class ReactionRolePanelConfigService {
  private readonly repository: IReactionRolePanelRepository;
  constructor(repository: IReactionRolePanelRepository) {
    this.repository = repository;
  }

  /**
   * IDでパネルを取得する
   * @param id パネルID
   * @returns パネル情報、存在しない場合はnull
   */
  async findById(id: string): Promise<GuildReactionRolePanel | null> {
    return this.repository.findById(id);
  }

  /**
   * ギルド内の全パネルを取得する
   * @param guildId ギルドID
   * @returns パネル情報の配列
   */
  async findAllByGuild(guildId: string): Promise<GuildReactionRolePanel[]> {
    return this.repository.findAllByGuild(guildId);
  }

  /**
   * パネルを新規作成する
   * @param data パネル作成データ（id, createdAt, updatedAt を除く）
   * @returns 作成されたパネル情報
   */
  async create(
    data: Omit<GuildReactionRolePanel, "id" | "createdAt" | "updatedAt">,
  ): Promise<GuildReactionRolePanel> {
    return this.repository.create(data);
  }

  /**
   * パネルを更新する
   * @param id パネルID
   * @param data 更新するフィールド
   * @returns 更新後のパネル情報
   */
  async update(
    id: string,
    data: Partial<GuildReactionRolePanel>,
  ): Promise<GuildReactionRolePanel> {
    return this.repository.update(id, data);
  }

  /**
   * パネルを削除する
   * @param id パネルID
   */
  async delete(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  /**
   * ギルドの全パネルを削除する
   * @param guildId ギルドID
   * @returns 削除されたパネル数
   */
  async deleteAllByGuild(guildId: string): Promise<number> {
    return this.repository.deleteAllByGuild(guildId);
  }
}

/**
 * IReactionRolePanelRepository からサービスを生成する
 * @param repository リアクションロールパネルリポジトリ
 * @returns 生成されたサービスインスタンス
 */
export function createReactionRolePanelConfigService(
  repository: IReactionRolePanelRepository,
): ReactionRolePanelConfigService {
  return new ReactionRolePanelConfigService(repository);
}
