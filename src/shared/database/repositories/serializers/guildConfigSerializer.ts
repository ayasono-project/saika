// src/shared/database/repositories/serializers/guildConfigSerializer.ts
// GuildConfig の serializer / deserializer

import type { GuildConfig } from "../../types";

type GuildConfigRecord = {
  id: string;
  guildId: string;
  locale: string;
  errorChannelId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * DBレコードをドメインの GuildConfig へ変換する
 * @param record Prismaレコード
 * @returns ドメインオブジェクト
 */
export function toGuildConfig(record: GuildConfigRecord): GuildConfig {
  return {
    guildId: record.guildId,
    locale: record.locale,
    errorChannelId: record.errorChannelId ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * GuildConfig から create 用DBデータを生成する
 * @param config ドメインオブジェクト
 * @param defaultLocale デフォルトロケール
 * @returns Prisma create 用データ
 */
export function toGuildConfigCreateData(
  config: GuildConfig,
  defaultLocale: string,
): {
  guildId: string;
  locale: string;
  errorChannelId?: string;
} {
  return {
    guildId: config.guildId,
    locale: config.locale || defaultLocale,
    ...(config.errorChannelId !== undefined && {
      errorChannelId: config.errorChannelId,
    }),
  };
}

/**
 * GuildConfig の部分更新データを DB update 形式へ変換する
 * @param updates 更新差分
 * @returns Prisma update 用データ
 */
export function toGuildConfigUpdateData(
  updates: Partial<GuildConfig>,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (updates.locale !== undefined) data.locale = updates.locale;
  if (updates.errorChannelId !== undefined)
    data.errorChannelId = updates.errorChannelId ?? null;

  return data;
}
