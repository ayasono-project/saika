// tests/unit/bot/features/reaction-role/handlers/ui/reactionRoleClickHandler.test.ts
// リアクションロールパネルボタンクリックハンドラのテスト

const mockConfigService = { findById: vi.fn(), findAllByGuild: vi.fn() };

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (p: string, m: string, params?: Record<string, unknown>) =>
    params ? `[${p}] ${m}:${JSON.stringify(params)}` : `[${p}] ${m}`,
  tDefault: vi.fn((key: string) => key),
  tInteraction: (_locale: string, key: string) => key,
}));
vi.mock("@/shared/utils/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotReactionRolePanelConfigService: () => mockConfigService,
}));
vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: vi.fn(() => ({ type: "success" })),
  createInfoEmbed: vi.fn(() => ({ type: "info" })),
  createErrorEmbed: vi.fn(() => ({ type: "error" })),
}));

import { reactionRoleClickHandler } from "@/bot/features/reaction-role/handlers/ui/reactionRoleClickHandler";
import {
  createErrorEmbed,
  createInfoEmbed,
  createSuccessEmbed,
} from "@/bot/utils/messageResponse";

// --- ヘルパー ---

function createMockButtonInteraction(
  customId: string,
  memberRoles: string[] = [],
) {
  const rolesCache = new Map(memberRoles.map((id) => [id, { id }]));
  return {
    customId,
    locale: "ja",
    guildId: "guild-1",
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    deleteReply: vi.fn().mockResolvedValue(undefined),
    member: {
      id: "user-1",
      guild: { id: "guild-1" },
      roles: {
        cache: { has: (id: string) => rolesCache.has(id) },
        add: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
      },
    },
    guild: {
      members: { me: { roles: { highest: { position: 10 } } } },
      roles: { cache: { get: (id: string) => ({ id, position: 5 }) } },
    },
  };
}

function createPanel(mode: string, buttons: object[]) {
  return {
    id: "panel-1",
    guildId: "guild-1",
    channelId: "ch-1",
    messageId: "msg-1",
    mode,
    title: "Test",
    description: "desc",
    color: "#00A8F3",
    buttons: JSON.stringify(buttons),
    buttonCounter: buttons.length,
  };
}

// --- テスト ---

