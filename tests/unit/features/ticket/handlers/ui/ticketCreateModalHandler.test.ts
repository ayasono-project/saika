import { ticketCreateModalHandler } from "@/features/ticket/handlers/ui/ticketCreateModalHandler";

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
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: vi.fn(() => ({ type: "success" })),
  createErrorEmbed: vi.fn(() => ({ type: "error" })),
  createWarningEmbed: vi.fn((_desc: string, _opts?: unknown) => ({
    type: "warning",
    addFields: vi.fn().mockReturnThis(),
  })),
  createInfoEmbed: vi.fn((_desc: string, _opts?: unknown) => ({
    type: "info",
    addFields: vi.fn().mockReturnThis(),
  })),
}));

const mockConfigService = {
  findByGuildAndCategory: vi.fn(),
  findAllByGuild: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteAllByGuild: vi.fn(),
  incrementCounter: vi.fn(),
};
const mockTicketRepository = {
  findById: vi.fn(),
  findByChannelId: vi.fn(),
  findOpenByUserAndCategory: vi.fn(),
  findOpenByCategory: vi.fn(),
  findAllByCategory: vi.fn(),
  findAllClosedByGuild: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteByCategory: vi.fn(),
  deleteAllByGuild: vi.fn(),
};
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotTicketSettingsService: () => mockConfigService,
  getBotTicketRepository: () => mockTicketRepository,
}));

vi.mock("@/features/ticket/services/ticketService", () => ({
  createTicketChannel: vi.fn(),
  closeTicket: vi.fn(),
  reopenTicket: vi.fn(),
  deleteTicket: vi.fn(),
}));

import { DiscordAPIError, MessageFlags, RESTJSONErrorCodes } from "discord.js";
import {
  createErrorEmbed,
  createWarningEmbed,
} from "@/bot/utils/messageResponse";
import { createTicketChannel } from "@/features/ticket/services/ticketService";
import { logger } from "@/shared/utils/logger";

