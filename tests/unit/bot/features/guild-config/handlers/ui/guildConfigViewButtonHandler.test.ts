// tests/unit/bot/features/guild-config/handlers/ui/guildConfigViewButtonHandler.test.ts
import type { ButtonInteraction } from "discord.js";
import { ComponentType } from "discord.js";

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: vi.fn((...args: unknown[]) => String(args[1])),
  tDefault: vi.fn((key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
  localeManager: { invalidateLocaleCache: vi.fn() },
}));

const buildViewPayloadMock = vi.fn().mockResolvedValue({
  embed: { kind: "embed" },
  components: [{ components: [] }],
});
vi.mock("@/bot/features/guild-config/commands/guildConfigCommand.view", () => ({
  buildViewPayload: (...args: unknown[]) => buildViewPayloadMock(...args),
}));

const parsePaginationActionMock = vi.fn();
const resolvePageFromActionMock = vi.fn();
const showPaginationJumpModalMock = vi.fn();
vi.mock("@/bot/shared/pagination", () => ({
  buildPaginationRow: vi.fn(() => ({ components: [] })),
  parsePaginationAction: (...args: unknown[]) =>
    parsePaginationActionMock(...args),
  resolvePageFromAction: (...args: unknown[]) =>
    resolvePageFromActionMock(...args),
  showPaginationJumpModal: (...args: unknown[]) =>
    showPaginationJumpModalMock(...args),
}));

vi.mock("@/bot/shared/disableComponentsAfterTimeout", () => ({
  disableComponentsAfterTimeout: vi.fn(),
}));

import { GUILD_CONFIG_CUSTOM_ID } from "@/bot/features/guild-config/constants/guildConfig.constants";
import { guildConfigViewButtonHandler } from "@/bot/features/guild-config/handlers/ui/guildConfigViewButtonHandler";

function createButtonInteraction(
  customId: string,
  defaultPageValue = "guild_config",
) {
  return {
    customId,
    guildId: "guild-1",
    locale: "ja",
    message: {
      components: [
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.StringSelect,
              customId: GUILD_CONFIG_CUSTOM_ID.PAGE_SELECT,
              options: [{ value: defaultPageValue, default: true }],
            },
          ],
        },
      ],
    },
    update: vi.fn().mockResolvedValue(undefined),
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
  } as unknown as ButtonInteraction;
}

