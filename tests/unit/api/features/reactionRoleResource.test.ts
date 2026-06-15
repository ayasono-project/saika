// tests/unit/api/features/reactionRoleResource.test.ts
// deletePanelMessage の孤児化可視化分岐のユニットテスト。
// Discord 副作用はモックし、運営 webhook(logger.error) とギルド通知(notifyWarnChannel)の
// 呼び出し有無で判定する。

import { beforeEach, describe, expect, it, vi } from "vitest";

const errorMock = vi.hoisted(() => vi.fn());
const notifyWarnMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/utils/logger", () => ({
  logger: { error: errorMock },
}));

// logPrefixed はキー解決のみ（i18next 依存を避けるため固定文字列を返す）
vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (_p: string, key: string) => key,
}));

// ギルドエラーチャンネル通知（動的 import される）をモック
vi.mock("@/bot/shared/errorChannelNotifier", () => ({
  notifyWarnChannel: notifyWarnMock,
  notifyErrorChannel: vi.fn(),
}));

import { deletePanelMessage } from "@/api/features/reactionRoleResource";
import type { BotClient } from "@/bot/client";
import type { GuildReactionRolePanel } from "@/shared/database/types/reactionRoleTypes";

const panel = {
  id: "panel-1",
  guildId: "guild-1",
  channelId: "ch-1",
  messageId: "msg-1",
} as GuildReactionRolePanel;

// guild は notifyWarnChannel をモックしているので id 解決のみ用意すれば足りる
const fakeGuild = { id: "guild-1" };

function makeClient(channel: unknown): BotClient {
  return {
    channels: { fetch: vi.fn(async () => channel) },
    guilds: { cache: { get: vi.fn(() => fakeGuild) } },
  } as unknown as BotClient;
}

describe("deletePanelMessage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("messageId が無ければ何もしない（fetch も通知もしない）", async () => {
    const client = makeClient(null);
    await deletePanelMessage(client, {
      ...panel,
      messageId: "",
    } as GuildReactionRolePanel);
    expect(client.channels.fetch).not.toHaveBeenCalled();
    expect(errorMock).not.toHaveBeenCalled();
    expect(notifyWarnMock).not.toHaveBeenCalled();
  });

  it("チャンネルが null（孤児リスク）なら運営 error とギルド警告を出す", async () => {
    await deletePanelMessage(makeClient(null), panel);
    expect(errorMock).toHaveBeenCalledTimes(1);
    expect(notifyWarnMock).toHaveBeenCalledTimes(1);
    expect(notifyWarnMock).toHaveBeenCalledWith(
      fakeGuild,
      expect.any(String),
      expect.objectContaining({ feature: expect.any(String) }),
    );
  });

  it("チャンネルが非テキスト（孤児リスク）なら運営 error とギルド警告を出す", async () => {
    const channel = { isTextBased: () => false };
    await deletePanelMessage(makeClient(channel), panel);
    expect(errorMock).toHaveBeenCalledTimes(1);
    expect(notifyWarnMock).toHaveBeenCalledTimes(1);
  });

  it("メッセージ削除成功時はどちらの通知も出さない", async () => {
    const channel = {
      isTextBased: () => true,
      messages: { fetch: vi.fn(async () => ({ delete: vi.fn() })) },
    };
    await deletePanelMessage(makeClient(channel), panel);
    expect(errorMock).not.toHaveBeenCalled();
    expect(notifyWarnMock).not.toHaveBeenCalled();
  });

  it("既に削除済み（code 10008）は望ましい終状態なのでどちらも出さない", async () => {
    const channel = {
      isTextBased: () => true,
      messages: {
        fetch: vi.fn(async () => {
          throw { code: 10008 };
        }),
      },
    };
    await deletePanelMessage(makeClient(channel), panel);
    expect(errorMock).not.toHaveBeenCalled();
    expect(notifyWarnMock).not.toHaveBeenCalled();
  });

  it("権限エラー（code 50013）等の削除失敗は運営 error とギルド警告を出す", async () => {
    const channel = {
      isTextBased: () => true,
      // 非テキスト判定回避のため guild も持たせず、guilds.cache 経由で解決させる
      messages: {
        fetch: vi.fn(async () => ({
          delete: vi.fn(async () => {
            throw { code: 50013 };
          }),
        })),
      },
    };
    await deletePanelMessage(makeClient(channel), panel);
    expect(errorMock).toHaveBeenCalledTimes(1);
    expect(notifyWarnMock).toHaveBeenCalledTimes(1);
  });
});
