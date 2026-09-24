// ギルド親レコードの登録リポジトリ（guilds テーブル）

import type { PrismaClient } from "@prisma/client";
import type { IGuildRegistryRepository } from "../../shared/database/types";
import { createRepositoryGetter } from "../../shared/utils/serviceFactory";

/**
 * guilds テーブルへギルドの親レコードを登録するリポジトリ
 *
 * 全機能テーブルが guilds へ FK を張っているため、**親行が無いギルドでは
 * どの機能の設定も保存できない**（FK 違反で落ちる）。参加時（guildCreate）と
 * 起動時スイープの2経路からここを呼び、親行が必ず存在する状態を保つ。
 */
export class GuildRegistryRepository implements IGuildRegistryRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async ensureGuild(guildId: string): Promise<void> {
    await this.prisma.guild.upsert({
      where: { guildId },
      create: { guildId },
      // 既存行には触らない。再参加のたびに joinedAt を上書きすると
      // 「いつから導入されているか」が失われる
      update: {},
    });
  }

  async ensureGuilds(guildIds: string[]): Promise<void> {
    // createMany は空配列でもクエリを投げるため、呼ばずに済ませる
    if (guildIds.length === 0) return;

    await this.prisma.guild.createMany({
      data: guildIds.map((guildId) => ({ guildId })),
      skipDuplicates: true,
    });
  }
}

/**
 * ギルド親レコード登録リポジトリのシングルトンを取得する
 */
export const getGuildRegistryRepository: (
  prisma?: PrismaClient,
) => IGuildRegistryRepository =
  createRepositoryGetter<IGuildRegistryRepository>(
    "GuildRegistryRepository",
    (prisma) => new GuildRegistryRepository(prisma),
  );
