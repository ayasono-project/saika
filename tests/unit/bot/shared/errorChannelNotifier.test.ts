// tests/unit/bot/shared/errorChannelNotifier.test.ts

import { ChannelType } from "discord.js";
import {
  notifyErrorChannel,
  notifyWarnChannel,
} from "@/bot/shared/errorChannelNotifier";

const getConfigMock = vi.fn();
const sendMock = vi.fn();
const channelFetchMock = vi.fn();
const tGuildMock = vi.fn((_guildId: string, key: string) => key);
const loggerDebugMock = vi.fn();
const createErrorEmbedMock = vi.fn(
  (_description: string, _options?: unknown) => ({ type: "error-embed" }),
);
const createWarningEmbedMock = vi.fn(
  (_description: string, _options?: unknown) => ({ type: "warning-embed" }),
);

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotGuildConfigService: () => ({
    getConfig: (...args: unknown[]) => getConfigMock(...args),
  }),
}));

vi.mock("@/shared/locale/localeManager", () => ({
  tGuild: (guildId: string, key: string) => tGuildMock(guildId, key),
  logPrefixed: (...args: unknown[]) => args.join(":"),
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { debug: (...args: unknown[]) => loggerDebugMock(...args) },
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createErrorEmbed: (description: string, options?: unknown) =>
    createErrorEmbedMock(description, options),
  createWarningEmbed: (description: string, options?: unknown) =>
    createWarningEmbedMock(description, options),
}));

function createGuildMock() {
  return {
    id: "guild-1",
    channels: {
      fetch: (...args: unknown[]) => channelFetchMock(...args),
    },
  } as never;
}

function createTextChannel() {
  return {
    type: ChannelType.GuildText,
    send: (...args: unknown[]) => sendMock(...args),
  };
}

