// GuildSettingsRepository のコアCRUD/locale ユースケース

import type { PrismaClient } from "@prisma/client";
import type { GuildSettings } from "../../../shared/database/types";
import {
  findGuildLocale,
  findGuildSettingsRecord,
} from "../persistence/guildSettingsReadPersistence";
import { upsertGuildSettingsRecord } from "../persistence/guildSettingsWritePersistence";
import {
  type GuildSettingsUpdate,
  toGuildSettings,
  toGuildSettingsUpdateData,
} from "../serializers/guildSettingsSerializer";

type ToDatabaseError = (prefix: string, error: unknown) => Error;

type CoreDeps = {
  prisma: PrismaClient;
  defaultLocale: string;
  toDatabaseError: ToDatabaseError;
};

const DB_ERROR = {
  GET_SETTINGS_FAILED: "Failed to get guild config",
  UPDATE_SETTINGS_FAILED: "Failed to update guild config",
} as const;

/**
 * Guild設定を取得する
 * @param deps 依存オブジェクト
 * @param guildId 対象ギルドID
 * @returns Guild設定（未作成時は null）
 */
export async function getGuildSettingsUsecase(
  deps: CoreDeps,
  guildId: string,
): Promise<GuildSettings | null> {
  try {
    const record = await findGuildSettingsRecord(deps.prisma, guildId);
    return record ? toGuildSettings(record) : null;
  } catch (error) {
    throw deps.toDatabaseError(DB_ERROR.GET_SETTINGS_FAILED, error);
  }
}

/**
 * Guild設定を部分更新する
 * @param deps 依存オブジェクト
 * @param guildId 対象ギルドID
 * @param updates 更新差分（`errorChannelId: null` は設定を消す）
 * @returns 実行完了を示す Promise
 */
export async function updateGuildSettingsUsecase(
  deps: CoreDeps,
  guildId: string,
  updates: GuildSettingsUpdate,
): Promise<void> {
  try {
    const data = toGuildSettingsUpdateData(updates);
    await upsertGuildSettingsRecord(deps.prisma, guildId, data, {
      guildId,
      locale: updates.locale ?? deps.defaultLocale,
      ...data,
    });
  } catch (error) {
    throw deps.toDatabaseError(DB_ERROR.UPDATE_SETTINGS_FAILED, error);
  }
}

/**
 * Guildのlocaleを取得する
 * @param deps 依存オブジェクト
 * @param guildId 対象ギルドID
 * @returns locale（失敗時は defaultLocale）
 */
export async function getGuildLocaleUsecase(
  deps: CoreDeps,
  guildId: string,
): Promise<string> {
  try {
    const locale = await findGuildLocale(deps.prisma, guildId);
    return locale || deps.defaultLocale;
  } catch {
    return deps.defaultLocale;
  }
}

/**
 * Guildのlocaleを更新する
 * @param deps 依存オブジェクト
 * @param guildId 対象ギルドID
 * @param locale 設定locale
 * @returns 実行完了を示す Promise
 */
export async function updateGuildLocaleUsecase(
  deps: CoreDeps,
  guildId: string,
  locale: string,
): Promise<void> {
  await updateGuildSettingsUsecase(deps, guildId, { locale });
}