// ページネーションボタンハンドラの matches 判定と execute フローを検証
describe("bot/features/guild-config/handlers/ui/guildConfigViewButtonHandler", () => {
  // 各ケースでモック呼び出し記録をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // matches のテスト
  describe("matches", () => {
    it("guild-config ページネーションボタンの customId に一致すること", () => {
      expect(
        guildConfigViewButtonHandler.matches(GUILD_CONFIG_CUSTOM_ID.PAGE_FIRST),
      ).toBe(true);
      expect(
        guildConfigViewButtonHandler.matches(GUILD_CONFIG_CUSTOM_ID.PAGE_PREV),
      ).toBe(true);
      expect(
        guildConfigViewButtonHandler.matches(GUILD_CONFIG_CUSTOM_ID.PAGE_JUMP),
      ).toBe(true);
      expect(
        guildConfigViewButtonHandler.matches(GUILD_CONFIG_CUSTOM_ID.PAGE_NEXT),
      ).toBe(true);
      expect(
        guildConfigViewButtonHandler.matches(GUILD_CONFIG_CUSTOM_ID.PAGE_LAST),
      ).toBe(true);
    });

    it("無関係な customId には一致しないこと", () => {
      expect(
        guildConfigViewButtonHandler.matches("bump-reminder:page-next"),
      ).toBe(false);
      expect(
        guildConfigViewButtonHandler.matches(
          GUILD_CONFIG_CUSTOM_ID.RESET_CONFIRM,
        ),
      ).toBe(false);
    });
  });

  // execute のテスト
  describe("execute", () => {
    it("guildId が null の場合は何もしないこと", async () => {
      const interaction = createButtonInteraction(
        GUILD_CONFIG_CUSTOM_ID.PAGE_NEXT,
      );
      (interaction as unknown as Record<string, unknown>).guildId = null;
      await guildConfigViewButtonHandler.execute(interaction);
      expect(buildViewPayloadMock).not.toHaveBeenCalled();
    });

    it("parsePaginationAction が null の場合は何もしないこと", async () => {
      parsePaginationActionMock.mockReturnValue(null);
      const interaction = createButtonInteraction(
        GUILD_CONFIG_CUSTOM_ID.PAGE_NEXT,
      );
      await guildConfigViewButtonHandler.execute(interaction);
      expect(buildViewPayloadMock).not.toHaveBeenCalled();
    });

    it("next アクションで次のページに更新されること", async () => {
      parsePaginationActionMock.mockReturnValue("next");
      resolvePageFromActionMock.mockReturnValue(1);
      const interaction = createButtonInteraction(
        GUILD_CONFIG_CUSTOM_ID.PAGE_NEXT,
      );
      await guildConfigViewButtonHandler.execute(interaction);
      expect(buildViewPayloadMock).toHaveBeenCalledWith(1, "guild-1", "ja");
      expect(interaction.update).toHaveBeenCalled();
    });

    it("ページが変わらない場合は deferUpdate のみ呼ばれること", async () => {
      parsePaginationActionMock.mockReturnValue("first");
      resolvePageFromActionMock.mockReturnValue(0);
      const interaction = createButtonInteraction(
        GUILD_CONFIG_CUSTOM_ID.PAGE_FIRST,
      );
      await guildConfigViewButtonHandler.execute(interaction);
      expect(interaction.deferUpdate).toHaveBeenCalled();
      expect(buildViewPayloadMock).not.toHaveBeenCalled();
    });

    it("jump アクションでモーダル表示後にページが更新されること", async () => {
      parsePaginationActionMock.mockReturnValue("jump");
      showPaginationJumpModalMock.mockResolvedValue("3");
      const interaction = createButtonInteraction(
        GUILD_CONFIG_CUSTOM_ID.PAGE_JUMP,
      );
      await guildConfigViewButtonHandler.execute(interaction);
      expect(buildViewPayloadMock).toHaveBeenCalledWith(2, "guild-1", "ja");
      expect(interaction.editReply).toHaveBeenCalled();
    });

    it("jump でモーダルがキャンセルされた場合は何もしないこと", async () => {
      parsePaginationActionMock.mockReturnValue("jump");
      showPaginationJumpModalMock.mockResolvedValue(null);
      const interaction = createButtonInteraction(
        GUILD_CONFIG_CUSTOM_ID.PAGE_JUMP,
      );
      await guildConfigViewButtonHandler.execute(interaction);
      expect(buildViewPayloadMock).not.toHaveBeenCalled();
    });

    it("jump で不正なページ番号の場合は何もしないこと", async () => {
      parsePaginationActionMock.mockReturnValue("jump");
      showPaginationJumpModalMock.mockResolvedValue("abc");
      const interaction = createButtonInteraction(
        GUILD_CONFIG_CUSTOM_ID.PAGE_JUMP,
      );
      await guildConfigViewButtonHandler.execute(interaction);
      expect(buildViewPayloadMock).not.toHaveBeenCalled();
    });

    it("セレクトメニューが見つからない場合はページ0として動作すること", async () => {
      parsePaginationActionMock.mockReturnValue("next");
      resolvePageFromActionMock.mockReturnValue(1);
      const interaction = {
        ...createButtonInteraction(GUILD_CONFIG_CUSTOM_ID.PAGE_NEXT),
        message: { components: [] },
      } as unknown as ButtonInteraction;
      await guildConfigViewButtonHandler.execute(interaction);
      expect(resolvePageFromActionMock).toHaveBeenCalledWith(
        "next",
        0,
        expect.any(Number),
      );
    });
  });
});
