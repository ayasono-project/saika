// tests/unit/bot/features/reaction-role/commands/usecases/reactionRoleConfigEditPanel.test.ts

import { MessageFlags } from "discord.js";
import type { GuildReactionRolePanel } from "@/shared/database/types/reactionRoleTypes";

const findAllByGuildMock = vi.fn();

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotReactionRolePanelConfigService: vi.fn(() => ({
    findAllByGuild: findAllByGuildMock,
  })),
}));

const editPanelSessionSetMock = vi.fn();
vi.mock(
  "@/bot/features/reaction-role/handlers/ui/reactionRoleSetupState",
  () => ({
    reactionRoleEditPanelSessions: {
      set: editPanelSessionSetMock,
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
    showModal: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("bot/features/reaction-role/commands/usecases/reactionRoleConfigEditPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("パネルが0件の場合はエラー応答を返す", async () => {
    const { handleReactionRoleConfigEditPanel } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigEditPanel"
    );

    findAllByGuildMock.mockResolvedValue([]);
    const interaction = createInteractionMock();

    await handleReactionRoleConfigEditPanel(interaction as never, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [expect.objectContaining({ type: "error" })],
        flags: MessageFlags.Ephemeral,
      }),
    );
  });

  it("パネルが1件の場合はモーダルを直接表示する", async () => {
    const { handleReactionRoleConfigEditPanel } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigEditPanel"
    );

    findAllByGuildMock.mockResolvedValue([createPanel()]);
    const interaction = createInteractionMock();

    await handleReactionRoleConfigEditPanel(interaction as never, "guild-1");

    expect(interaction.showModal).toHaveBeenCalledTimes(1);
    const modal = interaction.showModal.mock.calls[0][0];
    expect(modal.data.custom_id).toContain("reaction-role:edit-panel-modal:");
  });

  it("パネルが1件の場合にセッションがpanelIdを持つこと", async () => {
    const { handleReactionRoleConfigEditPanel } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigEditPanel"
    );

    findAllByGuildMock.mockResolvedValue([createPanel({ id: "panel-x" })]);
    const interaction = createInteractionMock();

    await handleReactionRoleConfigEditPanel(interaction as never, "guild-1");

    expect(editPanelSessionSetMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ panelId: "panel-x" }),
    );
  });

  it("パネルが複数件の場合はセレクトメニューを表示する", async () => {
    const { handleReactionRoleConfigEditPanel } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigEditPanel"
    );

    findAllByGuildMock.mockResolvedValue([
      createPanel({ id: "panel-1" }),
      createPanel({ id: "panel-2" }),
    ]);
    const interaction = createInteractionMock();

    await handleReactionRoleConfigEditPanel(interaction as never, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        components: expect.arrayContaining([expect.any(Object)]),
        flags: MessageFlags.Ephemeral,
      }),
    );
    expect(interaction.showModal).not.toHaveBeenCalled();
  });

  it("セレクトメニューのcustomIdにEDIT_PANEL_SELECT_PREFIXが含まれる", async () => {
    const { handleReactionRoleConfigEditPanel } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigEditPanel"
    );

    findAllByGuildMock.mockResolvedValue([
      createPanel({ id: "panel-1" }),
      createPanel({ id: "panel-2" }),
    ]);
    const interaction = createInteractionMock();

    await handleReactionRoleConfigEditPanel(interaction as never, "guild-1");

    const replyCall = interaction.reply.mock.calls[0][0];
    const selectMenu = replyCall.components[0].components[0].data;
    expect(selectMenu.custom_id).toContain("reaction-role:edit-panel-select:");
  });

  it("複数パネルの場合はセッションのpanelIdが空文字で初期化される", async () => {
    const { handleReactionRoleConfigEditPanel } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigEditPanel"
    );

    findAllByGuildMock.mockResolvedValue([
      createPanel({ id: "panel-1" }),
      createPanel({ id: "panel-2" }),
    ]);
    const interaction = createInteractionMock();

    await handleReactionRoleConfigEditPanel(interaction as never, "guild-1");

    expect(editPanelSessionSetMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ panelId: "" }),
    );
  });
});
