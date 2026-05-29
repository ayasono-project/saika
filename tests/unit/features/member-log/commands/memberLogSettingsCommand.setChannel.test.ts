// tests/unit/bot/features/member-log/commands/memberLogSettingsCommand.setChannel.test.ts

import { ValidationError } from "@ayasono/shared/core";
import { ChannelType } from "discord.js";
import { MEMBER_LOG_SETTINGS_COMMAND } from "@/features/member-log/commands/memberLogSettingsCommand.constants";
import { handleMemberLogSettingsSetChannel } from "@/features/member-log/commands/memberLogSettingsCommand.setChannel";

// ---- モック定義 ----
const ensurePermissionMock = vi.fn();
const setChannelIdMock = vi.fn();
const tGuildMock = vi.fn(
  async (_guildId: string, key: string, _opts?: Record<string, unknown>) => key,
);
const tDefaultMock = vi.fn(
  (key: string, _opts?: Record<string, unknown>) => key,
);
const loggerInfoMock = vi.fn();
const createSuccessEmbedMock = vi.fn(
  (desc: string, opts?: { title?: string }) => ({
    description: desc,
    title: opts?.title,
  }),
);

vi.mock(
  "@/features/member-log/commands/memberLogSettingsCommand.guard",
  () => ({
    ensureMemberLogManageGuildPermission: (...args: unknown[]) =>
      ensurePermissionMock(...args),
  }),
);

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotMemberLogSettingsService: () => ({
    setChannelId: (...args: unknown[]) => setChannelIdMock(...args),
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
  tGuild: (guildId: string, key: string, opts?: Record<string, unknown>) =>
    tGuildMock(guildId, key, opts),
  tInteraction: vi.fn((_locale: string, key: string) => key),
  tDefault: (key: string, opts?: Record<string, unknown>) =>
    tDefaultMock(key, opts),
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { info: (...args: unknown[]) => loggerInfoMock(...args) },
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: (desc: string, opts?: { title?: string }) =>
    createSuccessEmbedMock(desc, opts),
}));

// ---- ヘルパー ----

/** テスト用 interaction モックを生成する */
function makeInteraction(channelType: ChannelType = ChannelType.GuildText) {
  return {
    options: {
      getChannel: vi.fn(() => ({
        id: "ch-123",
        type: channelType,
      })),
    },
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

// handleMemberLogSettingsSetChannel の権限チェック・チャンネル検証・保存フローを検証
describe("bot/features/member-log/commands/memberLogSettingsCommand.setChannel", () => {
  // 各テストでモック呼び出し記録をリセットし、テスト間の副作用を排除する
  beforeEach(() => {
    vi.clearAllMocks();
    setChannelIdMock.mockResolvedValue(undefined);
  });

  it("ガードが ValidationError を投げた場合にそれが伝播することを確認", async () => {
    ensurePermissionMock.mockRejectedValue(new ValidationError("no-perm"));
    const interaction = makeInteraction();

    await expect(
      handleMemberLogSettingsSetChannel(interaction as never, "guild-1"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("テキストチャンネル以外を選択した場合に ValidationError を投げることを確認", async () => {
    ensurePermissionMock.mockResolvedValue(undefined);
    const interaction = makeInteraction(ChannelType.GuildVoice);

    await expect(
      handleMemberLogSettingsSetChannel(interaction as never, "guild-1"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("テキストチャンネルが選択された場合に service.setChannelId が正しい引数で呼ばれることを確認", async () => {
    ensurePermissionMock.mockResolvedValue(undefined);
    const interaction = makeInteraction();

    await handleMemberLogSettingsSetChannel(interaction as never, "guild-1");

    expect(setChannelIdMock).toHaveBeenCalledWith("guild-1", "ch-123");
  });

  it("成功時に success embed で interaction.reply が呼ばれることを確認", async () => {
    ensurePermissionMock.mockResolvedValue(undefined);
    const interaction = makeInteraction();

    await handleMemberLogSettingsSetChannel(interaction as never, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ embeds: expect.any(Array) }),
    );
  });

  it("成功時に logger.info が呼ばれることを確認", async () => {
    ensurePermissionMock.mockResolvedValue(undefined);
    const interaction = makeInteraction();

    await handleMemberLogSettingsSetChannel(interaction as never, "guild-1");

    expect(loggerInfoMock).toHaveBeenCalledWith(
      expect.stringContaining("memberLog:log.config_set_channel"),
    );
  });

  it("getChannel が MEMBER_LOG_SETTINGS_COMMAND.OPTION.CHANNEL を引数に呼ばれることを確認", async () => {
    ensurePermissionMock.mockResolvedValue(undefined);
    const interaction = makeInteraction();

    await handleMemberLogSettingsSetChannel(interaction as never, "guild-1");

    expect(interaction.options.getChannel).toHaveBeenCalledWith(
      MEMBER_LOG_SETTINGS_COMMAND.OPTION.CHANNEL,
      true,
    );
  });
});
