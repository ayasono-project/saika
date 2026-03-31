// tests/unit/bot/features/ticket/handlers/ui/ticketRoleSelectHandler.test.ts

import { ticketRoleSelectHandler } from "@/bot/features/ticket/handlers/ui/ticketRoleSelectHandler";

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

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotTicketConfigService: vi.fn(),
  getBotTicketRepository: vi.fn(),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: vi.fn(() => ({ type: "success" })),
  createErrorEmbed: vi.fn(() => ({ type: "error" })),
  createWarningEmbed: vi.fn(() => ({ type: "warning" })),
  createInfoEmbed: vi.fn(() => ({ type: "info" })),
}));

import { getBotTicketConfigService } from "@/bot/services/botCompositionRoot";

function createMockRoleSelectInteraction(customId: string, overrides = {}) {
  return {
    customId,
    locale: "ja",
    guildId: "guild-1",
    roles: new Map([
      ["role-1", { id: "role-1" }],
      ["role-2", { id: "role-2" }],
    ]),
    reply: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("bot/features/ticket/handlers/ui/ticketRoleSelectHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("matches", () => {
    it("ticket:set-roles: プレフィックスにマッチ", () => {
      expect(ticketRoleSelectHandler.matches("ticket:set-roles:cat-1")).toBe(
        true,
      );
    });

    it("ticket:add-roles: プレフィックスにマッチ", () => {
      expect(ticketRoleSelectHandler.matches("ticket:add-roles:cat-1")).toBe(
        true,
      );
    });

    it("ticket:remove-roles: プレフィックスにマッチ", () => {
      expect(ticketRoleSelectHandler.matches("ticket:remove-roles:cat-1")).toBe(
        true,
      );
    });

    it("無関係なcustomIdにはマッチしない", () => {
      expect(ticketRoleSelectHandler.matches("ticket:setup-roles:1")).toBe(
        false,
      );
      expect(ticketRoleSelectHandler.matches("other:set-roles:1")).toBe(false);
    });
  });

  describe("execute", () => {
    describe("SET_ROLES", () => {
      it("設定が見つからない場合はエラー応答", async () => {
        const mockConfigService = {
          findByGuildAndCategory: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
        };
        vi.mocked(getBotTicketConfigService).mockReturnValue(
          mockConfigService as never,
        );

        const interaction = createMockRoleSelectInteraction(
          "ticket:set-roles:cat-1",
        );

        await ticketRoleSelectHandler.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
        expect(mockConfigService.update).not.toHaveBeenCalled();
      });

      it("ロールが正常に上書きされる", async () => {
        const mockConfigService = {
          findByGuildAndCategory: vi.fn().mockResolvedValue({
            guildId: "guild-1",
            categoryId: "cat-1",
            staffRoleIds: '["old-role"]',
          }),
          update: vi.fn().mockResolvedValue(undefined),
        };
        vi.mocked(getBotTicketConfigService).mockReturnValue(
          mockConfigService as never,
        );

        const interaction = createMockRoleSelectInteraction(
          "ticket:set-roles:cat-1",
        );

        await ticketRoleSelectHandler.execute(interaction as never);

        expect(mockConfigService.update).toHaveBeenCalledWith(
          "guild-1",
          "cat-1",
          { staffRoleIds: JSON.stringify(["role-1", "role-2"]) },
        );
        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
      });
    });

    describe("ADD_ROLES", () => {
      it("ロールが追加される（重複なし）", async () => {
        const mockConfigService = {
          findByGuildAndCategory: vi.fn().mockResolvedValue({
            guildId: "guild-1",
            categoryId: "cat-1",
            staffRoleIds: '["role-1","role-existing"]',
          }),
          update: vi.fn().mockResolvedValue(undefined),
        };
        vi.mocked(getBotTicketConfigService).mockReturnValue(
          mockConfigService as never,
        );

        const interaction = createMockRoleSelectInteraction(
          "ticket:add-roles:cat-1",
        );

        await ticketRoleSelectHandler.execute(interaction as never);

        expect(mockConfigService.update).toHaveBeenCalledWith(
          "guild-1",
          "cat-1",
          {
            staffRoleIds: JSON.stringify(["role-1", "role-existing", "role-2"]),
          },
        );
      });
    });

    describe("REMOVE_ROLES", () => {
      it("最後のロールを削除しようとするとエラー", async () => {
        const mockConfigService = {
          findByGuildAndCategory: vi.fn().mockResolvedValue({
            guildId: "guild-1",
            categoryId: "cat-1",
            staffRoleIds: '["role-1"]',
          }),
          update: vi.fn(),
        };
        vi.mocked(getBotTicketConfigService).mockReturnValue(
          mockConfigService as never,
        );

        const interaction = createMockRoleSelectInteraction(
          "ticket:remove-roles:cat-1",
          {
            roles: new Map([["role-1", { id: "role-1" }]]),
          },
        );

        await ticketRoleSelectHandler.execute(interaction as never);

        expect(mockConfigService.update).not.toHaveBeenCalled();
        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
      });

      it("ロールが正常に削除される", async () => {
        const mockConfigService = {
          findByGuildAndCategory: vi.fn().mockResolvedValue({
            guildId: "guild-1",
            categoryId: "cat-1",
            staffRoleIds: '["role-1","role-2","role-3"]',
          }),
          update: vi.fn().mockResolvedValue(undefined),
        };
        vi.mocked(getBotTicketConfigService).mockReturnValue(
          mockConfigService as never,
        );

        const interaction = createMockRoleSelectInteraction(
          "ticket:remove-roles:cat-1",
          {
            roles: new Map([["role-1", { id: "role-1" }]]),
          },
        );

        await ticketRoleSelectHandler.execute(interaction as never);

        expect(mockConfigService.update).toHaveBeenCalledWith(
          "guild-1",
          "cat-1",
          { staffRoleIds: JSON.stringify(["role-2", "role-3"]) },
        );
        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
      });
    });
  });
});
