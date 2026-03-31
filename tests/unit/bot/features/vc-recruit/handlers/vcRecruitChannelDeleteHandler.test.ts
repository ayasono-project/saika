// tests/unit/bot/features/vc-recruit/handlers/vcRecruitChannelDeleteHandler.test.ts

import { ChannelType } from "discord.js";
import { handleVcRecruitChannelDelete } from "@/bot/features/vc-recruit/handlers/vcRecruitChannelDeleteHandler";
import { logger } from "@/shared/utils/logger";

// ---- モック定義 ----

const findSetupByPanelChannelIdMock = vi.fn();
const findSetupByPostChannelIdMock = vi.fn();
const findSetupByCreatedVcIdMock = vi.fn();
const removeSetupMock = vi.fn();
const removeCreatedVoiceChannelIdMock = vi.fn();

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVcRecruitRepository: () => ({
    findSetupByPanelChannelId: (...args: unknown[]) =>
      findSetupByPanelChannelIdMock(...args),
    findSetupByPostChannelId: (...args: unknown[]) =>
      findSetupByPostChannelIdMock(...args),
    findSetupByCreatedVcId: (...args: unknown[]) =>
      findSetupByCreatedVcIdMock(...args),
    removeSetup: (...args: unknown[]) => removeSetupMock(...args),
    removeCreatedVoiceChannelId: (...args: unknown[]) =>
      removeCreatedVoiceChannelIdMock(...args),
  }),
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn() },
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
  tGuild: vi.fn(async (_guildId: string, key: string) => key),
  tInteraction: vi.fn((_locale: string, key: string) => key),
  tDefault: vi.fn((key: string) => key),
}));

// ---- ヘルパー ----

const GUILD_ID = "guild-1";

/** テキストチャンネルのモックを作成 */
function makeGuildChannel(
  id: string,
  opts: {
    fetchResult?: { delete?: ReturnType<typeof vi.fn> } | null;
  } = {},
) {
  const fetchResult =
    opts.fetchResult === undefined
      ? { delete: vi.fn().mockResolvedValue(undefined) }
      : opts.fetchResult;

  return {
    id,
    guildId: GUILD_ID,
    type: ChannelType.GuildText,
    isDMBased: () => false,
    guild: {
      channels: {
        fetch: vi.fn().mockResolvedValue(fetchResult),
      },
    },
  };
}

/** DM チャンネルのモックを作成 */
function makeDMChannel() {
  return {
    id: "dm-1",
    type: ChannelType.DM,
    isDMBased: () => true,
  };
}

