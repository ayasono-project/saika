// tests/unit/bot/features/vac/handlers/vacStartupCleanup.test.ts
import { cleanupVacOnStartup } from "@/bot/features/vac/handlers/vacStartupCleanup";

const cleanupOnStartupMock = vi.fn();

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVacService: vi.fn(() => ({
    cleanupOnStartup: (...args: unknown[]) => cleanupOnStartupMock(...args),
  })),
}));

describe("bot/features/vac/handlers/vacStartupCleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("起動時のclientをvacサービスへ委譲する", async () => {
    const client = { guilds: { cache: new Map() } };

    await cleanupVacOnStartup(client as never);

    expect(cleanupOnStartupMock).toHaveBeenCalledWith(client);
  });

  it("サービスの失敗を呼び出し元に伝播する", async () => {
    cleanupOnStartupMock.mockRejectedValueOnce(new Error("service failed"));

    await expect(cleanupVacOnStartup({} as never)).rejects.toThrow(
      "service failed",
    );
  });
});
