// tests/unit/bot/features/sticky-message/commands/stickyMessageCommand.execute.test.ts

import { PermissionFlagsBits } from "discord.js";

const handleStickyMessageSetMock = vi.fn();
const handleStickyMessageRemoveMock = vi.fn();
const handleStickyMessageViewMock = vi.fn();
const handleStickyMessageUpdateMock = vi.fn();
const handleCommandErrorMock = vi.fn();
const tDefaultMock = vi.fn((key: string) => `[${key}]`);
const tGuildMock = vi.fn(async (_guildId: string, key: string) => `[${key}]`);

vi.mock(
  "@/bot/features/sticky-message/commands/usecases/stickyMessageSet",
  () => ({ handleStickyMessageSet: handleStickyMessageSetMock }),
);
vi.mock(
  "@/bot/features/sticky-message/commands/usecases/stickyMessageRemove",
  () => ({ handleStickyMessageRemove: handleStickyMessageRemoveMock }),
);
vi.mock(
  "@/bot/features/sticky-message/commands/usecases/stickyMessageView",
  () => ({ handleStickyMessageView: handleStickyMessageViewMock }),
);
vi.mock(
  "@/bot/features/sticky-message/commands/usecases/stickyMessageUpdate",
  () => ({ handleStickyMessageUpdate: handleStickyMessageUpdateMock }),
);
vi.mock("@/bot/errors/interactionErrorHandler", () => ({
  handleCommandError: handleCommandErrorMock,
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

function createInteractionMock({
  guildId = "guild-1",
  hasPermission = true,
  subcommand = "set",
}: {
  guildId?: string | null;
  hasPermission?: boolean;
  subcommand?: string;
} = {}) {
  return {
    guildId,
    memberPermissions: {
      has: vi.fn((flag: bigint) => {
        if (flag === PermissionFlagsBits.ManageChannels) return hasPermission;
        if (flag === PermissionFlagsBits.Administrator) return false;
        return false;
      }),
    },
    options: {
      getSubcommand: vi.fn(() => subcommand),
    },
  };
}

// guildId の有無・ManageChannels 権限・各サブコマンド名に応じて
// 対応するユースケース関数が呼び出されるか、またはバリデーションエラーとして処理されるかを検証する
describe("bot/features/sticky-message/commands/stickyMessageCommand.execute", () => {
  // 全ユースケースモックとエラーハンドラーモックをリセットしてテスト間の干渉を防ぐ
  beforeEach(() => {
    vi.clearAllMocks();
    handleStickyMessageSetMock.mockResolvedValue(undefined);
    handleStickyMessageRemoveMock.mockResolvedValue(undefined);
    handleStickyMessageViewMock.mockResolvedValue(undefined);
    handleStickyMessageUpdateMock.mockResolvedValue(undefined);
    handleCommandErrorMock.mockResolvedValue(undefined);
  });

  it("DM など guildId が null のインタラクションはギルド外として早期検証エラーになる", async () => {
    const { executeStickyMessageCommand } = await import(
      "@/bot/features/sticky-message/commands/stickyMessageCommand.execute"
    );
    const interaction = createInteractionMock({ guildId: null });

    await executeStickyMessageCommand(interaction as never);

    expect(handleCommandErrorMock).toHaveBeenCalled();
  });

  it("ManageChannels 権限がない場合は ValidationError として処理される", async () => {
    const { executeStickyMessageCommand } = await import(
      "@/bot/features/sticky-message/commands/stickyMessageCommand.execute"
    );
    const interaction = createInteractionMock({ hasPermission: false });

    await executeStickyMessageCommand(interaction as never);

    expect(handleCommandErrorMock).toHaveBeenCalled();
  });

  it("set サブコマンドで handleStickyMessageSet が呼ばれる", async () => {
    const { executeStickyMessageCommand } = await import(
      "@/bot/features/sticky-message/commands/stickyMessageCommand.execute"
    );
    const interaction = createInteractionMock({ subcommand: "set" });

    await executeStickyMessageCommand(interaction as never);

    expect(handleStickyMessageSetMock).toHaveBeenCalledWith(interaction);
  });

  it("remove サブコマンドで handleStickyMessageRemove が呼ばれる", async () => {
    const { executeStickyMessageCommand } = await import(
      "@/bot/features/sticky-message/commands/stickyMessageCommand.execute"
    );
    const interaction = createInteractionMock({ subcommand: "remove" });

    await executeStickyMessageCommand(interaction as never);

    expect(handleStickyMessageRemoveMock).toHaveBeenCalledWith(
      interaction,
      "guild-1",
    );
  });

  it("view サブコマンドで handleStickyMessageView が呼ばれる", async () => {
    const { executeStickyMessageCommand } = await import(
      "@/bot/features/sticky-message/commands/stickyMessageCommand.execute"
    );
    const interaction = createInteractionMock({ subcommand: "view" });

    await executeStickyMessageCommand(interaction as never);

    expect(handleStickyMessageViewMock).toHaveBeenCalledWith(
      interaction,
      "guild-1",
    );
  });

  it("update サブコマンドで handleStickyMessageUpdate が呼ばれる", async () => {
    const { executeStickyMessageCommand } = await import(
      "@/bot/features/sticky-message/commands/stickyMessageCommand.execute"
    );
    const interaction = createInteractionMock({ subcommand: "update" });

    await executeStickyMessageCommand(interaction as never);

    expect(handleStickyMessageUpdateMock).toHaveBeenCalledWith(interaction);
  });

  it("定義外のサブコマンド名が渡された場合は網羅外として ValidationError 扱いになる", async () => {
    const { executeStickyMessageCommand } = await import(
      "@/bot/features/sticky-message/commands/stickyMessageCommand.execute"
    );
    const interaction = createInteractionMock({ subcommand: "unknown" });

    await executeStickyMessageCommand(interaction as never);

    expect(handleCommandErrorMock).toHaveBeenCalled();
  });

  it("ユースケース内で予期せぬ例外が発生した場合、handleCommandError へ委譲されて握りつぶされない", async () => {
    const { executeStickyMessageCommand } = await import(
      "@/bot/features/sticky-message/commands/stickyMessageCommand.execute"
    );
    const err = new Error("something failed");
    handleStickyMessageSetMock.mockRejectedValueOnce(err);
    const interaction = createInteractionMock({ subcommand: "set" });

    await executeStickyMessageCommand(interaction as never);

    expect(handleCommandErrorMock).toHaveBeenCalledWith(interaction, err);
  });
});
