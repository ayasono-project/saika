// tests/unit/bot/features/bump-reminder/commands/bumpReminderConfigCommand.removeUsers.test.ts
import { handleBumpReminderConfigRemoveUsers } from "@/bot/features/bump-reminder/commands/bumpReminderConfigCommand.removeUsers";
import { ValidationError } from "@/shared/errors/customErrors";

const getBumpReminderConfigOrDefaultMock = vi.fn();
const saveBumpReminderConfigMock = vi.fn();

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
  getBotBumpReminderConfigService: () => ({
    getBumpReminderConfigOrDefault: (...args: unknown[]) =>
      getBumpReminderConfigOrDefaultMock(...args),
    saveBumpReminderConfig: (...args: unknown[]) =>
      saveBumpReminderConfigMock(...args),
  }),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createInfoEmbed: vi.fn((desc: string) => ({ description: desc })),
  createSuccessEmbed: vi.fn((desc: string) => ({ description: desc })),
  createWarningEmbed: vi.fn((desc: string) => ({ description: desc })),
}));

vi.mock("@/bot/shared/pagination", () => ({
  buildPaginationRow: vi.fn(() => ({ type: "pagination-row" })),
  parsePaginationAction: vi.fn(() => null),
  resolvePageFromAction: vi.fn(),
  showPaginationJumpModal: vi.fn(),
}));

