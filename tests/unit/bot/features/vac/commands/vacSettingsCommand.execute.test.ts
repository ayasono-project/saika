// tests/unit/bot/features/vac/commands/vacSettingsCommand.execute.test.ts
import { handleCommandError } from "@/bot/errors/interactionErrorHandler";
import { handleVacSettingsCreateTrigger } from "@/bot/features/vac/commands/usecases/vacSettingsCreateTrigger";
import { handleVacSettingsRemoveTrigger } from "@/bot/features/vac/commands/usecases/vacSettingsRemoveTrigger";
import { handleVacSettingsView } from "@/bot/features/vac/commands/usecases/vacSettingsView";
import { VAC_SETTINGS_COMMAND } from "@/bot/features/vac/commands/vacSettingsCommand.constants";
import { executeVacSettingsCommand } from "@/bot/features/vac/commands/vacSettingsCommand.execute";

vi.mock(
  "@/bot/features/vac/commands/usecases/vacSettingsCreateTrigger",
  () => ({
    handleVacSettingsCreateTrigger: vi.fn(),
  }),
);

vi.mock(
  "@/bot/features/vac/commands/usecases/vacSettingsRemoveTrigger",
  () => ({
    handleVacSettingsRemoveTrigger: vi.fn(),
  }),
);

vi.mock("@/bot/features/vac/commands/usecases/vacSettingsView", () => ({
  handleVacSettingsView: vi.fn(),
}));

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
  tGuild: vi.fn(async (_guildId: string, key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
}));

function createInteraction(overrides?: {
  guildId?: string | null;
  hasManageGuild?: boolean;
  subcommand?: string;
}) {
  return {
    guildId:
      overrides && "guildId" in overrides ? overrides.guildId : "guild-1",
    memberPermissions: {
      has: vi.fn(() =>
        overrides && "hasManageGuild" in overrides
          ? overrides.hasManageGuild
          : true,
      ),
    },
    options: {
      getSubcommand: vi.fn(
        () => overrides?.subcommand ?? VAC_SETTINGS_COMMAND.SUBCOMMAND.VIEW,
      ),
    },
  };
}

// vacSettings コマンドの実行エントリポイントが、ギルド制限・権限チェック・サブコマンド分岐を
// 正しく各ユースケースハンドラへ委譲することを検証するグループ
describe("bot/features/vac/commands/vacSettingsCommand.execute", () => {
  // サブコマンドごとに呼び出されるべきハンドラが異なるため、呼び出し履歴をテスト間でリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DM 等 guildId が null の環境ではギルド専用コマンドとして拒否し、エラーハンドラに委譲することを確認", async () => {
    const interaction = createInteraction({ guildId: null });

    await executeVacSettingsCommand(interaction as never);

    expect(handleCommandError).toHaveBeenCalledTimes(1);
    expect(handleVacSettingsView).not.toHaveBeenCalled();
  });

  it("ManageGuild 権限を持たないユーザーのコマンド実行が拒否されることを確認", async () => {
    const interaction = createInteraction({ hasManageGuild: false });

    await executeVacSettingsCommand(interaction as never);

    expect(handleCommandError).toHaveBeenCalledTimes(1);
    expect(handleVacSettingsCreateTrigger).not.toHaveBeenCalled();
    expect(handleVacSettingsRemoveTrigger).not.toHaveBeenCalled();
    expect(handleVacSettingsView).not.toHaveBeenCalled();
  });

  it("create-trigger-vcサブコマンドをユースケースへ委譲する", async () => {
    const interaction = createInteraction({
      subcommand: VAC_SETTINGS_COMMAND.SUBCOMMAND.CREATE_TRIGGER,
    });

    await executeVacSettingsCommand(interaction as never);

    expect(handleVacSettingsCreateTrigger).toHaveBeenCalledWith(
      interaction,
      "guild-1",
    );
    expect(handleVacSettingsRemoveTrigger).not.toHaveBeenCalled();
    expect(handleVacSettingsView).not.toHaveBeenCalled();
  });

  it("remove-trigger-vcサブコマンドをユースケースへ委譲する", async () => {
    const interaction = createInteraction({
      subcommand: VAC_SETTINGS_COMMAND.SUBCOMMAND.REMOVE_TRIGGER,
    });

    await executeVacSettingsCommand(interaction as never);

    expect(handleVacSettingsRemoveTrigger).toHaveBeenCalledWith(
      interaction,
      "guild-1",
    );
    expect(handleVacSettingsCreateTrigger).not.toHaveBeenCalled();
    expect(handleVacSettingsView).not.toHaveBeenCalled();
  });

  it("viewサブコマンドをユースケースへ委譲する", async () => {
    const interaction = createInteraction({
      subcommand: VAC_SETTINGS_COMMAND.SUBCOMMAND.VIEW,
    });

    await executeVacSettingsCommand(interaction as never);

    expect(handleVacSettingsView).toHaveBeenCalledWith(interaction, "guild-1");
    expect(handleVacSettingsCreateTrigger).not.toHaveBeenCalled();
    expect(handleVacSettingsRemoveTrigger).not.toHaveBeenCalled();
  });

  it("網羅していないサブコマンド名を渡した場合に unhandled として handleCommandError に委譲されることを確認", async () => {
    const interaction = createInteraction({ subcommand: "invalid-subcommand" });

    await executeVacSettingsCommand(interaction as never);

    expect(handleCommandError).toHaveBeenCalledTimes(1);
    expect(handleVacSettingsCreateTrigger).not.toHaveBeenCalled();
    expect(handleVacSettingsRemoveTrigger).not.toHaveBeenCalled();
    expect(handleVacSettingsView).not.toHaveBeenCalled();
  });
});