describe("bot/shared/errorChannelNotifier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("notifyErrorChannel", () => {
    it("errorChannelId が未設定の場合はスキップする", async () => {
      getConfigMock.mockResolvedValue(null);

      await notifyErrorChannel(createGuildMock(), new Error("test"), {
        feature: "テスト機能",
        action: "テスト処理",
      });

      expect(channelFetchMock).not.toHaveBeenCalled();
      expect(sendMock).not.toHaveBeenCalled();
    });

    it("errorChannelId が設定済みでもチャンネルが見つからない場合はスキップする", async () => {
      getConfigMock.mockResolvedValue({ errorChannelId: "ch-1" });
      channelFetchMock.mockResolvedValue(null);

      await notifyErrorChannel(createGuildMock(), new Error("test"), {
        feature: "テスト機能",
        action: "テスト処理",
      });

      expect(sendMock).not.toHaveBeenCalled();
    });

    it("チャンネルがテキストチャンネルでない場合はスキップする", async () => {
      getConfigMock.mockResolvedValue({ errorChannelId: "ch-1" });
      channelFetchMock.mockResolvedValue({ type: ChannelType.GuildVoice });

      await notifyErrorChannel(createGuildMock(), new Error("test"), {
        feature: "テスト機能",
        action: "テスト処理",
      });

      expect(sendMock).not.toHaveBeenCalled();
    });

    it("テキストチャンネルが存在する場合はエラーEmbedを送信する", async () => {
      getConfigMock.mockResolvedValue({ errorChannelId: "ch-1" });
      channelFetchMock.mockResolvedValue(createTextChannel());
      sendMock.mockResolvedValue(undefined);

      await notifyErrorChannel(createGuildMock(), new Error("test error"), {
        feature: "メンバーログ",
        action: "入室通知の送信失敗",
      });

      expect(createErrorEmbedMock).toHaveBeenCalledWith("", {
        title: "guildConfig:error-notification.title",
        timestamp: true,
        fields: [
          {
            name: "guildConfig:error-notification.feature",
            value: "メンバーログ",
            inline: true,
          },
          {
            name: "guildConfig:error-notification.action",
            value: "入室通知の送信失敗",
            inline: true,
          },
          {
            name: "guildConfig:error-notification.message",
            value: "test error",
          },
        ],
      });
      expect(sendMock).toHaveBeenCalledWith({
        embeds: [{ type: "error-embed" }],
      });
    });

    it("文字列エラーを正しく抽出する", async () => {
      getConfigMock.mockResolvedValue({ errorChannelId: "ch-1" });
      channelFetchMock.mockResolvedValue(createTextChannel());
      sendMock.mockResolvedValue(undefined);

      await notifyErrorChannel(createGuildMock(), "string error", {
        feature: "テスト",
        action: "テスト",
      });

      expect(createErrorEmbedMock).toHaveBeenCalledWith(
        "",
        expect.objectContaining({
          fields: expect.arrayContaining([
            expect.objectContaining({ value: "string error" }),
          ]),
        }),
      );
    });

    it("非Error/非stringのエラーをString()で変換する", async () => {
      getConfigMock.mockResolvedValue({ errorChannelId: "ch-1" });
      channelFetchMock.mockResolvedValue(createTextChannel());
      sendMock.mockResolvedValue(undefined);

      await notifyErrorChannel(createGuildMock(), 42, {
        feature: "テスト",
        action: "テスト",
      });

      expect(createErrorEmbedMock).toHaveBeenCalledWith(
        "",
        expect.objectContaining({
          fields: expect.arrayContaining([
            expect.objectContaining({ value: "42" }),
          ]),
        }),
      );
    });

    it("1024文字を超えるエラーメッセージはトランケートされる", async () => {
      getConfigMock.mockResolvedValue({ errorChannelId: "ch-1" });
      channelFetchMock.mockResolvedValue(createTextChannel());
      sendMock.mockResolvedValue(undefined);

      const longMessage = "x".repeat(2000);
      await notifyErrorChannel(createGuildMock(), new Error(longMessage), {
        feature: "テスト",
        action: "テスト",
      });

      const call = createErrorEmbedMock.mock.calls[0] as unknown[];
      const messageField = (call[1] as { fields: { value: string }[] })
        .fields[2];
      expect(messageField.value.length).toBe(1024);
      expect(messageField.value.endsWith("...")).toBe(true);
    });

    it("送信失敗時はログのみ記録して例外を投げない", async () => {
      getConfigMock.mockRejectedValue(new Error("DB error"));

      await notifyErrorChannel(createGuildMock(), new Error("test"), {
        feature: "テスト",
        action: "テスト",
      });

      expect(loggerDebugMock).toHaveBeenCalledWith(
        expect.stringContaining("send_error_failed"),
      );
    });

    it("チャンネルfetchが例外を投げた場合はcatchでnullになりスキップする", async () => {
      getConfigMock.mockResolvedValue({ errorChannelId: "ch-1" });
      channelFetchMock.mockRejectedValue(new Error("fetch failed"));

      await notifyErrorChannel(createGuildMock(), new Error("test"), {
        feature: "テスト",
        action: "テスト",
      });

      expect(sendMock).not.toHaveBeenCalled();
    });
  });

  describe("notifyWarnChannel", () => {
    it("errorChannelId が未設定の場合はスキップする", async () => {
      getConfigMock.mockResolvedValue(null);

      await notifyWarnChannel(createGuildMock(), "warning message", {
        feature: "テスト機能",
        action: "テスト処理",
      });

      expect(sendMock).not.toHaveBeenCalled();
    });

    it("チャンネルがテキストチャンネルでない場合はスキップする", async () => {
      getConfigMock.mockResolvedValue({ errorChannelId: "ch-1" });
      channelFetchMock.mockResolvedValue({ type: ChannelType.GuildVoice });

      await notifyWarnChannel(createGuildMock(), "warning", {
        feature: "テスト",
        action: "テスト",
      });

      expect(sendMock).not.toHaveBeenCalled();
    });

    it("チャンネルfetchが例外を投げた場合はcatchでnullになりスキップする", async () => {
      getConfigMock.mockResolvedValue({ errorChannelId: "ch-1" });
      channelFetchMock.mockRejectedValue(new Error("fetch failed"));

      await notifyWarnChannel(createGuildMock(), "warning", {
        feature: "テスト",
        action: "テスト",
      });

      expect(sendMock).not.toHaveBeenCalled();
    });

    it("テキストチャンネルが存在する場合は警告Embedを送信する", async () => {
      getConfigMock.mockResolvedValue({ errorChannelId: "ch-1" });
      channelFetchMock.mockResolvedValue(createTextChannel());
      sendMock.mockResolvedValue(undefined);

      await notifyWarnChannel(createGuildMock(), "channel not found", {
        feature: "メンバーログ",
        action: "通知先チャンネル消失",
      });

      expect(createWarningEmbedMock).toHaveBeenCalledWith("", {
        title: "guildConfig:error-notification.warn_title",
        timestamp: true,
        fields: [
          {
            name: "guildConfig:error-notification.feature",
            value: "メンバーログ",
            inline: true,
          },
          {
            name: "guildConfig:error-notification.action",
            value: "通知先チャンネル消失",
            inline: true,
          },
          {
            name: "guildConfig:error-notification.message",
            value: "channel not found",
          },
        ],
      });
      expect(sendMock).toHaveBeenCalledWith({
        embeds: [{ type: "warning-embed" }],
      });
    });

    it("1024文字を超える警告メッセージはトランケートされる", async () => {
      getConfigMock.mockResolvedValue({ errorChannelId: "ch-1" });
      channelFetchMock.mockResolvedValue(createTextChannel());
      sendMock.mockResolvedValue(undefined);

      const longMessage = "w".repeat(2000);
      await notifyWarnChannel(createGuildMock(), longMessage, {
        feature: "テスト",
        action: "テスト",
      });

      const call = createWarningEmbedMock.mock.calls[0] as unknown[];
      const messageField = (call[1] as { fields: { value: string }[] })
        .fields[2];
      expect(messageField.value.length).toBe(1024);
      expect(messageField.value.endsWith("...")).toBe(true);
    });

    it("送信失敗時はログのみ記録して例外を投げない", async () => {
      getConfigMock.mockRejectedValue(new Error("DB error"));

      await notifyWarnChannel(createGuildMock(), "warning", {
        feature: "テスト",
        action: "テスト",
      });

      expect(loggerDebugMock).toHaveBeenCalledWith(
        expect.stringContaining("send_warn_failed"),
      );
    });
  });
});
