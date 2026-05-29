// src/shared/database/repositories/usecases/guildSettingsCoreUsecases.ts
// GuildSettingsRepository のコアCRUD/locale ユースケース

import type { PrismaClient } from "@prisma/client";
import type { GuildSettings } from "../../types";
import {
  existsGuildSettingsRecord,
  findGuildLocale,
  findGuildSettingsRecord,
} from "../persistence/guildSettingsReadPersistence";
import {
  createGuildSettingsRecord,
  deleteGuildSettingsRecord,
  upsertGuildSettingsRecord,
} from "../persistence/guildSettingsWritePersistence";
import {
  toGuildSettings,
  toGuildSettingsCreateData,
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
  SAVE_SETTINGS_FAILED: "Failed to save guild config",
  UPDATE_SETTINGS_FAILED: "Failed to update guild config",
  DELETE_SETTINGS_FAILED: "Failed to delete guild config",
  CHECK_EXISTS_FAILED: "Failed to check guild config existence",
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
 * Guild設定を新規保存する
 * @param deps 依存オブジェクト
 * @param config 保存対象設定
 * @returns 実行完了を示す Promise
 */
export async function saveGuildSettingsUsecase(
  deps: CoreDeps,
  config: GuildSettings,
): Promise<void> {
  try {
    await createGuildSettingsRecord(
      deps.prisma,
      toGuildSettingsCreateData(config, deps.defaultLocale),
    );
  } catch (error) {
    throw deps.toDatabaseError(DB_ERROR.SAVE_SETTINGS_FAILED, error);
  }
}

/**
 * Guild設定を部分更新する
 * @param deps 依存オブジェクト
 * @param guildId 対象ギルドID
 * @param updates 更新差分
 * @returns 実行完了を示す Promise
 */
export async function updateGuildSettingsUsecase(
  deps: CoreDeps,
  guildId: string,
  updates: Partial<GuildSettings>,
): Promise<void> {
  try {
    const data = toGuildSettingsUpdateData(updates);
    await upsertGuildSettingsRecord(deps.prisma, guildId, data, {
      guildId,
      locale: (updates.locale as string | undefined) ?? deps.defaultLocale,
      ...data,
    });
  } catch (error) {
    throw deps.toDatabaseError(DB_ERROR.UPDATE_SETTINGS_FAILED, error);
  }
}

/**
 * Guild設定を削除する
 * @param deps 依存オブジェクト
 * @param guildId 対象ギルドID
 * @returns 実行完了を示す Promise
 */
export async function deleteGuildSettingsUsecase(
  deps: CoreDeps,
  guildId: string,
): Promise<void> {
  try {
    await deleteGuildSettingsRecord(deps.prisma, guildId);
  } catch (error) {
    throw deps.toDatabaseError(DB_ERROR.DELETE_SETTINGS_FAILED, error);
  }
}

/**
 * Guild設定の存在有無を確認する
 * @param deps 依存オブジェクト
 * @param guildId 対象ギルドID
 * @returns 存在する場合 true
 */
export async function existsGuildSettingsUsecase(
  deps: CoreDeps,
  guildId: string,
): Promise<boolean> {
  try {
    return await existsGuildSettingsRecord(deps.prisma, guildId);
  } catch (error) {
    throw deps.toDatabaseError(DB_ERROR.CHECK_EXISTS_FAILED, error);
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
