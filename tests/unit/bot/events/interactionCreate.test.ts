// tests/unit/bot/events/interactionCreate.test.ts

import { Events, MessageFlags } from "discord.js";
import type { Mock } from "vitest";
import {
  handleCommandError,
  handleInteractionError,
} from "@/bot/errors/interactionErrorHandler";
import { interactionCreateEvent } from "@/bot/events/interactionCreate";
import { tInteraction } from "@/shared/locale/localeManager";
import { logger } from "@/shared/utils/logger";

// ErrorHandler は呼び出し有無の検証に限定する
vi.mock("@/bot/errors/interactionErrorHandler", () => ({
  handleCommandError: vi.fn(),
  handleInteractionError: vi.fn(),
}));

// ローカライズは固定文字列化してアサーションを簡潔にする
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
  tInteraction: vi.fn((_locale: string, key: string) => `interaction:${key}`),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  STATUS_COLORS: {
    success: 0x57f287,
    info: 0x3498db,
    warning: 0xfee75c,
    error: 0xed4245,
  },
}));

// ログ出力は副作用回避のためダミー化する
vi.mock("@/shared/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// レジストリハンドラはテストごとに挙動を制御できるようダミーを公開する
vi.mock("@/bot/handlers/interactionCreate/ui/buttons", () => {
  const mockButtonHandler = {
    matches: vi.fn(() => false),
    execute: vi.fn().mockResolvedValue(undefined),
  };
  return {
    buttonHandlers: [mockButtonHandler],
    __mockButtonHandler: mockButtonHandler,
  };
});
vi.mock("@/bot/handlers/interactionCreate/ui/modals", () => {
  const mockModalHandler = {
    matches: vi.fn(() => false),
    execute: vi.fn().mockResolvedValue(undefined),
  };
  return {
    modalHandlers: [mockModalHandler],
    __mockModalHandler: mockModalHandler,
  };
});
vi.mock("@/bot/handlers/interactionCreate/ui/selectMenus", () => {
  const mockUserSelectHandler = {
    matches: vi.fn(() => false),
    execute: vi.fn().mockResolvedValue(undefined),
  };
  const mockStringSelectHandler = {
    matches: vi.fn(() => false),
    execute: vi.fn().mockResolvedValue(undefined),
  };
  return {
    userSelectHandlers: [mockUserSelectHandler],
    __mockUserSelectHandler: mockUserSelectHandler,
    stringSelectHandlers: [mockStringSelectHandler],
    __mockStringSelectHandler: mockStringSelectHandler,
  };
});

type BaseInteraction = {
  client: {
    commands: Map<string, unknown>;
    cooldownManager: { check: Mock };
    modals: Map<string, { execute: Mock<(arg: unknown) => Promise<void>> }>;
  };
  commandName: string;
  customId: string;
  guildId: string;
  locale: string;
  user: { id: string; tag: string };
  reply: Mock<(arg: unknown) => Promise<void>>;
  isChatInputCommand: Mock<() => boolean>;
  isAutocomplete: Mock<() => boolean>;
  isModalSubmit: Mock<() => boolean>;
  isButton: Mock<() => boolean>;
  isUserSelectMenu: Mock<() => boolean>;
  isRoleSelectMenu: Mock<() => boolean>;
  isStringSelectMenu: Mock<() => boolean>;
};

// interactionCreate 用の最小 interaction を共通化して分岐設定を容易にする
function createInteraction(
  overrides?: Partial<BaseInteraction>,
): BaseInteraction {
  return {
    client: {
      commands: new Map(),
      cooldownManager: { check: vi.fn(() => 0) },
      modals: new Map(),
    },
    commandName: "ping",
    customId: "custom-id",
    guildId: "guild-1",
    locale: "ja",
    user: { id: "user-1", tag: "user#0001" },
    reply: vi.fn().mockResolvedValue(undefined),
    isChatInputCommand: vi.fn(() => false),
    isAutocomplete: vi.fn(() => false),
    isModalSubmit: vi.fn(() => false),
    isButton: vi.fn(() => false),
    isUserSelectMenu: vi.fn(() => false),
    isRoleSelectMenu: vi.fn(() => false),
    isStringSelectMenu: vi.fn(() => false),
    ...overrides,
  };
}

// interactionCreate イベントハンドラーの各 interaction 種別ごとのルーティング・クールダウン・エラー委譲を検証
describe("bot/events/interactionCreate", () => {
  // テスト前にモック状態を初期化し、分岐ごとの副作用検証を安定化する
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("イベントメタデータが正しいことを確認", () => {
    expect(interactionCreateEvent.name).toBe(Events.InteractionCreate);
    expect(interactionCreateEvent.once).toBe(false);
  });

  it("クールダウン中はコマンドを実行せず Ephemeral でクールダウンメッセージを返すことを確認", async () => {
    const command = {
      data: { name: "ping" },
      cooldown: 5,
      execute: vi.fn(),
    };
    const interaction = createInteraction({
      isChatInputCommand: vi.fn(() => true),
    });
    interaction.client.commands.set("ping", command);
    interaction.client.cooldownManager.check.mockReturnValue(2);

    await interactionCreateEvent.execute(interaction as never);

    expect(tInteraction).toHaveBeenCalledWith("ja", "common:cooldown.wait", {
      seconds: 2,
    });
    expect(interaction.reply).toHaveBeenCalledWith({
      content: "interaction:common:cooldown.wait",
      flags: MessageFlags.Ephemeral,
    });
    expect(command.execute).not.toHaveBeenCalled();
  });

  it("モーダル送信が registry ハンドラーを優先して実行されることを確認", async () => {
    const mockedModalModule = (await vi.importMock(
      "@/bot/handlers/interactionCreate/ui/modals",
    )) as {
      __mockModalHandler: {
        matches: Mock<(s: string) => boolean>;
        execute: Mock<(arg: unknown) => Promise<void>>;
      };
    };

    mockedModalModule.__mockModalHandler.matches.mockReturnValue(true);

    const interaction = createInteraction({
      customId: "vac:rename:123",
      isModalSubmit: vi.fn(() => true),
    });

    await interactionCreateEvent.execute(interaction as never);

    expect(mockedModalModule.__mockModalHandler.execute).toHaveBeenCalledWith(
      interaction,
    );
  });

  it("modal registry ハンドラー実行失敗時は handleInteractionError へ委譲されることを確認", async () => {
    const mockedModalModule = (await vi.importMock(
      "@/bot/handlers/interactionCreate/ui/modals",
    )) as {
      __mockModalHandler: {
        matches: Mock<(s: string) => boolean>;
        execute: Mock<(arg: unknown) => Promise<void>>;
      };
    };

    const modalError = new Error("registry modal failed");
    mockedModalModule.__mockModalHandler.matches.mockReturnValue(true);
    mockedModalModule.__mockModalHandler.execute.mockRejectedValue(modalError);

    const interaction = createInteraction({
      customId: "vac:rename:error",
      isModalSubmit: vi.fn(() => true),
    });

    await interactionCreateEvent.execute(interaction as never);

    expect(handleInteractionError).toHaveBeenCalledWith(
      interaction,
      modalError,
    );
  });

  it("ボタンハンドラー実行失敗時は handleInteractionError へ委譲されることを確認", async () => {
    const mockedButtonModule = (await vi.importMock(
      "@/bot/handlers/interactionCreate/ui/buttons",
    )) as {
      __mockButtonHandler: {
        matches: Mock<(s: string) => boolean>;
        execute: Mock<(arg: unknown) => Promise<void>>;
      };
    };

    const error = new Error("button failed");
    mockedButtonModule.__mockButtonHandler.matches.mockReturnValue(true);
    mockedButtonModule.__mockButtonHandler.execute.mockRejectedValue(error);

    const interaction = createInteraction({
      customId: "button:1",
      isButton: vi.fn(() => true),
    });

    await interactionCreateEvent.execute(interaction as never);

    expect(handleInteractionError).toHaveBeenCalledWith(interaction, error);
  });

  it("コマンド実行失敗時は handleCommandError へ委譲されることを確認", async () => {
    const error = new Error("command failed");
    const command = {
      data: { name: "ping" },
      cooldown: 3,
      execute: vi.fn().mockRejectedValue(error),
    };

    const interaction = createInteraction({
      isChatInputCommand: vi.fn(() => true),
    });
    interaction.client.commands.set("ping", command);

    await interactionCreateEvent.execute(interaction as never);

    expect(handleCommandError).toHaveBeenCalledWith(interaction, error);
  });

  it("未登録コマンド名の場合は警告ログのみで終了することを確認", async () => {
    const interaction = createInteraction({
      isChatInputCommand: vi.fn(() => true),
      commandName: "unknown",
    });

    await interactionCreateEvent.execute(interaction as never);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "[system:log_prefix.interaction_create:command] system:interaction.unknown_command",
      ),
    );
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it("ギルド外でも tInteraction のクールダウンメッセージを使うことを確認", async () => {
    const command = {
      data: { name: "ping" },
      cooldown: undefined,
      execute: vi.fn(),
    };
    const interaction = createInteraction({
      isChatInputCommand: vi.fn(() => true),
      guildId: "",
    });
    interaction.client.commands.set("ping", command);
    interaction.client.cooldownManager.check.mockReturnValue(1);

    await interactionCreateEvent.execute(interaction as never);

    expect(tInteraction).toHaveBeenCalledWith("ja", "common:cooldown.wait", {
      seconds: 1,
    });
    expect(interaction.reply).toHaveBeenCalledWith({
      content: "interaction:common:cooldown.wait",
      flags: MessageFlags.Ephemeral,
    });
  });

  it("クールダウン対象外の場合にコマンドが実行され logger.debug が呼ばれることを確認", async () => {
    const command = {
      data: { name: "ping" },
      cooldown: 3,
      execute: vi.fn().mockResolvedValue(undefined),
    };
    const interaction = createInteraction({
      isChatInputCommand: vi.fn(() => true),
    });
    interaction.client.commands.set("ping", command);
    interaction.client.cooldownManager.check.mockReturnValue(0);

    await interactionCreateEvent.execute(interaction as never);

    expect(command.execute).toHaveBeenCalledWith(interaction);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining(
        "[system:log_prefix.interaction_create:command] system:interaction.command_executed",
      ),
    );
  });

  it("オートコンプリート対応コマンドがある場合に autocomplete ハンドラーが実行されることを確認", async () => {
    const autocomplete = vi.fn().mockResolvedValue(undefined);
    const command = {
      data: { name: "ping" },
      execute: vi.fn(),
      autocomplete,
    };
    const interaction = createInteraction({
      isAutocomplete: vi.fn(() => true),
    });
    interaction.client.commands.set("ping", command);

    await interactionCreateEvent.execute(interaction as never);

    expect(autocomplete).toHaveBeenCalledWith(interaction);
  });

  it("autocomplete 非対応または未登録の場合は何もせず終了することを確認", async () => {
    const interaction = createInteraction({
      isAutocomplete: vi.fn(() => true),
    });

    await interactionCreateEvent.execute(interaction as never);

    const commandWithoutAutocomplete = {
      data: { name: "ping" },
      execute: vi.fn(),
    };
    interaction.client.commands.set("ping", commandWithoutAutocomplete);
    await interactionCreateEvent.execute(interaction as never);

    expect(logger.error).not.toHaveBeenCalledWith(
      expect.stringContaining("system:interaction.autocomplete_error"),
      expect.anything(),
    );
  });

  it("autocomplete 失敗時はエラーログのみ行うことを確認", async () => {
    const autocompleteError = new Error("autocomplete failed");
    const command = {
      data: { name: "ping" },
      execute: vi.fn(),
      autocomplete: vi.fn().mockRejectedValue(autocompleteError),
    };
    const interaction = createInteraction({
      isAutocomplete: vi.fn(() => true),
    });
    interaction.client.commands.set("ping", command);

    await interactionCreateEvent.execute(interaction as never);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining(
        "[system:log_prefix.interaction_create:command] system:interaction.autocomplete_error",
      ),
      autocompleteError,
    );
  });

  it("modal registry 非一致時は client.modals を使わず警告して終了することを確認", async () => {
    const mockedModalModule = (await vi.importMock(
      "@/bot/handlers/interactionCreate/ui/modals",
    )) as {
      __mockModalHandler: {
        matches: Mock<(s: string) => boolean>;
      };
    };
    mockedModalModule.__mockModalHandler.matches.mockReturnValue(false);

    const modalExecute = vi.fn().mockResolvedValue(undefined);
    const interaction = createInteraction({
      isModalSubmit: vi.fn(() => true),
      customId: "modal:exact",
    });
    interaction.client.modals.set("modal:exact", { execute: modalExecute });

    await interactionCreateEvent.execute(interaction as never);

    expect(modalExecute).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "[system:log_prefix.interaction_create:modal] system:interaction.unknown_modal",
      ),
    );
  });

  it("modal が registry にも collection にも存在しない場合は警告して終了することを確認", async () => {
    const mockedModalModule = (await vi.importMock(
      "@/bot/handlers/interactionCreate/ui/modals",
    )) as {
      __mockModalHandler: {
        matches: Mock<(s: string) => boolean>;
      };
    };
    mockedModalModule.__mockModalHandler.matches.mockReturnValue(false);

    const interaction = createInteraction({
      isModalSubmit: vi.fn(() => true),
      customId: "modal:missing",
    });

    await interactionCreateEvent.execute(interaction as never);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "[system:log_prefix.interaction_create:modal] system:interaction.unknown_modal",
      ),
    );
  });

  it("registry 非一致時は fallback モーダルの失敗も発生せず interaction error へ委譲しないことを確認", async () => {
    const mockedModalModule = (await vi.importMock(
      "@/bot/handlers/interactionCreate/ui/modals",
    )) as {
      __mockModalHandler: {
        matches: Mock<(s: string) => boolean>;
      };
    };
    mockedModalModule.__mockModalHandler.matches.mockReturnValue(false);

    const modalError = new Error("modal failed");
    const modalExecute = vi.fn().mockRejectedValue(modalError);
    const interaction = createInteraction({
      isModalSubmit: vi.fn(() => true),
      customId: "modal:error",
    });
    interaction.client.modals.set("modal:error", { execute: modalExecute });

    await interactionCreateEvent.execute(interaction as never);

    expect(modalExecute).not.toHaveBeenCalled();
    expect(handleInteractionError).not.toHaveBeenCalled();
  });

  it("user select ハンドラーが一致した場合に execute が呼ばれることを確認", async () => {
    const mockedSelectModule = (await vi.importMock(
      "@/bot/handlers/interactionCreate/ui/selectMenus",
    )) as {
      __mockUserSelectHandler: {
        matches: Mock<(s: string) => boolean>;
        execute: Mock<(arg: unknown) => Promise<void>>;
      };
    };
    mockedSelectModule.__mockUserSelectHandler.matches.mockReturnValue(true);

    const interaction = createInteraction({
      customId: "user-select:1",
      isUserSelectMenu: vi.fn(() => true),
    });

    await interactionCreateEvent.execute(interaction as never);

    expect(
      mockedSelectModule.__mockUserSelectHandler.execute,
    ).toHaveBeenCalledWith(interaction);
  });

  it("user select ハンドラー失敗時は handleInteractionError へ委譲されることを確認", async () => {
    const mockedSelectModule = (await vi.importMock(
      "@/bot/handlers/interactionCreate/ui/selectMenus",
    )) as {
      __mockUserSelectHandler: {
        matches: Mock<(s: string) => boolean>;
        execute: Mock<(arg: unknown) => Promise<void>>;
      };
    };
    const selectError = new Error("select failed");
    mockedSelectModule.__mockUserSelectHandler.matches.mockReturnValue(true);
    mockedSelectModule.__mockUserSelectHandler.execute.mockRejectedValue(
      selectError,
    );

    const interaction = createInteraction({
      customId: "user-select:error",
      isUserSelectMenu: vi.fn(() => true),
    });

    await interactionCreateEvent.execute(interaction as never);

    expect(handleInteractionError).toHaveBeenCalledWith(
      interaction,
      selectError,
    );
  });

  it("ボタンハンドラーが一致しない場合は何も実行しないことを確認", async () => {
    const mockedButtonModule = (await vi.importMock(
      "@/bot/handlers/interactionCreate/ui/buttons",
    )) as {
      __mockButtonHandler: {
        matches: Mock<(s: string) => boolean>;
        execute: Mock<(arg: unknown) => Promise<void>>;
      };
    };
    mockedButtonModule.__mockButtonHandler.matches.mockReturnValue(false);

    const interaction = createInteraction({
      customId: "button:none",
      isButton: vi.fn(() => true),
    });

    await interactionCreateEvent.execute(interaction as never);

    expect(
      mockedButtonModule.__mockButtonHandler.execute,
    ).not.toHaveBeenCalled();
    expect(handleInteractionError).not.toHaveBeenCalled();
  });

  it("ユーザーセレクトハンドラーが一致しない場合は何も実行しないことを確認", async () => {
    const mockedSelectModule = (await vi.importMock(
      "@/bot/handlers/interactionCreate/ui/selectMenus",
    )) as {
      __mockUserSelectHandler: {
        matches: Mock<(s: string) => boolean>;
        execute: Mock<(arg: unknown) => Promise<void>>;
      };
    };
    mockedSelectModule.__mockUserSelectHandler.matches.mockReturnValue(false);

    const interaction = createInteraction({
      customId: "user-select:none",
      isUserSelectMenu: vi.fn(() => true),
    });

    await interactionCreateEvent.execute(interaction as never);

    expect(
      mockedSelectModule.__mockUserSelectHandler.execute,
    ).not.toHaveBeenCalled();
    expect(handleInteractionError).not.toHaveBeenCalled();
  });

  it("どの interaction 種別にも該当しない場合は何もしないことを確認", async () => {
    const interaction = createInteraction();

    await interactionCreateEvent.execute(interaction as never);

    expect(interaction.reply).not.toHaveBeenCalled();
    expect(handleCommandError).not.toHaveBeenCalled();
    expect(handleInteractionError).not.toHaveBeenCalled();
  });
});
