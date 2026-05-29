// src/features/reaction-role/reactionRolePanelRepository.ts
// リアクションロールパネルリポジトリ（Prisma実装。guild_reaction_role_panels テーブル）

import { Prisma, type PrismaClient } from "@prisma/client";
import type {
  GuildReactionRolePanel,
  IReactionRolePanelRepository,
} from "../../shared/database/types";
import { tDefault } from "../../shared/locale/localeManager";
import { executeWithDatabaseError } from "../../shared/utils/errorHandling";
import { createRepositoryGetter } from "../../shared/utils/serviceFactory";

/**
 * リアクションロールパネルのDB永続化を担当するリポジトリ
 */
export class ReactionRolePanelRepository
  implements IReactionRolePanelRepository
{
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findById(id: string): Promise<GuildReactionRolePanel | null> {
    return executeWithDatabaseError(
      () =>
        this.prisma.guildReactionRolePanel.findUnique({
          where: { id },
        }),
      tDefault("reactionRole:log.database_panel_find_failed", {
        guildId: "",
        panelId: id,
      }),
    ) as unknown as Promise<GuildReactionRolePanel | null>;
  }

  async findAllByGuild(guildId: string): Promise<GuildReactionRolePanel[]> {
    return executeWithDatabaseError(
      () =>
        this.prisma.guildReactionRolePanel.findMany({
          where: { guildId },
        }),
      tDefault("reactionRole:log.database_panel_find_failed", {
        guildId,
        panelId: "",
      }),
    ) as unknown as Promise<GuildReactionRolePanel[]>;
  }

  async create(
    data: Omit<GuildReactionRolePanel, "id" | "createdAt" | "updatedAt">,
  ): Promise<GuildReactionRolePanel> {
    return executeWithDatabaseError(
      () =>
        this.prisma.guildReactionRolePanel.create({
          data: {
            ...data,
            buttons: data.buttons as unknown as Prisma.InputJsonValue,
          },
        }),
      tDefault("reactionRole:log.database_panel_save_failed", {
        guildId: data.guildId,
        panelId: "",
      }),
    ) as unknown as Promise<GuildReactionRolePanel>;
  }

  async update(
    id: string,
    data: Partial<GuildReactionRolePanel>,
  ): Promise<GuildReactionRolePanel> {
    // buttons は jsonb のため Prisma 入力型に合わせて分離して扱う
    const { buttons, ...rest } = data;
    return executeWithDatabaseError(
      () =>
        this.prisma.guildReactionRolePanel.update({
          where: { id },
          data: {
            ...rest,
            ...(buttons !== undefined
              ? { buttons: buttons as unknown as Prisma.InputJsonValue }
              : {}),
          },
        }),
      tDefault("reactionRole:log.database_panel_save_failed", {
        guildId: "",
        panelId: id,
      }),
    ) as unknown as Promise<GuildReactionRolePanel>;
  }

  async delete(id: string): Promise<void> {
    await executeWithDatabaseError(
      () =>
        this.prisma.guildReactionRolePanel.delete({
          where: { id },
        }),
      tDefault("reactionRole:log.database_panel_delete_failed", {
        guildId: "",
        panelId: id,
      }),
    );
  }

  async deleteAllByGuild(guildId: string): Promise<number> {
    const result = await executeWithDatabaseError(
      () =>
        this.prisma.guildReactionRolePanel.deleteMany({
          where: { guildId },
        }),
      tDefault("reactionRole:log.database_panel_delete_failed", {
        guildId,
        panelId: "",
      }),
    );
    return result.count;
  }
}

/**
 * リアクションロールパネルリポジトリのシングルトンを取得する
 * @param prisma 初回呼び出し時に必要なPrismaClientインスタンス
 * @returns リポジトリのシングルトンインスタンス
 */
export const getReactionRolePanelRepository: (
  prisma?: PrismaClient,
) => IReactionRolePanelRepository =
  createRepositoryGetter<IReactionRolePanelRepository>(
    "ReactionRolePanelRepository",
    (prisma) => new ReactionRolePanelRepository(prisma),
  );
