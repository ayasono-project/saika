// tests/unit/shared/utils/ttlMap.test.ts

import { TtlMap } from "@/shared/utils/ttlMap";

// TtlMap の単体テスト — TTL 付きインメモリ Map の全メソッドを検証する
describe("shared/utils/ttlMap", () => {
  // 各テスト間でフェイクタイマーの状態をリセットするため
  beforeEach(() => {
    vi.useFakeTimers();
  });

  // フェイクタイマーを元に戻すため
  afterEach(() => {
    vi.useRealTimers();
  });

  it("set で追加したエントリを get で取得できる", () => {
    // Arrange
    const map = new TtlMap<string>(5000);

    // Act
    map.set("key1", "value1");

    // Assert
    expect(map.get("key1")).toBe("value1");
  });

  it("存在しないキーを get すると undefined を返す", () => {
    // Arrange
    const map = new TtlMap<string>(5000);

    // Act & Assert
    expect(map.get("nonexistent")).toBeUndefined();
  });

  it("has でエントリの存在を確認できる", () => {
    // Arrange
    const map = new TtlMap<string>(5000);
    map.set("key1", "value1");

    // Act & Assert
    expect(map.has("key1")).toBe(true);
    expect(map.has("key2")).toBe(false);
  });

  it("TTL 経過後にエントリが自動削除される", () => {
    // Arrange
    const map = new TtlMap<string>(3000);
    map.set("key1", "value1");

    // Act
    vi.advanceTimersByTime(3000);

    // Assert
    expect(map.get("key1")).toBeUndefined();
    expect(map.has("key1")).toBe(false);
  });

  it("同じキーで set を呼ぶとタイマーがリセットされ値が上書きされる", () => {
    // Arrange
    const map = new TtlMap<string>(5000);
    map.set("key1", "value1");

    // Act — 3秒後に再度 set
    vi.advanceTimersByTime(3000);
    map.set("key1", "value2");

    // 元の TTL (5秒) が経過しても削除されない
    vi.advanceTimersByTime(3000);

    // Assert
    expect(map.get("key1")).toBe("value2");

    // 新しい TTL が経過すると削除される
    vi.advanceTimersByTime(2000);
    expect(map.get("key1")).toBeUndefined();
  });

  it("delete でエントリとタイマーを削除できる", () => {
    // Arrange
    const map = new TtlMap<string>(5000);
    map.set("key1", "value1");

    // Act
    map.delete("key1");

    // Assert
    expect(map.get("key1")).toBeUndefined();
    expect(map.has("key1")).toBe(false);
  });

  it("存在しないキーを delete しても例外が発生しない", () => {
    // Arrange
    const map = new TtlMap<string>(5000);

    // Act & Assert
    expect(() => map.delete("nonexistent")).not.toThrow();
  });

  it("clear で全エントリと全タイマーを削除する", () => {
    // Arrange
    const map = new TtlMap<string>(5000);
    map.set("key1", "value1");
    map.set("key2", "value2");
    map.set("key3", "value3");

    // Act
    map.clear();

    // Assert — 全エントリが削除されている
    expect(map.get("key1")).toBeUndefined();
    expect(map.get("key2")).toBeUndefined();
    expect(map.get("key3")).toBeUndefined();
  });

  it("clear 後に TTL が経過してもエラーが発生しない", () => {
    // Arrange
    const map = new TtlMap<string>(5000);
    map.set("key1", "value1");
    map.set("key2", "value2");

    // Act
    map.clear();

    // Assert — タイマーが正しくクリアされており、期限切れ処理でエラーにならない
    expect(() => vi.advanceTimersByTime(10000)).not.toThrow();
  });
});
