// tests/unit/shared/utils/prisma.test.ts
describe("shared/utils/prisma", () => {
  const loggerMock = {
    error: vi.fn(),
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    vi.doMock("@/shared/utils/logger", () => ({
      logger: loggerMock,
    }));

    vi.doMock("@/shared/locale/localeManager", () => ({
      tDefault: vi.fn((key: string) => key),
      logPrefixed: (
        prefixKey: string,
        messageKey: string,
        params?: Record<string, unknown>,
        sub?: string,
      ) => {
        const m = params
          ? `${messageKey}:${JSON.stringify(params)}`
          : messageKey;
        return sub ? `[${prefixKey}:${sub}] ${m}` : `[${prefixKey}] ${m}`;
      },
      logCommand: (
        commandName: string,
        messageKey: string,
        params?: Record<string, unknown>,
      ) => {
        const m = params
          ? `${messageKey}:${JSON.stringify(params)}`
          : messageKey;
        return `[${commandName}] ${m}`;
      },
    }));
  });

  it("初期化前は getPrismaClient が null を返すこと", async () => {
    const { getPrismaClient } = await import("@/shared/utils/prisma");
    expect(getPrismaClient()).toBeNull();
  });

  it("setPrismaClient で設定した prisma クライアントを getPrismaClient で取得できること", async () => {
    const { getPrismaClient, setPrismaClient } = await import(
      "@/shared/utils/prisma"
    );
    const client = { $disconnect: vi.fn() };

    setPrismaClient(client as never);

    expect(getPrismaClient()).toBe(client);
  });

  it("初期化済みの場合は requirePrismaClient でクライアントを取得できること", async () => {
    const { requirePrismaClient, setPrismaClient } = await import(
      "@/shared/utils/prisma"
    );
    const client = { $connect: vi.fn() };
    setPrismaClient(client as never);

    expect(requirePrismaClient()).toBe(client);
  });

  it("未初期化状態で requirePrismaClient を呼ぶと例外をスローしてログ出力すること", async () => {
    const { requirePrismaClient } = await import("@/shared/utils/prisma");

    expect(() => requirePrismaClient()).toThrow(
      "system:database.prisma_not_available",
    );
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.stringContaining("system:database.prisma_not_available"),
      expect.any(Error),
    );
  });
});
