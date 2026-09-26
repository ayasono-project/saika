// タイマー処理（node-cron + setTimeout）

import cron, { type ScheduledTask } from "node-cron";
import { logPrefixed } from "../locale/localeManager";
import { logger } from "../utils/logger";
import { MAX_TIMEOUT_DELAY_MS } from "./jobScheduler.constants";

interface ScheduledJob {
  /** ジョブID（同IDの再登録は置き換えになる） */
  id: string;
  /** cron 式 */
  schedule: string;
  /** 発火時に実行するタスク */
  task: () => Promise<void> | void;
  /** ジョブの説明（任意） */
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
   * @param quiet 置き換えを正常系として扱い warn を出さない（デバウンス用途）
   */
  private replaceExistingJob(id: string, quiet = false): void {
    if (this.jobs.has(id) || this.oneTimeJobs.has(id)) {
      // デバウンスでは置き換えが設計どおりの動作なので警告しない
      if (!quiet) {
        logger.warn(
          logPrefixed(
            "system:log_prefix.scheduler",
            "system:scheduler.job_exists",
            { jobId: id },
          ),
        );
      }
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
   * @param job 登録するジョブ（同IDの既存ジョブは置き換える）
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
   *
   * node-cron は年フィールドをサポートしないため、特定日時への1回実行は setTimeout を使用する。
   * setTimeout 1回で待てる上限（MAX_TIMEOUT_DELAY_MS・約24.8日）を超える遅延は、上限ずつ区切って
   * 同じジョブIDのまま張り直す。hasJob / removeJob / stopAll / 同ID置換は、待機のどの区間でも効く。
   * @param id ジョブID
   * @param delayMs 実行までの遅延時間（ミリ秒）。0以下は即時実行。NaN・±Infinity は登録を拒否し、既存の同IDジョブもそのまま残す
   * @param task 実行するタスク
   * @param options quiet を立てると同ID置換時の warn を抑止する（デバウンス用途）
   */
  public addOneTimeJob(
    id: string,
    delayMs: number,
    task: () => Promise<void> | void,
    options?: { quiet?: boolean },
  ): void {
    // 有限でない遅延は発火時刻が決まらない。setTimeout に渡すと Node は 1ms で発火させ、
    // チケットの自動削除のようにデータを消すジョブが即座に走るため、登録自体を拒否する
    if (!Number.isFinite(delayMs)) {
      logger.error(
        logPrefixed(
          "system:log_prefix.scheduler",
          "system:scheduler.invalid_delay",
          { jobId: id, delayMs: String(delayMs) },
        ),
      );
      return;
    }

    // 既存の同IDジョブをキャンセル
    this.replaceExistingJob(id, options?.quiet ?? false);

    // 負数遅延は0に丸めて即時実行扱いにする
    const safeDelay = Math.max(0, delayMs);

    // setTimeout ベースの one-time 実行を登録（上限超えは区切って張り直す）
    this.armOneTimeTimer(id, safeDelay, task);

    logger.info(
      logPrefixed(
        "system:log_prefix.scheduler",
        "system:scheduler.job_scheduled",
        { jobId: id },
      ),
    );
  }

  /**
   * one-time ジョブのタイマーを1区間ぶん張り、管理マップのハンドルを差し替える
   *
   * 残りが MAX_TIMEOUT_DELAY_MS を超える場合は上限ぶんだけ待ち、発火時に残りで張り直す。
   * 残りは時計を読まず区間の長さを差し引いて求める。setTimeout は単調時計で動き、区間ごとに
   * 指定より早くは発火しないので、合計の待ち時間は必ず delayMs 以上になる（システム時刻の変更にも影響されない）。
   * @param id ジョブID
   * @param remainingMs 発火までの残り時間（ミリ秒・0以上の有限値）
   * @param task 実行するタスク
   */
  private armOneTimeTimer(
    id: string,
    remainingMs: number,
    task: () => Promise<void> | void,
  ): void {
    const segmentMs = Math.min(remainingMs, MAX_TIMEOUT_DELAY_MS);

    const handle = setTimeout(async () => {
      // 上限で区切った途中の区間なら、同じIDのまま残りで張り直す
      const restMs = remainingMs - segmentMs;
      if (restMs > 0) {
        logger.debug(
          logPrefixed(
            "system:log_prefix.scheduler",
            "system:scheduler.job_rearmed",
            { jobId: id, remainingMs: String(restMs) },
          ),
        );
        this.armOneTimeTimer(id, restMs, task);
        return;
      }

      // 実行開始時点で管理マップから除去
      this.oneTimeJobs.delete(id);
      await this.runTask(id, task);
    }, segmentMs);

    // Node.js が終了を待たないようにする（張り直した区間のタイマーも同様）
    handle.unref();

    // 管理マップへ保存（張り直しでは同じIDのハンドルを差し替え、removeJob / stopAll が現区間を止められるようにする）
    this.oneTimeJobs.set(id, handle);
  }

  /**
   * ジョブを削除（cron・oneTime 両方対応）
   * @param id ジョブID
   * @returns 削除した場合は true、該当ジョブが無い場合は false
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
   * @param id ジョブID
   * @returns 登録済み（one-time は発火前）なら true
   */
  public hasJob(id: string): boolean {
    return this.jobs.has(id) || this.oneTimeJobs.has(id);
  }

  /**
   * すべてのジョブIDを取得
   * @returns cron ジョブと one-time ジョブのID一覧
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
   * @returns cron ジョブと one-time ジョブの合計数
   */
  public getJobCount(): number {
    return this.jobs.size + this.oneTimeJobs.size;
  }
}

// シングルトンインスタンス
export const jobScheduler: JobScheduler = new JobScheduler();
