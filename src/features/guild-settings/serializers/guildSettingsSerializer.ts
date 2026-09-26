// GuildSettings の serializer / deserializer

import type { GuildSettings } from "../../../shared/database/types";

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
 * GuildSettings の部分更新差分
 *
 * `errorChannelId` は `undefined` なら「変更しない」、`null` なら「設定を消す」。
 * ドメイン型の `errorChannelId?: string` だけでは「消す」を表せず、`undefined` を
 * 渡しても update から落ちて DB に残るため、`null` を受け付ける形にしている。
 */
export type GuildSettingsUpdate = Omit<
  Partial<GuildSettings>,
  "errorChannelId"
> & {
  errorChannelId?: string | null;
};

/**
 * GuildSettings の部分更新データを DB update 形式へ変換する
 * @param updates 更新差分（`errorChannelId: null` は設定を消す）
 * @returns Prisma update 用データ
 */
export function toGuildSettingsUpdateData(
  updates: GuildSettingsUpdate,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  if (updates.locale !== undefined) data.locale = updates.locale;
  if (updates.errorChannelId !== undefined)
    data.errorChannelId = updates.errorChannelId;

  return data;
}
