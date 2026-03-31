// tests/unit/bot/features/vc-recruit/handlers/ui/vcRecruitButton.teardown.test.ts
// teardown 確認ボタン（撤去する）の処理を検証
// 特に「DB 削除 → メッセージ削除 → チャンネル削除」の順序を重点的に確認する

import { DiscordAPIError, MessageFlags, RESTJSONErrorCodes } from "discord.js";
import { vcRecruitButtonHandler } from "@/bot/features/vc-recruit/handlers/ui/vcRecruitButton";

// ---- モック定義 ----

const getTeardownConfirmSessionMock = vi.fn();
const deleteTeardownConfirmSessionMock = vi.fn();
const findSetupByPanelChannelIdMock = vi.fn();
const removeSetupMock = vi.fn();
const tInteractionMock = vi.fn(
  (_locale: string, key: string, opts?: Record<string, unknown>) =>
    opts ? `${key}:${JSON.stringify(opts)}` : key,
);

vi.mock("@/bot/features/vc-recruit/handlers/ui/vcRecruitTeardownState", () => ({
  getTeardownConfirmSession: (...args: unknown[]) =>
    getTeardownConfirmSessionMock(...args),
  deleteTeardownConfirmSession: (...args: unknown[]) =>
    deleteTeardownConfirmSessionMock(...args),
  setTeardownConfirmSession: vi.fn(),
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVcRecruitRepository: () => ({
    findSetupByPanelChannelId: (...args: unknown[]) =>
      findSetupByPanelChannelIdMock(...args),
    removeSetup: (...args: unknown[]) => removeSetupMock(...args),
    getVcRecruitConfigOrDefault: vi
      .fn()
      .mockResolvedValue({ setups: [], mentionRoleIds: [] }),
  }),
  getBotVacConfigService: () => ({
    getVacConfigOrDefault: vi.fn().mockResolvedValue({ triggerChannelIds: [] }),
  }),
}));

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (
    prefixKey: string,
    messageKey: string,
    params?: Record<string, unknown>,
    sub?: string,
  ) => {
    const p = `${prefixKey}`;
    const m = params ? `${messageKey}:${JSON.stringify(params)}` : messageKey;
    return sub ? `[${p}:${sub}] ${m}` : `[${p}] ${m}`;
  },
  logCommand: (
    commandName: string,
    messageKey: string,
    params?: Record<string, unknown>,
  ) => {
    const m = params ? `${messageKey}:${JSON.stringify(params)}` : messageKey;
    return `[${commandName}] ${m}`;
  },
  tInteraction: (...args: unknown[]) =>
    tInteractionMock(...(args as Parameters<typeof tInteractionMock>)),
  tDefault: vi.fn((key: string) => key),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: vi.fn((msg: string) => ({ success: msg })),
  createInfoEmbed: vi.fn((msg: string) => ({ info: msg })),
  createWarningEmbed: vi.fn((msg: string) => ({ warning: msg })),
}));

vi.mock("@/bot/utils/interaction", () => ({
  safeReply: vi.fn(),
}));

vi.mock("@/bot/features/vc-recruit/handlers/ui/vcRecruitPanelState", () => ({
  getVcRecruitSession: vi.fn().mockReturnValue(null),
  setVcRecruitSession: vi.fn(),
  deleteVcRecruitSession: vi.fn(),
  NEW_VC_VALUE: "__new__",
}));

vi.mock(
  "@/bot/features/vc-recruit/commands/usecases/vcRecruitConfigTeardown",
  () => ({
    buildTeardownSelectOptions: vi.fn().mockReturnValue([]),
  }),
);

// ---- ヘルパー ----

const GUILD_ID = "guild-1";
const PANEL_CHANNEL_ID = "panel-ch-1";
const POST_CHANNEL_ID = "post-ch-1";
const PANEL_MSG_ID = "panel-msg-1";
const SELECT_INTERACTION_ID = "select-001";
const CONFIRM_PREFIX = "vc-recruit:teardown-confirm:";

/** 実際の DiscordAPIError インスタンスをアプローチした UnknownChannel エラーモックを作成する */
function makeUnknownChannelError(): DiscordAPIError {
  const err = Object.assign(new Error("Unknown Channel"), {
    code: RESTJSONErrorCodes.UnknownChannel,
    status: 404,
    method: "DELETE",
    url: "https://discord.com/api/channels/123",
    rawError: {
      message: "Unknown Channel",
      code: RESTJSONErrorCodes.UnknownChannel,
    },
    requestBody: { files: [], json: undefined },
  });
  Object.setPrototypeOf(err, DiscordAPIError.prototype);
  return err as unknown as DiscordAPIError;
}

