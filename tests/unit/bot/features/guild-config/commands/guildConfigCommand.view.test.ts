// tests/unit/bot/features/guild-config/commands/guildConfigCommand.view.test.ts
import type { ChatInputCommandInteraction } from "discord.js";

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: vi.fn((...args: unknown[]) => String(args[1])),
  tDefault: vi.fn((key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
  localeManager: { invalidateLocaleCache: vi.fn() },
}));

const buildPageMock = vi.fn().mockResolvedValue({ kind: "embed" });
vi.mock(
  "@/bot/features/guild-config/commands/guildConfigCommand.viewPages",
  () => ({
    buildPage: (...args: unknown[]) => buildPageMock(...args),
  }),
);

vi.mock("@/bot/shared/pagination", () => ({
  buildPaginationRow: vi.fn(() => ({ components: [] })),
}));

vi.mock("@/bot/shared/disableComponentsAfterTimeout", () => ({
  disableComponentsAfterTimeout: vi.fn(),
}));

import {
  buildViewComponents,
  buildViewPayload,
  handleView,
} from "@/bot/features/guild-config/commands/guildConfigCommand.view";
import { disableComponentsAfterTimeout } from "@/bot/shared/disableComponentsAfterTimeout";

function createInteraction() {
  return {
    locale: "ja",
    reply: vi.fn().mockResolvedValue(undefined),
  } as unknown as ChatInputCommandInteraction;
}

// view ハンドラのページ生成・コンポーネント構築・タイムアウト設定を検証
describe("bot/features/guild-config/commands/guildConfigCommand.view", () => {
  // 各ケースでモック呼び出し記録をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // handleView のテスト
  describe("handleView", () => {
    it("1ページ目の Embed で ephemeral 返信しタイムアウトを設定すること", async () => {
      const interaction = createInteraction();
      await handleView(interaction, "guild-1");

      expect(buildPageMock).toHaveBeenCalledWith(0, "guild-1", "ja");
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ flags: 64 }),
      );
      expect(disableComponentsAfterTimeout).toHaveBeenCalled();
    });
  });

  // buildViewComponents のテスト
  describe("buildViewComponents", () => {
    it("複数ページの場合はページネーション行 + セレクトメニュー行の2行を返すこと", () => {
      const rows = buildViewComponents(0, 7, "ja");
      // ページネーション行 + セレクトメニュー行
      expect(rows).toHaveLength(2);
    });

    it("単ページの場合はセレクトメニュー行のみ返すこと", () => {
      const rows = buildViewComponents(0, 1, "ja");
      expect(rows).toHaveLength(1);
    });
  });

  // buildViewPayload のテスト
  describe("buildViewPayload", () => {
    it("指定ページの Embed と Components を返すこと", async () => {
      const result = await buildViewPayload(2, "guild-1", "ja");
      expect(buildPageMock).toHaveBeenCalledWith(2, "guild-1", "ja");
      expect(result.embed).toEqual({ kind: "embed" });
      expect(result.components).toBeDefined();
      expect(result.components.length).toBeGreaterThan(0);
    });
  });
});
