// tests/unit/bot/features/vac/commands/usecases/vacConfigRemoveTrigger.test.ts

import { ChannelType } from "discord.js";
import { handleVacConfigRemoveTrigger } from "@/bot/features/vac/commands/usecases/vacConfigRemoveTrigger";
import { ValidationError } from "@/shared/errors/customErrors";

const removeTriggerChannelMock = vi.fn();
const getVacConfigOrDefaultMock = vi.fn();

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (
    prefixKey: string,
    messageKey: string,
    params?: Record<string, unknown>,
  ) =>
    params
      ? `[${prefixKey}] ${messageKey}:${JSON.stringify(params)}`
      : `[${prefixKey}] ${messageKey}`,
  tInteraction: (_locale: string, key: string) => key,
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { info: vi.fn() },
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVacConfigService: () => ({
    getVacConfigOrDefault: (...args: unknown[]) =>
      getVacConfigOrDefaultMock(...args),
    removeTriggerChannel: (...args: unknown[]) =>
      removeTriggerChannelMock(...args),
  }),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createInfoEmbed: vi.fn((desc: string) => ({ description: desc })),
  createSuccessEmbed: vi.fn((desc: string) => ({ description: desc })),
  createWarningEmbed: vi.fn((desc: string) => ({ description: desc })),
}));

