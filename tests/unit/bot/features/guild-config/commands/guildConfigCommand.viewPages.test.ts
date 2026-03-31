// tests/unit/bot/features/guild-config/commands/guildConfigCommand.viewPages.test.ts

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: vi.fn((...args: unknown[]) => String(args[1])),
  tDefault: vi.fn((key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
  localeManager: { invalidateLocaleCache: vi.fn() },
}));

const getConfigMock = vi.fn();
const getAfkConfigMock = vi.fn();
const getVacConfigMock = vi.fn().mockResolvedValue({
  enabled: false,
  triggerChannelIds: [],
  createdChannels: [],
});
const getVcRecruitConfigMock = vi
  .fn()
  .mockResolvedValue({ enabled: false, mentionRoleIds: [], setups: [] });
const getStickyMessagesMock = vi.fn().mockResolvedValue([]);
const getMemberLogConfigMock = vi.fn().mockResolvedValue(null);
const getBumpConfigMock = vi.fn().mockResolvedValue(null);

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotGuildConfigService: () => ({ getConfig: getConfigMock }),
  getBotVacConfigService: () => ({ getVacConfigOrDefault: getVacConfigMock }),
  getBotVcRecruitConfigService: () => ({
    getVcRecruitConfigOrDefault: getVcRecruitConfigMock,
  }),
  getBotStickyMessageConfigService: () => ({
    findAllByGuild: getStickyMessagesMock,
  }),
  getBotMemberLogConfigService: () => ({
    getMemberLogConfig: getMemberLogConfigMock,
  }),
  getBotBumpReminderConfigService: () => ({
    getBumpReminderConfig: getBumpConfigMock,
  }),
}));

