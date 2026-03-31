// src/shared/utils/ttlMap.ts
// TTL（有効期限）付きインメモリ Map — UI セッション状態の一時保持に使用する

/**
 * 自動期限切れ機能付きの Map ラッパー
 *
 * エントリ追加時に TTL タイマーを設定し、有効期限を過ぎたエントリを自動削除する。
 * Discord のボタン / セレクトメニュー等、短命な UI セッション状態の管理用途を想定。
 */
export class TtlMap<V> {
  /** 実データ格納用 Map */
  private readonly map = new Map<string, V>();
  /** キーごとの TTL タイマー */
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  /** エントリの有効期限（ミリ秒） */
  private readonly ttlMs: number;

  /**
   * @param ttlMs エントリの有効期限（ミリ秒）
   */
  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  /**
   * エントリを追加する（既存キーがあればタイマーをリセットして上書き）
   * @param key エントリキー
   * @param value エントリ値
   */
  set(key: string, value: V): void {
    // 既存タイマーがあればクリアして二重登録を防ぐ
    this.delete(key);
    this.map.set(key, value);
    this.timers.set(
      key,
      setTimeout(() => this.delete(key), this.ttlMs),
    );
  }

  /**
   * エントリを取得する
   * @param key エントリキー
   * @returns エントリ値（存在しない場合は undefined）
   */
  get(key: string): V | undefined {
    return this.map.get(key);
  }

  /**
   * 指定キーのエントリが存在するか確認する
   * @param key エントリキー
   * @returns 存在する場合 true
   */
  has(key: string): boolean {
    return this.map.has(key);
  }

  /**
   * エントリを削除する（タイマーも同時にクリア）
   * @param key エントリキー
   */
  delete(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
    this.map.delete(key);
  }

  /**
   * 全エントリを削除する（全タイマーもクリア）
   */
  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.map.clear();
  }
}
