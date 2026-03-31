// src/bot/services/cooldownManager.ts
// コマンドクールダウン管理

import { logPrefixed } from "../../shared/locale/localeManager";
import { logger } from "../../shared/utils/logger";

/**
 * コマンドのクールダウンを管理するクラス
 * メモリリークを防ぎ、自動クリーンアップを行う
 */
export class CooldownManager {
  private cooldowns: Map<string, Map<string, number>> = new Map();
  /** 自動削除タイマーのハンドルを保持（古いタイマーのキャンセルに使用） */
  private timers: Map<string, Map<string, NodeJS.Timeout>> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // 5分ごとに期限切れクールダウンをクリーンアップ
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000,
    );
    // Node.js が終了を待たないようにする（テスト時のメモリリーク防止）
    this.cleanupInterval.unref();
  }

  /**
   * クールダウンをチェックして設定
   * @param commandName コマンド名
   * @param userId ユーザーID
   * @param cooldownSeconds クールダウン時間（秒）
   * @returns 残り時間（秒）、クールダウン中でなければ0
   */
  check(commandName: string, userId: string, cooldownSeconds: number): number {
    const now = Date.now();

    // コマンド単位のタイムスタンプ管理Mapを取得/初期化
    let timestamps = this.cooldowns.get(commandName);
    if (!timestamps) {
      timestamps = new Map<string, number>();
      this.cooldowns.set(commandName, timestamps);
    }

    const expirationTime = timestamps.get(userId);

    if (expirationTime && now < expirationTime) {
      return Math.ceil((expirationTime - now) / 1000);
    }

    // 既存の自動削除タイマーをキャンセル（再コマンド時の誤削除を防ぐ）
    const existingTimer = this.timers.get(commandName)?.get(userId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // クールダウン設定
    const expiresAt = now + cooldownSeconds * 1000;
    timestamps.set(userId, expiresAt);

    // 自動削除タイマー（クールダウン期限後に即座に解放）
    let timerMap = this.timers.get(commandName);
    if (!timerMap) {
      timerMap = new Map<string, NodeJS.Timeout>();
      this.timers.set(commandName, timerMap);
    }
    const timer = setTimeout(() => {
      const ts = this.cooldowns.get(commandName);
      // エントリが現在のタイマーが設定した期限と一致する場合のみ削除（古いタイマーによる誤削除防止）
      if (ts?.get(userId) === expiresAt) {
        ts.delete(userId);
        if (ts.size === 0) {
          this.cooldowns.delete(commandName);
        }
      }
      this.timers.get(commandName)?.delete(userId);
      if (this.timers.get(commandName)?.size === 0) {
        this.timers.delete(commandName);
      }
    }, cooldownSeconds * 1000).unref();

    timerMap.set(userId, timer);

    // 新規設定時はクールダウン待機なし
    return 0;
  }

  /**
   * 特定ユーザーのクールダウンをリセット
   */
  reset(commandName: string, userId: string): void {
    // クールダウン情報を即時削除
    this.cooldowns.get(commandName)?.delete(userId);
    // 対応する自動削除タイマーもキャンセル
    const timer = this.timers.get(commandName)?.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.timers.get(commandName)?.delete(userId);
      if (this.timers.get(commandName)?.size === 0) {
        this.timers.delete(commandName);
      }
    }
    logger.debug(
      logPrefixed("system:log_prefix.cooldown", "system:cooldown.reset", {
        commandName,
        userId,
      }),
    );
  }

  /**
   * 特定コマンドのすべてのクールダウンをクリア
   */
  clearCommand(commandName: string): void {
    // 指定コマンド配下の全ユーザー分を削除
    this.cooldowns.delete(commandName);
    // 対応する自動削除タイマーもキャンセル
    const timerMap = this.timers.get(commandName);
    if (timerMap) {
      for (const timer of timerMap.values()) {
        clearTimeout(timer);
      }
      this.timers.delete(commandName);
    }
    logger.debug(
      logPrefixed(
        "system:log_prefix.cooldown",
        "system:cooldown.cleared_for_command",
        { commandName },
      ),
    );
  }

  /**
   * すべてのクールダウンをクリア
   */
  clearAll(): void {
    // すべてのコマンドクールダウン状態を初期化
    this.cooldowns.clear();
    // すべての自動削除タイマーをキャンセル
    for (const timerMap of this.timers.values()) {
      for (const timer of timerMap.values()) {
        clearTimeout(timer);
      }
    }
    this.timers.clear();
    logger.debug(
      logPrefixed("system:log_prefix.cooldown", "system:cooldown.cleared_all"),
    );
  }

  /**
   * 期限切れクールダウンを一括削除
   */
  cleanup(): void {
    const now = Date.now();
    let removedCount = 0;

    // 期限切れエントリをコマンド単位で走査して削除
    for (const [cmdName, timestamps] of this.cooldowns.entries()) {
      for (const [userId, expTime] of timestamps.entries()) {
        if (now >= expTime) {
          timestamps.delete(userId);
          removedCount++;
        }
      }
      if (timestamps.size === 0) {
        this.cooldowns.delete(cmdName);
      }
    }

    if (removedCount > 0) {
      logger.debug(
        logPrefixed("system:log_prefix.cooldown", "system:cooldown.cleanup", {
          count: removedCount,
        }),
      );
    }
  }

  /**
   * 現在のクールダウン状況を取得（デバッグ用）
   */
  getStats(): { totalCommands: number; totalUsers: number } {
    // コマンドごとのユーザー数を合算
    let totalUsers = 0;
    for (const timestamps of this.cooldowns.values()) {
      totalUsers += timestamps.size;
    }
    return {
      totalCommands: this.cooldowns.size,
      totalUsers,
    };
  }

  /**
   * クリーンアップを停止
   */
  destroy(): void {
    // 周期クリーンアップを停止
    clearInterval(this.cleanupInterval);
    this.cooldowns.clear();
    // すべての自動削除タイマーをキャンセル
    for (const timerMap of this.timers.values()) {
      for (const timer of timerMap.values()) {
        clearTimeout(timer);
      }
    }
    // タイマーマップも空にして完全破棄
    this.timers.clear();
    logger.info(
      logPrefixed("system:log_prefix.cooldown", "system:cooldown.destroyed"),
    );
  }
}