describe("bumpReminderConfigCommand.removeUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("登録ユーザーが0人の場合は ValidationError を投げる", async () => {
    getBumpReminderConfigOrDefaultMock.mockResolvedValue({
      enabled: true,
      mentionUserIds: [],
    });

    const interaction = {
      locale: "ja",
      guild: { id: "guild-1" },
      guildId: "guild-1",
      user: { id: "user-1" },
      reply: vi.fn(),
    };

    await expect(
      handleBumpReminderConfigRemoveUsers(interaction as never, "guild-1"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("登録ユーザーがある場合にセレクトメニュー付きで reply する", async () => {
    getBumpReminderConfigOrDefaultMock.mockResolvedValue({
      enabled: true,
      mentionUserIds: ["user-a", "user-b"],
    });

    const replyMock = vi.fn().mockResolvedValue({
      createMessageComponentCollector: () => ({
        on: vi.fn(),
      }),
    });

    const interaction = {
      locale: "ja",
      guild: { id: "guild-1" },
      guildId: "guild-1",
      user: { id: "user-1" },
      reply: replyMock,
    };

    await handleBumpReminderConfigRemoveUsers(interaction as never, "guild-1");

    expect(replyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        components: expect.any(Array),
        flags: 64,
      }),
    );
  });

  it("セレクトメニューで選択した後に削除ボタンで削除が実行される", async () => {
    getBumpReminderConfigOrDefaultMock.mockResolvedValue({
      enabled: true,
      mentionUserIds: ["user-a", "user-b", "user-c"],
    });
    saveBumpReminderConfigMock.mockResolvedValue(undefined);

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

    const editReplyMock = vi.fn().mockResolvedValue(undefined);

    const interaction = {
      locale: "ja",
      guild: { id: "guild-1" },
      guildId: "guild-1",
      user: { id: "user-1" },
      reply: replyMock,
      editReply: editReplyMock,
    };

    await handleBumpReminderConfigRemoveUsers(interaction as never, "guild-1");

    // セレクトメニューで user-a と user-c を選択
    const selectInteraction = {
      customId: "bump-reminder:user-select",
      isStringSelectMenu: () => true,
      values: ["user-a", "user-c"],
      update: vi.fn().mockResolvedValue(undefined),
      user: { id: "user-1" },
    };
    await collectHandlers[0](selectInteraction);
    expect(selectInteraction.update).toHaveBeenCalled();

    // 削除ボタンを押す
    const deleteInteraction = {
      customId: "bump-reminder:user-delete",
      isStringSelectMenu: () => false,
      update: vi.fn().mockResolvedValue(undefined),
      user: { id: "user-1" },
    };
    await collectHandlers[0](deleteInteraction);

    // 一括操作: user-a, user-c を除外した ["user-b"] で保存される
    expect(saveBumpReminderConfigMock).toHaveBeenCalledWith(
      "guild-1",
      expect.objectContaining({
        mentionUserIds: ["user-b"],
      }),
    );
    expect(deleteInteraction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        components: [],
      }),
    );
    expect(collectorMock.stop).toHaveBeenCalled();
  });

  it("全員選択ボタンで全ユーザーが選択される", async () => {
    getBumpReminderConfigOrDefaultMock.mockResolvedValue({
      enabled: true,
      mentionUserIds: ["user-a", "user-b"],
    });
    saveBumpReminderConfigMock.mockResolvedValue(undefined);

    const collectHandlers: ((i: unknown) => Promise<void>)[] = [];

    const collectorMock = {
      on: vi.fn(
        (event: string, handler: (...args: unknown[]) => Promise<void>) => {
          if (event === "collect") collectHandlers.push(handler);
          return collectorMock;
        },
      ),
      stop: vi.fn(),
    };

    const replyMock = vi.fn().mockResolvedValue({
      createMessageComponentCollector: vi.fn(() => collectorMock),
    });

    const interaction = {
      locale: "ja",
      guild: { id: "guild-1" },
      guildId: "guild-1",
      user: { id: "user-1" },
      reply: replyMock,
    };

    await handleBumpReminderConfigRemoveUsers(interaction as never, "guild-1");

    // 全員選択ボタンを押す
    const allSelectInteraction = {
      customId: "bump-reminder:all-user-select",
      isStringSelectMenu: () => false,
      update: vi.fn().mockResolvedValue(undefined),
      user: { id: "user-1" },
    };
    await collectHandlers[0](allSelectInteraction);
    expect(allSelectInteraction.update).toHaveBeenCalled();

    // 削除ボタンを押す
    const deleteInteraction = {
      customId: "bump-reminder:user-delete",
      isStringSelectMenu: () => false,
      update: vi.fn().mockResolvedValue(undefined),
      user: { id: "user-1" },
    };
    await collectHandlers[0](deleteInteraction);

    // 一括操作: 全員除外して空配列で保存される
    expect(saveBumpReminderConfigMock).toHaveBeenCalledWith(
      "guild-1",
      expect.objectContaining({
        mentionUserIds: [],
      }),
    );
    expect(saveBumpReminderConfigMock).toHaveBeenCalledTimes(1);
    expect(collectorMock.stop).toHaveBeenCalled();
  });

  it("タイムアウト時にタイムアウトメッセージを表示する", async () => {
    getBumpReminderConfigOrDefaultMock.mockResolvedValue({
      enabled: true,
      mentionUserIds: ["user-a"],
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
      locale: "ja",
      guild: { id: "guild-1" },
      guildId: "guild-1",
      user: { id: "user-1" },
      reply: replyMock,
      editReply: editReplyMock,
    };

    await handleBumpReminderConfigRemoveUsers(interaction as never, "guild-1");

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

  it("ページネーション prev アクションでページを移動する", async () => {
    const { parsePaginationAction, resolvePageFromAction } = await import(
      "@/bot/shared/pagination"
    );

    getBumpReminderConfigOrDefaultMock.mockResolvedValue({
      enabled: true,
      mentionUserIds: Array.from({ length: 30 }, (_, i) => `user-${i}`),
    });

    const collectHandlers: ((i: unknown) => Promise<void>)[] = [];
    const collectorMock = {
      on: vi.fn(
        (event: string, handler: (...args: unknown[]) => Promise<void>) => {
          if (event === "collect") collectHandlers.push(handler);
          return collectorMock;
        },
      ),
      stop: vi.fn(),
    };

    const replyMock = vi.fn().mockResolvedValue({
      createMessageComponentCollector: vi.fn(() => collectorMock),
    });

    const interaction = {
      locale: "ja",
      guild: { id: "guild-1" },
      guildId: "guild-1",
      user: { id: "user-1" },
      reply: replyMock,
    };

    // parsePaginationAction を "prev" を返すように設定
    (parsePaginationAction as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      "prev",
    );
    (resolvePageFromAction as ReturnType<typeof vi.fn>).mockReturnValueOnce(0);

    await handleBumpReminderConfigRemoveUsers(interaction as never, "guild-1");

    const prevInteraction = {
      customId: "bump-reminder:page-prev",
      update: vi.fn().mockResolvedValue(undefined),
    };
    await collectHandlers[0](prevInteraction);

    expect(resolvePageFromAction).toHaveBeenCalled();
    expect(prevInteraction.update).toHaveBeenCalled();
  });

  it("ページネーション jump アクションでページジャンプモーダルを表示する", async () => {
    const { parsePaginationAction, showPaginationJumpModal } = await import(
      "@/bot/shared/pagination"
    );

    getBumpReminderConfigOrDefaultMock.mockResolvedValue({
      enabled: true,
      mentionUserIds: Array.from({ length: 30 }, (_, i) => `user-${i}`),
    });

    const collectHandlers: ((i: unknown) => Promise<void>)[] = [];
    const collectorMock = {
      on: vi.fn(
        (event: string, handler: (...args: unknown[]) => Promise<void>) => {
          if (event === "collect") collectHandlers.push(handler);
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
      locale: "ja",
      guild: { id: "guild-1" },
      guildId: "guild-1",
      user: { id: "user-1" },
      reply: replyMock,
      editReply: editReplyMock,
      followUp: vi.fn().mockResolvedValue(undefined),
    };

    // parsePaginationAction を "jump" を返すように設定
    (parsePaginationAction as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      "jump",
    );
    (showPaginationJumpModal as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      "1",
    );

    await handleBumpReminderConfigRemoveUsers(interaction as never, "guild-1");

    const jumpInteraction = {
      customId: "bump-reminder:page-jump",
    };
    await collectHandlers[0](jumpInteraction);

    expect(showPaginationJumpModal).toHaveBeenCalled();
    expect(editReplyMock).toHaveBeenCalled();
  });

  it("collector が time 以外の理由で終了した場合はスキップする", async () => {
    getBumpReminderConfigOrDefaultMock.mockResolvedValue({
      enabled: true,
      mentionUserIds: ["user-a"],
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
      locale: "ja",
      guild: { id: "guild-1" },
      guildId: "guild-1",
      user: { id: "user-1" },
      reply: replyMock,
      editReply: editReplyMock,
    };

    await handleBumpReminderConfigRemoveUsers(interaction as never, "guild-1");

    await endHandlers[0](undefined, "user");

    expect(editReplyMock).not.toHaveBeenCalled();
  });
});
