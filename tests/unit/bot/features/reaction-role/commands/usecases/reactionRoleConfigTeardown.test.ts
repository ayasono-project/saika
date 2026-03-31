// tests/unit/bot/features/reaction-role/commands/usecases/reactionRoleConfigTeardown.test.ts

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

const teardownSessionSetMock = vi.fn();
vi.mock(
  "@/bot/features/reaction-role/handlers/ui/reactionRoleSetupState",
  () => ({
    reactionRoleTeardownSessions: {
      set: teardownSessionSetMock,
      get: vi.fn(),
      delete: vi.fn(),
    },
  }),
);

vi.mock("@/bot/shared/disableComponentsAfterTimeout", () => ({
  disableComponentsAfterTimeout: vi.fn(),
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

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: vi.fn(() => ({ type: "success" })),
  createInfoEmbed: vi.fn(() => ({ type: "info" })),
  createErrorEmbed: vi.fn(() => ({ type: "error" })),
  createWarningEmbed: vi.fn(() => ({ type: "warning" })),
}));

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

describe("bot/features/reaction-role/commands/usecases/reactionRoleConfigTeardown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("パネルが0件の場合はエラー応答を返す", async () => {
    const { handleReactionRoleConfigTeardown } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigTeardown"
    );

    findAllByGuildMock.mockResolvedValue([]);
    const interaction = createInteractionMock();

    await handleReactionRoleConfigTeardown(interaction as never, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [expect.objectContaining({ type: "error" })],
        flags: MessageFlags.Ephemeral,
      }),
    );
  });

  it("パネルが1件の場合はセレクトメニューをスキップして確認ダイアログを直接表示する", async () => {
    const { handleReactionRoleConfigTeardown } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigTeardown"
    );

    findAllByGuildMock.mockResolvedValue([createPanel()]);
    const interaction = createInteractionMock();

    await handleReactionRoleConfigTeardown(interaction as never, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [expect.objectContaining({ type: "warning" })],
        components: expect.arrayContaining([expect.any(Object)]),
        flags: MessageFlags.Ephemeral,
      }),
    );
    expect(teardownSessionSetMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ panelIds: ["panel-1"] }),
    );
  });

  it("パネルが複数件の場合はセレクトメニューを表示する", async () => {
    const { handleReactionRoleConfigTeardown } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigTeardown"
    );

    findAllByGuildMock.mockResolvedValue([
      createPanel({ id: "panel-1", channelId: "ch-1" }),
      createPanel({ id: "panel-2", channelId: "ch-2" }),
    ]);
    const interaction = createInteractionMock();

    await handleReactionRoleConfigTeardown(interaction as never, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        components: expect.arrayContaining([expect.any(Object)]),
        flags: MessageFlags.Ephemeral,
      }),
    );
    expect(teardownSessionSetMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ panelIds: [] }),
    );
  });

  it("セレクトメニューのcustomIdにTEARDOWN_SELECT_PREFIXが含まれる", async () => {
    const { handleReactionRoleConfigTeardown } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigTeardown"
    );

    findAllByGuildMock.mockResolvedValue([
      createPanel({ id: "panel-1" }),
      createPanel({ id: "panel-2" }),
    ]);
    const interaction = createInteractionMock();

    await handleReactionRoleConfigTeardown(interaction as never, "guild-1");

    const replyCall = interaction.reply.mock.calls[0][0];
    const selectMenu = replyCall.components[0].components[0].data;
    expect(selectMenu.custom_id).toContain("reaction-role:teardown-select:");
  });

  it("メッセージが存在しないパネルはDBから削除される", async () => {
    const { handleReactionRoleConfigTeardown } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigTeardown"
    );

    findAllByGuildMock.mockResolvedValue([
      createPanel({ id: "panel-1", channelId: "ch-1" }),
    ]);
    const interaction = createInteractionMock({
      client: {
        channels: {
          fetch: vi.fn().mockResolvedValue(null),
        },
      },
    });

    await handleReactionRoleConfigTeardown(interaction as never, "guild-1");

    expect(deleteMock).toHaveBeenCalledWith("panel-1");
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [expect.objectContaining({ type: "error" })],
        flags: MessageFlags.Ephemeral,
      }),
    );
  });

  it("一部パネルがクリーンアップされた場合はfollowUpで通知する", async () => {
    const { handleReactionRoleConfigTeardown } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigTeardown"
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

    await handleReactionRoleConfigTeardown(interaction as never, "guild-1");

    expect(deleteMock).toHaveBeenCalledWith("panel-2");
    expect(interaction.followUp).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral,
      }),
    );
  });
});
