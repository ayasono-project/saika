// src/bot/handlers/interactionCreate/flow/modal.ts
// モーダル送信処理

import type { ModalSubmitInteraction } from "discord.js";
import { logPrefixed } from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { handleInteractionError } from "../../../errors/interactionErrorHandler";
import { modalHandlers } from "../ui/modals";

/**
 * モーダル送信をレジストリで処理する関数
 */
export async function handleModalSubmit(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  // prefix マッチ型のレジストリハンドラを適用
  const registryHandler = modalHandlers.find((h) =>
    h.matches(interaction.customId),
  );
  if (!registryHandler) {
    logger.warn(
      logPrefixed(
        "system:log_prefix.interaction_create",
        "system:interaction.unknown_modal",
        { customId: interaction.customId },
        "modal",
      ),
    );
    return;
  }

  try {
    await registryHandler.execute(interaction);
    logger.debug(
      logPrefixed(
        "system:log_prefix.interaction_create",
        "system:interaction.modal_submitted",
        { customId: interaction.customId, userId: interaction.user.id },
        "modal",
      ),
    );
  } catch (error) {
    // モーダル処理失敗は同じエラーハンドラに集約
    logger.error(
      logPrefixed(
        "system:log_prefix.interaction_create",
        "system:interaction.modal_error",
        { customId: interaction.customId },
        "modal",
      ),
      error,
    );
    await handleInteractionError(interaction, error);
  }
}