function createMockModalInteraction(
  customId: string,
  fields: Record<string, string> = {},
  overrides = {},
) {
  return {
    customId,
    locale: "ja",
    guildId: "guild-1",
    guild: { id: "guild-1", channels: { fetch: vi.fn() } },
    channelId: "channel-1",
    channel: { send: vi.fn().mockResolvedValue({ id: "msg-1" }) },
    user: { id: "user-1" },
    fields: {
      getTextInputValue: vi.fn((fieldId: string) => fields[fieldId] ?? ""),
    },
    reply: vi.fn().mockResolvedValue(undefined),
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("bot/features/ticket/handlers/ui/ticketCreateModalHandler", () => {
  // 各テストで呼び出し記録を初期化し、既定ではパネルの設定があり上限未満（オープン中0件）にする
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigService.findByGuildAndCategory.mockResolvedValue({
      guildId: "guild-1",
      categoryId: "cat-1",
      maxTicketsPerUser: 1,
    });
    mockTicketRepository.findOpenByUserAndCategory.mockResolvedValue([]);
  });

  describe("matches", () => {
    it("ticket:create-modal: プレフィックスにマッチする", () => {
      expect(
        ticketCreateModalHandler.matches("ticket:create-modal:cat-1"),
      ).toBe(true);
    });

    it("無関係なcustomIdにはマッチしない", () => {
      expect(ticketCreateModalHandler.matches("ticket:setup-modal:abc")).toBe(
        false,
      );
      expect(ticketCreateModalHandler.matches("other:create-modal:abc")).toBe(
        false,
      );
    });
  });

  describe("execute", () => {
    it("guildがnullの場合は早期リターンする", async () => {
      const interaction = createMockModalInteraction(
        "ticket:create-modal:cat-1",
        {},
        { guild: null },
      );

      await ticketCreateModalHandler.execute(interaction as never);

      expect(createTicketChannel).not.toHaveBeenCalled();
      expect(interaction.deferReply).not.toHaveBeenCalled();
    });

    it("正常系: チケットチャンネルを作成し成功応答する", async () => {
      const mockChannel = { id: "new-channel-1" };
      vi.mocked(createTicketChannel).mockResolvedValue({
        ticket: { ticketNumber: 7 },
        channel: mockChannel,
      } as never);

      const interaction = createMockModalInteraction(
        "ticket:create-modal:cat-1",
        {
          "ticket:create-subject": "Test Subject",
          "ticket:create-detail": "Test Detail",
        },
      );

      await ticketCreateModalHandler.execute(interaction as never);

      expect(createTicketChannel).toHaveBeenCalledWith(
        interaction.guild,
        "cat-1",
        "user-1",
        "Test Subject",
        "Test Detail",
        mockConfigService,
        mockTicketRepository,
      );
      expect(interaction.deferReply).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
        }),
      );
      // 作成ログに作成者とチケット番号が埋め込まれること（{{userId}} 等のまま出ない）
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('"userId":"user-1","ticketNumber":"7"'),
      );
    });

    it("送信時に上限に達していれば（別のモーダルから先に作られた等）作成せず、上限を返信する", async () => {
      mockTicketRepository.findOpenByUserAndCategory.mockResolvedValue([
        { id: "t-already" },
      ]);
      const interaction = createMockModalInteraction(
        "ticket:create-modal:cat-1",
        {
          "ticket:create-subject": "Test Subject",
          "ticket:create-detail": "Test Detail",
        },
      );

      await ticketCreateModalHandler.execute(interaction as never);

      expect(
        mockTicketRepository.findOpenByUserAndCategory,
      ).toHaveBeenCalledWith("guild-1", "cat-1", "user-1");
      expect(createErrorEmbed).toHaveBeenCalledWith(
        "ticket:user-response.max_tickets_reached",
        expect.anything(),
      );
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ flags: MessageFlags.Ephemeral }),
      );
      expect(interaction.deferReply).not.toHaveBeenCalled();
      expect(createTicketChannel).not.toHaveBeenCalled();
    });

    it("モーダルを開いた後にパネルが消されていたら作成せず、パネルが見つからない旨を返信する", async () => {
      mockConfigService.findByGuildAndCategory.mockResolvedValue(null);
      const interaction = createMockModalInteraction(
        "ticket:create-modal:cat-1",
        {
          "ticket:create-subject": "Test Subject",
          "ticket:create-detail": "Test Detail",
        },
      );

      await ticketCreateModalHandler.execute(interaction as never);

      expect(createErrorEmbed).toHaveBeenCalledWith(
        "ticket:user-response.panel_not_found",
        expect.anything(),
      );
      expect(interaction.deferReply).not.toHaveBeenCalled();
      expect(createTicketChannel).not.toHaveBeenCalled();
    });

    it("MissingPermissionsエラー時は上位ハンドラへ伝播する", async () => {
      const apiError = new DiscordAPIError(
        {
          code: RESTJSONErrorCodes.MissingPermissions,
          message: "Missing Permissions",
        },
        RESTJSONErrorCodes.MissingPermissions,
        403,
        "POST",
        "/guilds/guild-1/channels",
        {},
      );
      vi.mocked(createTicketChannel).mockRejectedValue(apiError);

      const interaction = createMockModalInteraction(
        "ticket:create-modal:cat-1",
        {
          "ticket:create-subject": "Test Subject",
          "ticket:create-detail": "Test Detail",
        },
      );

      await expect(
        ticketCreateModalHandler.execute(interaction as never),
      ).rejects.toThrow(apiError);
    });

    it("その他のエラーも上位ハンドラへ伝播する", async () => {
      const otherError = new Error("Unknown error");
      vi.mocked(createTicketChannel).mockRejectedValue(otherError);

      const interaction = createMockModalInteraction(
        "ticket:create-modal:cat-1",
        {
          "ticket:create-subject": "Test Subject",
          "ticket:create-detail": "Test Detail",
        },
      );

      await expect(
        ticketCreateModalHandler.execute(interaction as never),
      ).rejects.toThrow("Unknown error");
    });
  });

  // 別の端末からほぼ同時に送信されたモーダルで、上限を超えて作らないこと（プロセス内の排他）を検証
  describe("execute（同時送信の排他）", () => {
    /** 作成モーダルの入力値 */
    const FIELDS = {
      "ticket:create-subject": "Test Subject",
      "ticket:create-detail": "Test Detail",
    };

    /**
     * 解決を外から遅らせられる createTicketChannel の結果を仕込む（1つ目の送信を作成中のまま止める）
     * @returns 作成を完了させる関数
     */
    function holdTicketCreation(): () => void {
      let finish: () => void = () => undefined;
      vi.mocked(createTicketChannel).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = () =>
              resolve({
                ticket: { ticketNumber: 1 },
                channel: { id: "new-channel-1" },
              } as never);
          }),
      );
      return () => finish();
    }

    // 排他で断られずに進んだ送信が、作成まで成功するようにする
    beforeEach(() => {
      vi.mocked(createTicketChannel).mockResolvedValue({
        ticket: { ticketNumber: 2 },
        channel: { id: "new-channel-2" },
      } as never);
    });

    it("同じユーザーが同じカテゴリのチケットを作成中に送信すると、作成中と本人にだけ返信し、上限の確認も作成もしない", async () => {
      const finish = holdTicketCreation();
      const first = createMockModalInteraction(
        "ticket:create-modal:cat-1",
        FIELDS,
      );
      const second = createMockModalInteraction(
        "ticket:create-modal:cat-1",
        FIELDS,
      );

      const firstRun = ticketCreateModalHandler.execute(first as never);
      await vi.waitFor(() => expect(createTicketChannel).toHaveBeenCalled());
      await ticketCreateModalHandler.execute(second as never);

      expect(createWarningEmbed).toHaveBeenCalledWith(
        "ticket:user-response.ticket_creation_in_progress",
        expect.objectContaining({ title: "common:title_already_running" }),
      );
      expect(second.reply).toHaveBeenCalledWith(
        expect.objectContaining({ flags: MessageFlags.Ephemeral }),
      );
      expect(second.deferReply).not.toHaveBeenCalled();
      expect(
        mockTicketRepository.findOpenByUserAndCategory,
      ).toHaveBeenCalledTimes(1);
      expect(createTicketChannel).toHaveBeenCalledTimes(1);

      finish();
      await firstRun;
      expect(first.editReply).toHaveBeenCalled();
    });

    it("作成が終わった後の送信は断らず、上限の確認から進む", async () => {
      const finish = holdTicketCreation();
      const firstRun = ticketCreateModalHandler.execute(
        createMockModalInteraction(
          "ticket:create-modal:cat-1",
          FIELDS,
        ) as never,
      );
      await vi.waitFor(() => expect(createTicketChannel).toHaveBeenCalled());
      finish();
      await firstRun;

      const next = createMockModalInteraction(
        "ticket:create-modal:cat-1",
        FIELDS,
      );
      await ticketCreateModalHandler.execute(next as never);

      expect(
        mockTicketRepository.findOpenByUserAndCategory,
      ).toHaveBeenCalledTimes(2);
      expect(createTicketChannel).toHaveBeenCalledTimes(2);
      expect(next.reply).not.toHaveBeenCalled();
    });

    it("作成に失敗しても排他を外し、次の送信は作成まで進む", async () => {
      vi.mocked(createTicketChannel).mockRejectedValueOnce(
        new Error("create failed"),
      );
      await expect(
        ticketCreateModalHandler.execute(
          createMockModalInteraction(
            "ticket:create-modal:cat-1",
            FIELDS,
          ) as never,
        ),
      ).rejects.toThrow("create failed");

      await ticketCreateModalHandler.execute(
        createMockModalInteraction(
          "ticket:create-modal:cat-1",
          FIELDS,
        ) as never,
      );

      expect(createTicketChannel).toHaveBeenCalledTimes(2);
      expect(createWarningEmbed).not.toHaveBeenCalled();
    });

    it("上限の確認で断ったときも排他を外し、次の送信は上限の確認から進む", async () => {
      mockTicketRepository.findOpenByUserAndCategory.mockResolvedValueOnce([
        { id: "t-already" },
      ]);
      await ticketCreateModalHandler.execute(
        createMockModalInteraction(
          "ticket:create-modal:cat-1",
          FIELDS,
        ) as never,
      );

      await ticketCreateModalHandler.execute(
        createMockModalInteraction(
          "ticket:create-modal:cat-1",
          FIELDS,
        ) as never,
      );

      expect(createTicketChannel).toHaveBeenCalledTimes(1);
      expect(createWarningEmbed).not.toHaveBeenCalled();
    });

    it("作成中でも、別のユーザーや別のカテゴリの送信は断らない", async () => {
      const finish = holdTicketCreation();
      const firstRun = ticketCreateModalHandler.execute(
        createMockModalInteraction(
          "ticket:create-modal:cat-1",
          FIELDS,
        ) as never,
      );
      await vi.waitFor(() => expect(createTicketChannel).toHaveBeenCalled());

      await ticketCreateModalHandler.execute(
        createMockModalInteraction("ticket:create-modal:cat-1", FIELDS, {
          user: { id: "user-2" },
        }) as never,
      );
      await ticketCreateModalHandler.execute(
        createMockModalInteraction(
          "ticket:create-modal:cat-2",
          FIELDS,
        ) as never,
      );

      expect(createTicketChannel).toHaveBeenCalledTimes(3);
      expect(createWarningEmbed).not.toHaveBeenCalled();

      finish();
      await firstRun;
    });
  });
});
