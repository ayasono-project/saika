// tests/integration/bot/features/ticket/ticketLifecycle.integration.test.ts
/**
 * Ticket Lifecycle Integration Test
 * setup config -> create ticket -> close ticket -> reopen ticket -> delete ticket
 * の一連のフローを統合テストで検証する
 */

import type { Ticket } from "@/shared/database/types";

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

const scheduleTicketAutoDeleteMock = vi.fn();
const cancelTicketAutoDeleteMock = vi.fn();

vi.mock("@/bot/features/ticket/services/ticketAutoDeleteService", () => ({
  scheduleTicketAutoDelete: (...args: unknown[]) =>
    scheduleTicketAutoDeleteMock(...args),
  cancelTicketAutoDelete: (...args: unknown[]) =>
    cancelTicketAutoDeleteMock(...args),
}));

import {
  closeTicket,
  createTicketChannel,
  deleteTicket,
  reopenTicket,
} from "@/bot/features/ticket/services/ticketService";
import type {
  GuildTicketConfig,
  IGuildTicketConfigRepository,
  ITicketRepository,
} from "@/shared/database/types";
import { TicketConfigService } from "@/shared/features/ticket/ticketConfigService";

function createInMemoryTicketConfigRepository(): IGuildTicketConfigRepository {
  const configs = new Map<string, GuildTicketConfig>();

  function makeKey(guildId: string, categoryId: string) {
    return `${guildId}:${categoryId}`;
  }

  return {
    findByGuildAndCategory: vi.fn(async (guildId, categoryId) => {
      return configs.get(makeKey(guildId, categoryId)) ?? null;
    }),
    findAllByGuild: vi.fn(async (guildId) => {
      const results: GuildTicketConfig[] = [];
      for (const config of configs.values()) {
        if (config.guildId === guildId) results.push(config);
      }
      return results;
    }),
    create: vi.fn(async (config) => {
      configs.set(makeKey(config.guildId, config.categoryId), config);
      return config;
    }),
    update: vi.fn(async (guildId, categoryId, data) => {
      const key = makeKey(guildId, categoryId);
      const existing = configs.get(key);
      if (!existing) throw new Error("Config not found");
      const updated = { ...existing, ...data };
      configs.set(key, updated);
      return updated;
    }),
    delete: vi.fn(async (guildId, categoryId) => {
      configs.delete(makeKey(guildId, categoryId));
    }),
    deleteAllByGuild: vi.fn(async (guildId) => {
      let count = 0;
      for (const [key, config] of configs.entries()) {
        if (config.guildId === guildId) {
          configs.delete(key);
          count++;
        }
      }
      return count;
    }),
    incrementCounter: vi.fn(async (guildId, categoryId) => {
      const key = makeKey(guildId, categoryId);
      const existing = configs.get(key);
      if (!existing) throw new Error("Config not found");
      existing.ticketCounter += 1;
      configs.set(key, existing);
      return existing.ticketCounter;
    }),
  };
}

