// tests/unit/bot/features/ticket/commands/usecases/ticketOpen.test.ts

import { MessageFlags } from "discord.js";

const findByChannelIdMock = vi.fn();
const findByGuildAndCategoryMock = vi.fn();
const reopenTicketMock = vi.fn();
const hasTicketPermissionMock = vi.fn();

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotTicketConfigService: vi.fn(() => ({
    findByGuildAndCategory: findByGuildAndCategoryMock,
  })),
  getBotTicketRepository: vi.fn(() => ({
    findByChannelId: findByChannelIdMock,
  })),
}));

vi.mock("@/bot/features/ticket/services/ticketService", () => ({
  reopenTicket: (...args: unknown[]) => reopenTicketMock(...args),
  hasTicketPermission: (...args: unknown[]) => hasTicketPermissionMock(...args),
}));

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
  tInteraction: (_locale: string, key: string) => key,
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createErrorEmbed: vi.fn((msg: string) => ({
    type: "error",
    description: msg,
  })),
  createSuccessEmbed: vi.fn((msg: string) => ({
    type: "success",
    description: msg,
  })),
}));

function createInteractionMock(overrides = {}) {
  return {
    channelId: "channel-1",
    locale: "ja",
    guild: { id: "guild-1" },
    user: { id: "user-1" },
    member: {
      roles: { cache: new Map([["role-1", {}]]) },
    },
    reply: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("bot/features/ticket/commands/usecases/ticketOpen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("チケットが見つからない場合はエラー応答", async () => {
    const { handleTicketOpen } = await import(
      "@/bot/features/ticket/commands/usecases/ticketOpen"
    );

    findByChannelIdMock.mockResolvedValue(null);
    const interaction = createInteractionMock();

    await handleTicketOpen(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
    expect(reopenTicketMock).not.toHaveBeenCalled();
  });

  it("既にオープン済みの場合はエラー応答", async () => {
    const { handleTicketOpen } = await import(
      "@/bot/features/ticket/commands/usecases/ticketOpen"
    );

    findByChannelIdMock.mockResolvedValue({
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "category-1",
      channelId: "channel-1",
      status: "open",
    });
    const interaction = createInteractionMock();

    await handleTicketOpen(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
    expect(reopenTicketMock).not.toHaveBeenCalled();
  });

  it("権限がない場合はエラー応答", async () => {
    const { handleTicketOpen } = await import(
      "@/bot/features/ticket/commands/usecases/ticketOpen"
    );

    findByChannelIdMock.mockResolvedValue({
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "category-1",
      channelId: "channel-1",
      status: "closed",
    });
    findByGuildAndCategoryMock.mockResolvedValue({
      staffRoleIds: '["staff-role-1"]',
    });
    hasTicketPermissionMock.mockReturnValue(false);
    const interaction = createInteractionMock();

    await handleTicketOpen(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
    expect(reopenTicketMock).not.toHaveBeenCalled();
  });

  it("正常に再オープンできた場合は reopenTicket が呼ばれ成功応答", async () => {
    const { handleTicketOpen } = await import(
      "@/bot/features/ticket/commands/usecases/ticketOpen"
    );

    const ticket = {
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "category-1",
      channelId: "channel-1",
      status: "closed",
    };
    findByChannelIdMock.mockResolvedValue(ticket);
    findByGuildAndCategoryMock.mockResolvedValue({
      staffRoleIds: '["staff-role-1"]',
    });
    hasTicketPermissionMock.mockReturnValue(true);
    reopenTicketMock.mockResolvedValue(undefined);
    const interaction = createInteractionMock();

    await handleTicketOpen(interaction as never);

    expect(reopenTicketMock).toHaveBeenCalledWith(
      ticket,
      interaction.guild,
      expect.anything(),
      expect.anything(),
    );
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
  });
});
