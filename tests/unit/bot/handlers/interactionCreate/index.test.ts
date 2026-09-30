import type { Mock } from "vitest";

const handleAutocompleteMock: Mock = vi.fn();
const handleButtonMock: Mock = vi.fn();
const handleChatInputCommandMock: Mock = vi.fn();
const handleModalSubmitMock: Mock = vi.fn();
const handleRoleSelectMenuMock: Mock = vi.fn();
const handleStringSelectMenuMock: Mock = vi.fn();

vi.mock("@/bot/handlers/interactionCreate/flow/command", () => ({
  handleAutocomplete: (...args: unknown[]) => handleAutocompleteMock(...args),
  handleChatInputCommand: (...args: unknown[]) =>
    handleChatInputCommandMock(...args),
}));

vi.mock("@/bot/handlers/interactionCreate/flow/modal", () => ({
  handleModalSubmit: (...args: unknown[]) => handleModalSubmitMock(...args),
}));

vi.mock("@/bot/handlers/interactionCreate/flow/components", () => ({
  handleButton: (...args: unknown[]) => handleButtonMock(...args),
  handleRoleSelectMenu: (...args: unknown[]) =>
    handleRoleSelectMenuMock(...args),
  handleStringSelectMenu: (...args: unknown[]) =>
    handleStringSelectMenuMock(...args),
}));

// handleInteractionCreate の各 interaction 種別から対応ハンドラーへのルーティングを検証
describe("bot/handlers/interactionCreate/index", () => {
  // 各テストケースでモック状態をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("チャットインプットコマンドが handleChatInputCommand へルーティングされることを確認", async () => {
    const { handleInteractionCreate } = await import(
      "@/bot/handlers/interactionCreate/handleInteractionCreate"
    );

    const interaction = {
      client: {},
      isChatInputCommand: () => true,
      isAutocomplete: () => false,
      isModalSubmit: () => false,
      isButton: () => false,
      isRoleSelectMenu: () => false,
    };

    await handleInteractionCreate(interaction as never);

    expect(handleChatInputCommandMock).toHaveBeenCalledTimes(1);
    expect(handleAutocompleteMock).not.toHaveBeenCalled();
  });

  it("ストリングセレクトメニューが handleStringSelectMenu へルーティングされることを確認", async () => {
    const { handleInteractionCreate } = await import(
      "@/bot/handlers/interactionCreate/handleInteractionCreate"
    );

    const interaction = {
      client: {},
      isChatInputCommand: () => false,
      isAutocomplete: () => false,
      isModalSubmit: () => false,
      isButton: () => false,
      isRoleSelectMenu: () => false,
      isStringSelectMenu: () => true,
    };

    await handleInteractionCreate(interaction as never);

    expect(handleStringSelectMenuMock).toHaveBeenCalledTimes(1);
  });

  it("ボタンが handleButton へルーティングされることを確認", async () => {
    const { handleInteractionCreate } = await import(
      "@/bot/handlers/interactionCreate/handleInteractionCreate"
    );

    const interaction = {
      client: {},
      isChatInputCommand: () => false,
      isAutocomplete: () => false,
      isModalSubmit: () => false,
      isButton: () => true,
      isRoleSelectMenu: () => false,
      isStringSelectMenu: () => false,
    };

    await handleInteractionCreate(interaction as never);

    expect(handleButtonMock).toHaveBeenCalledTimes(1);
    expect(handleChatInputCommandMock).not.toHaveBeenCalled();
  });

  it("モーダル送信が handleModalSubmit へルーティングされることを確認", async () => {
    const { handleInteractionCreate } = await import(
      "@/bot/handlers/interactionCreate/handleInteractionCreate"
    );

    const interaction = {
      client: {},
      isChatInputCommand: () => false,
      isAutocomplete: () => false,
      isModalSubmit: () => true,
      isButton: () => false,
      isRoleSelectMenu: () => false,
      isStringSelectMenu: () => false,
    };

    await handleInteractionCreate(interaction as never);

    expect(handleModalSubmitMock).toHaveBeenCalledTimes(1);
    expect(handleButtonMock).not.toHaveBeenCalled();
  });

  it("オートコンプリートが handleAutocomplete へルーティングされることを確認", async () => {
    const { handleInteractionCreate } = await import(
      "@/bot/handlers/interactionCreate/handleInteractionCreate"
    );

    const interaction = {
      client: {},
      isChatInputCommand: () => false,
      isAutocomplete: () => true,
      isModalSubmit: () => false,
      isButton: () => false,
      isRoleSelectMenu: () => false,
      isStringSelectMenu: () => false,
    };

    await handleInteractionCreate(interaction as never);

    expect(handleAutocompleteMock).toHaveBeenCalledTimes(1);
    expect(handleChatInputCommandMock).not.toHaveBeenCalled();
  });

  it("ロールセレクトメニューが handleRoleSelectMenu へルーティングされることを確認", async () => {
    const { handleInteractionCreate } = await import(
      "@/bot/handlers/interactionCreate/handleInteractionCreate"
    );

    const interaction = {
      client: {},
      isChatInputCommand: () => false,
      isAutocomplete: () => false,
      isModalSubmit: () => false,
      isButton: () => false,
      isRoleSelectMenu: () => true,
      isStringSelectMenu: () => false,
    };

    await handleInteractionCreate(interaction as never);

    expect(handleRoleSelectMenuMock).toHaveBeenCalledTimes(1);
    expect(handleStringSelectMenuMock).not.toHaveBeenCalled();
  });
});
