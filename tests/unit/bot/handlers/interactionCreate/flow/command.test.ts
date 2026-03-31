// tests/unit/bot/handlers/interactionCreate/flow/command.test.ts

import type { Mock } from "vitest";
import { handleCommandError } from "@/bot/errors/interactionErrorHandler";
import {
  handleAutocomplete,
  handleChatInputCommand,
} from "@/bot/handlers/interactionCreate/flow/command";

const tDefaultMock = vi.fn((key: string) => `default:${key}`);
const tGuildMock: Mock = vi.fn(async () => "guild:cooldown");
const loggerWarnMock = vi.fn();
const loggerDebugMock = vi.fn();
const loggerErrorMock = vi.fn();

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
  tDefault: (key: string, _params?: Record<string, unknown>) =>
    tDefaultMock(key),
  tGuild: (guildId: string, key: string, params?: Record<string, unknown>) =>
    tGuildMock(guildId, key, params),
  tInteraction: vi.fn((_locale: string, key: string) => key),
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    warn: (...args: unknown[]) => loggerWarnMock(...args),
    debug: (...args: unknown[]) => loggerDebugMock(...args),
    error: (...args: unknown[]) => loggerErrorMock(...args),
  },
}));

vi.mock("@/bot/errors/interactionErrorHandler", () => ({
  handleCommandError: vi.fn(),
}));

// コマンドハンドラーのルーティング制御を検証する
// 未登録コマンド・クールダウン中・実行エラー・オートコンプリートの各分岐が正しく処理されるかを確認する
describe("bot/handlers/interactionCreate/flow/command", () => {
  // テスト間でモック呼び出し履歴が混入しないようにリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未登録のコマンドが指定された場合に警告ログを出して返ることを確認", async () => {
    const interaction = { commandName: "unknown" };
    const client = {
      commands: new Map(),
      cooldownManager: { check: vi.fn() },
    };

    await handleChatInputCommand(interaction as never, client as never);

    expect(loggerWarnMock).toHaveBeenCalledTimes(1);
  });

  it("cooldownManager.check が正の値を返した場合はコマンドを実行せずクールダウンメッセージを ephemeral で返すことを確認", async () => {
    const interaction = {
      commandName: "ping",
      guildId: "guild-1",
      locale: "ja",
      user: { id: "user-1", tag: "user#0001" },
      reply: vi.fn().mockResolvedValue(undefined),
    };
    const command = {
      data: { name: "ping" },
      execute: vi.fn(),
    };
    const client = {
      commands: new Map([["ping", command]]),
      cooldownManager: { check: vi.fn(() => 2) },
    };

    await handleChatInputCommand(interaction as never, client as never);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: "common:cooldown.wait",
      flags: 64,
    });
    expect(command.execute).not.toHaveBeenCalled();
  });

  it("コマンドの execute が例外を投げた場合に handleCommandError へ委譲することを確認", async () => {
    const error = new Error("execute failed");
    const interaction = {
      commandName: "ping",
      guildId: "guild-1",
      locale: "ja",
      user: { id: "user-1", tag: "user#0001" },
      reply: vi.fn(),
    };
    const command = {
      data: { name: "ping" },
      execute: vi.fn().mockRejectedValue(error),
    };
    const client = {
      commands: new Map([["ping", command]]),
      cooldownManager: { check: vi.fn(() => 0) },
    };

    await handleChatInputCommand(interaction as never, client as never);

    expect(handleCommandError).toHaveBeenCalledWith(interaction, error);
    expect(loggerErrorMock).toHaveBeenCalledTimes(1);
  });

  it("オートコンプリート対応コマンドがある場合に autocomplete が実行されることを確認", async () => {
    const interaction = { commandName: "ping" };
    const autocomplete = vi.fn().mockResolvedValue(undefined);
    const client = {
      commands: new Map([["ping", { autocomplete }]]),
    };

    await handleAutocomplete(interaction as never, client as never);

    expect(autocomplete).toHaveBeenCalledWith(interaction);
  });
});
