// tests/integration/bot/features/vc-command/commands/vcCommand.integration.test.ts
/**
 * VC Command Integration Tests
 * executeVcCommand → getManagedVoiceChannel（VAC/VC募集のオーナーシップ検証）→
 * rename / limit 実行の統合テスト
 */

import { ChannelType } from "discord.js";

// Logger のモック
vi.mock("@/shared/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// i18n のモック
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
  tDefault: vi.fn((key: string) => key),
  tInteraction: vi.fn(
    (_locale: string, key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  ),
}));

// messageResponse のモック
vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: vi.fn((desc: string) => ({
    type: "success",
    description: desc,
  })),
  createErrorEmbed: vi.fn((desc: string) => ({
    type: "error",
    description: desc,
  })),
}));

// interactionErrorHandler のモック
const handleCommandErrorMock = vi.fn();
vi.mock("@/bot/errors/interactionErrorHandler", () => ({
  handleCommandError: (...args: unknown[]) => handleCommandErrorMock(...args),
}));

// Composition root のモック
const mockVacConfigService = {
  isManagedVacChannel: vi.fn(),
};
const mockVcRecruitRepository = {
  isCreatedVcRecruitChannel: vi.fn(),
};

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVacConfigService: () => mockVacConfigService,
  getBotVcRecruitRepository: () => mockVcRecruitRepository,
}));

/** テスト用 interaction モック */
function createInteraction(overrides?: {
  subcommand?: string;
  name?: string;
  limit?: number;
  voiceChannelId?: string | null;
  voiceChannelType?: ChannelType;
}) {
  const replyMock = vi.fn().mockResolvedValue(undefined);
  const editMock = vi.fn().mockResolvedValue(undefined);
  const voiceChannelId =
    overrides?.voiceChannelId !== undefined
      ? overrides.voiceChannelId
      : "managed-vc-1";

  const fetchMemberMock = vi.fn().mockResolvedValue({
    voice: {
      channel: voiceChannelId
        ? {
            id: voiceChannelId,
            type: overrides?.voiceChannelType ?? ChannelType.GuildVoice,
          }
        : null,
    },
  });

  const fetchChannelMock = vi.fn().mockResolvedValue({
    id: voiceChannelId ?? "managed-vc-1",
    type: ChannelType.GuildVoice,
    edit: editMock,
  });

  return {
    interaction: {
      guildId: "guild-1",
      locale: "ja",
      user: { id: "user-1" },
      guild: {
        members: { fetch: fetchMemberMock },
        channels: { fetch: fetchChannelMock },
      },
      options: {
        getSubcommand: vi.fn(() => overrides?.subcommand ?? "rename"),
        getString: vi.fn(() => overrides?.name ?? "New Room Name"),
        getInteger: vi.fn(() => overrides?.limit ?? 10),
      },
      reply: replyMock,
    },
    replyMock,
    editMock,
    fetchMemberMock,
    fetchChannelMock,
  };
}