function createInMemoryTicketRepository(): ITicketRepository {
  const tickets = new Map<string, Ticket>();
  let idCounter = 0;

  return {
    findById: vi.fn(async (id) => tickets.get(id) ?? null),
    findByChannelId: vi.fn(async (channelId) => {
      for (const ticket of tickets.values()) {
        if (ticket.channelId === channelId) return ticket;
      }
      return null;
    }),
    findOpenByUserAndCategory: vi.fn(async (guildId, categoryId, userId) => {
      const results: Ticket[] = [];
      for (const ticket of tickets.values()) {
        if (
          ticket.guildId === guildId &&
          ticket.categoryId === categoryId &&
          ticket.userId === userId &&
          ticket.status === "open"
        ) {
          results.push(ticket);
        }
      }
      return results;
    }),
    findAllByCategory: vi.fn(async (guildId, categoryId) => {
      const results: Ticket[] = [];
      for (const ticket of tickets.values()) {
        if (ticket.guildId === guildId && ticket.categoryId === categoryId) {
          results.push(ticket);
        }
      }
      return results;
    }),
    findOpenByCategory: vi.fn(async (guildId, categoryId) => {
      const results: Ticket[] = [];
      for (const ticket of tickets.values()) {
        if (
          ticket.guildId === guildId &&
          ticket.categoryId === categoryId &&
          ticket.status === "open"
        ) {
          results.push(ticket);
        }
      }
      return results;
    }),
    findAllClosedByGuild: vi.fn(async (guildId) => {
      const results: Ticket[] = [];
      for (const ticket of tickets.values()) {
        if (ticket.guildId === guildId && ticket.status === "closed") {
          results.push(ticket);
        }
      }
      return results;
    }),
    create: vi.fn(async (data) => {
      idCounter++;
      const ticket: Ticket = {
        id: `ticket-${idCounter}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Ticket;
      tickets.set(ticket.id, ticket);
      return ticket;
    }),
    update: vi.fn(async (id, data) => {
      const existing = tickets.get(id);
      if (!existing) throw new Error("Ticket not found");
      const updated = { ...existing, ...data, updatedAt: new Date() };
      tickets.set(id, updated);
      return updated;
    }),
    delete: vi.fn(async (id) => {
      tickets.delete(id);
    }),
    deleteByCategory: vi.fn(async (guildId, categoryId) => {
      let count = 0;
      for (const [key, ticket] of tickets.entries()) {
        if (ticket.guildId === guildId && ticket.categoryId === categoryId) {
          tickets.delete(key);
          count++;
        }
      }
      return count;
    }),
    deleteAllByGuild: vi.fn(async (guildId) => {
      let count = 0;
      for (const [key, ticket] of tickets.entries()) {
        if (ticket.guildId === guildId) {
          tickets.delete(key);
          count++;
        }
      }
      return count;
    }),
  };
}

function createMockGuild() {
  const mockChannel = {
    id: "ticket-channel-1",
    send: vi.fn().mockResolvedValue(undefined),
    permissionOverwrites: {
      edit: vi.fn().mockResolvedValue(undefined),
    },
    messages: {
      fetch: vi.fn().mockResolvedValue(new Map()),
    },
    delete: vi.fn().mockResolvedValue(undefined),
  };
  return {
    id: "guild-1",
    roles: { everyone: { id: "guild-1" } },
    client: { user: { id: "bot-user-1" } },
    channels: {
      create: vi.fn().mockResolvedValue(mockChannel),
      fetch: vi.fn().mockResolvedValue(mockChannel),
    },
    _mockChannel: mockChannel,
  };
}

describe("ticket lifecycle integration", () => {
  let configService: TicketConfigService;
  let ticketRepository: ITicketRepository;
  let guild: ReturnType<typeof createMockGuild>;

  beforeEach(() => {
    vi.clearAllMocks();

    const configRepo = createInMemoryTicketConfigRepository();
    configService = new TicketConfigService(configRepo);
    ticketRepository = createInMemoryTicketRepository();
    guild = createMockGuild();
  });

  it("setup config -> create ticket -> close -> reopen -> delete の一連のフローが正しく動作する", async () => {
    // 1. 設定を作成
    await configService.create({
      guildId: "guild-1",
      categoryId: "cat-1",
      enabled: true,
      staffRoleIds: JSON.stringify(["role-staff-1"]),
      panelChannelId: "panel-channel-1",
      panelMessageId: "panel-message-1",
      panelTitle: "Support",
      panelDescription: "Click to create a ticket",
      panelColor: "#00A8F3",
      autoDeleteDays: 7,
      maxTicketsPerUser: 3,
      ticketCounter: 0,
    });

    const config = await configService.findByGuildAndCategory(
      "guild-1",
      "cat-1",
    );
    expect(config).not.toBeNull();
    expect(config?.ticketCounter).toBe(0);

    // 2. チケットチャンネルを作成
    const { ticket, channel } = await createTicketChannel(
      guild as never,
      "cat-1",
      "user-1",
      "テストチケット",
      "テストの詳細説明",
      configService as never,
      ticketRepository as never,
    );

    expect(ticket).toBeDefined();
    expect(ticket.status).toBe("open");
    expect(ticket.ticketNumber).toBe(1);
    expect(channel).toBeDefined();
    expect(guild.channels.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "ticket-1",
        parent: "cat-1",
      }),
    );
    expect(guild._mockChannel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        components: expect.any(Array),
      }),
    );

    // カウンターがインクリメントされたことを確認
    const updatedConfig = await configService.findByGuildAndCategory(
      "guild-1",
      "cat-1",
    );
    expect(updatedConfig?.ticketCounter).toBe(1);

    // 3. チケットをクローズ
    await closeTicket(
      ticket,
      guild as never,
      configService as never,
      ticketRepository as never,
    );

    // ステータスが closed に更新されていることを確認
    const closedTicket = await ticketRepository.findById(ticket.id);
    expect(closedTicket?.status).toBe("closed");
    expect(closedTicket?.closedAt).toBeInstanceOf(Date);

    // 自動削除がスケジュールされたことを確認
    expect(scheduleTicketAutoDeleteMock).toHaveBeenCalledWith(
      ticket.id,
      ticket.channelId,
      ticket.guildId,
      expect.any(Number),
      guild.client,
    );

    // 権限が変更されたことを確認
    expect(guild._mockChannel.permissionOverwrites.edit).toHaveBeenCalledWith(
      "user-1",
      { SendMessages: false },
    );
    expect(guild._mockChannel.permissionOverwrites.edit).toHaveBeenCalledWith(
      "role-staff-1",
      { SendMessages: false },
    );

    // クローズ通知が送信されたことを確認
    expect(guild._mockChannel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        components: expect.any(Array),
      }),
    );

    // 4. チケットを再オープン
    vi.clearAllMocks();
    const ticketBeforeReopen = await ticketRepository.findById(ticket.id);
    await reopenTicket(
      ticketBeforeReopen as never,
      guild as never,
      configService as never,
      ticketRepository as never,
    );

    // 自動削除がキャンセルされたことを確認
    expect(cancelTicketAutoDeleteMock).toHaveBeenCalledWith(
      ticket.id,
      ticket.guildId,
    );

    // ステータスが open に戻っていることを確認
    const reopenedTicket = await ticketRepository.findById(ticket.id);
    expect(reopenedTicket?.status).toBe("open");
    expect(reopenedTicket?.closedAt).toBeNull();

    // 経過時間が保存されていることを確認
    expect(reopenedTicket?.elapsedDeleteMs).toBeGreaterThanOrEqual(0);

    // 権限が復元されたことを確認
    expect(guild._mockChannel.permissionOverwrites.edit).toHaveBeenCalledWith(
      "user-1",
      { SendMessages: true },
    );
    expect(guild._mockChannel.permissionOverwrites.edit).toHaveBeenCalledWith(
      "role-staff-1",
      { SendMessages: true },
    );

    // 再オープン通知が送信されたことを確認
    expect(guild._mockChannel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
      }),
    );

    // 5. チケットを削除
    vi.clearAllMocks();
    const ticketBeforeDelete = await ticketRepository.findById(ticket.id);
    await deleteTicket(
      ticketBeforeDelete as never,
      guild as never,
      ticketRepository as never,
    );

    // 自動削除タイマーがキャンセルされたことを確認
    expect(cancelTicketAutoDeleteMock).toHaveBeenCalledWith(
      ticket.id,
      ticket.guildId,
    );

    // DB からチケットが削除されたことを確認
    const deletedTicket = await ticketRepository.findById(ticket.id);
    expect(deletedTicket).toBeNull();

    // チャンネルが削除されたことを確認
    expect(guild.channels.fetch).toHaveBeenCalledWith(ticket.channelId);
    expect(guild._mockChannel.delete).toHaveBeenCalled();
  });
});
