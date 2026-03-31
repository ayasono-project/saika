// src/bot/features/ticket/handlers/ui/ticketTeardownState.ts
// teardown フローのセッション状態管理

import { TtlMap } from "../../../../../shared/utils/ttlMap";
import { TICKET_SESSION_TTL_MS } from "../../commands/ticketCommand.constants";

export interface TicketTeardownSession {
  categoryIds: string[];
}

export const ticketTeardownSessions: TtlMap<TicketTeardownSession> =
  new TtlMap<TicketTeardownSession>(TICKET_SESSION_TTL_MS);