describe("bot/features/vac/commands/usecases/vacConfigRemoveTrigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ギルドコンテキストが存在しない場合にValidationErrorをスローする", async () => {
    const interaction = {
      guild: null,
      locale: "ja",
      user: { id: "user-1" },
      reply: vi.fn(),
    };

    await expect(
      handleVacConfigRemoveTrigger(interaction as never, "guild-1"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("トリガーチャンネルが0件の場合にValidationErrorをスローする", async () => {
    getVacConfigOrDefaultMock.mockResolvedValue({
      triggerChannelIds: [],
    });

    const interaction = {
      guild: { id: "guild-1", channels: { fetch: vi.fn() } },
      locale: "ja",
      user: { id: "user-1" },
      reply: vi.fn(),
    };

    await expect(
      handleVacConfigRemoveTrigger(interaction as never, "guild-1"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("トリガーチャンネルがある場合にセレクトメニュー付きで reply する", async () => {
    getVacConfigOrDefaultMock.mockResolvedValue({
      triggerChannelIds: ["trigger-1"],
    });

    const fetchMock = vi.fn().mockResolvedValue({
      id: "trigger-1",
      name: "CreateVC",
      type: ChannelType.GuildVoice,
      parent: { type: ChannelType.GuildCategory, name: "General" },
    });

    const replyMock = vi.fn().mockResolvedValue({
      createMessageComponentCollector: () => ({
        on: vi.fn(),
      }),
    });

    const interaction = {
      guild: { id: "guild-1", channels: { fetch: fetchMock } },
      locale: "ja",
      user: { id: "user-1" },
      reply: replyMock,
    };

    await handleVacConfigRemoveTrigger(interaction as never, "guild-1");

    expect(replyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        components: expect.any(Array),
        flags: 64,
      }),
    );
  });

  it("セレクトメニューで選択して削除ボタンで削除が実行される", async () => {
    getVacConfigOrDefaultMock.mockResolvedValue({
      triggerChannelIds: ["trigger-1", "trigger-2"],
    });
    removeTriggerChannelMock.mockResolvedValue(undefined);

    const channelMocks: Record<
      string,
      {
        id: string;
        name: string;
        type: ChannelType;
        parent: { type: ChannelType; name: string } | null;
        delete: ReturnType<typeof vi.fn>;
      }
    > = {
      "trigger-1": {
        id: "trigger-1",
        name: "CreateVC-1",
        type: ChannelType.GuildVoice,
        parent: { type: ChannelType.GuildCategory, name: "General" },
        delete: vi.fn().mockResolvedValue(undefined),
      },
      "trigger-2": {
        id: "trigger-2",
        name: "CreateVC-2",
        type: ChannelType.GuildVoice,
        parent: { type: ChannelType.GuildCategory, name: "Gaming" },
        delete: vi.fn().mockResolvedValue(undefined),
      },
    };

    const fetchMock = vi.fn((id: string) => Promise.resolve(channelMocks[id]));

    const collectHandlers: ((i: unknown) => Promise<void>)[] = [];
    const endHandlers: ((
      collected: unknown,
      reason: string,
    ) => Promise<void>)[] = [];

    const collectorMock = {
      on: vi.fn(
        (event: string, handler: (...args: unknown[]) => Promise<void>) => {
          if (event === "collect") collectHandlers.push(handler);
          if (event === "end") endHandlers.push(handler);
          return collectorMock;
        },
      ),
      stop: vi.fn(),
    };

    const replyMock = vi.fn().mockResolvedValue({
      createMessageComponentCollector: vi.fn(() => collectorMock),
    });

    const interaction = {
      guild: { id: "guild-1", channels: { fetch: fetchMock } },
      locale: "ja",
      user: { id: "user-1" },
      reply: replyMock,
    };

    await handleVacConfigRemoveTrigger(interaction as never, "guild-1");

    // セレクトメニューで trigger-1 を選択
    const selectInteraction = {
      customId: "vac-config:trigger-remove-select",
      isStringSelectMenu: () => true,
      values: ["trigger-1"],
      update: vi.fn().mockResolvedValue(undefined),
      user: { id: "user-1" },
    };
    await collectHandlers[0](selectInteraction);
    expect(selectInteraction.update).toHaveBeenCalled();

    // 削除ボタンを押す
    const confirmInteraction = {
      customId: "vac-config:trigger-remove-confirm",
      isStringSelectMenu: () => false,
      update: vi.fn().mockResolvedValue(undefined),
      user: { id: "user-1" },
    };
    await collectHandlers[0](confirmInteraction);

    expect(removeTriggerChannelMock).toHaveBeenCalledWith(
      "guild-1",
      "trigger-1",
    );
    expect(removeTriggerChannelMock).not.toHaveBeenCalledWith(
      "guild-1",
      "trigger-2",
    );
    expect(channelMocks["trigger-1"].delete).toHaveBeenCalled();
    expect(channelMocks["trigger-2"].delete).not.toHaveBeenCalled();
    expect(confirmInteraction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        components: [],
      }),
    );
    expect(collectorMock.stop).toHaveBeenCalled();
  });

  it("タイムアウト時にタイムアウトメッセージを表示する", async () => {
    getVacConfigOrDefaultMock.mockResolvedValue({
      triggerChannelIds: ["trigger-1"],
    });

    const fetchMock = vi.fn().mockResolvedValue({
      id: "trigger-1",
      name: "CreateVC",
      type: ChannelType.GuildVoice,
      parent: { type: ChannelType.GuildCategory, name: "General" },
    });

    const endHandlers: ((
      collected: unknown,
      reason: string,
    ) => Promise<void>)[] = [];

    const collectorMock = {
      on: vi.fn(
        (event: string, handler: (...args: unknown[]) => Promise<void>) => {
          if (event === "end") endHandlers.push(handler);
          return collectorMock;
        },
      ),
      stop: vi.fn(),
    };

    const replyMock = vi.fn().mockResolvedValue({
      createMessageComponentCollector: vi.fn(() => collectorMock),
    });

    const editReplyMock = vi.fn().mockResolvedValue(undefined);

    const interaction = {
      guild: { id: "guild-1", channels: { fetch: fetchMock } },
      locale: "ja",
      user: { id: "user-1" },
      reply: replyMock,
      editReply: editReplyMock,
    };

    await handleVacConfigRemoveTrigger(interaction as never, "guild-1");

    // タイムアウトイベントを発火
    await endHandlers[0](undefined, "time");

    expect(editReplyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            description: "common:interaction.timeout",
          }),
        ]),
        components: [],
      }),
    );
  });
});
