// tests/unit/bot/commands/guild-config.test.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import type { Mock } from "vitest";

const tDefaultMock = vi.hoisted(() => vi.fn((key: string) => `default:${key}`));

vi.mock("@/shared/locale/commandLocalizations", () => ({
  getCommandLocalizations: () => ({
    ja: "desc",
    localizations: { "en-US": "desc" },
  }),
  getChoiceLocalizations: vi
    .fn()
    .mockImplementation((_ns: string, _key: string, value: string) => ({
      name: "test",
      name_localizations: { "en-US": "test", "en-GB": "test" },
      value,
    })),
}));

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: vi.fn((...args: unknown[]) => String(args[1])),
  logCommand: vi.fn((...args: unknown[]) => String(args[1])),
  tDefault: tDefaultMock,
  tGuild: vi.fn(),
  tInteraction: (...args: unknown[]) => args[1],
  localeManager: { invalidateLocaleCache: vi.fn() },
}));

const updateLocaleMock = vi.fn();
const updateErrorChannelMock = vi.fn();
const getConfigMock = vi.fn();
const resetGuildSettingsMock = vi.fn();
const deleteAllConfigMock = vi.fn();
const exportConfigMock = vi.fn();
const validateImportDataMock = vi.fn();
const importConfigMock = vi.fn();

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotGuildConfigService: () => ({
    updateLocale: updateLocaleMock,
    updateErrorChannel: updateErrorChannelMock,
    getConfig: getConfigMock,
    resetGuildSettings: resetGuildSettingsMock,
    deleteAllConfig: deleteAllConfigMock,
    exportConfig: exportConfigMock,
    validateImportData: validateImportDataMock,
    importConfig: importConfigMock,
  }),
  getBotBumpReminderConfigService: () => ({
    getBumpReminderConfig: vi.fn().mockResolvedValue(null),
  }),
  getBotVacConfigService: () => ({
    getVacConfigOrDefault: vi.fn().mockResolvedValue({
      enabled: false,
      triggerChannelIds: [],
      createdChannels: [],
    }),
  }),
  getBotVcRecruitConfigService: () => ({
    getVcRecruitConfigOrDefault: vi
      .fn()
      .mockResolvedValue({ enabled: false, mentionRoleIds: [], setups: [] }),
  }),
  getBotStickyMessageConfigService: () => ({
    findAllByGuild: vi.fn().mockResolvedValue([]),
  }),
  getBotMemberLogConfigService: () => ({
    getMemberLogConfig: vi.fn().mockResolvedValue(null),
  }),
}));

vi.mock("@/shared/features/afk/afkConfigService", () => ({
  getAfkConfig: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: (d: string, _o?: unknown) => ({
    kind: "success",
    description: d,
  }),
  createInfoEmbed: (d: string, _o?: unknown) => ({
    kind: "info",
    description: d,
  }),
  createWarningEmbed: (d: string, _o?: unknown) => ({
    kind: "warning",
    description: d,
  }),
  createErrorEmbed: (d: string, _o?: unknown) => ({
    kind: "error",
    description: d,
  }),
}));

vi.mock("@/bot/errors/interactionErrorHandler", () => ({
  handleCommandError: vi.fn(),
}));

vi.mock("@/bot/shared/disableComponentsAfterTimeout", () => ({
  disableComponentsAfterTimeout: vi.fn(),
}));

vi.mock("@/bot/shared/pagination", () => ({
  buildPaginationRow: vi.fn(() => ({ components: [] })),
  parsePaginationAction: vi.fn(),
  resolvePageFromAction: vi.fn(),
  showPaginationJumpModal: vi.fn(),
}));

vi.mock("@/shared/database/repositories/guildCoreRepository", () => ({
  getGuildCoreRepository: () => ({}),
}));

import { guildConfigCommand } from "@/bot/commands/guild-config";
import { handleCommandError } from "@/bot/errors/interactionErrorHandler";

type TestInteraction = {
  guildId: string | null;
  locale: string;
  memberPermissions: { has: Mock };
  options: {
    getSubcommand: Mock<() => string>;
    getString: Mock;
    getChannel: Mock;
    getAttachment: Mock;
  };
  reply: Mock;
  guild: null;
};

function createInteraction(
  overrides?: Partial<TestInteraction>,
): TestInteraction {
  return {
    guildId: "guild-1",
    locale: "ja",
    memberPermissions: { has: vi.fn(() => true) },
    options: {
      getSubcommand: vi.fn(() => "set-locale"),
      getString: vi.fn(() => "ja"),
      getChannel: vi.fn(() => ({ id: "ch-1", type: 0 })),
      getAttachment: vi.fn(),
    },
    reply: vi.fn().mockResolvedValue(undefined),
    guild: null,
    ...overrides,
  };
}

// guild-config コマンド定義・ルーティングを検証
describe("bot/commands/guild-config", () => {
  // 各ケースでモック呼び出し記録をリセットし、テスト間の副作用を排除する
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("コマンド名が guild-config であること", () => {
    expect(guildConfigCommand.data.name).toBe("guild-config");
  });

  it("ManageGuild 権限がデフォルトで要求されていること", () => {
    expect(guildConfigCommand.data.default_member_permissions).toBe(
      PermissionFlagsBits.ManageGuild.toString(),
    );
  });

  it("7つのサブコマンドが定義されていること", () => {
    const subcommands = guildConfigCommand.data.options;
    expect(subcommands).toHaveLength(7);
  });

  it("guildId が null の場合はエラーハンドリングに委譲されること", async () => {
    const interaction = createInteraction({ guildId: null });
    await guildConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );
    expect(handleCommandError).toHaveBeenCalledTimes(1);
  });

  it("ManageGuild 権限がない場合はエラーハンドリングに委譲されること", async () => {
    const interaction = createInteraction({
      memberPermissions: { has: vi.fn(() => false) },
    });
    await guildConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );
    expect(handleCommandError).toHaveBeenCalledTimes(1);
  });

  it("set-locale サブコマンドで updateLocale が呼ばれること", async () => {
    const interaction = createInteraction({
      options: {
        getSubcommand: vi.fn(() => "set-locale"),
        getString: vi.fn(() => "en"),
        getChannel: vi.fn(),
        getAttachment: vi.fn(),
      },
    });
    await guildConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );
    expect(updateLocaleMock).toHaveBeenCalledWith("guild-1", "en");
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: 64 }),
    );
  });

  it("不正なサブコマンドの場合はエラーハンドリングに委譲されること", async () => {
    const interaction = createInteraction({
      options: {
        getSubcommand: vi.fn(() => "invalid"),
        getString: vi.fn(),
        getChannel: vi.fn(),
        getAttachment: vi.fn(),
      },
    });
    await guildConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );
    expect(handleCommandError).toHaveBeenCalledTimes(1);
  });
});
