// tests/unit/bot/features/reaction-role/commands/usecases/reactionRoleConfigView.test.ts

import { MessageFlags } from "discord.js";
import type { GuildReactionRolePanel } from "@/shared/database/types/reactionRoleTypes";

const findAllByGuildMock = vi.fn();
const deleteMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotReactionRolePanelConfigService: vi.fn(() => ({
    findAllByGuild: findAllByGuildMock,
    delete: deleteMock,
  })),
}));

vi.mock("@/bot/shared/disableComponentsAfterTimeout", () => ({
  disableComponentsAfterTimeout: vi.fn(),
}));

vi.mock("@/bot/shared/pagination", () => ({
  buildPaginationRow: vi.fn(() => ({
    components: [{ data: { custom_id: "pagination" } }],
  })),
}));

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (p: string, m: string, params?: Record<string, unknown>) =>
    params ? `[${p}] ${m}:${JSON.stringify(params)}` : `[${p}] ${m}`,
  tDefault: vi.fn((key: string) => key),
  tInteraction: (_locale: string, key: string) => key,
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/bot/utils/messageResponse", async () => {
  const { EmbedBuilder } =
    await vi.importActual<typeof import("discord.js")>("discord.js");
  return {
    createSuccessEmbed: vi.fn(() => ({ type: "success" })),
    createInfoEmbed: vi.fn(
      (
        _desc: string,
        opts?: {
          title?: string;
          fields?: { name: string; value: string; inline?: boolean }[];
        },
      ) => {
        const embed = new EmbedBuilder();
        if (opts?.title) embed.setTitle(opts.title);
        if (opts?.fields) embed.addFields(opts.fields);
        return embed;
      },
    ),
    createErrorEmbed: vi.fn(() => ({ type: "error" })),
    createWarningEmbed: vi.fn(() => ({ type: "warning" })),
  };
});