// VC募集 channelDelete ハンドラーの動作を検証
describe("bot/features/vc-recruit/handlers/vcRecruitChannelDeleteHandler", () => {
  // beforeEach: 各テストの前にモックをリセットして副作用を分離する
  beforeEach(() => {
    vi.clearAllMocks();
    findSetupByPanelChannelIdMock.mockResolvedValue(null);
    findSetupByPostChannelIdMock.mockResolvedValue(null);
    findSetupByCreatedVcIdMock.mockResolvedValue(null);
    removeSetupMock.mockResolvedValue(undefined);
    removeCreatedVoiceChannelIdMock.mockResolvedValue(undefined);
  });

  it("DM チャンネルは対象外でリポジトリを呼ばない", async () => {
    const channel = makeDMChannel();
    await handleVcRecruitChannelDelete(channel as never);

    expect(findSetupByPanelChannelIdMock).not.toHaveBeenCalled();
    expect(findSetupByPostChannelIdMock).not.toHaveBeenCalled();
  });

  it("登録外のチャンネル（パネルでも投稿でもない）は何もしない", async () => {
    const channel = makeGuildChannel("unknown-ch");
    await handleVcRecruitChannelDelete(channel as never);

    expect(removeSetupMock).not.toHaveBeenCalled();
  });

  it("パネルチャンネルが削除されたとき、投稿チャンネルを削除して DB からも削除する", async () => {
    const setup = {
      panelChannelId: "panel-ch-1",
      postChannelId: "post-ch-1",
    };
    findSetupByPanelChannelIdMock.mockResolvedValue(setup);

    const deleteMock = vi.fn().mockResolvedValue(undefined);
    const channel = makeGuildChannel("panel-ch-1", {
      fetchResult: { delete: deleteMock },
    });

    await handleVcRecruitChannelDelete(channel as never);

    expect(findSetupByPanelChannelIdMock).toHaveBeenCalledWith(
      GUILD_ID,
      "panel-ch-1",
    );
    expect(channel.guild.channels.fetch).toHaveBeenCalledWith("post-ch-1");
    expect(deleteMock).toHaveBeenCalled();
    expect(removeSetupMock).toHaveBeenCalledWith(GUILD_ID, "panel-ch-1");
    // 投稿チャンネルで findSetupByPostChannelId は呼ばれない（早期 return）
    expect(findSetupByPostChannelIdMock).not.toHaveBeenCalled();
  });

  it("投稿チャンネルが削除されたとき、パネルチャンネルを削除して DB からも削除する", async () => {
    const setup = {
      panelChannelId: "panel-ch-2",
      postChannelId: "post-ch-2",
    };
    findSetupByPostChannelIdMock.mockResolvedValue(setup);

    const deleteMock = vi.fn().mockResolvedValue(undefined);
    const channel = makeGuildChannel("post-ch-2", {
      fetchResult: { delete: deleteMock },
    });

    await handleVcRecruitChannelDelete(channel as never);

    expect(findSetupByPanelChannelIdMock).toHaveBeenCalledWith(
      GUILD_ID,
      "post-ch-2",
    );
    expect(findSetupByPostChannelIdMock).toHaveBeenCalledWith(
      GUILD_ID,
      "post-ch-2",
    );
    expect(channel.guild.channels.fetch).toHaveBeenCalledWith("panel-ch-2");
    expect(deleteMock).toHaveBeenCalled();
    expect(removeSetupMock).toHaveBeenCalledWith(GUILD_ID, "panel-ch-2");
  });

  it("パネル削除時にペアのチャンネルが既に消えていても（fetch null）エラーにならない", async () => {
    const setup = {
      panelChannelId: "panel-ch-3",
      postChannelId: "post-ch-3",
    };
    findSetupByPanelChannelIdMock.mockResolvedValue(setup);

    const channel = makeGuildChannel("panel-ch-3", { fetchResult: null });

    await expect(
      handleVcRecruitChannelDelete(channel as never),
    ).resolves.toBeUndefined();

    expect(removeSetupMock).toHaveBeenCalledWith(GUILD_ID, "panel-ch-3");
  });

  it("投稿削除時にペアのチャンネルが既に消えていても（fetch null）エラーにならない", async () => {
    const setup = {
      panelChannelId: "panel-ch-4",
      postChannelId: "post-ch-4",
    };
    findSetupByPostChannelIdMock.mockResolvedValue(setup);

    const channel = makeGuildChannel("post-ch-4", { fetchResult: null });

    await expect(
      handleVcRecruitChannelDelete(channel as never),
    ).resolves.toBeUndefined();

    expect(removeSetupMock).toHaveBeenCalledWith(GUILD_ID, "panel-ch-4");
  });

  it("パネル削除時に投稿チャンネルの delete() が throw しても成功し logger.error を出力する", async () => {
    const setup = {
      panelChannelId: "panel-ch-5",
      postChannelId: "post-ch-5",
    };
    findSetupByPanelChannelIdMock.mockResolvedValue(setup);

    // fetch は成功するが delete() が throw
    const throwingDelete = vi
      .fn()
      .mockRejectedValue(new Error("DiscordAPIError: Missing Permissions"));
    const channel = makeGuildChannel("panel-ch-5", {
      fetchResult: { delete: throwingDelete },
    });

    await expect(
      handleVcRecruitChannelDelete(channel as never),
    ).resolves.toBeUndefined();

    expect(throwingDelete).toHaveBeenCalled();
    expect(removeSetupMock).toHaveBeenCalledWith(GUILD_ID, "panel-ch-5");
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("post_channel_delete_failed"),
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });

  it("投稿削除時にパネルチャンネルの delete() が throw しても成功し logger.error を出力する", async () => {
    const setup = {
      panelChannelId: "panel-ch-6",
      postChannelId: "post-ch-6",
    };
    findSetupByPostChannelIdMock.mockResolvedValue(setup);

    const throwingDelete = vi
      .fn()
      .mockRejectedValue(new Error("DiscordAPIError: Missing Permissions"));
    const channel = makeGuildChannel("post-ch-6", {
      fetchResult: { delete: throwingDelete },
    });

    await expect(
      handleVcRecruitChannelDelete(channel as never),
    ).resolves.toBeUndefined();

    expect(throwingDelete).toHaveBeenCalled();
    expect(removeSetupMock).toHaveBeenCalledWith(GUILD_ID, "panel-ch-6");
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("panel_channel_cleanup_failed"),
      expect.objectContaining({ error: expect.any(Error) }),
    );
  });

  it("作成VCが手動削除された場合、DBから削除し投稿ボタンをVC終了済みに更新する", async () => {
    const setup = {
      panelChannelId: "panel-ch-7",
      postChannelId: "post-ch-7",
    };
    findSetupByCreatedVcIdMock.mockResolvedValue(setup);

    const editMock = vi.fn().mockResolvedValue(undefined);
    const msgWithTarget = {
      components: [
        {
          components: [
            { customId: "vc-recruit:end-vc:user-1:vc-deleted-1" },
            { customId: "vc-recruit:delete-post:user-1:vc-deleted-1" },
          ],
        },
      ],
      embeds: [{ toJSON: () => ({ title: "📢 VC募集" }) }],
      edit: editMock,
    };
    const msgWithoutTarget = {
      components: [
        {
          components: [{ customId: "vc-recruit:end-vc:user-2:other-vc" }],
        },
      ],
      embeds: [],
      edit: vi.fn(),
    };

    const messagesFetchMock = vi.fn().mockResolvedValue(
      new Map([
        ["msg-1", msgWithTarget],
        ["msg-2", msgWithoutTarget],
      ]),
    );
    const postChannel = {
      id: "post-ch-7",
      messages: { fetch: messagesFetchMock },
    };

    const channel = {
      id: "vc-deleted-1",
      guildId: GUILD_ID,
      isDMBased: () => false,
      guild: {
        channels: {
          fetch: vi.fn().mockResolvedValue(postChannel),
        },
      },
    };

    await handleVcRecruitChannelDelete(channel as never);

    expect(removeCreatedVoiceChannelIdMock).toHaveBeenCalledWith(
      GUILD_ID,
      "vc-deleted-1",
    );
    expect(editMock).toHaveBeenCalledWith(
      expect.objectContaining({ components: expect.any(Array) }),
    );
    // 無関係なメッセージは更新されない
    expect(msgWithoutTarget.edit).not.toHaveBeenCalled();
  });

  it("作成VCが削除されたが投稿チャンネルが見つからない場合もエラーにならない", async () => {
    const setup = {
      panelChannelId: "panel-ch-8",
      postChannelId: "post-ch-8",
    };
    findSetupByCreatedVcIdMock.mockResolvedValue(setup);

    const channel = {
      id: "vc-deleted-2",
      guildId: GUILD_ID,
      isDMBased: () => false,
      guild: {
        channels: {
          fetch: vi.fn().mockResolvedValue(null),
        },
      },
    };

    await expect(
      handleVcRecruitChannelDelete(channel as never),
    ).resolves.toBeUndefined();

    expect(removeCreatedVoiceChannelIdMock).toHaveBeenCalledWith(
      GUILD_ID,
      "vc-deleted-2",
    );
  });
});
