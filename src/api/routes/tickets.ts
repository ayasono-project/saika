// src/api/routes/tickets.ts
// チケットパネルのコレクション CRUD（/api/guilds/:guildId/tickets）。
// categoryId を識別キーに一覧/作成/更新/削除し、Discord パネルの投稿/編集/削除を伴う。

import type { TicketPanel as ContractTicket } from "@ayasono/shared/api";
import type { FastifyPluginAsync } from "fastify";
import {
  getBotTicketRepository,
  getBotTicketSettingsService,
} from "../../bot/services/botCompositionRoot";
import type { GuildTicketSettings } from "../../shared/database/types/ticketTypes";
import { tDefault } from "../../shared/locale/localeManager";
import {
  deleteTicketPanel,
  editTicketPanel,
  postTicketPanel,
  toContractTicket,
} from "../features/ticketResource";
import { ApiHttpError } from "../lib/httpError";
import { getGuildId } from "../lib/request";
import type { ApiServerDeps } from "../types";

/** ticketRoutes プラグインのオプション */
export interface TicketRoutesOptions {
  deps: ApiServerDeps;
}

/** カテゴリのオープン中チケット数を数える */
async function openCountOf(
  guildId: string,
  categoryId: string,
): Promise<number> {
  return (
    await getBotTicketRepository().findOpenByCategory(guildId, categoryId)
  ).length;
}

/**
 * チケットパネルのコレクション CRUD ルートプラグイン。
 * すべて authenticate + requireGuildAccess で保護される。
 */
export const ticketRoutes: FastifyPluginAsync<TicketRoutesOptions> = async (
  fastify,
  opts,
) => {
  const { deps } = opts;
  const guarded = {
    preHandler: [fastify.authenticate, fastify.requireGuildAccess],
  };

  // 一覧（各カテゴリのオープン件数つき）
  fastify.get("/:guildId/tickets", guarded, async (request) => {
    const guildId = getGuildId(request);
    const all = await getBotTicketSettingsService().findAllByGuild(guildId);
    const data = await Promise.all(
      all.map(async (s) =>
        toContractTicket(s, await openCountOf(guildId, s.categoryId)),
      ),
    );
    return { data };
  });

  // 作成（DB 作成 → Discord 投稿 → messageId 反映）。同一カテゴリ既存は 409。
  fastify.post("/:guildId/tickets", guarded, async (request) => {
    const guildId = getGuildId(request);
    const body = request.body as Omit<ContractTicket, "id" | "openCount">;
    if (!body?.categoryId) {
      throw ApiHttpError.validation(
        tDefault("system:web.category_id_required"),
      );
    }
    const service = getBotTicketSettingsService();
    if (await service.findByGuildAndCategory(guildId, body.categoryId)) {
      throw ApiHttpError.conflict(
        tDefault("system:web.ticket_category_exists"),
      );
    }
    const created = await service.create({
      guildId,
      categoryId: body.categoryId,
      enabled: true,
      staffRoleIds: body.staffRoleIds,
      panelChannelId: body.channelId ?? "",
      panelMessageId: "",
      panelTitle: body.title,
      panelDescription: body.description,
      panelColor: body.color,
      autoDeleteDays: body.autoDeleteDays,
      maxTicketsPerUser: body.maxTicketsPerUser,
      ticketCounter: 0,
    });
    const messageId = await postTicketPanel(deps.client, guildId, created);
    const saved = messageId
      ? await service.update(guildId, body.categoryId, {
          panelMessageId: messageId,
        })
      : created;
    return { data: toContractTicket(saved, 0) };
  });

  // 更新（部分）→ Discord メッセージを再構築して編集
  fastify.patch("/:guildId/tickets/:id", guarded, async (request) => {
    const guildId = getGuildId(request);
    const { id: categoryId } = request.params as { id: string };
    const body = request.body as Partial<ContractTicket>;
    const service = getBotTicketSettingsService();
    const existing = await service.findByGuildAndCategory(guildId, categoryId);
    if (!existing) {
      throw ApiHttpError.notFound(
        tDefault("system:web.ticket_panel_not_found"),
      );
    }
    const patch: Partial<GuildTicketSettings> = {};
    if (body.channelId !== undefined)
      patch.panelChannelId = body.channelId ?? "";
    if (body.staffRoleIds !== undefined) patch.staffRoleIds = body.staffRoleIds;
    if (body.title !== undefined) patch.panelTitle = body.title;
    if (body.description !== undefined)
      patch.panelDescription = body.description;
    if (body.color !== undefined) patch.panelColor = body.color;
    if (body.autoDeleteDays !== undefined)
      patch.autoDeleteDays = body.autoDeleteDays;
    if (body.maxTicketsPerUser !== undefined)
      patch.maxTicketsPerUser = body.maxTicketsPerUser;
    const saved = await service.update(guildId, categoryId, patch);
    await editTicketPanel(deps.client, guildId, saved);
    return {
      data: toContractTicket(saved, await openCountOf(guildId, categoryId)),
    };
  });

  // 削除（Discord メッセージも best-effort で除去）
  fastify.delete("/:guildId/tickets/:id", guarded, async (request) => {
    const guildId = getGuildId(request);
    const { id: categoryId } = request.params as { id: string };
    const service = getBotTicketSettingsService();
    const existing = await service.findByGuildAndCategory(guildId, categoryId);
    if (existing) {
      // DB を先に削除（メッセージ削除を先にすると bot 側の掃除と競合しうるため）
      await service.delete(guildId, categoryId);
      await deleteTicketPanel(deps.client, existing);
    }
    return { data: { id: categoryId } };
  });
};
