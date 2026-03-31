// tests/unit/bot/features/guild-config/handlers/ui/guildConfigViewSelectHandler.test.ts
import type { StringSelectMenuInteraction } from "discord.js";

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

vi.mock("@/bot/shared/pagination", () => ({
  buildPaginationRow: vi.fn(() => ({ components: [] })),
}));

vi.mock("@/bot/shared/disableComponentsAfterTimeout", () => ({
  disableComponentsAfterTimeout: vi.fn(),
}));

import {
  GUILD_CONFIG_CUSTOM_ID,
  PAGE_VALUES,
} from "@/bot/features/guild-config/constants/guildConfig.constants";
import { guildConfigViewSelectHandler } from "@/bot/features/guild-config/handlers/ui/guildConfigViewSelectHandler";

function createSelectInteraction(value: string) {
  return {
    customId: GUILD_CONFIG_CUSTOM_ID.PAGE_SELECT,
    guildId: "guild-1",
    locale: "ja",
    values: [value],
    update: vi.fn().mockResolvedValue(undefined),
  } as unknown as StringSelectMenuInteraction;
}

// ページセレクトメニューハンドラの matches 判定と execute フローを検証
describe("bot/features/guild-config/handlers/ui/guildConfigViewSelectHandler", () => {
  // 各ケースでモック呼び出し記録をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // matches のテスト
  describe("matches", () => {
    it("guild-config:page-select に一致すること", () => {
      expect(
        guildConfigViewSelectHandler.matches(
          GUILD_CONFIG_CUSTOM_ID.PAGE_SELECT,
        ),
      ).toBe(true);
    });

    it("無関係な customId には一致しないこと", () => {
      expect(guildConfigViewSelectHandler.matches("other:page-select")).toBe(
        false,
      );
    });
  });

  // execute のテスト
  describe("execute", () => {
    it("guildId が null の場合は何もしないこと", async () => {
      const interaction = createSelectInteraction(PAGE_VALUES.AFK);
      (interaction as unknown as Record<string, unknown>).guildId = null;
      await guildConfigViewSelectHandler.execute(interaction);
      expect(buildViewPayloadMock).not.toHaveBeenCalled();
    });

    it("AFK を選択した場合はページ1（0-indexed）に更新されること", async () => {
      const interaction = createSelectInteraction(PAGE_VALUES.AFK);
      await guildConfigViewSelectHandler.execute(interaction);
      expect(buildViewPayloadMock).toHaveBeenCalledWith(1, "guild-1", "ja");
      expect(interaction.update).toHaveBeenCalled();
    });

    it("BUMP を選択した場合はページ6（0-indexed）に更新されること", async () => {
      const interaction = createSelectInteraction(PAGE_VALUES.BUMP);
      await guildConfigViewSelectHandler.execute(interaction);
      expect(buildViewPayloadMock).toHaveBeenCalledWith(6, "guild-1", "ja");
    });

    it("不正な value の場合は何もしないこと", async () => {
      const interaction = createSelectInteraction("unknown_value");
      await guildConfigViewSelectHandler.execute(interaction);
      expect(buildViewPayloadMock).not.toHaveBeenCalled();
    });
  });
});