function makeSetup(
  overrides?: Partial<{
    panelChannelId: string;
    postChannelId: string;
    panelMessageId: string;
  }>,
) {
  return {
    panelChannelId: PANEL_CHANNEL_ID,
    postChannelId: POST_CHANNEL_ID,
    panelMessageId: PANEL_MSG_ID,
    ...overrides,
  };
}

function makeGuildChannel(deleteMock = vi.fn().mockResolvedValue(undefined)) {
  return {
    id: "ch",
    isTextBased: () => true,
    delete: deleteMock,
    messages: {
      fetch: vi
        .fn()
        .mockResolvedValue({ delete: vi.fn().mockResolvedValue(undefined) }),
    },
  };
}

function makeInteraction(
  customId = `${CONFIRM_PREFIX}${SELECT_INTERACTION_ID}`,
) {
  const panelCh = makeGuildChannel();
  const postCh = makeGuildChannel();
  return {
    customId,
    locale: "ja",
    guild: {
      id: GUILD_ID,
      channels: {
        fetch: vi.fn(async (id: string) => {
          if (id === PANEL_CHANNEL_ID) return panelCh;
          if (id === POST_CHANNEL_ID) return postCh;
          return null;
        }),
        cache: {
          get: vi.fn().mockReturnValue(panelCh),
        },
      },
      roles: { everyone: { id: "everyone" } },
    },
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
  };
}

// ---- テスト ----

