// tests/integration/bot/events/interactionCreate.routing.integration.test.ts
import type { Mock } from "vitest";
import { handleInteractionError } from "@/bot/errors/interactionErrorHandler";
import { interactionCreateEvent } from "@/bot/events/interactionCreate";

// エラーハンドラは呼び出し確認だけ行う
vi.mock("@/bot/errors/interactionErrorHandler", () => ({
  handleCommandError: vi.fn(),
  handleInteractionError: vi.fn(),
}));

// ローカライズとロガーは副作用を排除する
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
  tGuild: vi.fn(async (_guildId: string, key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
}));
vi.mock("@/shared/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Handler レジストリをテスト専用に差し替え、ルーティングを直接検証できるようにする
vi.mock("@/bot/handlers/interactionCreate/ui/modals", () => {
  const modalHandler = {
    matches: vi.fn((customId: string) => customId.startsWith("modal:")),
    execute: vi.fn().mockResolvedValue(undefined),
  };
  return {
    modalHandlers: [modalHandler],
    __modalHandler: modalHandler,
  };
});
vi.mock("@/bot/handlers/interactionCreate/ui/buttons", () => {
  const buttonHandler = {
    matches: vi.fn((customId: string) => customId.startsWith("btn:")),
    execute: vi.fn().mockResolvedValue(undefined),
  };
  return {
    buttonHandlers: [buttonHandler],
    __buttonHandler: buttonHandler,
  };
});
vi.mock("@/bot/handlers/interactionCreate/ui/selectMenus", () => {
  const userSelectHandler = {
    matches: vi.fn((customId: string) => customId.startsWith("select:")),
    execute: vi.fn().mockResolvedValue(undefined),
  };
  return {
    userSelectHandlers: [userSelectHandler],
    __userSelectHandler: userSelectHandler,
  };
});

type InteractionBase = {
  client: {
    commands: Map<string, unknown>;
    cooldownManager: { check: Mock };
    modals: Map<string, { execute: Mock<(arg: unknown) => Promise<void>> }>;
  };
  customId: string;
  user: { id: string; tag: string };
  reply: Mock<(arg: unknown) => Promise<void>>;
  commandName: string;
  guildId: string;
  isChatInputCommand: Mock<() => boolean>;
  isAutocomplete: Mock<() => boolean>;
  isModalSubmit: Mock<() => boolean>;
  isButton: Mock<() => boolean>;
  isUserSelectMenu: Mock<() => boolean>;
};

// interactionCreate の各分岐に使う共通 interaction モック
function createInteraction(
  overrides?: Partial<InteractionBase>,
): InteractionBase {
  return {
    client: {
      commands: new Map(),
      cooldownManager: { check: vi.fn(() => 0) },
      modals: new Map(),
    },
    customId: "id-1",
    user: { id: "user-1", tag: "user#0001" },
    reply: vi.fn().mockResolvedValue(undefined),
    commandName: "ping",
    guildId: "guild-1",
    isChatInputCommand: vi.fn(() => false),
    isAutocomplete: vi.fn(() => false),
    isModalSubmit: vi.fn(() => false),
    isButton: vi.fn(() => false),
    isUserSelectMenu: vi.fn(() => false),
    ...overrides,
  };
}

describe("integration: interactionCreate handler routing", () => {
  // ケース間でモック状態をリセットし、呼び出し回数の検証を安定させる
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("modal submit が modalHandlers へルーティングされること", async () => {
    const modalModule = (await vi.importMock(
      "@/bot/handlers/interactionCreate/ui/modals",
    )) as {
      __modalHandler: {
        execute: Mock<(arg: unknown) => Promise<void>>;
      };
    };

    const interaction = createInteraction({
      customId: "modal:rename:1",
      isModalSubmit: vi.fn(() => true),
    });

    await interactionCreateEvent.execute(interaction as never);

    expect(modalModule.__modalHandler.execute).toHaveBeenCalledWith(
      interaction,
    );
  });

  it("button interaction が buttonHandlers を経由して処理されること", async () => {
    const buttonModule = (await vi.importMock(
      "@/bot/handlers/interactionCreate/ui/buttons",
    )) as {
      __buttonHandler: {
        execute: Mock<(arg: unknown) => Promise<void>>;
      };
    };

    const interaction = createInteraction({
      customId: "btn:panel:1",
      isButton: vi.fn(() => true),
    });

    await interactionCreateEvent.execute(interaction as never);

    expect(buttonModule.__buttonHandler.execute).toHaveBeenCalledWith(
      interaction,
    );
  });

  it("user select ハンドラの例外が interaction 用エラーハンドラへ委譲されること", async () => {
    const selectModule = (await vi.importMock(
      "@/bot/handlers/interactionCreate/ui/selectMenus",
    )) as {
      __userSelectHandler: {
        execute: Mock<(arg: unknown) => Promise<void>>;
      };
    };
    const error = new Error("select failed");
    selectModule.__userSelectHandler.execute.mockRejectedValueOnce(error);

    const interaction = createInteraction({
      customId: "select:afk:1",
      isUserSelectMenu: vi.fn(() => true),
    });

    await interactionCreateEvent.execute(interaction as never);

    expect(handleInteractionError).toHaveBeenCalledWith(interaction, error);
  });
});
