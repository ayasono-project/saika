// src/bot/events/interactionCreate.ts
// インタラクション処理イベント

import { Events } from "discord.js";
import { handleInteractionCreate } from "../handlers/interactionCreate/handleInteractionCreate";
import type { BotEvent } from "../types/discord";

export const interactionCreateEvent: BotEvent<typeof Events.InteractionCreate> =
  {
    name: Events.InteractionCreate,
    once: false,

    async execute(interaction) {
      // interaction の種別判定と実処理は専用ハンドラへ委譲
      await handleInteractionCreate(interaction);
    },
  };
