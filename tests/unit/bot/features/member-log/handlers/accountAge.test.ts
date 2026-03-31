// tests/unit/bot/features/member-log/handlers/accountAge.test.ts
import { calcDuration } from "@/bot/features/member-log/handlers/accountAge";

// calcDuration の年・月・日計算の正確性・境界値・デフォルト値補完を検証
describe("bot/features/member-log/handlers/accountAge", () => {
  // 偽タイマーを実タイマーに戻して後続テストへの影響を防ぐ
  afterEach(() => {
    vi.useRealTimers();
  });

  // calcDuration：年・月・日が正しく算出されること・境界値・ゼロ経過を検証
  describe("calcDuration", () => {
    it("5年3ヶ月7日が経過した場合に正しい年・月・日を返すことを確認", () => {
      vi.useFakeTimers();
      // 2020-11-24 + 5y3m7d = 2026-03-03
      vi.setSystemTime(new Date("2026-03-03T00:00:00.000Z"));
      const start = new Date("2020-11-24T00:00:00.000Z").getTime();

      const result = calcDuration(start);

      expect(result.years).toBe(5);
      expect(result.months).toBe(3);
      expect(result.days).toBe(7);
    });

    it("経過ゼロ（現在時刻と同じタイムスタンプ）の場合にすべて 0 を返すことを確認", () => {
      vi.useFakeTimers();
      const now = new Date("2026-03-01T00:00:00.000Z");
      vi.setSystemTime(now);

      const result = calcDuration(now.getTime());

      expect(result).toEqual({ years: 0, months: 0, days: 0 });
    });

    it("ちょうど 1 年経過した場合に years:1 / months:0 / days:0 を返すことを確認", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-01T00:00:00.000Z"));
      const oneYearAgo = new Date("2025-03-01T00:00:00.000Z").getTime();

      const result = calcDuration(oneYearAgo);

      expect(result).toEqual({ years: 1, months: 0, days: 0 });
    });

    it("1 ヶ月未満（数日のみ）の場合に years:0 / months:0 / days のみ返すことを確認", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-01T00:00:00.000Z"));
      const fiveDaysAgo = new Date("2026-02-24T00:00:00.000Z").getTime();

      const result = calcDuration(fiveDaysAgo);

      expect(result).toEqual({ years: 0, months: 0, days: 5 });
    });

    // date-fns: 2024-02-29 → 2025-03-01 は 1y0m1d（閏日なし年の換算で +1 日）
    it("うるう年（2024-02-29）を含む期間でも正しく計算されることを確認", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-03-01T00:00:00.000Z"));
      const start = new Date("2024-02-29T00:00:00.000Z").getTime();

      const result = calcDuration(start);

      expect(result.years).toBe(1);
      expect(result.months).toBe(0);
      expect(result.days).toBe(1);
    });
  });
});