function createPanel(
  overrides: Partial<GuildReactionRolePanel> = {},
): GuildReactionRolePanel {
  return {
    id: "panel-1",
    guildId: "guild-1",
    channelId: "ch-1",
    messageId: "msg-1",
    mode: "toggle",
    title: "Test Panel",
    description: "desc",
    color: "#00A8F3",
    buttons: "[]",
    buttonCounter: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createInteractionMock(overrides = {}) {
  return {
    guildId: "guild-1",
    locale: "ja",
    guild: { channels: { cache: { get: () => ({ name: "test-channel" }) } } },
    reply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
    showModal: vi.fn().mockResolvedValue(undefined),
    client: {
      channels: {
        fetch: vi.fn().mockResolvedValue({
          messages: { fetch: vi.fn().mockResolvedValue({ id: "msg-1" }) },
        }),
      },
    },
    ...overrides,
  };
}

describe("bot/features/reaction-role/commands/usecases/reactionRoleConfigView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("パネルが0件の場合はエラー応答を返す", async () => {
    const { handleReactionRoleConfigView } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigView"
    );

    findAllByGuildMock.mockResolvedValue([]);
    const interaction = createInteractionMock();

    await handleReactionRoleConfigView(interaction as never, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [expect.objectContaining({ type: "error" })],
        flags: MessageFlags.Ephemeral,
      }),
    );
  });

  it("パネルが1件の場合はページネーションなしでembedを表示する", async () => {
    const { handleReactionRoleConfigView } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigView"
    );

    findAllByGuildMock.mockResolvedValue([createPanel()]);
    const interaction = createInteractionMock();

    await handleReactionRoleConfigView(interaction as never, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.arrayContaining([expect.any(Object)]),
        components: [],
        flags: MessageFlags.Ephemeral,
      }),
    );
  });

  it("パネルが複数件の場合はページネーションとセレクトメニュー付きで表示する", async () => {
    const { handleReactionRoleConfigView } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigView"
    );

    findAllByGuildMock.mockResolvedValue([
      createPanel({ id: "panel-1", channelId: "ch-1" }),
      createPanel({ id: "panel-2", channelId: "ch-2" }),
    ]);
    const interaction = createInteractionMock();

    await handleReactionRoleConfigView(interaction as never, "guild-1");

    const replyCall = interaction.reply.mock.calls[0][0];
    expect(replyCall.components.length).toBeGreaterThanOrEqual(2);
  });

  it("メッセージが存在しないパネルはDBから削除される", async () => {
    const { handleReactionRoleConfigView } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigView"
    );

    findAllByGuildMock.mockResolvedValue([createPanel({ id: "panel-1" })]);
    const interaction = createInteractionMock({
      client: {
        channels: {
          fetch: vi.fn().mockResolvedValue(null),
        },
      },
    });

    await handleReactionRoleConfigView(interaction as never, "guild-1");

    expect(deleteMock).toHaveBeenCalledWith("panel-1");
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [expect.objectContaining({ type: "error" })],
        flags: MessageFlags.Ephemeral,
      }),
    );
  });

  it("一部パネルがクリーンアップされた場合はfollowUpで通知する", async () => {
    const { handleReactionRoleConfigView } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigView"
    );

    findAllByGuildMock.mockResolvedValue([
      createPanel({ id: "panel-1", channelId: "ch-1" }),
      createPanel({ id: "panel-2", channelId: "ch-2" }),
    ]);

    const clientMock = {
      channels: {
        fetch: vi
          .fn()
          .mockResolvedValueOnce({
            messages: {
              fetch: vi.fn().mockResolvedValue({ id: "msg-1" }),
            },
          })
          .mockResolvedValueOnce(null),
      },
    };
    const interaction = createInteractionMock({ client: clientMock });

    await handleReactionRoleConfigView(interaction as never, "guild-1");

    expect(deleteMock).toHaveBeenCalledWith("panel-2");
    expect(interaction.followUp).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral,
      }),
    );
  });

  it("セレクトメニューのcustomIdにVIEW_SELECT_PREFIXが含まれる", async () => {
    const { handleReactionRoleConfigView } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigView"
    );

    findAllByGuildMock.mockResolvedValue([
      createPanel({ id: "panel-1" }),
      createPanel({ id: "panel-2" }),
    ]);
    const interaction = createInteractionMock();

    await handleReactionRoleConfigView(interaction as never, "guild-1");

    const replyCall = interaction.reply.mock.calls[0][0];
    // Last component row contains the select menu
    const lastRow = replyCall.components[replyCall.components.length - 1];
    const selectMenu = lastRow.components[0].data;
    expect(selectMenu.custom_id).toContain("reaction-role:view-select:");
  });

  describe("buildViewEmbed", () => {
    it("ボタンが存在するパネルでボタン一覧が描画されること", async () => {
      const { buildViewEmbed } = await import(
        "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigView"
      );

      const panels = [
        createPanel({
          buttons: JSON.stringify([
            {
              buttonId: 1,
              label: "Red",
              emoji: "🔴",
              style: "primary",
              roleIds: ["role-1", "role-2"],
            },
            {
              buttonId: 2,
              label: "Blue",
              emoji: "",
              style: "secondary",
              roleIds: ["role-3"],
            },
          ]),
          buttonCounter: 2,
        }),
      ];

      const embed = buildViewEmbed(panels, 0, "ja");
      const fields = embed.data.fields ?? [];
      const buttonListField = fields.find(
        (f) => f.name === "reactionRole:embed.field.name.button_list",
      );
      expect(buttonListField).toBeDefined();
      expect(buttonListField?.value).toContain("🔴 Red");
      expect(buttonListField?.value).toContain("Blue");
      expect(buttonListField?.value).toContain("<@&role-1>");
    });

    it("ボタンがないパネルではボタン一覧が '-' であること", async () => {
      const { buildViewEmbed } = await import(
        "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigView"
      );

      const panels = [createPanel({ buttons: "[]" })];

      const embed = buildViewEmbed(panels, 0, "ja");
      const fields = embed.data.fields ?? [];
      const buttonListField = fields.find(
        (f) => f.name === "reactionRole:embed.field.name.button_list",
      );
      expect(buttonListField?.value).toBe("-");
    });

    it("各モードの表示名が正しいキーで解決されること", async () => {
      const { buildViewEmbed } = await import(
        "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigView"
      );

      for (const [mode, expectedKey] of [
        ["toggle", "reactionRole:embed.field.value.mode_toggle"],
        ["one-action", "reactionRole:embed.field.value.mode_one_action"],
        ["exclusive", "reactionRole:embed.field.value.mode_exclusive"],
      ] as const) {
        const panels = [createPanel({ mode })];
        const embed = buildViewEmbed(panels, 0, "ja");
        const modeField = (embed.data.fields ?? []).find(
          (f) => f.name === "reactionRole:embed.field.name.mode",
        );
        expect(modeField?.value).toBe(expectedKey);
      }
    });
  });
});
