// src/api/routes/reactionRoles.ts
// リアクションロールパネルのコレクション CRUD（/api/guilds/:guildId/reaction-roles）。
// 作成時に Discord へパネルを投稿し、更新時はメッセージ編集、削除時はメッセージ除去する。

import type { ReactionRolePanel as ContractPanel } from "@ayasono/shared/api";
import type { FastifyPluginAsync } from "fastify";
import { getBotReactionRolePanelSettingsService } from "../../bot/services/botCompositionRoot";
import type { GuildReactionRolePanel } from "../../shared/database/types/reactionRoleTypes";
import { tDefault } from "../../shared/locale/localeManager";
import {
  deletePanelMessage,
  postPanelMessage,
  toContractPanel,
  toDomainButtons,
} from "../features/reactionRoleResource";
import { ApiHttpError } from "../lib/httpError";
import { getGuildId } from "../lib/request";
import type { ApiServerDeps } from "../types";

/** reactionRoleRoutes プラグインのオプション */
export interface ReactionRoleRoutesOptions {
  deps: ApiServerDeps;
}

/**
 * リアクションロールパネルのコレクション CRUD ルートプラグイン。
 * すべて authenticate + requireGuildAccess で保護される。
 */
export const reactionRoleRoutes: FastifyPluginAsync<
  ReactionRoleRoutesOptions
> = async (fastify, opts) => {
  const { deps } = opts;
  const guarded = {
    preHandler: [fastify.authenticate, fastify.requireGuildAccess],
  };

  // 一覧
  fastify.get("/:guildId/reaction-roles", guarded, async (request) => {
    const guildId = getGuildId(request);
    const all =
      await getBotReactionRolePanelSettingsService().findAllByGuild(guildId);
    return { data: all.map(toContractPanel) };
  });

  // 作成（DB 作成 → Discord 投稿 → messageId 反映）
  fastify.post("/:guildId/reaction-roles", guarded, async (request) => {
    const guildId = getGuildId(request);
    const body = request.body as Omit<ContractPanel, "id">;
    if (!body?.channelId) {
      throw ApiHttpError.validation(tDefault("system:web.channel_id_required"));
    }
    const service = getBotReactionRolePanelSettingsService();
    const created = await service.create({
      guildId,
      channelId: body.channelId,
      messageId: "",
      mode: body.mode,
      title: body.title,
      description: body.description,
      color: body.color,
      buttons: toDomainButtons(body.buttons),
      buttonCounter: body.buttons.length,
    });
    const messageId = await postPanelMessage(deps.client, created);
    const saved = messageId
      ? await service.update(created.id, { messageId })
      : created;
    return { data: toContractPanel(saved) };
  });

  // 更新（部分）→ Discord メッセージを再構築して編集
  fastify.patch("/:guildId/reaction-roles/:id", guarded, async (request) => {
    const guildId = getGuildId(request);
    const { id } = request.params as { id: string };
    const body = request.body as Partial<ContractPanel>;
    const service = getBotReactionRolePanelSettingsService();
    const existing = await service.findById(id);
    if (!existing || existing.guildId !== guildId) {
      throw ApiHttpError.notFound(
        tDefault("system:web.reaction_role_not_found"),
      );
    }
    const patch: Partial<GuildReactionRolePanel> = {};
    if (body.channelId !== undefined) patch.channelId = body.channelId ?? "";
    if (body.mode !== undefined) patch.mode = body.mode;
    if (body.title !== undefined) patch.title = body.title;
    if (body.description !== undefined) patch.description = body.description;
    if (body.color !== undefined) patch.color = body.color;
    if (body.buttons !== undefined) {
      patch.buttons = toDomainButtons(body.buttons);
      patch.buttonCounter = body.buttons.length;
    }
    const saved = await service.update(id, patch);
    if (saved.messageId) {
      const { updatePanelMessage } = await import(
        "../../features/reaction-role/services/reactionRolePanelBuilder"
      );
      await updatePanelMessage(
        deps.client,
        saved.channelId,
        saved.messageId,
        saved.id,
        saved.title,
        saved.description,
        saved.color,
        saved.buttons,
      );
    }
    return { data: toContractPanel(saved) };
  });

  // 削除（Discord メッセージも best-effort で除去）
  fastify.delete("/:guildId/reaction-roles/:id", guarded, async (request) => {
    const guildId = getGuildId(request);
    const { id } = request.params as { id: string };
    const service = getBotReactionRolePanelSettingsService();
    const existing = await service.findById(id);
    if (existing && existing.guildId === guildId) {
      // 先に DB を消す。メッセージ削除を先にすると bot の messageDelete ハンドラが
      // 先に DB レコードを掃除して service.delete が「対象なし」で失敗するため。
      await service.delete(id);
      await deletePanelMessage(deps.client, existing);
    }
    return { data: { id } };
  });
};
