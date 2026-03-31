// tests/unit/bot/commands/bump-reminder-config.test.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { MessageFlags, PermissionFlagsBits } from "discord.js";
import type { Mock } from "vitest";

const setBumpReminderEnabledMock = vi.fn();
const getBumpReminderConfigMock = vi.fn();
const setBumpReminderMentionRoleMock = vi.fn();
const cancelReminderMock = vi.fn();
const tDefaultMock = vi.hoisted(() => vi.fn((key: string) => `default:${key}`));
const tGuildMock = vi.hoisted(() => vi.fn());
const createSuccessEmbedMock = vi.fn((description: string) => ({
  description,
}));

// Bump設定サービス依存を置き換えてコマンド分岐を直接検証する
vi.mock("@/shared/features/bump-reminder/bumpReminderConfigService", () => ({
  BUMP_REMINDER_MENTION_ROLE_RESULT: {
    UPDATED: "updated",
    CLEARED: "cleared",
    NOT_CONFIGURED: "not_configured",
  },
  getBumpReminderConfigService: vi.fn(() => ({
    setBumpReminderEnabled: (...args: unknown[]) =>
      setBumpReminderEnabledMock(...args),
    getBumpReminderConfig: (...args: unknown[]) =>
      getBumpReminderConfigMock(...args),
    setBumpReminderMentionRole: (...args: unknown[]) =>
      setBumpReminderMentionRoleMock(...args),
  })),
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotBumpReminderConfigService: vi.fn(() => ({
    setBumpReminderEnabled: (...args: unknown[]) =>
      setBumpReminderEnabledMock(...args),
    getBumpReminderConfig: (...args: unknown[]) =>
      getBumpReminderConfigMock(...args),
    setBumpReminderMentionRole: (...args: unknown[]) =>
      setBumpReminderMentionRoleMock(...args),
  })),
  getBotBumpReminderManager: vi.fn(() => ({
    cancelReminder: (...args: unknown[]) => cancelReminderMock(...args),
  })),
}));

// 共通エラーハンドラの委譲を確認
vi.mock("@/bot/errors/interactionErrorHandler", () => ({
  handleCommandError: vi.fn(),
}));

// i18n を固定値化して期待値を安定させる
vi.mock("@/shared/locale/commandLocalizations", () => ({
  getCommandLocalizations: () => ({
    ja: "desc",
    localizations: { "en-US": "desc" },
  }),
}));
vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (
    prefixKey: string,
    messageKey: string,
    params?: Record<string, unknown>,
    sub?: string,
  ) => {
    const p = `${prefixKey}`;
    const m = params ? `${messageKey}:${JSON.stringify(params)}` : messageKey;
    return sub ? `[${p}:${sub}] ${m}` : `[${p}] ${m}`;
  },
  logCommand: (
    commandName: string,
    messageKey: string,
    params?: Record<string, unknown>,
  ) => {
    const m = params ? `${messageKey}:${JSON.stringify(params)}` : messageKey;
    return `[${commandName}] ${m}`;
  },
  tDefault: tDefaultMock,
  tGuild: tGuildMock,
  tInteraction: (...args: unknown[]) => args[1],
}));

// メッセージ生成は簡易オブジェクト化
vi.mock("@/bot/utils/messageResponse", () => ({
  createErrorEmbed: vi.fn((message: string) => ({ message })),
  createInfoEmbed: vi.fn((message: string) => ({ message })),
  createSuccessEmbed: (description: string) =>
    createSuccessEmbedMock(description),
  STATUS_COLORS: {
    success: 0x57f287,
    info: 0x3498db,
    warning: 0xfee75c,
    error: 0xed4245,
  },
}));