describe("VC Command Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function loadHandler() {
    return (
      await import("@/bot/features/vc-command/commands/vcCommand.execute")
    ).executeVcCommand;
  }

  describe("rename: オーナーシップ検証 → チャンネル名変更", () => {
    it("VAC管理チャンネルの名前を変更できること", async () => {
      const handler = await loadHandler();

      mockVacConfigService.isManagedVacChannel.mockResolvedValue(true);

      const { interaction, replyMock, editMock } = createInteraction({
        subcommand: "rename",
        name: "Alice's Gaming Room",
      });

      await handler(interaction as never);

      // オーナーシップ検証でVACチェックが呼ばれる
      expect(mockVacConfigService.isManagedVacChannel).toHaveBeenCalledWith(
        "guild-1",
        "managed-vc-1",
      );
      // チャンネル名を変更
      expect(editMock).toHaveBeenCalledWith({ name: "Alice's Gaming Room" });
      // 成功レスポンス
      expect(replyMock).toHaveBeenCalledTimes(1);
    });

    it("VC募集管理チャンネルの名前を変更できること", async () => {
      const handler = await loadHandler();

      // VAC管理外 → VC募集管理下
      mockVacConfigService.isManagedVacChannel.mockResolvedValue(false);
      mockVcRecruitRepository.isCreatedVcRecruitChannel.mockResolvedValue(true);

      const { interaction, editMock } = createInteraction({
        subcommand: "rename",
        name: "Party Room",
      });

      await handler(interaction as never);

      expect(
        mockVcRecruitRepository.isCreatedVcRecruitChannel,
      ).toHaveBeenCalledWith("guild-1", "managed-vc-1");
      expect(editMock).toHaveBeenCalledWith({ name: "Party Room" });
    });
  });

  describe("limit: オーナーシップ検証 → 人数制限変更", () => {
    it("VAC管理チャンネルの人数制限を変更できること", async () => {
      const handler = await loadHandler();

      mockVacConfigService.isManagedVacChannel.mockResolvedValue(true);

      const { interaction, editMock, replyMock } = createInteraction({
        subcommand: "limit",
        limit: 5,
      });

      await handler(interaction as never);

      expect(editMock).toHaveBeenCalledWith({ userLimit: 5 });
      expect(replyMock).toHaveBeenCalledTimes(1);
    });

    it("人数制限を0に設定すると無制限になること", async () => {
      const handler = await loadHandler();

      mockVacConfigService.isManagedVacChannel.mockResolvedValue(true);

      const { interaction, editMock, replyMock } = createInteraction({
        subcommand: "limit",
        limit: 0,
      });

      await handler(interaction as never);

      expect(editMock).toHaveBeenCalledWith({ userLimit: 0 });
      // "unlimited" を含むレスポンス
      const embed = replyMock.mock.calls[0][0].embeds[0];
      expect(embed.description).toContain("unlimited");
    });
  });

  describe("オーナーシップ検証エラー", () => {
    it("VCに未参加の場合はエラーハンドラが呼ばれること", async () => {
      const handler = await loadHandler();

      const { interaction } = createInteraction({
        voiceChannelId: null,
      });

      await handler(interaction as never);

      expect(handleCommandErrorMock).toHaveBeenCalledTimes(1);
      expect(handleCommandErrorMock.mock.calls[0][1].message).toContain(
        "not_in_any_vc",
      );
    });

    it("管理外のVCにいる場合はエラーハンドラが呼ばれること", async () => {
      const handler = await loadHandler();

      // VAC でも VC募集でもない
      mockVacConfigService.isManagedVacChannel.mockResolvedValue(false);
      mockVcRecruitRepository.isCreatedVcRecruitChannel.mockResolvedValue(
        false,
      );

      const { interaction } = createInteraction();

      await handler(interaction as never);

      expect(handleCommandErrorMock).toHaveBeenCalledTimes(1);
      expect(handleCommandErrorMock.mock.calls[0][1].message).toContain(
        "not_managed_channel",
      );
    });
  });

  describe("limit バリデーション", () => {
    it("上限を超えた値を指定するとエラーハンドラが呼ばれること", async () => {
      const handler = await loadHandler();

      mockVacConfigService.isManagedVacChannel.mockResolvedValue(true);

      const { interaction } = createInteraction({
        subcommand: "limit",
        limit: 100,
      });

      await handler(interaction as never);

      expect(handleCommandErrorMock).toHaveBeenCalledTimes(1);
      expect(handleCommandErrorMock.mock.calls[0][1].message).toContain(
        "limit_out_of_range",
      );
    });

    it("負の値を指定するとエラーハンドラが呼ばれること", async () => {
      const handler = await loadHandler();

      mockVacConfigService.isManagedVacChannel.mockResolvedValue(true);

      const { interaction } = createInteraction({
        subcommand: "limit",
        limit: -1,
      });

      await handler(interaction as never);

      expect(handleCommandErrorMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("統合シナリオ: VAC → VC募集のフォールバックチェック", () => {
    it("VAC管理外でもVC募集管理下であればコマンドが実行できること", async () => {
      const handler = await loadHandler();

      // VAC → false, VC募集 → true
      mockVacConfigService.isManagedVacChannel.mockResolvedValue(false);
      mockVcRecruitRepository.isCreatedVcRecruitChannel.mockResolvedValue(true);

      const { interaction, editMock, replyMock } = createInteraction({
        subcommand: "rename",
        name: "Recruit Room",
      });

      await handler(interaction as never);

      // 両方のサービスがチェックされる
      expect(mockVacConfigService.isManagedVacChannel).toHaveBeenCalledTimes(1);
      expect(
        mockVcRecruitRepository.isCreatedVcRecruitChannel,
      ).toHaveBeenCalledTimes(1);
      // コマンドは成功
      expect(editMock).toHaveBeenCalledWith({ name: "Recruit Room" });
      expect(replyMock).toHaveBeenCalledTimes(1);
    });

    it("VAC管理下の場合はVC募集チェックをスキップすること", async () => {
      const handler = await loadHandler();

      mockVacConfigService.isManagedVacChannel.mockResolvedValue(true);

      const { interaction, editMock } = createInteraction({
        subcommand: "rename",
        name: "VAC Room",
      });

      await handler(interaction as never);

      // VAC が true なので VC募集チェックは呼ばれない
      expect(mockVacConfigService.isManagedVacChannel).toHaveBeenCalledTimes(1);
      expect(
        mockVcRecruitRepository.isCreatedVcRecruitChannel,
      ).not.toHaveBeenCalled();
      expect(editMock).toHaveBeenCalledTimes(1);
    });
  });
});