describe("vcRecruitButtonHandler / teardown confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findSetupByPanelChannelIdMock.mockResolvedValue(null);
    removeSetupMock.mockResolvedValue(undefined);
  });

  it("セッションが失効していた場合はエフェメラルエラーを返す", async () => {
    const { safeReply } = await import("@/bot/utils/interaction");
    getTeardownConfirmSessionMock.mockReturnValue(null);

    const interaction = makeInteraction();
    await vcRecruitButtonHandler.execute(interaction as never);

    expect(safeReply).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
    expect(removeSetupMock).not.toHaveBeenCalled();
  });

  it("DB にレコードがない場合はそのエントリをスキップする", async () => {
    getTeardownConfirmSessionMock.mockReturnValue({
      guildId: GUILD_ID,
      selectedSetups: [
        { panelChannelId: PANEL_CHANNEL_ID, categoryLabel: "TOP" },
      ],
    });
    findSetupByPanelChannelIdMock.mockResolvedValue(null);

    const interaction = makeInteraction();
    await vcRecruitButtonHandler.execute(interaction as never);

    expect(removeSetupMock).not.toHaveBeenCalled();
  });

  it("removeSetup が channel.delete より先に呼ばれる（DB 削除優先）", async () => {
    getTeardownConfirmSessionMock.mockReturnValue({
      guildId: GUILD_ID,
      selectedSetups: [
        { panelChannelId: PANEL_CHANNEL_ID, categoryLabel: "TOP" },
      ],
    });
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());

    // 呼び出し順序を記録する
    const callOrder: string[] = [];
    removeSetupMock.mockImplementation(async () => {
      callOrder.push("removeSetup");
    });

    const panelChDelete = vi.fn().mockImplementation(async () => {
      callOrder.push("panelChannel.delete");
    });
    const postChDelete = vi.fn().mockImplementation(async () => {
      callOrder.push("postChannel.delete");
    });

    const interaction = {
      ...makeInteraction(),
      guild: {
        id: GUILD_ID,
        channels: {
          fetch: vi.fn(async (id: string) => {
            if (id === PANEL_CHANNEL_ID)
              return { id: PANEL_CHANNEL_ID, delete: panelChDelete };
            if (id === POST_CHANNEL_ID)
              return { id: POST_CHANNEL_ID, delete: postChDelete };
            return null;
          }),
          cache: {
            get: vi.fn().mockReturnValue(null), // メッセージ削除はスキップ
          },
        },
      },
      deferUpdate: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue(undefined),
    };

    await vcRecruitButtonHandler.execute(interaction as never);

    expect(callOrder[0]).toBe("removeSetup");
    expect(callOrder).toContain("panelChannel.delete");
    expect(callOrder).toContain("postChannel.delete");
    expect(callOrder.indexOf("removeSetup")).toBeLessThan(
      callOrder.indexOf("panelChannel.delete"),
    );
    expect(callOrder.indexOf("removeSetup")).toBeLessThan(
      callOrder.indexOf("postChannel.delete"),
    );
  });

  it("チャンネルが既に削除されている場合もエラーにならず成功する", async () => {
    getTeardownConfirmSessionMock.mockReturnValue({
      guildId: GUILD_ID,
      selectedSetups: [
        { panelChannelId: PANEL_CHANNEL_ID, categoryLabel: "TOP" },
      ],
    });
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());

    const interaction = {
      ...makeInteraction(),
      guild: {
        id: GUILD_ID,
        channels: {
          fetch: vi.fn().mockResolvedValue(null), // 全チャンネルが見つからない
          cache: { get: vi.fn().mockReturnValue(null) },
        },
      },
      deferUpdate: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue(undefined),
    };

    await vcRecruitButtonHandler.execute(interaction as never);

    expect(removeSetupMock).toHaveBeenCalledWith(GUILD_ID, PANEL_CHANNEL_ID);
    expect(interaction.editReply).toHaveBeenCalled();
  });

  it("UnknownChannel DiscordAPIError は吸収されて成功扱いになる（冪等性）", async () => {
    getTeardownConfirmSessionMock.mockReturnValue({
      guildId: GUILD_ID,
      selectedSetups: [
        { panelChannelId: PANEL_CHANNEL_ID, categoryLabel: "TOP" },
      ],
    });
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());

    // fetch は成功するが delete() が UnknownChannel エラー
    const throwingDelete = vi.fn().mockRejectedValue(makeUnknownChannelError());

    const interaction = {
      ...makeInteraction(),
      guild: {
        id: GUILD_ID,
        channels: {
          fetch: vi
            .fn()
            .mockResolvedValue({ id: "ch", delete: throwingDelete }),
          cache: { get: vi.fn().mockReturnValue(null) },
        },
      },
      deferUpdate: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      vcRecruitButtonHandler.execute(interaction as never),
    ).resolves.toBeUndefined();

    expect(throwingDelete).toHaveBeenCalled();
    expect(removeSetupMock).toHaveBeenCalledWith(GUILD_ID, PANEL_CHANNEL_ID);
    // エラーが吸収されたので errorLines はなく、メインが successLines に入る
    const editArg = (interaction.editReply as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as { embeds: Array<{ success: string }> };
    expect(editArg.embeds[0].success).not.toContain("teardown_partial_error");
  });

  it("UnknownChannel 以外のエラー（Missing Permissions 等）は errorLines に記録される", async () => {
    getTeardownConfirmSessionMock.mockReturnValue({
      guildId: GUILD_ID,
      selectedSetups: [
        { panelChannelId: PANEL_CHANNEL_ID, categoryLabel: "TOP" },
      ],
    });
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());

    // fetch は成功するが delete() が Missing Permissions エラー（普通の Error）
    const throwingDelete = vi
      .fn()
      .mockRejectedValue(new Error("Missing Permissions"));

    const interaction = {
      ...makeInteraction(),
      guild: {
        id: GUILD_ID,
        channels: {
          fetch: vi
            .fn()
            .mockResolvedValue({ id: "ch", delete: throwingDelete }),
          cache: { get: vi.fn().mockReturnValue(null) },
        },
      },
      deferUpdate: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      vcRecruitButtonHandler.execute(interaction as never),
    ).resolves.toBeUndefined();

    expect(throwingDelete).toHaveBeenCalled();
    expect(removeSetupMock).toHaveBeenCalledWith(GUILD_ID, PANEL_CHANNEL_ID);
    // エラーが errorLines に入ったので partial_error ヘッダーが含まれる
    const editArg = (interaction.editReply as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as { embeds: Array<{ success: string }> };
    expect(editArg.embeds[0].success).toContain("teardown_partial_error");
    expect(editArg.embeds[0].success).toContain("Missing Permissions");
  });

  it("複数セットアップの一部が失敗しても残りは処理されエラーが報告される", async () => {
    getTeardownConfirmSessionMock.mockReturnValue({
      guildId: GUILD_ID,
      selectedSetups: [
        { panelChannelId: "panel-a", categoryLabel: "カテゴリーA" },
        { panelChannelId: "panel-b", categoryLabel: "カテゴリーB" },
      ],
    });

    findSetupByPanelChannelIdMock
      .mockResolvedValueOnce(
        makeSetup({ panelChannelId: "panel-a", postChannelId: "post-a" }),
      )
      .mockResolvedValueOnce(
        makeSetup({ panelChannelId: "panel-b", postChannelId: "post-b" }),
      );

    // 最初のエントリは removeSetup でエラー
    removeSetupMock
      .mockRejectedValueOnce(new Error("DB error"))
      .mockResolvedValueOnce(undefined);

    const interaction = {
      ...makeInteraction(),
      guild: {
        id: GUILD_ID,
        channels: {
          fetch: vi.fn().mockResolvedValue(null),
          cache: { get: vi.fn().mockReturnValue(null) },
        },
      },
      deferUpdate: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue(undefined),
    };

    await vcRecruitButtonHandler.execute(interaction as never);

    // 両エントリが処理された（2回 findSetupByPanelChannelId が呼ばれた）
    expect(findSetupByPanelChannelIdMock).toHaveBeenCalledTimes(2);
    expect(interaction.editReply).toHaveBeenCalled();
  });

  it("postChannel 削除時に UnknownChannel 以外のエラーが throw されると errorLines に記録される", async () => {
    getTeardownConfirmSessionMock.mockReturnValue({
      guildId: GUILD_ID,
      selectedSetups: [
        { panelChannelId: PANEL_CHANNEL_ID, categoryLabel: "TOP" },
      ],
    });
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());

    // postChannel の delete のみ Missing Permissions で失敗させる
    const throwingDelete = vi
      .fn()
      .mockRejectedValue(new Error("Missing Permissions"));
    const panelCh = makeGuildChannel(); // 正常に削除
    const postCh = makeGuildChannel(throwingDelete); // 削除失敗

    const interaction = {
      ...makeInteraction(),
      guild: {
        id: GUILD_ID,
        channels: {
          fetch: vi.fn(async (id: string) => {
            if (id === PANEL_CHANNEL_ID) return panelCh;
            if (id === POST_CHANNEL_ID) return postCh;
            return null;
          }),
          cache: { get: vi.fn().mockReturnValue(null) },
        },
      },
      deferUpdate: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      vcRecruitButtonHandler.execute(interaction as never),
    ).resolves.toBeUndefined();

    expect(throwingDelete).toHaveBeenCalled();
    expect(removeSetupMock).toHaveBeenCalledWith(GUILD_ID, PANEL_CHANNEL_ID);
    // postChannel のエラーが errorLines に入り partial_error ヘッダーが含まれる
    const editArg = (interaction.editReply as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as { embeds: Array<{ success: string }> };
    expect(editArg.embeds[0].success).toContain("teardown_partial_error");
    expect(editArg.embeds[0].success).toContain("Missing Permissions");
  });
});

