// src/shared/database/repositories/serializers/guildSettingsSerializer.ts
// GuildSettings の serializer / deserializer

import type { GuildSettings } from "../../types";

type GuildSettingsRecord = {
  id: string;
  guildId: string;
  locale: string;
  errorChannelId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * DBレコードをドメインの GuildSettings へ変換する
 * @param record Prismaレコード
 * @returns ドメインオブジェクト
 */
export function toGuildSettings(record: GuildSettingsRecord): GuildSettings {
  return {
    guildId: record.guildId,
    locale: record.locale,
    errorChannelId: record.errorChannelId ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * GuildSettings から create 用DBデータを生成する
 * @param config ドメインオブジェクト
 * @param defaultLocale デフォルトロケール
 * @returns Prisma create 用データ
 */
export function toGuildSettingsCreateData(
  config: GuildSettings,
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
 * GuildSettings の部分更新データを DB update 形式へ変換する
 * @param updates 更新差分
 * @returns Prisma update 用データ
 */
export function toGuildSettingsUpdateData(
  updates: Partial<GuildSettings>,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (updates.locale !== undefined) data.locale = updates.locale;
  if (updates.errorChannelId !== undefined)
    data.errorChannelId = updates.errorChannelId ?? null;

  return data;
}
