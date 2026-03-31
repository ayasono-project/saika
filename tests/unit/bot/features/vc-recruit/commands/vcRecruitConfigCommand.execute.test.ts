// tests/unit/bot/features/vc-recruit/commands/vcRecruitConfigCommand.execute.test.ts

import { PermissionFlagsBits } from "discord.js";
import { executeVcRecruitConfigCommand } from "@/bot/features/vc-recruit/commands/vcRecruitConfigCommand.execute";
import { PermissionError, ValidationError } from "@/shared/errors/customErrors";

// ---- モック定義 ----

const handleVcRecruitConfigSetupMock = vi.fn().mockResolvedValue(undefined);
const handleVcRecruitConfigTeardownMock = vi.fn().mockResolvedValue(undefined);
const handleVcRecruitConfigAddRoleMock = vi.fn().mockResolvedValue(undefined);
const handleVcRecruitConfigRemoveRoleMock = vi
  .fn()
  .mockResolvedValue(undefined);
const handleVcRecruitConfigViewMock = vi.fn().mockResolvedValue(undefined);
const handleCommandErrorMock = vi.fn().mockResolvedValue(undefined);
const tDefaultMock = vi.fn((key: string) => key);
const tGuildMock = vi.fn(async (_guildId: string, key: string) => key);

vi.mock(
  "@/bot/features/vc-recruit/commands/usecases/vcRecruitConfigSetup",
  () => ({
    handleVcRecruitConfigSetup: (...args: unknown[]) =>
      handleVcRecruitConfigSetupMock(...args),
  }),
);
vi.mock(
  "@/bot/features/vc-recruit/commands/usecases/vcRecruitConfigTeardown",
  () => ({
    handleVcRecruitConfigTeardown: (...args: unknown[]) =>
      handleVcRecruitConfigTeardownMock(...args),
  }),
);
vi.mock(
  "@/bot/features/vc-recruit/commands/usecases/vcRecruitConfigAddRole",
  () => ({
    handleVcRecruitConfigAddRole: (...args: unknown[]) =>
      handleVcRecruitConfigAddRoleMock(...args),
  }),
);
vi.mock(
  "@/bot/features/vc-recruit/commands/usecases/vcRecruitConfigRemoveRole",
  () => ({
    handleVcRecruitConfigRemoveRole: (...args: unknown[]) =>
      handleVcRecruitConfigRemoveRoleMock(...args),
  }),
);
vi.mock(
  "@/bot/features/vc-recruit/commands/usecases/vcRecruitConfigView",
  () => ({
    handleVcRecruitConfigView: (...args: unknown[]) =>
      handleVcRecruitConfigViewMock(...args),
  }),
);
vi.mock("@/bot/errors/interactionErrorHandler", () => ({
  handleCommandError: (...args: unknown[]) => handleCommandErrorMock(...args),
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
  tDefault: (...args: unknown[]) =>
    tDefaultMock(...(args as Parameters<typeof tDefaultMock>)),
  tGuild: (guildId: string, key: string) => tGuildMock(guildId, key),
  tInteraction: vi.fn((_locale: string, key: string) => key),
}));

// ---- ヘルパー ----

const GUILD_ID = "guild-1";

/** ManageGuild 権限を持つインタラクションモックを作成 */
function makeInteraction(
  opts: {
    guildId?: string | null;
    hasManageGuild?: boolean;
    subcommand?: string;
  } = {},
) {
  const {
    guildId = GUILD_ID,
    hasManageGuild = true,
    subcommand = "view",
  } = opts;

  return {
    guildId,
    guild: guildId ? { id: guildId } : null,
    memberPermissions: {
      has: (perm: bigint) =>
        hasManageGuild && perm === PermissionFlagsBits.ManageGuild,
    },
    options: {
      getSubcommand: () => subcommand,
    },
    reply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
  };
}

describe("bot/features/vc-recruit/commands/vcRecruitConfigCommand.execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("guildId が null の場合は ValidationError が handleCommandError に渡される", async () => {
    const interaction = makeInteraction({ guildId: null });
    await executeVcRecruitConfigCommand(interaction as never);

    expect(handleCommandErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(ValidationError),
    );
  });

  it("ManageGuild 権限がない場合は PermissionError が handleCommandError に渡される", async () => {
    const interaction = makeInteraction({ hasManageGuild: false });
    await executeVcRecruitConfigCommand(interaction as never);

    expect(handleCommandErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(PermissionError),
    );
  });

  it("setup サブコマンドが handleVcRecruitConfigSetup にルーティングされる", async () => {
    const interaction = makeInteraction({ subcommand: "setup" });
    await executeVcRecruitConfigCommand(interaction as never);

    expect(handleVcRecruitConfigSetupMock).toHaveBeenCalledWith(
      interaction,
      GUILD_ID,
    );
    expect(handleCommandErrorMock).not.toHaveBeenCalled();
  });

  it("teardown サブコマンドが handleVcRecruitConfigTeardown にルーティングされる", async () => {
    const interaction = makeInteraction({ subcommand: "teardown" });
    await executeVcRecruitConfigCommand(interaction as never);

    expect(handleVcRecruitConfigTeardownMock).toHaveBeenCalledWith(
      interaction,
      GUILD_ID,
    );
    expect(handleCommandErrorMock).not.toHaveBeenCalled();
  });

  it("add-role サブコマンドが handleVcRecruitConfigAddRole にルーティングされる", async () => {
    const interaction = makeInteraction({ subcommand: "add-role" });
    await executeVcRecruitConfigCommand(interaction as never);

    expect(handleVcRecruitConfigAddRoleMock).toHaveBeenCalledWith(interaction);
    expect(handleCommandErrorMock).not.toHaveBeenCalled();
  });

  it("remove-role サブコマンドが handleVcRecruitConfigRemoveRole にルーティングされる", async () => {
    const interaction = makeInteraction({ subcommand: "remove-role" });
    await executeVcRecruitConfigCommand(interaction as never);

    expect(handleVcRecruitConfigRemoveRoleMock).toHaveBeenCalledWith(
      interaction,
      GUILD_ID,
    );
    expect(handleCommandErrorMock).not.toHaveBeenCalled();
  });

  it("view サブコマンドが handleVcRecruitConfigView にルーティングされる", async () => {
    const interaction = makeInteraction({ subcommand: "view" });
    await executeVcRecruitConfigCommand(interaction as never);

    expect(handleVcRecruitConfigViewMock).toHaveBeenCalledWith(
      interaction,
      GUILD_ID,
    );
    expect(handleCommandErrorMock).not.toHaveBeenCalled();
  });

  it("不明なサブコマンドは ValidationError が handleCommandError に渡される", async () => {
    const interaction = makeInteraction({ subcommand: "unknown" });
    await executeVcRecruitConfigCommand(interaction as never);

    expect(handleCommandErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(ValidationError),
    );
  });

  it("ユースケースがエラーを throw した場合は handleCommandError に委譲する", async () => {
    const error = new Error("ユースケースエラー");
    handleVcRecruitConfigViewMock.mockRejectedValueOnce(error);

    const interaction = makeInteraction({ subcommand: "view" });
    await executeVcRecruitConfigCommand(interaction as never);

    expect(handleCommandErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      error,
    );
  });
});
