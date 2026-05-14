// tests/unit/bot/features/guild-config/commands/guildConfigCommand.viewPages.test.ts

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: vi.fn((...args: unknown[]) => String(args[1])),
  tDefault: vi.fn((key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
  localeManager: { invalidateLocaleCache: vi.fn() },
}));

const getConfigMock = vi.fn();

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotGuildConfigService: () => ({ getConfig: getConfigMock }),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createInfoEmbed: (
    _d: string,
    opts?: { title?: string; fields?: unknown[] },
  ) => ({
    kind: "info",
    title: opts?.title,
    fields: opts?.fields,
  }),
}));

vi.mock("@/shared/database/repositories/guildCoreRepository", () => ({
  getGuildCoreRepository: () => ({}),
}));

import { buildGuildConfigPage } from "@/bot/features/guild-config/commands/guildConfigCommand.viewPages";

// ギルド設定ページの Embed 生成ロジックを検証
describe("bot/features/guild-config/commands/guildConfigCommand.viewPages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfigMock.mockResolvedValue(null);
  });

  describe("buildGuildConfigPage - ギルド設定", () => {
    it("設定が存在する場合は locale と errorChannelId が表示されること", async () => {
      getConfigMock.mockResolvedValue({
        guildId: "g1",
        locale: "ja",
        errorChannelId: "ch-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const embed = (await buildGuildConfigPage(
        "g1",
        "ja",
      )) as unknown as Record<string, unknown>;
      expect(embed.title).toBe("guildConfig:embed.title.view");
      expect(embed.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ value: "日本語 (ja)" }),
          expect.objectContaining({ value: "<#ch-1>" }),
        ]),
      );
    });

    it("設定が存在しない場合はデフォルト表示されること", async () => {
      getConfigMock.mockResolvedValue(null);
      const embed = (await buildGuildConfigPage(
        "g1",
        "ja",
      )) as unknown as Record<string, unknown>;
      expect(embed.title).toBe("guildConfig:embed.title.view");
      expect(embed.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            value: "common:embed.field.value.not_configured",
          }),
        ]),
      );
    });

    it("locale が en の場合は English (en) と表示されること", async () => {
      getConfigMock.mockResolvedValue({
        guildId: "g1",
        locale: "en",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const embed = (await buildGuildConfigPage(
        "g1",
        "ja",
      )) as unknown as Record<string, unknown>;
      expect(embed.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ value: "English (en)" }),
        ]),
      );
    });
  });
});
