// tests/unit/bot/features/vc-command/commands/vcCommand.execute.test.ts

import type { Mock } from "vitest";
import { handleCommandError } from "@/bot/errors/interactionErrorHandler";
import { executeVcLimit } from "@/bot/features/vc-command/commands/usecases/vcLimit";
import { executeVcRename } from "@/bot/features/vc-command/commands/usecases/vcRename";
import { getManagedVoiceChannel } from "@/bot/features/vc-command/commands/usecases/vcVoiceChannelGuard";
import { VC_COMMAND } from "@/bot/features/vc-command/commands/vcCommand.constants";
import { executeVcCommand } from "@/bot/features/vc-command/commands/vcCommand.execute";

vi.mock("@/bot/features/vc-command/commands/usecases/vcLimit", () => ({
  executeVcLimit: vi.fn(),
}));

vi.mock("@/bot/features/vc-command/commands/usecases/vcRename", () => ({
  executeVcRename: vi.fn(),
}));

vi.mock(
  "@/bot/features/vc-command/commands/usecases/vcVoiceChannelGuard",
  () => ({
    getManagedVoiceChannel: vi.fn(),
  }),
);

vi.mock("@/bot/errors/interactionErrorHandler", () => ({
  handleCommandError: vi.fn(),
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
  tDefault: vi.fn((key: string) => `default:${key}`),
  tInteraction: (...args: unknown[]) => args[1],
}));

function createInteraction(overrides?: {
  guildId?: string | null;
  subcommand?: string;
}) {
  return {
    guildId:
      overrides && "guildId" in overrides ? overrides.guildId : "guild-1",
    options: {
      getSubcommand: vi.fn(
        () => overrides?.subcommand ?? VC_COMMAND.SUBCOMMAND.RENAME,
      ),
    },
  };
}

describe("bot/features/vc-command/commands/vcCommand.execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getManagedVoiceChannel as Mock).mockResolvedValue({
      id: "voice-1",
    });
  });

  it("guildIdがnull（DM等）の場合はガード・サブコマンド処理を一切呼ばずエラーハンドラへ委譲する", async () => {
    const interaction = createInteraction({ guildId: null });

    await executeVcCommand(interaction as never);

    expect(getManagedVoiceChannel).not.toHaveBeenCalled();
    expect(handleCommandError).toHaveBeenCalledTimes(1);
  });

  it("renameサブコマンドをexecuteVcRenameへ委譲する", async () => {
    const interaction = createInteraction({
      subcommand: VC_COMMAND.SUBCOMMAND.RENAME,
    });

    await executeVcCommand(interaction as never);

    expect(getManagedVoiceChannel).toHaveBeenCalledWith(interaction, "guild-1");
    expect(executeVcRename).toHaveBeenCalledWith(interaction, "voice-1");
    expect(executeVcLimit).not.toHaveBeenCalled();
  });

  it("limitサブコマンドをexecuteVcLimitへ委譲する", async () => {
    const interaction = createInteraction({
      subcommand: VC_COMMAND.SUBCOMMAND.LIMIT,
    });

    await executeVcCommand(interaction as never);

    expect(getManagedVoiceChannel).toHaveBeenCalledWith(interaction, "guild-1");
    expect(executeVcLimit).toHaveBeenCalledWith(interaction, "voice-1");
    expect(executeVcRename).not.toHaveBeenCalled();
  });

  it("定義外のサブコマンド名が渡された場合はエラーハンドラへ委譲する", async () => {
    const interaction = createInteraction({ subcommand: "invalid-subcommand" });

    await executeVcCommand(interaction as never);

    expect(handleCommandError).toHaveBeenCalledTimes(1);
    expect(executeVcLimit).not.toHaveBeenCalled();
    expect(executeVcRename).not.toHaveBeenCalled();
  });

  it("ボイスチャンネルガードが例外を投げた場合、サブコマンド処理を呼ばずエラーハンドラへ委譲する", async () => {
    (getManagedVoiceChannel as Mock).mockRejectedValueOnce(
      new Error("not managed"),
    );
    const interaction = createInteraction();

    await executeVcCommand(interaction as never);

    expect(handleCommandError).toHaveBeenCalledTimes(1);
    expect(executeVcLimit).not.toHaveBeenCalled();
    expect(executeVcRename).not.toHaveBeenCalled();
  });
});
