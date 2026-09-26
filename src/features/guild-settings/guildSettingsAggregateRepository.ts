// ギルド設定一括操作リポジトリ（reset-all）

import type { PrismaClient } from "@prisma/client";
import type { IGuildSettingsAggregateRepository } from "../../shared/database/types";

/**
 * 全機能設定の一括削除を担当するリポジトリ
 */
export class GuildSettingsAggregateRepository
  implements IGuildSettingsAggregateRepository
{
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * ギルド設定と全機能設定を一括削除する（reset-all 用）
   *
   * `guilds` の親行を削除し、FK の `onDelete: Cascade` で全機能テーブルを落とす。
   * **Bot はまだこのギルドに居る**ので、親行は同じ `joinedAt` で作り直して登録を
   * 保つ（親行が無いと以降どの設定も保存できない）。削除と再作成は同一
   * トランザクションで行い、途中で失敗しても登録が失われないようにしている。
   *
   * テーブルを個別に列挙する実装をやめたのは、テーブルを増やすたびに列挙漏れが
   * 起きる構造だったため（2026-09-20 にチケット・リアクションロール・未承認キック・
   * VC自動募集の4つが抜けているのを見つけて直した）。カスケードなら新しい
   * ギルド単位テーブルは FK を張るだけで自動的に対象になる。
   *
   * **削除対象が変わったら `guildSettings:embed.field.value.reset_all_target` も
   * 直すこと。** あれは取り消せない操作の確認ダイアログに出る削除対象の一覧で、
   * 実際に消すものより少なく書くと利用者を騙すことになる。
   * @param guildId 対象ギルドID
   * @returns 実行完了を示す Promise
   */
  async deleteAllSettings(guildId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.guild.findUnique({ where: { guildId } });
      // 親行が無ければ FK により子行も存在しえないため、消すものがない
      if (!existing) return;

      // 削除予約も引き継ぐ。通常は Bot が参加中なので予約は無いが、退出済みギルドで
      // 落とすと、次の照合で改めて30日後に予約され、元の期限より削除が遅れる
      await tx.guild.delete({ where: { guildId } });
      await tx.guild.create({
        data: {
          guildId,
          joinedAt: existing.joinedAt,
          scheduledDeletionAt: existing.scheduledDeletionAt,
        },
      });
    });
  }
}
