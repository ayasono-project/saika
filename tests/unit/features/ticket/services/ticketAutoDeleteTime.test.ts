// 自動削除までの残り時間の計算のテスト

import { TICKET_MS_PER_DAY } from "@/features/ticket/commands/ticketCommand.constants";
import { computeAutoDeleteRemainingMs } from "@/features/ticket/services/ticketAutoDeleteTime";

// 自動削除日数・累計のクローズ時間・今回のクローズからの経過時間の差し引きを検証
describe("features/ticket/services/ticketAutoDeleteTime", () => {
  describe("computeAutoDeleteRemainingMs", () => {
    const NOW = Date.parse("2026-09-26T00:00:00Z");

    it("これからクローズする場合（closedAt が null）は日数から累計だけを引く", () => {
      expect(computeAutoDeleteRemainingMs(7, 1000, null, NOW)).toBe(
        7 * TICKET_MS_PER_DAY - 1000,
      );
    });

    it("クローズ済みの場合は、今回クローズしてからの経過時間も引く", () => {
      const closedAt = new Date(NOW - 10_000);

      expect(computeAutoDeleteRemainingMs(7, 1000, closedAt, NOW)).toBe(
        7 * TICKET_MS_PER_DAY - 1000 - 10_000,
      );
    });

    it("期限を過ぎていれば0以下を返す", () => {
      const closedAt = new Date(NOW - 8 * TICKET_MS_PER_DAY);

      expect(
        computeAutoDeleteRemainingMs(7, 0, closedAt, NOW),
      ).toBeLessThanOrEqual(0);
    });
  });
});
