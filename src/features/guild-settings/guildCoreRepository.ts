// ギルド設定コアリポジトリ（guild_configs テーブル）

import { DatabaseError } from "@ayasono/shared/core";
import type { PrismaClient } from "@prisma/client";
import type {
  GuildSettings,
  IGuildCoreRepository,
} from "../../shared/database/types";
import { DEFAULT_LOCALE } from "../../shared/locale/i18n";
import { createRepositoryGetter } from "../../shared/utils/serviceFactory";
import {
  deleteGuildSettingsUsecase,
  existsGuildSettingsUsecase,
  getGuildLocaleUsecase,
  getGuildSettingsUsecase,
  saveGuildSettingsUsecase,
  updateGuildLocaleUsecase,
  updateGuildSettingsUsecase,
} from "./usecases/guildSettingsCoreUsecases";

const DB_ERROR = {
  UNKNOWN: "unknown error",
} as const;

/**
 * guild_configs テーブルを使用したギルド設定コアリポジトリ
 */
export class GuildCoreRepository implements IGuildCoreRepository {
  private readonly prisma: PrismaClient;
  private readonly toDatabaseError = (
    prefix: string,
    error: unknown,
  ): DatabaseError =>
    new DatabaseError(
      `${prefix}: ${error instanceof Error ? error.message : DB_ERROR.UNKNOWN}`,
    );

  /**
   * GuildCoreRepository を初期化する
   * @param prisma Prismaクライアント
   */
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * ギルド設定を取得する
   * @param guildId 対象ギルドID
   * @returns ギルド設定（未作成時は null）
   */
  async getSettings(guildId: string): Promise<GuildSettings | null> {
    return getGuildSettingsUsecase(this.getCoreDeps(), guildId);
  }

  /**
   * ギルド設定を新規保存する
   * @param config 保存する設定
   */
  async saveSettings(config: GuildSettings): Promise<void> {
    await saveGuildSettingsUsecase(this.getCoreDeps(), config);
  }

  /**
   * ギルド設定を部分更新する（未作成なら作成する）
   * @param guildId 対象ギルドID
   * @param updates 更新差分
   */
  async updateSettings(
    guildId: string,
    updates: Partial<GuildSettings>,
  ): Promise<void> {
    await updateGuildSettingsUsecase(this.getCoreDeps(), guildId, updates);
  }

  /**
   * ギルド設定を削除する
   * @param guildId 対象ギルドID
   */
  async deleteSettings(guildId: string): Promise<void> {
    await deleteGuildSettingsUsecase(this.getCoreDeps(), guildId);
  }

  /**
   * ギルド設定が存在するかを確認する
   * @param guildId 対象ギルドID
   * @returns 存在する場合 true
   */
  async exists(guildId: string): Promise<boolean> {
    return existsGuildSettingsUsecase(this.getCoreDeps(), guildId);
  }

  /**
   * ギルドのロケールを取得する
   * @param guildId 対象ギルドID
   * @returns ロケール（未設定・取得失敗時はデフォルト）
   */
  async getLocale(guildId: string): Promise<string> {
    return getGuildLocaleUsecase(this.getCoreDeps(), guildId);
  }

  /**
   * ギルドのロケールを更新する
   * @param guildId 対象ギルドID
   * @param locale 設定するロケール
   */
  async updateLocale(guildId: string, locale: string): Promise<void> {
    await updateGuildLocaleUsecase(this.getCoreDeps(), guildId, locale);
  }

  /**
   * エラー通知チャンネルを設定する
   * @param guildId 対象ギルドID
   * @param channelId エラー通知先チャンネルID
   */
  async updateErrorChannel(guildId: string, channelId: string): Promise<void> {
    await updateGuildSettingsUsecase(this.getCoreDeps(), guildId, {
      errorChannelId: channelId,
    });
  }

  /**
   * ロケールをデフォルトに戻し、エラー通知チャンネルの設定を消す
   * @param guildId 対象ギルドID
   */
  async resetGuildSettings(guildId: string): Promise<void> {
    // errorChannelId は null で渡す（undefined は「変更しない」として update から落ちる）
    await updateGuildSettingsUsecase(this.getCoreDeps(), guildId, {
      locale: DEFAULT_LOCALE,
      errorChannelId: null,
    });
  }

  /**
   * コアユースケースへ渡す依存オブジェクトを組み立てる
   * @returns Prisma・デフォルトロケール・エラー変換関数
   */
  private getCoreDeps() {
    return {
      prisma: this.prisma,
      defaultLocale: DEFAULT_LOCALE,
      toDatabaseError: (prefix: string, error: unknown) =>
        this.toDatabaseError(prefix, error),
    };
  }
}

/**
 * ギルド設定コアリポジトリのシングルトンを取得する
 * @param prisma 初回呼び出し時に必要な Prismaクライアント
 * @returns ギルド設定コアリポジトリ
 */
export const getGuildCoreRepository: (
  prisma?: PrismaClient,
) => IGuildCoreRepository = createRepositoryGetter<IGuildCoreRepository>(
  "GuildCoreRepository",
  (prisma) => new GuildCoreRepository(prisma),
);