describe("vcRecruitButtonHandler / teardown cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("CANCEL ボタンでセッションを削除してキャンセル成功 embed を表示する", async () => {
    const interaction = {
      customId: `vc-recruit:teardown-cancel:${SELECT_INTERACTION_ID}`,
      guild: { id: GUILD_ID },
      update: vi.fn().mockResolvedValue(undefined),
      deferUpdate: vi.fn(),
      editReply: vi.fn(),
    };

    await vcRecruitButtonHandler.execute(interaction as never);

    expect(deleteTeardownConfirmSessionMock).toHaveBeenCalledWith(
      SELECT_INTERACTION_ID,
    );
    expect(interaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ components: [] }),
    );
  });

  it("guild が null の場合は早期リターンして何もしない", async () => {
    const interaction = {
      customId: `vc-recruit:teardown-cancel:${SELECT_INTERACTION_ID}`,
      guild: null,
      update: vi.fn(),
    };

    await vcRecruitButtonHandler.execute(interaction as never);

    expect(interaction.update).not.toHaveBeenCalled();
  });
});

describe("vcRecruitButtonHandler / teardown redo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("REDO ボタンでセッションを削除して teardown セレクトメニューを再表示する", async () => {
    const interaction = {
      customId: `vc-recruit:teardown-redo:${SELECT_INTERACTION_ID}`,
      guild: { id: GUILD_ID },
      id: "new-interaction-1",
      update: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue(undefined),
      deferUpdate: vi.fn(),
    };

    await vcRecruitButtonHandler.execute(interaction as never);

    expect(deleteTeardownConfirmSessionMock).toHaveBeenCalledWith(
      SELECT_INTERACTION_ID,
    );
    expect(interaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ components: expect.any(Array) }),
    );
  });

  it("REDO の 60秒後にセレクトメニューが無効化される", async () => {
    vi.useFakeTimers();
    const interaction = {
      customId: `vc-recruit:teardown-redo:${SELECT_INTERACTION_ID}`,
      guild: { id: GUILD_ID },
      id: "new-interaction-2",
      update: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue(undefined),
      deferUpdate: vi.fn(),
    };

    await vcRecruitButtonHandler.execute(interaction as never);
    await vi.runAllTimersAsync();

    expect(interaction.editReply).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("タイムアウト後に editReply が throw しても（トークン失効）エラーにならない", async () => {
    vi.useFakeTimers();
    const interaction = {
      customId: `vc-recruit:teardown-redo:${SELECT_INTERACTION_ID}`,
      guild: { id: GUILD_ID },
      id: "new-interaction-3",
      update: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockRejectedValue(new Error("InteractionExpired")),
      deferUpdate: vi.fn(),
    };

    await vcRecruitButtonHandler.execute(interaction as never);
    // setTimeout のコールバックを実行。editReply が失敗しても .catch(() => null) で吸収される
    await vi.runAllTimersAsync();

    expect(interaction.editReply).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
