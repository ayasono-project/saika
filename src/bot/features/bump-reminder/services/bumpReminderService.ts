// src/bot/features/bump-reminder/services/bumpReminderService.ts
// Bumpリマインダー用のジョブマネージャー
// DB永続化対応：Bot再起動時もリマインダーを復元可能

import {
  type BumpServiceName,
  toBumpReminderKey,
} from "../constants/bumpReminderConstants";
import { type IBumpReminderRepository } from "../repositories/types";
import { type ScheduledReminderRef } from "./helpers/bumpReminderScheduleHelper";
import { cancelBumpReminderUsecase } from "./usecases/cancelBumpReminderUsecase";
import { clearAllBumpRemindersUsecase } from "./usecases/clearAllBumpRemindersUsecase";
import { restorePendingBumpRemindersUsecase } from "./usecases/restorePendingBumpRemindersUsecase";
import { setBumpReminderUsecase } from "./usecases/setBumpReminderUsecase";

export type BumpReminderTaskFactory = (
  guildId: string,
  channelId: string,
  messageId?: string,
  panelMessageId?: string,
  serviceName?: BumpServiceName,
) => () => Promise<void>;

// 復元時に pending レコードを実行タスクへ変換するためのファクトリ型

/**
 * Bumpリマインダー用のジョブマネージャー
 */
export class BumpReminderManager {
  private readonly repository: IBumpReminderRepository;
  private reminders: Map<string, ScheduledReminderRef> = new Map();
  constructor(repository: IBumpReminderRepository) {
    this.repository = repository;
  }

  /**
   * リマインダーを設定（DBに保存 + スケジュール登録）
   * @param guildId ギルドID
   * @param channelId 通知先チャンネルID
   * @param messageId 元のBumpメッセージID（返信用、オプション）
   * @param panelMessageId Bumpパネルメッセージ ID（送信後削除用、オプション）
   * @param delayMinutes 遅延時間（分）
   * @param task 実行するタスク
   * @param serviceName サービス名（Disboard, Dissoku）
   * @returns 実行完了を示す Promise
   */
  public async setReminder(
    guildId: string,
    channelId: string,
    messageId: string | undefined,
    panelMessageId: string | undefined,
    delayMinutes: number,
    task: () => Promise<void>,
    serviceName?: BumpServiceName,
  ): Promise<void> {
    await setBumpReminderUsecase({
      repository: this.repository,
      reminders: this.reminders,
      guildId,
      channelId,
      messageId,
      panelMessageId,
      delayMinutes,
      task,
      serviceName,
      cancelReminder: (
        targetGuildId: string,
        targetServiceName?: BumpServiceName,
      ) => this.cancelReminder(targetGuildId, targetServiceName),
    });
  }

  /**
   * リマインダーをキャンセル
   * @param guildId キャンセル対象のギルドID
   * @param serviceName キャンセル対象のサービス名（未指定時は guildId のみで照合）
   * @returns キャンセルできた場合は true
   */
  public async cancelReminder(
    guildId: string,
    serviceName?: BumpServiceName,
  ): Promise<boolean> {
    return cancelBumpReminderUsecase({
      repository: this.repository,
      reminders: this.reminders,
      guildId,
      serviceName,
    });
  }

  /**
   * リマインダーが設定されているか確認
   * @param guildId 確認対象のギルドID
   * @param serviceName 確認対象のサービス名（未指定時は guildId のみで照合）
   * @returns 予約が存在する場合は true
   */
  public hasReminder(guildId: string, serviceName?: BumpServiceName): boolean {
    // 複合キーでメモリ上の管理マップを照合する
    return this.reminders.has(toBumpReminderKey(guildId, serviceName));
  }

  /**
   * Bot起動時にDBから pending のリマインダーを復元
   * DBレコードはそのまま再利用し、メモリ上のスケジュールのみ再登録する
   * @param taskFactory リマインダー実行時のタスクを生成する関数
   * @returns 復元した件数
   */
  public async restorePendingReminders(
    taskFactory: BumpReminderTaskFactory,
  ): Promise<number> {
    return restorePendingBumpRemindersUsecase({
      repository: this.repository,
      reminders: this.reminders,
      taskFactory,
    });
  }

  /**
   * すべてのリマインダーをクリア
   * 个々のキャンセル失敗時はエラーを記録して続行する
   * @returns 実行完了を示す Promise
   */
  public async clearAll(): Promise<void> {
    await clearAllBumpRemindersUsecase({
      reminders: this.reminders,
      // Map のキーは複合キー（"guildId:serviceName"）の場合があるため、
      // キーをそのまま guildId として渡す（toBumpReminderKey の掂等変換で安全）
      cancelByKey: (reminderKey: string) => this.cancelReminder(reminderKey),
    });
  }
}

// シングルトンインスタンス
let bumpReminderManager: BumpReminderManager | null = null;
let cachedRepository: IBumpReminderRepository | undefined;

/**
 * BumpReminderManager インスタンスを生成
 * @param repository 永続化アクセスに利用する repository
 * @returns 新規 BumpReminderManager
 */
export function createBumpReminderManager(
  repository: IBumpReminderRepository,
): BumpReminderManager {
  return new BumpReminderManager(repository);
}

/**
 * BumpReminderManager を解決する
 * repository 未指定時は初期化済みの repository を利用する
 * @returns 共有の BumpReminderManager インスタンス
 */
export function getBumpReminderManager(
  repository?: IBumpReminderRepository,
): BumpReminderManager {
  const resolvedRepository = repository ?? cachedRepository;

  if (!resolvedRepository) {
    throw new Error(
      "BumpReminderManager is not initialized. Initialize in composition root first.",
    );
  }

  // 初回呼び出し時、または注入 repository の変更時のみ再生成
  if (!bumpReminderManager || cachedRepository !== resolvedRepository) {
    bumpReminderManager = createBumpReminderManager(resolvedRepository);
    cachedRepository = resolvedRepository;
  }

  // 共有シングルトンを返す
  return bumpReminderManager;
}