vi.mock("@/shared/features/afk/afkConfigService", () => ({
  getAfkConfig: (...args: unknown[]) => getAfkConfigMock(...args),
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

import { buildPage } from "@/bot/features/guild-config/commands/guildConfigCommand.viewPages";

// 全7ページの Embed 生成ロジックを検証
describe("bot/features/guild-config/commands/guildConfigCommand.viewPages", () => {
  // 各ケースでモック呼び出し記録をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
    getConfigMock.mockResolvedValue(null);
    getAfkConfigMock.mockResolvedValue(null);
  });

  // ページ1: ギルド設定
  describe("buildPage(0) - ギルド設定", () => {
    it("設定が存在する場合は locale と errorChannelId が表示されること", async () => {
      getConfigMock.mockResolvedValue({
        guildId: "g1",
        locale: "ja",
        errorChannelId: "ch-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const embed = (await buildPage(0, "g1", "ja")) as unknown as Record<
        string,
        unknown
      >;
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
      const embed = (await buildPage(0, "g1", "ja")) as unknown as Record<
        string,
        unknown
      >;
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
      const embed = (await buildPage(0, "g1", "ja")) as unknown as Record<
        string,
        unknown
      >;
      expect(embed.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ value: "English (en)" }),
        ]),
      );
    });
  });

  // ページ2: AFK
  describe("buildPage(1) - AFK", () => {
    it("AFK が設定済みの場合は enabled と channelId が表示されること", async () => {
      getAfkConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "afk-ch",
      });
      const embed = (await buildPage(1, "g1", "ja")) as unknown as Record<
        string,
        unknown
      >;
      expect(embed.title).toBe("afk:embed.title.config_view");
      expect(embed.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ value: "common:enabled" }),
          expect.objectContaining({ value: "<#afk-ch>" }),
        ]),
      );
    });

    it("AFK が未設定の場合は disabled と not_configured が表示されること", async () => {
      getAfkConfigMock.mockResolvedValue(null);
      const embed = (await buildPage(1, "g1", "ja")) as unknown as Record<
        string,
        unknown
      >;
      expect(embed.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ value: "common:disabled" }),
        ]),
      );
    });
  });

  // ページ3: VAC
  describe("buildPage(2) - VAC", () => {
    it("トリガーチャンネルが表示されること", async () => {
      getVacConfigMock.mockResolvedValue({
        enabled: true,
        triggerChannelIds: ["vc-1"],
        createdChannels: [],
      });
      const embed = (await buildPage(2, "g1", "ja")) as unknown as Record<
        string,
        unknown
      >;
      expect(embed.title).toBe("vac:embed.title.config_view");
      expect(embed.fields).toEqual(
        expect.arrayContaining([expect.objectContaining({ value: "<#vc-1>" })]),
      );
    });
  });

  // ページ4: VC募集
  describe("buildPage(3) - VC募集", () => {
    it("セットアップが表示されること", async () => {
      getVcRecruitConfigMock.mockResolvedValue({
        enabled: true,
        mentionRoleIds: [],
        setups: [{ panelChannelId: "p1", postChannelId: "po1" }],
      });
      const embed = (await buildPage(3, "g1", "ja")) as unknown as Record<
        string,
        unknown
      >;
      expect(embed.title).toBe("vcRecruit:embed.title.config_view");
    });
  });

  // ページ5: メッセージ固定
  describe("buildPage(4) - メッセージ固定", () => {
    it("スティッキーメッセージのチャンネルが表示されること", async () => {
      getStickyMessagesMock.mockResolvedValue([{ channelId: "st-1" }]);
      const embed = (await buildPage(4, "g1", "ja")) as unknown as Record<
        string,
        unknown
      >;
      expect(embed.title).toBe("stickyMessage:embed.title.view");
      expect(embed.fields).toEqual(
        expect.arrayContaining([expect.objectContaining({ value: "<#st-1>" })]),
      );
    });
  });

  // ページ6: メンバーログ
  describe("buildPage(5) - メンバーログ", () => {
    it("設定が存在する場合は全フィールドが表示されること", async () => {
      getMemberLogConfigMock.mockResolvedValue({
        enabled: true,
        channelId: "ml-ch",
        joinMessage: "welcome",
        leaveMessage: "bye",
      });
      const embed = (await buildPage(5, "g1", "ja")) as unknown as Record<
        string,
        unknown
      >;
      expect(embed.title).toBe("memberLog:embed.title.config_view");
      const fields = embed.fields as Array<{ value: string }>;
      expect(fields).toHaveLength(4);
    });

    it("設定が存在しない場合は未設定メッセージが表示されること", async () => {
      getMemberLogConfigMock.mockResolvedValue(null);
      const embed = (await buildPage(5, "g1", "ja")) as unknown as Record<
        string,
        unknown
      >;
      expect(embed.title).toBe("memberLog:embed.title.config_view");
    });
  });

  // ページ7: Bumpリマインダー
  describe("buildPage(6) - Bumpリマインダー", () => {
    it("設定が存在する場合はステータスとメンション情報が表示されること", async () => {
      getBumpConfigMock.mockResolvedValue({
        enabled: true,
        mentionRoleId: "role-1",
        mentionUserIds: ["u1"],
      });
      const embed = (await buildPage(6, "g1", "ja")) as unknown as Record<
        string,
        unknown
      >;
      expect(embed.title).toBe("bumpReminder:embed.title.config_view");
      const fields = embed.fields as Array<{ value: string }>;
      expect(fields).toHaveLength(3);
    });

    it("設定が存在しない場合は未設定メッセージが表示されること", async () => {
      getBumpConfigMock.mockResolvedValue(null);
      const embed = (await buildPage(6, "g1", "ja")) as unknown as Record<
        string,
        unknown
      >;
      expect(embed.title).toBe("bumpReminder:embed.title.config_view");
    });
  });

  // 範囲外のページ
  describe("buildPage(99) - 範囲外", () => {
    it("範囲外のページインデックスでもエラーにならずデフォルト Embed を返すこと", async () => {
      const embed = (await buildPage(99, "g1", "ja")) as unknown as Record<
        string,
        unknown
      >;
      expect(embed).toBeDefined();
    });
  });
});
