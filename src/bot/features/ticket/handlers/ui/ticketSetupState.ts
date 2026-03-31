// src/bot/features/ticket/handlers/ui/ticketSetupState.ts
// setup フローのセッション状態管理

import type { ChatInputCommandInteraction } from "discord.js";
import { TtlMap } from "../../../../../shared/utils/ttlMap";
import { TICKET_SESSION_TTL_MS } from "../../commands/ticketCommand.constants";

export interface TicketSetupSession {
  categoryId: string;
  staffRoleIds: string[];
  /** ロール選択メッセージを削除するために元のコマンドインタラクションを保持 */
  commandInteraction: ChatInputCommandInteraction;
}

export const ticketSetupSessions: TtlMap<TicketSetupSession> =
  new TtlMap<TicketSetupSession>(TICKET_SESSION_TTL_MS);
