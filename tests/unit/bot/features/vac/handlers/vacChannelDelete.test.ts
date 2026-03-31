// tests/unit/bot/features/vac/handlers/vacChannelDelete.test.ts
import { handleVacChannelDelete } from "@/bot/features/vac/handlers/vacChannelDelete";

const handleChannelDeleteMock = vi.fn();

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVacService: vi.fn(() => ({
    handleChannelDelete: (...args: unknown[]) =>
      handleChannelDeleteMock(...args),
  })),
}));

describe("bot/features/vac/handlers/vacChannelDelete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("削除されたチャンネルをvacサービスへ委譲する", async () => {
    const channel = { id: "voice-1" };

    await handleVacChannelDelete(channel as never);

    expect(handleChannelDeleteMock).toHaveBeenCalledWith(channel);
  });

  it("サービスの失敗を呼び出し元に伝播する", async () => {
    handleChannelDeleteMock.mockRejectedValueOnce(new Error("service failed"));

    await expect(handleVacChannelDelete({} as never)).rejects.toThrow(
      "service failed",
    );
  });
});
