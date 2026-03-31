// tests/unit/bot/features/vac/handlers/vacVoiceStateUpdate.test.ts
import { handleVacVoiceStateUpdate } from "@/bot/features/vac/handlers/vacVoiceStateUpdate";

const handleVoiceStateUpdateMock = vi.fn();

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVacService: vi.fn(() => ({
    handleVoiceStateUpdate: (...args: unknown[]) =>
      handleVoiceStateUpdateMock(...args),
  })),
}));

describe("bot/features/vac/handlers/vacVoiceStateUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ボイス状態ペアをvacサービスへ委譲する", async () => {
    const oldState = { channelId: "old-1" };
    const newState = { channelId: "new-1" };

    await handleVacVoiceStateUpdate(oldState as never, newState as never);

    expect(handleVoiceStateUpdateMock).toHaveBeenCalledWith(oldState, newState);
  });

  it("サービスの失敗を呼び出し元に伝播する", async () => {
    handleVoiceStateUpdateMock.mockRejectedValueOnce(
      new Error("service failed"),
    );

    await expect(
      handleVacVoiceStateUpdate({} as never, {} as never),
    ).rejects.toThrow("service failed");
  });
});
