// src/shared/database/repositories/usecases/guildConfigCoreUsecases.ts
// GuildConfigRepository のコアCRUD/locale ユースケース

import type { PrismaClient } from "@prisma/client";
import type { GuildConfig } from "../../types";
import {
  existsGuildConfigRecord,
  findGuildConfigRecord,
  findGuildLocale,
} from "../persistence/guildConfigReadPersistence";
import {
  createGuildConfigRecord,
  deleteGuildConfigRecord,
  upsertGuildConfigRecord,
} from "../persistence/guildConfigWritePersistence";
import {
  toGuildConfig,
  toGuildConfigCreateData,
  toGuildConfigUpdateData,
} from "../serializers/guildConfigSerializer";

type ToDatabaseError = (prefix: string, error: unknown) => Error;

type CoreDeps = {
  prisma: PrismaClient;
  defaultLocale: string;
  toDatabaseError: ToDatabaseError;
};

const DB_ERROR = {
  GET_CONFIG_FAILED: "Failed to get guild config",
  SAVE_CONFIG_FAILED: "Failed to save guild config",
  UPDATE_CONFIG_FAILED: "Failed to update guild config",
  DELETE_CONFIG_FAILED: "Failed to delete guild config",
  CHECK_EXISTS_FAILED: "Failed to check guild config existence",
} as const;

/**
 * Guild設定を取得する
 * @param deps 依存オブジェクト
 * @param guildId 対象ギルドID
 * @returns Guild設定（未作成時は null）
 */
export async function getGuildConfigUsecase(
  deps: CoreDeps,
  guildId: string,
): Promise<GuildConfig | null> {
  try {
    const record = await findGuildConfigRecord(deps.prisma, guildId);
    return record ? toGuildConfig(record) : null;
  } catch (error) {
    throw deps.toDatabaseError(DB_ERROR.GET_CONFIG_FAILED, error);
  }
}

/**
 * Guild設定を新規保存する
 * @param deps 依存オブジェクト
 * @param config 保存対象設定
 * @returns 実行完了を示す Promise
 */
export async function saveGuildConfigUsecase(
  deps: CoreDeps,
  config: GuildConfig,
): Promise<void> {
  try {
    await createGuildConfigRecord(
      deps.prisma,
      toGuildConfigCreateData(config, deps.defaultLocale),
    );
  } catch (error) {
    throw deps.toDatabaseError(DB_ERROR.SAVE_CONFIG_FAILED, error);
  }
}

/**
 * Guild設定を部分更新する
 * @param deps 依存オブジェクト
 * @param guildId 対象ギルドID
 * @param updates 更新差分
 * @returns 実行完了を示す Promise
 */
export async function updateGuildConfigUsecase(
  deps: CoreDeps,
  guildId: string,
  updates: Partial<GuildConfig>,
): Promise<void> {
  try {
    const data = toGuildConfigUpdateData(updates);
    await upsertGuildConfigRecord(deps.prisma, guildId, data, {
      guildId,
      locale: (updates.locale as string | undefined) ?? deps.defaultLocale,
      ...data,
    });
  } catch (error) {
    throw deps.toDatabaseError(DB_ERROR.UPDATE_CONFIG_FAILED, error);
  }
}

/**
 * Guild設定を削除する
 * @param deps 依存オブジェクト
 * @param guildId 対象ギルドID
 * @returns 実行完了を示す Promise
 */
export async function deleteGuildConfigUsecase(
  deps: CoreDeps,
  guildId: string,
): Promise<void> {
  try {
    await deleteGuildConfigRecord(deps.prisma, guildId);
  } catch (error) {
    throw deps.toDatabaseError(DB_ERROR.DELETE_CONFIG_FAILED, error);
  }
}

/**
 * Guild設定の存在有無を確認する
 * @param deps 依存オブジェクト
 * @param guildId 対象ギルドID
 * @returns 存在する場合 true
 */
export async function existsGuildConfigUsecase(
  deps: CoreDeps,
  guildId: string,
): Promise<boolean> {
  try {
    return await existsGuildConfigRecord(deps.prisma, guildId);
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
  await updateGuildConfigUsecase(deps, guildId, { locale });
}
