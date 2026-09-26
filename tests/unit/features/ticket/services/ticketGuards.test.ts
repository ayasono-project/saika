// チケット操作の前提確認（設定が無い・作成上限）のテスト

vi.mock("@/shared/locale/localeManager", () => ({
  tInteraction: (
    _locale: string,
    key: string,
    params?: Record<string, unknown>,
  ) => (params ? `${key}:${JSON.stringify(params)}` : key),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createErrorEmbed: vi.fn((description: string) => ({
    type: "error",
    description,
  })),
}));

import { MessageFlags } from "discord.js";
import {
  findCreatableTicketConfigOrReply,
  findTicketConfigOrReply,
} from "@/features/ticket/services/ticketGuards";
import { ticket as enTicket } from "@/shared/locale/locales/en/features/ticket";
import { ticket as jaTicket } from "@/shared/locale/locales/ja/features/ticket";

/** カテゴリの設定 */
const CONFIG = {
  guildId: "guild-1",
  categoryId: "cat-1",
  staffRoleIds: ["role-staff"],
  maxTicketsPerUser: 2,
};

/** 操作対象のチケット */
const TICKET = {
  id: "t-1",
  guildId: "guild-1",
  categoryId: "cat-1",
  channelId: "ch-1",
  userId: "user-1",
  status: "open",
};

/**
 * 返信を記録するインタラクションのモックを作る
 * @returns インタラクションのモック
 */
function createInteraction() {
  return {
    locale: "ja",
    user: { id: "user-1" },
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * findByGuildAndCategory が config を返す設定サービスのモックを作る
 * @param config 返す設定
 * @returns 設定サービスのモック
 */
function createSettingsService(config: unknown) {
  return { findByGuildAndCategory: vi.fn().mockResolvedValue(config) };
}

// 設定が無いチケットを操作させないこと・作成時の上限の確認を検証
describe("features/ticket/services/ticketGuards", () => {
  // 各テストでモックの呼び出し記録を初期化する
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findTicketConfigOrReply", () => {
    it("設定があれば返信せずに設定を返す", async () => {
      const interaction = createInteraction();
      const settingsService = createSettingsService(CONFIG);

      const result = await findTicketConfigOrReply(
        interaction as never,
        TICKET as never,
        settingsService as never,
      );

      expect(result).toBe(CONFIG);
      expect(settingsService.findByGuildAndCategory).toHaveBeenCalledWith(
        "guild-1",
        "cat-1",
      );
      expect(interaction.reply).not.toHaveBeenCalled();
    });

    it("設定が無い（パネルが削除された）ときは、操作できない理由と出口を本人にだけ返信して null を返す", async () => {
      const interaction = createInteraction();

      const result = await findTicketConfigOrReply(
        interaction as never,
        TICKET as never,
        createSettingsService(null) as never,
      );

      expect(result).toBeNull();
      expect(interaction.reply).toHaveBeenCalledWith({
        embeds: [
          {
            type: "error",
            description: "ticket:user-response.ticket_config_missing",
          },
        ],
        flags: MessageFlags.Ephemeral,
      });
    });

    it("返信の文面（ja/en）は、設置し直すとクローズから自動削除の日数を過ぎたチケットが削除されることを伝え、自動削除が止まっているとは言わない（止まっている間もクローズからの経過は数えるため）", () => {
      const ja = jaTicket["user-response.ticket_config_missing"];
      const en = enTicket["user-response.ticket_config_missing"];

      expect(ja).toContain(
        "クローズしてから自動削除の日数を過ぎているチケットは、設置し直した時点で削除されます",
      );
      expect(ja).not.toContain("止まっています");
      expect(en).toContain("are deleted as soon as the panel is set up again");
      expect(en).not.toContain("paused");
    });
  });

  describe("findCreatableTicketConfigOrReply", () => {
    it("パネルの設定が無ければ panel_not_found を返信して null を返し、上限は数えない", async () => {
      const interaction = createInteraction();
      const ticketRepository = { findOpenByUserAndCategory: vi.fn() };

      const result = await findCreatableTicketConfigOrReply(
        interaction as never,
        "guild-1",
        "cat-1",
        createSettingsService(null) as never,
        ticketRepository as never,
      );

      expect(result).toBeNull();
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [
            {
              type: "error",
              description: "ticket:user-response.panel_not_found",
            },
          ],
        }),
      );
      expect(ticketRepository.findOpenByUserAndCategory).not.toHaveBeenCalled();
    });

    it("操作者のオープン中のチケットが上限に達していれば、上限の値を埋めて返信し null を返す", async () => {
      const interaction = createInteraction();
      const ticketRepository = {
        findOpenByUserAndCategory: vi.fn().mockResolvedValue([{}, {}]),
      };

      const result = await findCreatableTicketConfigOrReply(
        interaction as never,
        "guild-1",
        "cat-1",
        createSettingsService(CONFIG) as never,
        ticketRepository as never,
      );

      expect(result).toBeNull();
      expect(ticketRepository.findOpenByUserAndCategory).toHaveBeenCalledWith(
        "guild-1",
        "cat-1",
        "user-1",
      );
      expect(interaction.reply).toHaveBeenCalledWith({
        embeds: [
          {
            type: "error",
            description: 'ticket:user-response.max_tickets_reached:{"max":2}',
          },
        ],
        flags: MessageFlags.Ephemeral,
      });
    });

    it("上限未満なら返信せずに設定を返す", async () => {
      const interaction = createInteraction();
      const ticketRepository = {
        findOpenByUserAndCategory: vi.fn().mockResolvedValue([{}]),
      };

      const result = await findCreatableTicketConfigOrReply(
        interaction as never,
        "guild-1",
        "cat-1",
        createSettingsService(CONFIG) as never,
        ticketRepository as never,
      );

      expect(result).toBe(CONFIG);
      expect(interaction.reply).not.toHaveBeenCalled();
    });
  });
});
