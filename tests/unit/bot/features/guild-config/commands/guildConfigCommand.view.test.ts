// tests/unit/bot/features/guild-config/commands/guildConfigCommand.view.test.ts
import type { ChatInputCommandInteraction } from "discord.js";

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: vi.fn((...args: unknown[]) => String(args[1])),
  tDefault: vi.fn((key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
  localeManager: { invalidateLocaleCache: vi.fn() },
}));

const buildGuildConfigPageMock = vi.fn().mockResolvedValue({ kind: "embed" });
vi.mock(
  "@/bot/features/guild-config/commands/guildConfigCommand.viewPages",
  () => ({
    buildGuildConfigPage: (...args: unknown[]) =>
      buildGuildConfigPageMock(...args),
  }),
);

import { handleView } from "@/bot/features/guild-config/commands/guildConfigCommand.view";

function createInteraction() {
  return {
    locale: "ja",
    reply: vi.fn().mockResolvedValue(undefined),
  } as unknown as ChatInputCommandInteraction;
}

// guild-config view ハンドラの単一 Embed 返信を検証
describe("bot/features/guild-config/commands/guildConfigCommand.view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleView", () => {
    it("ギルド設定の Embed を ephemeral で返信すること", async () => {
      const interaction = createInteraction();
      await handleView(interaction, "guild-1");

      expect(buildGuildConfigPageMock).toHaveBeenCalledWith("guild-1", "ja");
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ flags: 64 }),
      );
    });

    it("コンポーネントが含まれないこと", async () => {
      const interaction = createInteraction();
      await handleView(interaction, "guild-1");

      const replyArg = vi.mocked(interaction.reply).mock.calls[0]?.[0] as
        | Record<string, unknown>
        | undefined;
      expect(replyArg?.components).toBeUndefined();
    });
  });
});
