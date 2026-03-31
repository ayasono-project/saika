// tests/unit/bot/shared/disableComponentsAfterTimeout.test.ts

// ActionRowBuilder.from のモックを制御するためのスタブ
const fromMock = vi.fn();

vi.mock("discord.js", () => ({
  ActionRowBuilder: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import { disableComponentsAfterTimeout } from "@/bot/shared/disableComponentsAfterTimeout";

// disableComponentsAfterTimeout の単体テスト
describe("bot/shared/disableComponentsAfterTimeout", () => {
  // 各テスト間のタイマーとモック状態をリセットするため
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  // フェイクタイマーを元に戻すため
  afterEach(() => {
    vi.useRealTimers();
  });

  it("指定時間後にコンポーネントを無効化して editReply を呼ぶ", async () => {
    // Arrange
    const component1 = { setDisabled: vi.fn() };
    const component2 = { setDisabled: vi.fn() };
    const clonedRow1 = { components: [component1] };
    const clonedRow2 = { components: [component2] };

    fromMock.mockReturnValueOnce(clonedRow1).mockReturnValueOnce(clonedRow2);

    const row1 = { toJSON: vi.fn().mockReturnValue({ type: 1 }) };
    const row2 = { toJSON: vi.fn().mockReturnValue({ type: 1 }) };

    const interaction = {
      editReply: vi.fn().mockResolvedValue(undefined),
    };

    // Act
    disableComponentsAfterTimeout(
      interaction as never,
      [row1, row2] as never,
      5000,
    );

    // タイマー発火前は何も呼ばれない
    expect(interaction.editReply).not.toHaveBeenCalled();

    // タイマーを進めてコールバックを実行
    await vi.advanceTimersByTimeAsync(5000);

    // Assert
    expect(row1.toJSON).toHaveBeenCalled();
    expect(row2.toJSON).toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledTimes(2);
    expect(component1.setDisabled).toHaveBeenCalledWith(true);
    expect(component2.setDisabled).toHaveBeenCalledWith(true);
    expect(interaction.editReply).toHaveBeenCalledWith({
      components: [clonedRow1, clonedRow2],
    });
  });

  it("タイムアウト時間が経過する前にはコンポーネントを無効化しない", () => {
    // Arrange
    const interaction = {
      editReply: vi.fn().mockResolvedValue(undefined),
    };
    const row = { toJSON: vi.fn().mockReturnValue({ type: 1 }) };

    // Act
    disableComponentsAfterTimeout(interaction as never, [row] as never, 10000);
    vi.advanceTimersByTime(9999);

    // Assert
    expect(interaction.editReply).not.toHaveBeenCalled();
  });

  it("editReply がエラーをスローしても例外が伝播しない", async () => {
    // Arrange
    const component = { setDisabled: vi.fn() };
    const clonedRow = { components: [component] };
    fromMock.mockReturnValue(clonedRow);

    const row = { toJSON: vi.fn().mockReturnValue({ type: 1 }) };
    const interaction = {
      editReply: vi.fn().mockRejectedValue(new Error("Unknown Message")),
    };

    // Act — エラーが伝播しないことを確認
    disableComponentsAfterTimeout(interaction as never, [row] as never, 3000);
    await vi.advanceTimersByTimeAsync(3000);

    // Assert
    expect(interaction.editReply).toHaveBeenCalled();
  });

  it("空の rows 配列を渡した場合でも正常に動作する", async () => {
    // Arrange
    const interaction = {
      editReply: vi.fn().mockResolvedValue(undefined),
    };

    // Act
    disableComponentsAfterTimeout(interaction as never, [] as never, 1000);
    await vi.advanceTimersByTimeAsync(1000);

    // Assert
    expect(interaction.editReply).toHaveBeenCalledWith({ components: [] });
  });
});
