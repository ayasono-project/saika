import { ChannelType } from "discord.js";
import {
  notifyErrorChannel,
  notifyWarnChannel,
} from "@/bot/shared/errorChannelNotifier";

const getConfigMock = vi.fn();
const sendMock = vi.fn();
const channelFetchMock = vi.fn();
// 翻訳はキーをそのまま返す（引数があれば JSON で後ろに付ける）
const translateMock = vi.fn((key: string, options?: Record<string, unknown>) =>
  options ? `${key}:${JSON.stringify(options)}` : key,
);
const getGuildTranslatorMock = vi.fn(async (_guildId: string) => translateMock);
const loggerWarnMock = vi.fn();
const createErrorEmbedMock = vi.fn(
  (_description: string, _options?: unknown) => ({ type: "error-embed" }),
);
const createWarningEmbedMock = vi.fn(
  (_description: string, _options?: unknown) => ({ type: "warning-embed" }),
);

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotGuildSettingsService: () => ({
    getSettings: (...args: unknown[]) => getConfigMock(...args),
  }),
}));

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (...args: unknown[]) => args.join(":"),
}));

vi.mock("@/shared/locale/helpers", () => ({
  getGuildTranslator: (guildId: string) => getGuildTranslatorMock(guildId),
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { warn: (...args: unknown[]) => loggerWarnMock(...args) },
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

const CONTEXT = {
  featureKey: "memberLog:embed.field.value.error_notification_feature",
  actionKey: "memberLog:embed.field.value.join_notification_failed_action",
} as const;

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

      await notifyErrorChannel(createGuildMock(), new Error("test"), CONTEXT);

      expect(channelFetchMock).not.toHaveBeenCalled();
      expect(sendMock).not.toHaveBeenCalled();
      // 送らないときはギルドの言語も引かない
      expect(getGuildTranslatorMock).not.toHaveBeenCalled();
    });

    it("errorChannelId が設定済みでもチャンネルが見つからない場合はスキップする", async () => {
      getConfigMock.mockResolvedValue({ errorChannelId: "ch-1" });
      channelFetchMock.mockResolvedValue(null);

      await notifyErrorChannel(createGuildMock(), new Error("test"), CONTEXT);

      expect(sendMock).not.toHaveBeenCalled();
    });

    it("チャンネルがテキストチャンネルでない場合はスキップする", async () => {
      getConfigMock.mockResolvedValue({ errorChannelId: "ch-1" });
      channelFetchMock.mockResolvedValue({ type: ChannelType.GuildVoice });

      await notifyErrorChannel(createGuildMock(), new Error("test"), CONTEXT);

      expect(sendMock).not.toHaveBeenCalled();
    });

    it("テキストチャンネルが存在する場合はエラーEmbedを送信する", async () => {
      getConfigMock.mockResolvedValue({ errorChannelId: "ch-1" });
      channelFetchMock.mockResolvedValue(createTextChannel());
      sendMock.mockResolvedValue(undefined);

      await notifyErrorChannel(
        createGuildMock(),
        new Error("test error"),
        CONTEXT,
      );

      expect(createErrorEmbedMock).toHaveBeenCalledWith("", {
        title: "guildSettings:error-notification.title",
        timestamp: true,
        fields: [
          {
            name: "guildSettings:error-notification.feature",
            value: "memberLog:embed.field.value.error_notification_feature",
            inline: true,
          },
          {
            name: "guildSettings:error-notification.action",
            value:
              "memberLog:embed.field.value.join_notification_failed_action",
            inline: true,
          },
          {
            name: "guildSettings:error-notification.message",
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

      await notifyErrorChannel(createGuildMock(), "string error", CONTEXT);

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

      await notifyErrorChannel(createGuildMock(), 42, CONTEXT);

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
      await notifyErrorChannel(
        createGuildMock(),
        new Error(longMessage),
        CONTEXT,
      );

      const call = createErrorEmbedMock.mock.calls[0] as unknown[];
      const messageField = (call[1] as { fields: { value: string }[] })
        .fields[2];
      expect(messageField.value.length).toBe(1024);
      expect(messageField.value.endsWith("...")).toBe(true);
    });

    it("設定の取得に失敗したら、エラーを添えて warn を残し、例外を投げない", async () => {
      const error = new Error("DB error");
      getConfigMock.mockRejectedValue(error);

      await notifyErrorChannel(createGuildMock(), new Error("test"), CONTEXT);

      expect(loggerWarnMock).toHaveBeenCalledWith(
        expect.stringContaining("send_error_failed"),
        error,
      );
    });

    it("送信に失敗したら（Bot がエラーチャンネルに入れない 50001 など）、エラーを添えて warn を残し、例外を投げない", async () => {
      const error = new Error("Missing Access");
      getConfigMock.mockResolvedValue({ errorChannelId: "ch-1" });
      channelFetchMock.mockResolvedValue(createTextChannel());
      sendMock.mockRejectedValue(error);

      await expect(
        notifyErrorChannel(createGuildMock(), new Error("test"), CONTEXT),
      ).resolves.toBeUndefined();

      expect(loggerWarnMock).toHaveBeenCalledWith(
        expect.stringContaining("send_error_failed"),
        error,
      );
    });

    it("チャンネルfetchが例外を投げた場合はcatchでnullになりスキップする", async () => {
      getConfigMock.mockResolvedValue({ errorChannelId: "ch-1" });
      channelFetchMock.mockRejectedValue(new Error("fetch failed"));

      await notifyErrorChannel(createGuildMock(), new Error("test"), CONTEXT);

      expect(sendMock).not.toHaveBeenCalled();
    });
  });

  describe("notifyWarnChannel", () => {
    it("errorChannelId が未設定の場合はスキップして false を返す", async () => {
      getConfigMock.mockResolvedValue(null);

      await expect(
        notifyWarnChannel(createGuildMock(), () => "warning message", CONTEXT),
      ).resolves.toBe(false);

      expect(sendMock).not.toHaveBeenCalled();
    });

    it("チャンネルが見つからない場合はスキップして false を返す", async () => {
      getConfigMock.mockResolvedValue({ errorChannelId: "ch-1" });
      channelFetchMock.mockResolvedValue(null);

      await expect(
        notifyWarnChannel(createGuildMock(), () => "warning", CONTEXT),
      ).resolves.toBe(false);

      expect(sendMock).not.toHaveBeenCalled();
    });

    it("チャンネルがテキストチャンネルでない場合はスキップして false を返す", async () => {
      getConfigMock.mockResolvedValue({ errorChannelId: "ch-1" });
      channelFetchMock.mockResolvedValue({ type: ChannelType.GuildVoice });

      await expect(
        notifyWarnChannel(createGuildMock(), () => "warning", CONTEXT),
      ).resolves.toBe(false);

      expect(sendMock).not.toHaveBeenCalled();
    });

    it("チャンネルfetchが例外を投げた場合はcatchでnullになりスキップして false を返す", async () => {
      getConfigMock.mockResolvedValue({ errorChannelId: "ch-1" });
      channelFetchMock.mockRejectedValue(new Error("fetch failed"));

      await expect(
        notifyWarnChannel(createGuildMock(), () => "warning", CONTEXT),
      ).resolves.toBe(false);

      expect(sendMock).not.toHaveBeenCalled();
    });

    it("テキストチャンネルが存在する場合は、通知先のギルドの言語で組み立てた警告Embedを送信する", async () => {
      getConfigMock.mockResolvedValue({ errorChannelId: "ch-1" });
      channelFetchMock.mockResolvedValue(createTextChannel());
      sendMock.mockResolvedValue(undefined);

      await notifyWarnChannel(
        createGuildMock(),
        (t) =>
          t("common:embed.field.value.channel_not_found", { channelId: "x" }),
        CONTEXT,
      );

      expect(getGuildTranslatorMock).toHaveBeenCalledWith("guild-1");

      expect(createWarningEmbedMock).toHaveBeenCalledWith("", {
        title: "guildSettings:error-notification.warn_title",
        timestamp: true,
        fields: [
          {
            name: "guildSettings:error-notification.feature",
            value: "memberLog:embed.field.value.error_notification_feature",
            inline: true,
          },
          {
            name: "guildSettings:error-notification.action",
            value:
              "memberLog:embed.field.value.join_notification_failed_action",
            inline: true,
          },
          {
            name: "guildSettings:error-notification.message",
            value:
              'common:embed.field.value.channel_not_found:{"channelId":"x"}',
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
      await notifyWarnChannel(createGuildMock(), () => longMessage, CONTEXT);

      const call = createWarningEmbedMock.mock.calls[0] as unknown[];
      const messageField = (call[1] as { fields: { value: string }[] })
        .fields[2];
      expect(messageField.value.length).toBe(1024);
      expect(messageField.value.endsWith("...")).toBe(true);
    });

    it("設定の取得に失敗したら、エラーを添えて warn を残し、false を返す（例外は投げない）", async () => {
      const error = new Error("DB error");
      getConfigMock.mockRejectedValue(error);

      await expect(
        notifyWarnChannel(createGuildMock(), () => "warning", CONTEXT),
      ).resolves.toBe(false);

      expect(loggerWarnMock).toHaveBeenCalledWith(
        expect.stringContaining("send_warn_failed"),
        error,
      );
    });

    it("送信に失敗したら（Bot がエラーチャンネルに入れない 50001 など）、エラーを添えて warn を残し、false を返す", async () => {
      const error = new Error("Missing Access");
      getConfigMock.mockResolvedValue({ errorChannelId: "ch-1" });
      channelFetchMock.mockResolvedValue(createTextChannel());
      sendMock.mockRejectedValue(error);

      await expect(
        notifyWarnChannel(createGuildMock(), () => "warning", CONTEXT),
      ).resolves.toBe(false);

      expect(loggerWarnMock).toHaveBeenCalledWith(
        expect.stringContaining("send_warn_failed"),
        error,
      );
    });

    it("本文の組み立てに失敗したら、送信の失敗と同じく warn を残し、false を返す", async () => {
      const error = new Error("build failed");
      getConfigMock.mockResolvedValue({ errorChannelId: "ch-1" });
      channelFetchMock.mockResolvedValue(createTextChannel());

      await expect(
        notifyWarnChannel(
          createGuildMock(),
          () => {
            throw error;
          },
          CONTEXT,
        ),
      ).resolves.toBe(false);

      expect(sendMock).not.toHaveBeenCalled();
      expect(loggerWarnMock).toHaveBeenCalledWith(
        expect.stringContaining("send_warn_failed"),
        error,
      );
    });

    it("送れたときだけ true を返す", async () => {
      getConfigMock.mockResolvedValue({ errorChannelId: "ch-1" });
      channelFetchMock.mockResolvedValue(createTextChannel());
      sendMock.mockResolvedValue(undefined);

      await expect(
        notifyWarnChannel(createGuildMock(), () => "warning", CONTEXT),
      ).resolves.toBe(true);
      expect(loggerWarnMock).not.toHaveBeenCalled();
    });
  });
});