// ログ出力の副作用を抑止
vi.mock("@/shared/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { bumpReminderConfigCommand } from "@/bot/commands/bump-reminder-config";
import { handleCommandError } from "@/bot/errors/interactionErrorHandler";

type InteractionLike = {
  guildId: string | null;
  channelId: string;
  locale: string;
  user: { id: string };
  guild?: {
    members: {
      fetch: Mock;
    };
  };
  memberPermissions: { has: Mock };
  options: {
    getSubcommand: Mock;
    getRole: Mock;
  };
  reply: Mock;
  editReply: Mock;
};

// bump-reminder-config 検証用 interaction モック
function createInteraction(
  overrides?: Partial<InteractionLike>,
): InteractionLike {
  return {
    guildId: "guild-1",
    channelId: "channel-1",
    locale: "ja",
    user: { id: "operator-1" },
    guild: {
      members: {
        fetch: vi.fn().mockResolvedValue(null),
      },
    },
    memberPermissions: { has: vi.fn(() => true) },
    options: {
      getSubcommand: vi.fn(() => "enable"),
      getRole: vi.fn(() => null),
    },
    reply: vi.fn().mockResolvedValue({
      awaitMessageComponent: vi.fn(),
    }),
    editReply: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// bump-reminder-config コマンドの各サブコマンド（enable/disable/set-mention/remove-mention/view）の分岐を検証
describe("bot/commands/bump-reminder-config", () => {
  // ケースごとにモックを初期化する
  beforeEach(() => {
    vi.clearAllMocks();
    // tInteraction mock returns the key as-is (configured in vi.mock)
    cancelReminderMock.mockResolvedValue(undefined);
    setBumpReminderEnabledMock.mockResolvedValue(undefined);
    getBumpReminderConfigMock.mockResolvedValue({
      enabled: true,
      channelId: "channel-1",
      mentionRoleId: "role-1",
      mentionUserIds: ["user-2"],
    });
    setBumpReminderMentionRoleMock.mockResolvedValue("updated");
  });

  it("enable でバンプリマインダーが有効化されて success 応答が返されることを確認", async () => {
    const interaction = createInteraction({
      options: {
        getSubcommand: vi.fn(() => "enable"),
        getRole: vi.fn(() => null),
      },
    });

    await bumpReminderConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(interaction.memberPermissions.has).toHaveBeenCalledWith(
      PermissionFlagsBits.ManageGuild,
    );
    expect(setBumpReminderEnabledMock).toHaveBeenCalledWith(
      "guild-1",
      true,
      "channel-1",
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [
        {
          description: "bumpReminder:user-response.enable_success",
        },
      ],
      flags: MessageFlags.Ephemeral,
    });
  });

  it("disable でアクティブなリマインダーが停止されてバンプリマインダーが無効化されることを確認", async () => {
    const interaction = createInteraction({
      options: {
        getSubcommand: vi.fn(() => "disable"),
        getRole: vi.fn(() => null),
      },
    });

    await bumpReminderConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(cancelReminderMock).toHaveBeenCalledWith("guild-1");
    expect(setBumpReminderEnabledMock).toHaveBeenCalledWith("guild-1", false);
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [
        {
          description: "bumpReminder:user-response.disable_success",
        },
      ],
      flags: MessageFlags.Ephemeral,
    });
  });

  // 各サブコマンドの権限不足時にエラーハンドラへ委譲されることを検証
  it.each([
    "enable",
    "disable",
    "set-mention",
    "remove-mention",
    "view",
  ])("%s サブコマンドで権限不足の場合は handleCommandError へ委譲されることを確認", async (subcommand) => {
    const interaction = createInteraction({
      memberPermissions: { has: vi.fn(() => false) },
      options: {
        getSubcommand: vi.fn(() => subcommand),
        getRole: vi.fn(() => null),
      },
    });

    await bumpReminderConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(handleCommandError).toHaveBeenCalledTimes(1);
  });

  it("set-mention で role が null の場合はエラーが委譲されることを確認", async () => {
    const interaction = createInteraction({
      options: {
        getSubcommand: vi.fn(() => "set-mention"),
        getRole: vi.fn(() => null),
      },
    });

    await bumpReminderConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(handleCommandError).toHaveBeenCalledTimes(1);
  });

  it("set-mention でロールが正常に設定されることを確認", async () => {
    setBumpReminderMentionRoleMock.mockResolvedValueOnce("updated");

    const interaction = createInteraction({
      options: {
        getSubcommand: vi.fn(() => "set-mention"),
        getRole: vi.fn(() => ({ id: "role-7" })),
      },
    });

    await bumpReminderConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(setBumpReminderMentionRoleMock).toHaveBeenCalledWith(
      "guild-1",
      "role-7",
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [
        {
          description: "bumpReminder:user-response.set_mention_role_success",
        },
      ],
      flags: MessageFlags.Ephemeral,
    });
  });

  it("set-mention で role 設定結果が not_configured の場合はエラーが委譲されることを確認", async () => {
    setBumpReminderMentionRoleMock.mockResolvedValueOnce("not_configured");
    const interaction = createInteraction({
      options: {
        getSubcommand: vi.fn(() => "set-mention"),
        getRole: vi.fn(() => ({ id: "role-7" })),
      },
    });

    await bumpReminderConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(handleCommandError).toHaveBeenCalledTimes(1);
  });

  it("view で設定が未登録の場合は info 応答が返されることを確認", async () => {
    getBumpReminderConfigMock.mockResolvedValueOnce(null);
    const interaction = createInteraction({
      options: {
        getSubcommand: vi.fn(() => "view"),
        getRole: vi.fn(() => null),
      },
    });

    await bumpReminderConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [
        {
          message: "bumpReminder:embed.description.not_configured",
        },
      ],
      flags: MessageFlags.Ephemeral,
    });
  });

  it("view で role と users が設定済みの場合に info 応答が返されることを確認", async () => {
    getBumpReminderConfigMock.mockResolvedValueOnce({
      enabled: false,
      channelId: "channel-1",
      mentionRoleId: "role-2",
      mentionUserIds: ["user-a", "user-b"],
    });
    const interaction = createInteraction({
      options: {
        getSubcommand: vi.fn(() => "view"),
        getRole: vi.fn(() => null),
      },
    });

    await bumpReminderConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [
        {
          message: "",
        },
      ],
      flags: MessageFlags.Ephemeral,
    });
  });

  it("view で role/users が未設定かつ enabled=true の場合に info 応答が返されることを確認", async () => {
    getBumpReminderConfigMock.mockResolvedValueOnce({
      enabled: true,
      channelId: "channel-1",
      mentionRoleId: null,
      mentionUserIds: [],
    });
    const interaction = createInteraction({
      options: {
        getSubcommand: vi.fn(() => "view"),
        getRole: vi.fn(() => null),
      },
    });

    await bumpReminderConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [
        {
          message: "",
        },
      ],
      flags: MessageFlags.Ephemeral,
    });
  });

  it("remove-mention でロールメンションが解除されることを確認", async () => {
    const interaction = createInteraction({
      options: {
        getSubcommand: vi.fn(() => "remove-mention"),
        getRole: vi.fn(() => null),
      },
    });

    await bumpReminderConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(setBumpReminderMentionRoleMock).toHaveBeenCalledWith(
      "guild-1",
      undefined,
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [
        {
          description: "bumpReminder:user-response.remove_mention_role",
        },
      ],
      flags: MessageFlags.Ephemeral,
    });
  });

  it("remove-mention が未設定の場合は not_configured エラーが委譲されることを確認", async () => {
    setBumpReminderMentionRoleMock.mockResolvedValueOnce("not_configured");
    const interaction = createInteraction({
      options: {
        getSubcommand: vi.fn(() => "remove-mention"),
        getRole: vi.fn(() => null),
      },
    });

    await bumpReminderConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(setBumpReminderMentionRoleMock).toHaveBeenCalledWith(
      "guild-1",
      undefined,
    );
    expect(handleCommandError).toHaveBeenCalledTimes(1);
  });
});
