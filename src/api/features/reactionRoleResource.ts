// src/api/features/reactionRoleResource.ts
// リアクションロールパネルの契約マッピングと Discord 投稿/削除の副作用。

import type {
  ReactionButton as ContractButton,
  ButtonStyle as ContractButtonStyle,
  ReactionRolePanel as ContractPanel,
  ReactionRoleMode,
} from "@ayasono/shared/api";
import type { BotClient } from "../../bot/client";
import type {
  GuildReactionRolePanel,
  ReactionRoleButton,
} from "../../shared/database/types/reactionRoleTypes";

// 注: discord.js を多用する reactionRolePanelBuilder は API の静的 import グラフに載せず、
// 実際に投稿する瞬間にのみ動的 import する（登録時/評価時の discord.js 依存を避ける）。

const BUTTON_STYLES: readonly string[] = [
  "primary",
  "secondary",
  "success",
  "danger",
];
const MODES: readonly string[] = ["toggle", "one-action", "exclusive"];

/** 既知のボタンスタイルへ正規化（未知は primary） */
function asButtonStyle(style: string): ContractButtonStyle {
  return BUTTON_STYLES.includes(style)
    ? (style as ContractButtonStyle)
    : "primary";
}

/** 既知のモードへ正規化（未知は toggle） */
function asMode(mode: string): ReactionRoleMode {
  return MODES.includes(mode) ? (mode as ReactionRoleMode) : "toggle";
}

/** ドメイン → 契約（domain は roleIds[] / 契約は単一 roleId・buttonId は文字列 id 化） */
export function toContractPanel(domain: GuildReactionRolePanel): ContractPanel {
  return {
    id: domain.id,
    channelId: domain.channelId || null,
    mode: asMode(domain.mode),
    title: domain.title,
    description: domain.description,
    color: domain.color,
    buttons: domain.buttons.map((b) => ({
      id: String(b.buttonId),
      label: b.label,
      emoji: b.emoji,
      style: asButtonStyle(b.style),
      roleId: b.roleIds[0] ?? null,
    })),
  };
}

/** 契約のボタン配列 → ドメイン（buttonId を 1..n で振り直し・roleId を roleIds[] 化） */
export function toDomainButtons(
  buttons: ContractButton[],
): ReactionRoleButton[] {
  return buttons.map((b, i) => ({
    buttonId: i + 1,
    label: b.label,
    emoji: b.emoji,
    style: b.style,
    roleIds: b.roleId ? [b.roleId] : [],
  }));
}

/**
 * パネルをチャンネルへ投稿し、メッセージ ID を返す。
 * チャンネルが解決できない/送信不可なら空文字（DB のみ作成済みとして扱う）。
 */
export async function postPanelMessage(
  client: BotClient,
  panel: GuildReactionRolePanel,
): Promise<string> {
  const channel = await client.channels
    .fetch(panel.channelId)
    .catch(() => null);
  if (!channel?.isSendable()) return "";
  const { buildPanelEmbed, buildPanelButtonRows } = await import(
    "../../features/reaction-role/services/reactionRolePanelBuilder"
  );
  const embed = buildPanelEmbed(panel.title, panel.description, panel.color);
  const rows = buildPanelButtonRows(panel.id, panel.buttons);
  const sent = await channel.send({ embeds: [embed], components: rows });
  return sent.id;
}

/** パネルメッセージを削除する（best-effort） */
export async function deletePanelMessage(
  client: BotClient,
  panel: GuildReactionRolePanel,
): Promise<void> {
  if (!panel.messageId) return;
  const channel = await client.channels
    .fetch(panel.channelId)
    .catch(() => null);
  if (!channel?.isTextBased()) return;
  await channel.messages
    .fetch(panel.messageId)
    .then((msg) => msg.delete())
    .catch(() => null);
}
