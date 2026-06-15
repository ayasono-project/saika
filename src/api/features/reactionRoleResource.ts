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
import { logPrefixed } from "../../shared/locale/localeManager";
import { logger } from "../../shared/utils/logger";

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

/** ドメイン → 契約（roleIds[] をそのまま受け渡し・buttonId は文字列 id 化） */
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
      roleIds: b.roleIds,
    })),
  };
}

/** 契約のボタン配列 → ドメイン（buttonId を 1..n で振り直し・roleIds[] をそのまま受け渡し） */
export function toDomainButtons(
  buttons: ContractButton[],
): ReactionRoleButton[] {
  return buttons.map((b, i) => ({
    buttonId: i + 1,
    label: b.label,
    emoji: b.emoji,
    style: b.style,
    roleIds: b.roleIds,
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

/**
 * パネルメッセージを削除する（best-effort）。
 * DB 行削除後にメッセージ削除が失敗すると「行なし・メッセージ残存」の孤児になるため、
 * 孤児リスク時は二経路で可視化する:
 *   - 運営者向け: logger.error（Discord 運営通知 webhook は level:error のみ捕捉）
 *   - ギルド管理者向け: 設定済みエラーチャンネルへ Warning 通知（手動削除/権限確認を促す）
 */
export async function deletePanelMessage(
  client: BotClient,
  panel: GuildReactionRolePanel,
): Promise<void> {
  if (!panel.messageId) return;

  const channel = await client.channels
    .fetch(panel.channelId)
    .catch(() => null);

  const notifyOrphan = async (err?: unknown): Promise<void> => {
    // 運営者向け（error ログのみ webhook へ届く）
    logger.error(
      logPrefixed(
        "system:log_prefix.reaction_role",
        "reactionRole:log.panel_message_delete_failed",
        {
          guildId: panel.guildId,
          panelId: panel.id,
          channelId: panel.channelId,
          messageId: panel.messageId,
        },
      ),
      err,
    );

    // ギルド管理者向け（設定済みエラーチャンネルへ警告通知）。
    // discord.js を静的 import グラフに載せないため動的 import する。
    const guild =
      (channel && "guild" in channel ? channel.guild : null) ??
      client.guilds.cache.get(panel.guildId) ??
      null;
    if (!guild) return;
    const { notifyWarnChannel } = await import(
      "../../bot/shared/errorChannelNotifier"
    );
    await notifyWarnChannel(
      guild,
      `<#${panel.channelId}> ChannelId: ${panel.channelId} MessageId: ${panel.messageId}`,
      {
        feature: "リアクションロール",
        action: "パネルメッセージの自動削除に失敗（手動削除/権限確認が必要）",
      },
    );
  };

  // チャンネル取得不可/非テキスト = メッセージが残存しうる → 孤児リスク
  if (!channel?.isTextBased()) {
    await notifyOrphan();
    return;
  }

  try {
    const msg = await channel.messages.fetch(panel.messageId);
    await msg.delete();
  } catch (err) {
    // 10008 = Unknown Message: 既に消えている = 望ましい終状態なので無視
    if ((err as { code?: number })?.code === 10008) return;
    await notifyOrphan(err);
  }
}
