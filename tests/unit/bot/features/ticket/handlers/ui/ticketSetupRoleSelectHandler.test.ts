// tests/unit/bot/features/ticket/handlers/ui/ticketSetupRoleSelectHandler.test.ts

import { ticketSetupRoleSelectHandler } from "@/bot/features/ticket/handlers/ui/ticketSetupRoleSelectHandler";

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
  tDefault: vi.fn((key: string) => key),
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

vi.mock("@/bot/features/ticket/handlers/ui/ticketSetupState", () => ({
  ticketSetupSessions: {
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn(),
    delete: vi.fn(),
  },
}));

import { ticketSetupSessions } from "@/bot/features/ticket/handlers/ui/ticketSetupState";

function createMockRoleSelectInteraction(customId: string, overrides = {}) {
  return {
    customId,
    locale: "ja",
    guildId: "guild-1",
    roles: new Map([
      ["role-1", { id: "role-1" }],
      ["role-2", { id: "role-2" }],
    ]),
    showModal: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("bot/features/ticket/handlers/ui/ticketSetupRoleSelectHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("matches", () => {
    it("ticket:setup-roles: プレフィックスにマッチ", () => {
      expect(
        ticketSetupRoleSelectHandler.matches("ticket:setup-roles:session-1"),
      ).toBe(true);
    });

    it("別のプレフィックスにはマッチしない", () => {
      expect(
        ticketSetupRoleSelectHandler.matches("ticket:set-roles:cat-1"),
      ).toBe(false);
      expect(ticketSetupRoleSelectHandler.matches("other:setup-roles:1")).toBe(
        false,
      );
    });
  });

  describe("execute", () => {
    it("セッションが見つからない場合は何もしない", async () => {
      vi.mocked(ticketSetupSessions.get).mockReturnValue(undefined as never);

      const interaction = createMockRoleSelectInteraction(
        "ticket:setup-roles:session-1",
      );

      await ticketSetupRoleSelectHandler.execute(interaction as never);

      expect(interaction.showModal).not.toHaveBeenCalled();
    });

    it("ロール選択後にモーダルが表示される", async () => {
      const session = { categoryId: "cat-1", staffRoleIds: [] as string[] };
      vi.mocked(ticketSetupSessions.get).mockReturnValue(session as never);

      const interaction = createMockRoleSelectInteraction(
        "ticket:setup-roles:session-1",
      );

      await ticketSetupRoleSelectHandler.execute(interaction as never);

      expect(interaction.showModal).toHaveBeenCalledTimes(1);
    });

    it("セッションにロールIDが保存される", async () => {
      const session = { categoryId: "cat-1", staffRoleIds: [] as string[] };
      vi.mocked(ticketSetupSessions.get).mockReturnValue(session as never);

      const interaction = createMockRoleSelectInteraction(
        "ticket:setup-roles:session-1",
      );

      await ticketSetupRoleSelectHandler.execute(interaction as never);

      expect(session.staffRoleIds).toEqual(["role-1", "role-2"]);
    });

    it("メッセージが存在しない場合でもエラーにならない", async () => {
      const session = { categoryId: "cat-1", staffRoleIds: [] as string[] };
      vi.mocked(ticketSetupSessions.get).mockReturnValue(session as never);

      const interaction = createMockRoleSelectInteraction(
        "ticket:setup-roles:session-1",
        { message: null },
      );

      await expect(
        ticketSetupRoleSelectHandler.execute(interaction as never),
      ).resolves.toBeUndefined();
    });
  });
});
