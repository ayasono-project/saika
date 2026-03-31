// tests/unit/bot/features/ticket/commands/usecases/ticketClose.test.ts

import { MessageFlags } from "discord.js";

const findByChannelIdMock = vi.fn();
const findByGuildAndCategoryMock = vi.fn();
const closeTicketMock = vi.fn();
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
  closeTicket: (...args: unknown[]) => closeTicketMock(...args),
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

describe("bot/features/ticket/commands/usecases/ticketClose", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("チケットが見つからない場合はエラー応答", async () => {
    const { handleTicketClose } = await import(
      "@/bot/features/ticket/commands/usecases/ticketClose"
    );

    findByChannelIdMock.mockResolvedValue(null);
    const interaction = createInteractionMock();

    await handleTicketClose(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
    expect(closeTicketMock).not.toHaveBeenCalled();
  });

  it("既にクローズ済みの場合はエラー応答", async () => {
    const { handleTicketClose } = await import(
      "@/bot/features/ticket/commands/usecases/ticketClose"
    );

    findByChannelIdMock.mockResolvedValue({
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "category-1",
      channelId: "channel-1",
      status: "closed",
    });
    const interaction = createInteractionMock();

    await handleTicketClose(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
    expect(closeTicketMock).not.toHaveBeenCalled();
  });

  it("設定が見つからない場合はエラー応答", async () => {
    const { handleTicketClose } = await import(
      "@/bot/features/ticket/commands/usecases/ticketClose"
    );

    findByChannelIdMock.mockResolvedValue({
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "category-1",
      channelId: "channel-1",
      status: "open",
    });
    findByGuildAndCategoryMock.mockResolvedValue(null);
    hasTicketPermissionMock.mockReturnValue(false);
    const interaction = createInteractionMock();

    await handleTicketClose(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
    expect(closeTicketMock).not.toHaveBeenCalled();
  });

  it("権限がない場合はエラー応答", async () => {
    const { handleTicketClose } = await import(
      "@/bot/features/ticket/commands/usecases/ticketClose"
    );

    findByChannelIdMock.mockResolvedValue({
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "category-1",
      channelId: "channel-1",
      status: "open",
    });
    findByGuildAndCategoryMock.mockResolvedValue({
      staffRoleIds: '["staff-role-1"]',
    });
    hasTicketPermissionMock.mockReturnValue(false);
    const interaction = createInteractionMock();

    await handleTicketClose(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
    expect(closeTicketMock).not.toHaveBeenCalled();
  });

  it("正常にクローズできた場合は closeTicket が呼ばれ成功応答", async () => {
    const { handleTicketClose } = await import(
      "@/bot/features/ticket/commands/usecases/ticketClose"
    );

    const ticket = {
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "category-1",
      channelId: "channel-1",
      status: "open",
    };
    findByChannelIdMock.mockResolvedValue(ticket);
    findByGuildAndCategoryMock.mockResolvedValue({
      staffRoleIds: '["staff-role-1"]',
    });
    hasTicketPermissionMock.mockReturnValue(true);
    closeTicketMock.mockResolvedValue(undefined);
    const interaction = createInteractionMock();

    await handleTicketClose(interaction as never);

    expect(closeTicketMock).toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
  });

  it("closeTicket のパラメータが正しいこと", async () => {
    const { handleTicketClose } = await import(
      "@/bot/features/ticket/commands/usecases/ticketClose"
    );

    const ticket = {
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "category-1",
      channelId: "channel-1",
      status: "open",
    };
    findByChannelIdMock.mockResolvedValue(ticket);
    findByGuildAndCategoryMock.mockResolvedValue({
      staffRoleIds: '["staff-role-1"]',
    });
    hasTicketPermissionMock.mockReturnValue(true);
    closeTicketMock.mockResolvedValue(undefined);
    const interaction = createInteractionMock();

    await handleTicketClose(interaction as never);

    expect(closeTicketMock).toHaveBeenCalledWith(
      ticket,
      interaction.guild,
      expect.anything(),
      expect.anything(),
    );
  });
});