describe("bot/features/reaction-role/handlers/ui/reactionRoleClickHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- matches ----

  describe("matches", () => {
    it("'reaction-role:click:' で始まる customId に一致する", () => {
      expect(
        reactionRoleClickHandler.matches("reaction-role:click:panel1:1"),
      ).toBe(true);
    });

    it("'reaction-role:click:' で始まらない customId に一致しない", () => {
      expect(
        reactionRoleClickHandler.matches("reaction-role:teardown:xxx"),
      ).toBe(false);
    });
  });

  // ---- execute: 共通バリデーション ----

  describe("execute - 共通バリデーション", () => {
    it("customId のサフィックスにコロンがない場合は deleteReply する", async () => {
      const interaction = createMockButtonInteraction(
        "reaction-role:click:nocolon",
      );

      await reactionRoleClickHandler.execute(interaction as never);

      expect(interaction.deferReply).toHaveBeenCalled();
      expect(interaction.deleteReply).toHaveBeenCalled();
    });

    it("パネルが見つからない場合はエラーメッセージを返す", async () => {
      const interaction = createMockButtonInteraction(
        "reaction-role:click:panel-1:1",
      );
      mockConfigService.findById.mockResolvedValue(null);

      await reactionRoleClickHandler.execute(interaction as never);

      expect(mockConfigService.findById).toHaveBeenCalledWith("panel-1");
      expect(createErrorEmbed).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith({
        embeds: [{ type: "error" }],
      });
    });

    it("クリックされたボタンが見つからない場合は deleteReply する", async () => {
      const panel = createPanel("toggle", [
        {
          buttonId: 1,
          label: "A",
          emoji: "",
          style: "Primary",
          roleIds: ["role-1"],
        },
      ]);
      mockConfigService.findById.mockResolvedValue(panel);
      // buttonId 99 は存在しない
      const interaction = createMockButtonInteraction(
        "reaction-role:click:panel-1:99",
      );

      await reactionRoleClickHandler.execute(interaction as never);

      expect(interaction.deleteReply).toHaveBeenCalled();
    });

    it("Bot より上位のロールが含まれる場合は role_too_high エラーを返す", async () => {
      const panel = createPanel("toggle", [
        {
          buttonId: 1,
          label: "A",
          emoji: "",
          style: "Primary",
          roleIds: ["high-role"],
        },
      ]);
      mockConfigService.findById.mockResolvedValue(panel);

      const interaction = createMockButtonInteraction(
        "reaction-role:click:panel-1:1",
      );
      // ロールの position を Bot の highest (10) 以上にする
      interaction.guild.roles.cache.get = (id: string) =>
        ({ id, position: 10 }) as never;

      await reactionRoleClickHandler.execute(interaction as never);

      expect(createErrorEmbed).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith({
        embeds: [{ type: "error" }],
      });
      // ロール操作は行われない
      expect(interaction.member.roles.add).not.toHaveBeenCalled();
      expect(interaction.member.roles.remove).not.toHaveBeenCalled();
    });
  });

  // ---- toggle モード ----

  describe("execute - toggle モード", () => {
    const buttons = [
      {
        buttonId: 1,
        label: "A",
        emoji: "",
        style: "Primary",
        roleIds: ["role-1", "role-2"],
      },
    ];

    it("ユーザーが全ロールを持っている場合はロールを解除する", async () => {
      const panel = createPanel("toggle", buttons);
      mockConfigService.findById.mockResolvedValue(panel);
      const interaction = createMockButtonInteraction(
        "reaction-role:click:panel-1:1",
        ["role-1", "role-2"],
      );

      await reactionRoleClickHandler.execute(interaction as never);

      expect(interaction.member.roles.remove).toHaveBeenCalledWith([
        "role-1",
        "role-2",
      ]);
      expect(createSuccessEmbed).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith({
        embeds: [{ type: "success" }],
      });
    });

    it("ユーザーが一部のロールを持っていない場合は不足分を付与する", async () => {
      const panel = createPanel("toggle", buttons);
      mockConfigService.findById.mockResolvedValue(panel);
      // role-1 のみ所有
      const interaction = createMockButtonInteraction(
        "reaction-role:click:panel-1:1",
        ["role-1"],
      );

      await reactionRoleClickHandler.execute(interaction as never);

      expect(interaction.member.roles.add).toHaveBeenCalledWith(["role-2"]);
      expect(createSuccessEmbed).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith({
        embeds: [{ type: "success" }],
      });
    });

    it("ロール操作で例外が発生した場合は role_too_high エラーを返す", async () => {
      const panel = createPanel("toggle", buttons);
      mockConfigService.findById.mockResolvedValue(panel);
      const interaction = createMockButtonInteraction(
        "reaction-role:click:panel-1:1",
      );
      interaction.member.roles.add.mockRejectedValue(
        new Error("Missing Permissions"),
      );

      await reactionRoleClickHandler.execute(interaction as never);

      expect(createErrorEmbed).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith({
        embeds: [{ type: "error" }],
      });
    });
  });

  // ---- one-action モード ----

  describe("execute - one-action モード", () => {
    const buttons = [
      {
        buttonId: 1,
        label: "A",
        emoji: "",
        style: "Primary",
        roleIds: ["role-1", "role-2"],
      },
    ];

    it("ユーザーが全ロールを持っている場合は既に付与済みメッセージを返す", async () => {
      const panel = createPanel("one-action", buttons);
      mockConfigService.findById.mockResolvedValue(panel);
      const interaction = createMockButtonInteraction(
        "reaction-role:click:panel-1:1",
        ["role-1", "role-2"],
      );

      await reactionRoleClickHandler.execute(interaction as never);

      expect(createInfoEmbed).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith({
        embeds: [{ type: "info" }],
      });
      expect(interaction.member.roles.add).not.toHaveBeenCalled();
    });

    it("ユーザーが一部のロールを持っていない場合は不足分を付与する", async () => {
      const panel = createPanel("one-action", buttons);
      mockConfigService.findById.mockResolvedValue(panel);
      const interaction = createMockButtonInteraction(
        "reaction-role:click:panel-1:1",
        ["role-1"],
      );

      await reactionRoleClickHandler.execute(interaction as never);

      expect(interaction.member.roles.add).toHaveBeenCalledWith(["role-2"]);
      expect(createSuccessEmbed).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith({
        embeds: [{ type: "success" }],
      });
    });

    it("ロール操作で例外が発生した場合は role_too_high エラーを返す", async () => {
      const panel = createPanel("one-action", buttons);
      mockConfigService.findById.mockResolvedValue(panel);
      const interaction = createMockButtonInteraction(
        "reaction-role:click:panel-1:1",
      );
      interaction.member.roles.add.mockRejectedValue(
        new Error("Missing Permissions"),
      );

      await reactionRoleClickHandler.execute(interaction as never);

      expect(createErrorEmbed).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith({
        embeds: [{ type: "error" }],
      });
    });
  });

  // ---- exclusive モード ----

  describe("execute - exclusive モード", () => {
    const buttons = [
      {
        buttonId: 1,
        label: "A",
        emoji: "",
        style: "Primary",
        roleIds: ["role-1"],
      },
      {
        buttonId: 2,
        label: "B",
        emoji: "",
        style: "Secondary",
        roleIds: ["role-2"],
      },
      {
        buttonId: 3,
        label: "C",
        emoji: "",
        style: "Success",
        roleIds: ["role-3"],
      },
    ];

    it("ユーザーがクリックしたボタンの全ロールを既に持っている場合は既に選択済みメッセージを返す", async () => {
      const panel = createPanel("exclusive", buttons);
      mockConfigService.findById.mockResolvedValue(panel);
      const interaction = createMockButtonInteraction(
        "reaction-role:click:panel-1:1",
        ["role-1"],
      );

      await reactionRoleClickHandler.execute(interaction as never);

      expect(createInfoEmbed).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith({
        embeds: [{ type: "info" }],
      });
      expect(interaction.member.roles.add).not.toHaveBeenCalled();
      expect(interaction.member.roles.remove).not.toHaveBeenCalled();
    });

    it("ユーザーがクリックしたボタンのロールを持っていない場合は他ボタンのロールを解除して付与する", async () => {
      const panel = createPanel("exclusive", buttons);
      mockConfigService.findById.mockResolvedValue(panel);
      // role-2 を所有、ボタン1 (role-1) をクリック
      const interaction = createMockButtonInteraction(
        "reaction-role:click:panel-1:1",
        ["role-2"],
      );

      await reactionRoleClickHandler.execute(interaction as never);

      // role-2 を解除（role-3 は所有していないので解除対象外）
      expect(interaction.member.roles.remove).toHaveBeenCalledWith(["role-2"]);
      // role-1 を付与
      expect(interaction.member.roles.add).toHaveBeenCalledWith(["role-1"]);
      expect(createSuccessEmbed).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith({
        embeds: [{ type: "success" }],
      });
    });

    it("他ボタンのロールを所有していない場合は remove を呼ばずに付与のみ行う", async () => {
      const panel = createPanel("exclusive", buttons);
      mockConfigService.findById.mockResolvedValue(panel);
      // ロールなし、ボタン1 (role-1) をクリック
      const interaction = createMockButtonInteraction(
        "reaction-role:click:panel-1:1",
      );

      await reactionRoleClickHandler.execute(interaction as never);

      expect(interaction.member.roles.remove).not.toHaveBeenCalled();
      expect(interaction.member.roles.add).toHaveBeenCalledWith(["role-1"]);
      expect(createSuccessEmbed).toHaveBeenCalled();
    });

    it("ロール操作で例外が発生した場合は role_too_high エラーを返す", async () => {
      const panel = createPanel("exclusive", buttons);
      mockConfigService.findById.mockResolvedValue(panel);
      const interaction = createMockButtonInteraction(
        "reaction-role:click:panel-1:1",
      );
      interaction.member.roles.add.mockRejectedValue(
        new Error("Missing Permissions"),
      );

      await reactionRoleClickHandler.execute(interaction as never);

      expect(createErrorEmbed).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith({
        embeds: [{ type: "error" }],
      });
    });
  });
});
