// tests/unit/bot/handlers/interactionCreate/flow/components.test.ts

import type { Mock } from "vitest";
import { handleInteractionError } from "@/bot/errors/interactionErrorHandler";
import {
  handleButton,
  handleRoleSelectMenu,
  handleStringSelectMenu,
  handleUserSelectMenu,
} from "@/bot/handlers/interactionCreate/flow/components";

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
  tDefault: vi.fn((key: string) => `default:${key}`),
  tInteraction: (...args: unknown[]) => args[1],
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    error: (...args: unknown[]) => loggerErrorMock(...args),
  },
}));

vi.mock("@/bot/errors/interactionErrorHandler", () => ({
  handleInteractionError: vi.fn(),
}));

vi.mock("@/bot/handlers/interactionCreate/ui/buttons", () => ({
  buttonHandlers: [
    {
      matches: vi.fn((id: string) => id === "target"),
      execute: vi.fn().mockResolvedValue(undefined),
    },
    {
      matches: vi.fn(() => true),
      execute: vi.fn().mockResolvedValue(undefined),
    },
  ],
}));

vi.mock("@/bot/handlers/interactionCreate/ui/selectMenus", () => ({
  userSelectHandlers: [
    {
      matches: vi.fn((id: string) => id === "target"),
      execute: vi.fn().mockResolvedValue(undefined),
    },
  ],
  roleSelectHandlers: [
    {
      matches: vi.fn((id: string) => id === "role-target"),
      execute: vi.fn().mockResolvedValue(undefined),
    },
  ],
  stringSelectHandlers: [
    {
      matches: vi.fn((id: string) => id === "target"),
      execute: vi.fn().mockResolvedValue(undefined),
    },
  ],
}));

// ボタン・セレクトメニューのインタラクションが、customId に合致した最初のハンドラだけに
// ディスパッチされることと、エラー時の委譲動作を検証するグループ
describe("bot/handlers/interactionCreate/flow/components", () => {
  // モックの呼び出し履歴が他のテストに漏れないよう、各テスト前にリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handlers 配列の先頭マッチが実行され後続ハンドラは呼ばれないことを確認", async () => {
    const interaction = { customId: "target" };
    const uiModule = (await vi.importMock(
      "@/bot/handlers/interactionCreate/ui/buttons",
    )) as { buttonHandlers: Array<{ execute: Mock }> };

    await handleButton(interaction as never);

    expect(uiModule.buttonHandlers[0].execute).toHaveBeenCalledWith(
      interaction,
    );
    expect(uiModule.buttonHandlers[1].execute).not.toHaveBeenCalled();
  });

  it("ボタンハンドラが例外を投げた場合に handleInteractionError へ委譲することを確認", async () => {
    const error = new Error("button failed");
    const uiModule = (await vi.importMock(
      "@/bot/handlers/interactionCreate/ui/buttons",
    )) as { buttonHandlers: Array<{ execute: Mock }> };
    uiModule.buttonHandlers[0].execute.mockRejectedValueOnce(error);
    const interaction = { customId: "target" };

    await handleButton(interaction as never);

    expect(handleInteractionError).toHaveBeenCalledWith(interaction, error);
    expect(loggerErrorMock).toHaveBeenCalledTimes(1);
  });

  it("customId に一致するユーザーセレクトハンドラーが実行されることを確認", async () => {
    const interaction = { customId: "target" };
    const uiModule = (await vi.importMock(
      "@/bot/handlers/interactionCreate/ui/selectMenus",
    )) as { userSelectHandlers: Array<{ execute: Mock }> };

    await handleUserSelectMenu(interaction as never);

    expect(uiModule.userSelectHandlers[0].execute).toHaveBeenCalledWith(
      interaction,
    );
  });

  it("customId に一致するストリングセレクトハンドラーが実行されることを確認", async () => {
    const interaction = { customId: "target" };
    const uiModule = (await vi.importMock(
      "@/bot/handlers/interactionCreate/ui/selectMenus",
    )) as { stringSelectHandlers: Array<{ execute: Mock }> };

    await handleStringSelectMenu(interaction as never);

    expect(uiModule.stringSelectHandlers[0].execute).toHaveBeenCalledWith(
      interaction,
    );
  });

  it("customId が一致しないストリングセレクトハンドラーは execute が呼ばれないことを確認", async () => {
    const interaction = { customId: "no-match" };
    const uiModule = (await vi.importMock(
      "@/bot/handlers/interactionCreate/ui/selectMenus",
    )) as { stringSelectHandlers: Array<{ execute: Mock }> };

    await handleStringSelectMenu(interaction as never);

    expect(uiModule.stringSelectHandlers[0].execute).not.toHaveBeenCalled();
  });

  it("customId に一致するロールセレクトハンドラーが実行されることを確認", async () => {
    const interaction = { customId: "role-target" };
    const uiModule = (await vi.importMock(
      "@/bot/handlers/interactionCreate/ui/selectMenus",
    )) as { roleSelectHandlers: Array<{ execute: Mock }> };

    await handleRoleSelectMenu(interaction as never);

    expect(uiModule.roleSelectHandlers[0].execute).toHaveBeenCalledWith(
      interaction,
    );
  });

  it("ストリングセレクトハンドラーが例外を投げた場合に handleInteractionError へ委譲されることを確認", async () => {
    const error = new Error("select failed");
    const uiModule = (await vi.importMock(
      "@/bot/handlers/interactionCreate/ui/selectMenus",
    )) as { stringSelectHandlers: Array<{ execute: Mock }> };
    uiModule.stringSelectHandlers[0].execute.mockRejectedValueOnce(error);
    const interaction = { customId: "target" };

    await handleStringSelectMenu(interaction as never);

    expect(handleInteractionError).toHaveBeenCalledWith(interaction, error);
    expect(loggerErrorMock).toHaveBeenCalledTimes(1);
  });
});
