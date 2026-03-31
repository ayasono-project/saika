// tests/unit/bot/features/reaction-role/commands/usecases/reactionRoleConfigRemoveButton.test.ts

import { MessageFlags } from "discord.js";
import type { GuildReactionRolePanel } from "@/shared/database/types/reactionRoleTypes";

const findAllByGuildMock = vi.fn();

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotReactionRolePanelConfigService: vi.fn(() => ({
    findAllByGuild: findAllByGuildMock,
  })),
}));

const removeButtonSessionSetMock = vi.fn();
vi.mock(
  "@/bot/features/reaction-role/handlers/ui/reactionRoleSetupState",
  () => ({
    reactionRoleRemoveButtonSessions: {
      set: removeButtonSessionSetMock,
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
    buttons: JSON.stringify([
      {
        buttonId: 1,
        label: "Role A",
        emoji: "",
        style: "Primary",
        roleIds: ["role-1"],
      },
      {
        buttonId: 2,
        label: "Role B",
        emoji: "🎮",
        style: "Secondary",
        roleIds: ["role-2"],
      },
    ]),
    buttonCounter: 2,
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

describe("bot/features/reaction-role/commands/usecases/reactionRoleConfigRemoveButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("パネルが0件の場合はエラー応答を返す", async () => {
    const { handleReactionRoleConfigRemoveButton } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigRemoveButton"
    );

    findAllByGuildMock.mockResolvedValue([]);
    const interaction = createInteractionMock();

    await handleReactionRoleConfigRemoveButton(interaction as never, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [expect.objectContaining({ type: "error" })],
        flags: MessageFlags.Ephemeral,
      }),
    );
  });

  it("パネルが1件の場合はボタン選択セレクトメニューを直接表示する", async () => {
    const { handleReactionRoleConfigRemoveButton } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigRemoveButton"
    );

    findAllByGuildMock.mockResolvedValue([createPanel({ id: "panel-x" })]);
    const interaction = createInteractionMock();

    await handleReactionRoleConfigRemoveButton(interaction as never, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        components: expect.arrayContaining([expect.any(Object)]),
        flags: MessageFlags.Ephemeral,
      }),
    );

    const replyCall = interaction.reply.mock.calls[0][0];
    const selectMenu = replyCall.components[0].components[0].data;
    expect(selectMenu.custom_id).toContain(
      "reaction-role:remove-button-select:",
    );
  });

  it("パネルが1件の場合にセッションが正しいpanelIdで作成される", async () => {
    const { handleReactionRoleConfigRemoveButton } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigRemoveButton"
    );

    findAllByGuildMock.mockResolvedValue([createPanel({ id: "panel-x" })]);
    const interaction = createInteractionMock();

    await handleReactionRoleConfigRemoveButton(interaction as never, "guild-1");

    expect(removeButtonSessionSetMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        panelId: "panel-x",
        buttonIds: [],
      }),
    );
  });

  it("ボタン選択メニューにパネルのボタン一覧がオプションとして含まれる", async () => {
    const { handleReactionRoleConfigRemoveButton } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigRemoveButton"
    );

    findAllByGuildMock.mockResolvedValue([createPanel()]);
    const interaction = createInteractionMock();

    await handleReactionRoleConfigRemoveButton(interaction as never, "guild-1");

    const replyCall = interaction.reply.mock.calls[0][0];
    const selectMenuComponent = replyCall.components[0].components[0];
    expect(selectMenuComponent.options).toHaveLength(2);
    expect(selectMenuComponent.options[0].data.label).toBe("Role A");
    expect(selectMenuComponent.options[1].data.label).toBe("Role B");
  });

  it("パネルが複数件の場合はパネル選択セレクトメニューを表示する", async () => {
    const { handleReactionRoleConfigRemoveButton } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigRemoveButton"
    );

    findAllByGuildMock.mockResolvedValue([
      createPanel({ id: "panel-1" }),
      createPanel({ id: "panel-2" }),
    ]);
    const interaction = createInteractionMock();

    await handleReactionRoleConfigRemoveButton(interaction as never, "guild-1");

    const replyCall = interaction.reply.mock.calls[0][0];
    const selectMenu = replyCall.components[0].components[0].data;
    expect(selectMenu.custom_id).toContain(
      "reaction-role:remove-button-panel:",
    );
  });

  it("複数パネルの場合はセッションのpanelIdが空文字で初期化される", async () => {
    const { handleReactionRoleConfigRemoveButton } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigRemoveButton"
    );

    findAllByGuildMock.mockResolvedValue([
      createPanel({ id: "panel-1" }),
      createPanel({ id: "panel-2" }),
    ]);
    const interaction = createInteractionMock();

    await handleReactionRoleConfigRemoveButton(interaction as never, "guild-1");

    expect(removeButtonSessionSetMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        panelId: "",
        buttonIds: [],
      }),
    );
  });
});
