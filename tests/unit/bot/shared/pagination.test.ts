// tests/unit/bot/shared/pagination.test.ts
import {
  buildPaginationRow,
  parsePaginationAction,
  resolvePageFromAction,
  showPaginationJumpModal,
} from "@/bot/shared/pagination";

vi.mock("@/shared/locale/localeManager", () => ({
  tInteraction: (
    _locale: string,
    key: string,
    params?: Record<string, unknown>,
  ) => (params ? `${key}:${JSON.stringify(params)}` : key),
}));

describe("bot/shared/pagination", () => {
  describe("buildPaginationRow", () => {
    it("5つのボタンを含む ActionRow を返す", () => {
      const row = buildPaginationRow("test", 0, 3, "ja");
      expect(row.components).toHaveLength(5);
    });

    it("最初のページでは先頭・前へボタンが disabled", () => {
      const row = buildPaginationRow("test", 0, 3, "ja");
      const buttons = row.components;
      expect(buttons[0].data).toMatchObject({ disabled: true }); // first
      expect(buttons[1].data).toMatchObject({ disabled: true }); // prev
      expect(buttons[3].data).toMatchObject({ disabled: false }); // next
      expect(buttons[4].data).toMatchObject({ disabled: false }); // last
    });

    it("最後のページでは次へ・末尾ボタンが disabled", () => {
      const row = buildPaginationRow("test", 2, 3, "ja");
      const buttons = row.components;
      expect(buttons[0].data).toMatchObject({ disabled: false }); // first
      expect(buttons[1].data).toMatchObject({ disabled: false }); // prev
      expect(buttons[3].data).toMatchObject({ disabled: true }); // next
      expect(buttons[4].data).toMatchObject({ disabled: true }); // last
    });

    it("単ページ時はジャンプボタンが disabled", () => {
      const row = buildPaginationRow("test", 0, 1, "ja");
      const jumpButton = row.components[2];
      expect(jumpButton.data).toMatchObject({ disabled: true });
    });

    it("customId にプレフィックスが使われる", () => {
      const row = buildPaginationRow("my-feature", 0, 3, "ja");
      const customIds = row.components.map(
        (c) => (c.data as { custom_id: string }).custom_id,
      );
      expect(customIds).toEqual([
        "my-feature:page-first",
        "my-feature:page-prev",
        "my-feature:page-jump",
        "my-feature:page-next",
        "my-feature:page-last",
      ]);
    });
  });

  describe("parsePaginationAction", () => {
    it("ページネーション customId を正しくパースする", () => {
      expect(parsePaginationAction("test:page-first", "test")).toBe("first");
      expect(parsePaginationAction("test:page-prev", "test")).toBe("prev");
      expect(parsePaginationAction("test:page-jump", "test")).toBe("jump");
      expect(parsePaginationAction("test:page-next", "test")).toBe("next");
      expect(parsePaginationAction("test:page-last", "test")).toBe("last");
    });

    it("無関係な customId は null を返す", () => {
      expect(parsePaginationAction("test:other-action", "test")).toBeNull();
      expect(parsePaginationAction("other:page-first", "test")).toBeNull();
    });
  });

  describe("resolvePageFromAction", () => {
    it("first は 0 を返す", () => {
      expect(resolvePageFromAction("first", 2, 5)).toBe(0);
    });

    it("prev は currentPage - 1 を返す（0 未満にはならない）", () => {
      expect(resolvePageFromAction("prev", 2, 5)).toBe(1);
      expect(resolvePageFromAction("prev", 0, 5)).toBe(0);
    });

    it("next は currentPage + 1 を返す（totalPages - 1 を超えない）", () => {
      expect(resolvePageFromAction("next", 2, 5)).toBe(3);
      expect(resolvePageFromAction("next", 4, 5)).toBe(4);
    });

    it("last は totalPages - 1 を返す", () => {
      expect(resolvePageFromAction("last", 0, 5)).toBe(4);
    });
  });

  describe("showPaginationJumpModal", () => {
    it("モーダルを表示し、入力値を返す", async () => {
      const interaction = {
        showModal: vi.fn().mockResolvedValue(undefined),
        awaitModalSubmit: vi.fn().mockResolvedValue({
          deferUpdate: vi.fn().mockResolvedValue(undefined),
          fields: {
            getTextInputValue: vi.fn().mockReturnValue("3"),
          },
        }),
      };

      const result = await showPaginationJumpModal(
        interaction as never,
        "test",
        5,
        "ja",
      );

      expect(interaction.showModal).toHaveBeenCalled();
      expect(result).toBe("3");
    });

    it("モーダルがキャンセルされた場合は null を返す", async () => {
      const interaction = {
        showModal: vi.fn().mockResolvedValue(undefined),
        awaitModalSubmit: vi.fn().mockResolvedValue(null),
      };

      const result = await showPaginationJumpModal(
        interaction as never,
        "test",
        5,
        "ja",
      );

      expect(result).toBeNull();
    });

    it("awaitModalSubmit がエラーを投げた場合は null を返す", async () => {
      const interaction = {
        showModal: vi.fn().mockResolvedValue(undefined),
        awaitModalSubmit: vi.fn().mockRejectedValue(new Error("timeout")),
      };

      const result = await showPaginationJumpModal(
        interaction as never,
        "test",
        5,
        "ja",
      );

      expect(result).toBeNull();
    });
  });
});
