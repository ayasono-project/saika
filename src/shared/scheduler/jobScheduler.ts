// src/shared/scheduler/jobScheduler.ts
// タイマー処理（node-cron + setTimeout）

import cron, { type ScheduledTask } from "node-cron";
import { logPrefixed } from "../locale/localeManager";
import { logger } from "../utils/logger";

interface ScheduledJob {
  id: string;
  schedule: string;
  task: () => Promise<void> | void;
  description?: string;
  /** cron 評価に用いるタイムゾーン（例: "Asia/Tokyo"）。未指定時はサーバーのローカルタイム */
  timezone?: string;
  /** 前回実行が長引いた場合に次回発火の重複起動を防ぐ（node-cron v4） */
  noOverlap?: boolean;
}

/**
 * ジョブスケジューラー
 */
export class JobScheduler {
  private jobs: Map<string, ScheduledTask> = new Map();
  /** 一回限り実行ジョブ（setTimeoutベース） */
  private oneTimeJobs: Map<string, NodeJS.Timeout> = new Map();

  /**
   * 同IDの既存ジョブ（cron・one-time いずれも）を停止して置き換える（多重実行を防止）
   * @param id ジョブID
   */
  private replaceExistingJob(id: string): void {
    if (this.jobs.has(id) || this.oneTimeJobs.has(id)) {
      logger.warn(
        logPrefixed(
          "system:log_prefix.scheduler",
          "system:scheduler.job_exists",
          { jobId: id },
        ),
      );
      this.removeJob(id);
    }
  }

  /**
   * タスクを実行ログ付きで安全に実行する（例外は捕捉してログのみ・スケジューラ全体は落とさない）
   * @param id ジョブID
   * @param task 実行するタスク
   */
  private async runTask(
    id: string,
    task: () => Promise<void> | void,
  ): Promise<void> {
    try {
      logger.debug(
        logPrefixed(
          "system:log_prefix.scheduler",
          "system:scheduler.executing_job",
          { jobId: id },
        ),
      );
      await task();
      logger.debug(
        logPrefixed(
          "system:log_prefix.scheduler",
          "system:scheduler.job_completed",
          { jobId: id },
        ),
      );
    } catch (error) {
      logger.error(
        logPrefixed(
          "system:log_prefix.scheduler",
          "system:scheduler.job_error",
          { jobId: id },
        ),
        error,
      );
    }
  }

  /**
   * 繰り返しジョブを追加（cron式）
   */
  public addJob(job: ScheduledJob): void {
    // 同IDの既存ジョブは置き換え（多重実行を防止）
    this.replaceExistingJob(job.id);

    try {
      // cron 式ジョブを登録（timezone / noOverlap が指定された場合のみ TaskOptions を渡す）
      const taskOptions: { timezone?: string; noOverlap?: boolean } = {};
      if (job.timezone) taskOptions.timezone = job.timezone;
      if (job.noOverlap) taskOptions.noOverlap = job.noOverlap;
      const scheduledTask =
        Object.keys(taskOptions).length > 0
          ? cron.schedule(
              job.schedule,
              () => this.runTask(job.id, job.task),
              taskOptions,
            )
          : cron.schedule(job.schedule, () => this.runTask(job.id, job.task));

      // 管理マップへ保存して起動
      this.jobs.set(job.id, scheduledTask);
      scheduledTask.start();

      logger.info(
        logPrefixed(
          "system:log_prefix.scheduler",
          "system:scheduler.job_scheduled",
          { jobId: job.id },
        ),
      );
    } catch (error) {
      logger.error(
        logPrefixed(
          "system:log_prefix.scheduler",
          "system:scheduler.schedule_failed",
          { jobId: job.id },
        ),
        error,
      );
      throw error;
    }
  }

  /**
   * 一回限りのジョブを追加（setTimeoutベース）
   * node-cron は年フィールドをサポートしないため、特定日時への1回実行は setTimeout を使用する
   * @param id ジョブID
   * @param delayMs 実行までの遅延時間（ミリ秒）。0以下の場合は即時実行
   * @param task 実行するタスク
   */
  public addOneTimeJob(
    id: string,
    delayMs: number,
    task: () => Promise<void> | void,
  ): void {
    // 既存の同IDジョブをキャンセル
    this.replaceExistingJob(id);

    // 負数遅延は0に丸めて即時実行扱いにする
    const safeDelay = Math.max(0, delayMs);

    // setTimeout ベースの one-time 実行を登録
    const handle = setTimeout(async () => {
      // 実行開始時点で管理マップから除去
      this.oneTimeJobs.delete(id);
      await this.runTask(id, task);
    }, safeDelay);

    // Node.js が終了を待たないようにする
    handle.unref();

    // 管理マップへ保存
    this.oneTimeJobs.set(id, handle);
    logger.info(
      logPrefixed(
        "system:log_prefix.scheduler",
        "system:scheduler.job_scheduled",
        { jobId: id },
      ),
    );
  }

  /**
   * ジョブを削除（cron・oneTime 両方対応）
   */
  public removeJob(id: string): boolean {
    // cron ジョブを優先的に探索して停止
    const cronJob = this.jobs.get(id);
    if (cronJob) {
      cronJob.stop();
      this.jobs.delete(id);
      logger.info(
        logPrefixed(
          "system:log_prefix.scheduler",
          "system:scheduler.job_removed",
          { jobId: id },
        ),
      );
      return true;
    }

    // 見つからなければ one-time ジョブを探索して停止
    const timeoutHandle = this.oneTimeJobs.get(id);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      this.oneTimeJobs.delete(id);
      logger.info(
        logPrefixed(
          "system:log_prefix.scheduler",
          "system:scheduler.job_removed",
          { jobId: id },
        ),
      );
      return true;
    }

    return false;
  }

  /**
   * すべてのジョブを停止
   */
  public stopAll(): void {
    logger.info(
      logPrefixed("system:log_prefix.scheduler", "system:scheduler.stopping"),
    );
    // cron ジョブを全停止
    for (const [id, job] of this.jobs.entries()) {
      job.stop();
      logger.debug(
        logPrefixed(
          "system:log_prefix.scheduler",
          "system:scheduler.job_stopped",
          { jobId: id },
        ),
      );
    }
    this.jobs.clear();

    // one-time ジョブを全停止
    for (const [id, handle] of this.oneTimeJobs.entries()) {
      clearTimeout(handle);
      logger.debug(
        logPrefixed(
          "system:log_prefix.scheduler",
          "system:scheduler.job_stopped",
          { jobId: id },
        ),
      );
    }
    this.oneTimeJobs.clear();
  }

  /**
   * ジョブの存在確認（cron・oneTime 両方）
   */
  public hasJob(id: string): boolean {
    return this.jobs.has(id) || this.oneTimeJobs.has(id);
  }

  /**
   * すべてのジョブIDを取得
   */
  public getJobIds(): string[] {
    // cron と one-time のIDを連結して返す
    return [
      ...Array.from(this.jobs.keys()),
      ...Array.from(this.oneTimeJobs.keys()),
    ];
  }

  /**
   * ジョブ数を取得
   */
  public getJobCount(): number {
    return this.jobs.size + this.oneTimeJobs.size;
  }
}

// シングルトンインスタンス
export const jobScheduler: JobScheduler = new JobScheduler();
