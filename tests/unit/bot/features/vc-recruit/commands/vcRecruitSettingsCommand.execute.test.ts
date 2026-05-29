// tests/unit/bot/features/vc-recruit/commands/vcRecruitSettingsCommand.execute.test.ts

import { PermissionError, ValidationError } from "@ayasono/shared/core";
import { PermissionFlagsBits } from "discord.js";
import { executeVcRecruitSettingsCommand } from "@/bot/features/vc-recruit/commands/vcRecruitSettingsCommand.execute";

// ---- モック定義 ----

const handleVcRecruitSettingsSetupMock = vi.fn().mockResolvedValue(undefined);
const handleVcRecruitSettingsTeardownMock = vi
  .fn()
  .mockResolvedValue(undefined);
const handleVcRecruitSettingsAddRoleMock = vi.fn().mockResolvedValue(undefined);
const handleVcRecruitSettingsRemoveRoleMock = vi
  .fn()
  .mockResolvedValue(undefined);
const handleVcRecruitSettingsViewMock = vi.fn().mockResolvedValue(undefined);
const handleCommandErrorMock = vi.fn().mockResolvedValue(undefined);
const tDefaultMock = vi.fn((key: string) => key);
const tGuildMock = vi.fn(async (_guildId: string, key: string) => key);

vi.mock(
  "@/bot/features/vc-recruit/commands/usecases/vcRecruitSettingsSetup",
  () => ({
    handleVcRecruitSettingsSetup: (...args: unknown[]) =>
      handleVcRecruitSettingsSetupMock(...args),
  }),
);
vi.mock(
  "@/bot/features/vc-recruit/commands/usecases/vcRecruitSettingsTeardown",
  () => ({
    handleVcRecruitSettingsTeardown: (...args: unknown[]) =>
      handleVcRecruitSettingsTeardownMock(...args),
  }),
);
vi.mock(
  "@/bot/features/vc-recruit/commands/usecases/vcRecruitSettingsAddRole",
  () => ({
    handleVcRecruitSettingsAddRole: (...args: unknown[]) =>
      handleVcRecruitSettingsAddRoleMock(...args),
  }),
);
vi.mock(
  "@/bot/features/vc-recruit/commands/usecases/vcRecruitSettingsRemoveRole",
  () => ({
    handleVcRecruitSettingsRemoveRole: (...args: unknown[]) =>
      handleVcRecruitSettingsRemoveRoleMock(...args),
  }),
);
vi.mock(
  "@/bot/features/vc-recruit/commands/usecases/vcRecruitSettingsView",
  () => ({
    handleVcRecruitSettingsView: (...args: unknown[]) =>
      handleVcRecruitSettingsViewMock(...args),
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

describe("bot/features/vc-recruit/commands/vcRecruitSettingsCommand.execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("guildId が null の場合は ValidationError が handleCommandError に渡される", async () => {
    const interaction = makeInteraction({ guildId: null });
    await executeVcRecruitSettingsCommand(interaction as never);

    expect(handleCommandErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(ValidationError),
    );
  });

  it("ManageGuild 権限がない場合は PermissionError が handleCommandError に渡される", async () => {
    const interaction = makeInteraction({ hasManageGuild: false });
    await executeVcRecruitSettingsCommand(interaction as never);

    expect(handleCommandErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(PermissionError),
    );
  });

  it("setup サブコマンドが handleVcRecruitSettingsSetup にルーティングされる", async () => {
    const interaction = makeInteraction({ subcommand: "setup" });
    await executeVcRecruitSettingsCommand(interaction as never);

    expect(handleVcRecruitSettingsSetupMock).toHaveBeenCalledWith(
      interaction,
      GUILD_ID,
    );
    expect(handleCommandErrorMock).not.toHaveBeenCalled();
  });

  it("teardown サブコマンドが handleVcRecruitSettingsTeardown にルーティングされる", async () => {
    const interaction = makeInteraction({ subcommand: "teardown" });
    await executeVcRecruitSettingsCommand(interaction as never);

    expect(handleVcRecruitSettingsTeardownMock).toHaveBeenCalledWith(
      interaction,
      GUILD_ID,
    );
    expect(handleCommandErrorMock).not.toHaveBeenCalled();
  });

  it("add-role サブコマンドが handleVcRecruitSettingsAddRole にルーティングされる", async () => {
    const interaction = makeInteraction({ subcommand: "add-role" });
    await executeVcRecruitSettingsCommand(interaction as never);

    expect(handleVcRecruitSettingsAddRoleMock).toHaveBeenCalledWith(
      interaction,
    );
    expect(handleCommandErrorMock).not.toHaveBeenCalled();
  });

  it("remove-role サブコマンドが handleVcRecruitSettingsRemoveRole にルーティングされる", async () => {
    const interaction = makeInteraction({ subcommand: "remove-role" });
    await executeVcRecruitSettingsCommand(interaction as never);

    expect(handleVcRecruitSettingsRemoveRoleMock).toHaveBeenCalledWith(
      interaction,
      GUILD_ID,
    );
    expect(handleCommandErrorMock).not.toHaveBeenCalled();
  });

  it("view サブコマンドが handleVcRecruitSettingsView にルーティングされる", async () => {
    const interaction = makeInteraction({ subcommand: "view" });
    await executeVcRecruitSettingsCommand(interaction as never);

    expect(handleVcRecruitSettingsViewMock).toHaveBeenCalledWith(
      interaction,
      GUILD_ID,
    );
    expect(handleCommandErrorMock).not.toHaveBeenCalled();
  });

  it("不明なサブコマンドは ValidationError が handleCommandError に渡される", async () => {
    const interaction = makeInteraction({ subcommand: "unknown" });
    await executeVcRecruitSettingsCommand(interaction as never);

    expect(handleCommandErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(ValidationError),
    );
  });

  it("ユースケースがエラーを throw した場合は handleCommandError に委譲する", async () => {
    const error = new Error("ユースケースエラー");
    handleVcRecruitSettingsViewMock.mockRejectedValueOnce(error);

    const interaction = makeInteraction({ subcommand: "view" });
    await executeVcRecruitSettingsCommand(interaction as never);

    expect(handleCommandErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      error,
    );
  });
});
