// src/api/routes/sticky.ts
// メッセージ固定（sticky）のコレクション CRUD（/api/guilds/:guildId/sticky）。
// channelId をキーに一覧/作成・上書き/更新/削除し、保存後に Discord へ反映する。

import type { StickyMessage as ContractSticky } from "@ayasono/shared/api";
import type { FastifyPluginAsync } from "fastify";
import { getBotStickyMessageSettingsService } from "../../bot/services/botCompositionRoot";
import { tDefault } from "../../shared/locale/localeManager";
import {
  applyStickyToChannel,
  removeStickyMessage,
  toContractSticky,
  toStickyEmbedData,
} from "../features/stickyResource";
import { ApiHttpError } from "../lib/httpError";
import { getGuildId } from "../lib/request";
import type { ApiServerDeps } from "../types";

/** stickyRoutes プラグインのオプション */
export interface StickyRoutesOptions {
  deps: ApiServerDeps;
}

/**
 * sticky のコレクション CRUD ルートプラグイン（/api/guilds 配下に同居）。
 * すべて authenticate + requireGuildAccess で保護される。
 */
export const stickyRoutes: FastifyPluginAsync<StickyRoutesOptions> = async (
  fastify,
  opts,
) => {
  const { deps } = opts;
  const guarded = {
    preHandler: [fastify.authenticate, fastify.requireGuildAccess],
  };

  // 一覧
  fastify.get("/:guildId/sticky", guarded, async (request) => {
    const guildId = getGuildId(request);
    const all =
      await getBotStickyMessageSettingsService().findAllByGuild(guildId);
    return { data: all.map(toContractSticky) };
  });

  // 作成・上書き（channelId キーの upsert）。保存後に Discord へ投稿する。
  fastify.post("/:guildId/sticky", guarded, async (request) => {
    const guildId = getGuildId(request);
    const body = request.body as ContractSticky;
    if (!body?.channelId) {
      throw ApiHttpError.validation(tDefault("system:web.channel_id_required"));
    }
    const service = getBotStickyMessageSettingsService();
    const embedData = toStickyEmbedData(body.embed ?? null);
    const existing = await service.findByChannel(body.channelId);
    const saved =
      existing && existing.guildId === guildId
        ? await service.updateContent(
            existing.id,
            body.content,
            embedData ?? null,
          )
        : await service.create(
            guildId,
            body.channelId,
            body.content,
            embedData,
          );
    await applyStickyToChannel(deps.client, saved);
    return { data: toContractSticky(saved) };
  });

  // 部分更新（content / embed）。保存後に Discord へ再投稿する。
  fastify.patch("/:guildId/sticky/:channelId", guarded, async (request) => {
    const guildId = getGuildId(request);
    const { channelId } = request.params as { channelId: string };
    const body = request.body as Partial<ContractSticky>;
    const service = getBotStickyMessageSettingsService();
    const existing = await service.findByChannel(channelId);
    if (!existing || existing.guildId !== guildId) {
      throw ApiHttpError.notFound(tDefault("system:web.sticky_not_found"));
    }
    const content = body.content ?? existing.content;
    const embedData =
      body.embed !== undefined
        ? toStickyEmbedData(body.embed)
        : existing.embedData;
    const saved = await service.updateContent(
      existing.id,
      content,
      embedData ?? null,
    );
    await applyStickyToChannel(deps.client, saved);
    return { data: toContractSticky(saved) };
  });

  // 削除（Discord の旧メッセージも best-effort で除去）
  fastify.delete("/:guildId/sticky/:channelId", guarded, async (request) => {
    const guildId = getGuildId(request);
    const { channelId } = request.params as { channelId: string };
    const service = getBotStickyMessageSettingsService();
    const existing = await service.findByChannel(channelId);
    if (existing && existing.guildId === guildId) {
      await removeStickyMessage(deps.client, existing);
      await service.delete(existing.id);
    }
    return { data: { channelId } };
  });
};
