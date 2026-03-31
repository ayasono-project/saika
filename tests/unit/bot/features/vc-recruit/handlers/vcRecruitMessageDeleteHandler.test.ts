// tests/unit/bot/features/vc-recruit/handlers/vcRecruitMessageDeleteHandler.test.ts
import { handleVcRecruitMessageDelete } from "@/bot/features/vc-recruit/handlers/vcRecruitMessageDeleteHandler";

// ---- モック定義 ----

const findSetupByPanelChannelIdMock = vi.fn();
const updatePanelMessageIdMock = vi.fn();

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVcRecruitRepository: () => ({
    findSetupByPanelChannelId: (...args: unknown[]) =>
      findSetupByPanelChannelIdMock(...args),
    updatePanelMessageId: (...args: unknown[]) =>
      updatePanelMessageIdMock(...args),
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
  tDefault: vi.fn((key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
}));

vi.mock("@/bot/features/vc-recruit/commands/vcRecruitPanelEmbed", () => ({
  buildVcRecruitPanelComponents: vi.fn(async () => ({
    embed: { title: "panel" },
    row: { components: [] },
  })),
}));

// ---- ヘルパー ----

const GUILD_ID = "guild-1";
const PANEL_CHANNEL_ID = "panel-ch-1";
const OLD_MSG_ID = "old-msg-1";
const NEW_MSG_ID = "new-msg-2";

function makeSetup() {
  return {
    panelChannelId: PANEL_CHANNEL_ID,
    postChannelId: "post-ch-1",
    panelMessageId: OLD_MSG_ID,
  };
}

function makeSendablePanelChannel() {
  return {
    id: PANEL_CHANNEL_ID,
    isSendable: () => true,
    send: vi.fn().mockResolvedValue({ id: NEW_MSG_ID }),
  };
}

function makeMessage(
  overrides?: Partial<{
    guildId: string | null;
    channelId: string | null;
    id: string;
    guild: unknown;
  }>,
) {
  return {
    id: OLD_MSG_ID,
    guildId: GUILD_ID,
    channelId: PANEL_CHANNEL_ID,
    guild: {
      channels: {
        fetch: vi.fn().mockResolvedValue(makeSendablePanelChannel()),
      },
    },
    ...overrides,
  };
}

// VC募集 messageDelete ハンドラーの動作を検証
describe("bot/features/vc-recruit/handlers/vcRecruitMessageDeleteHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findSetupByPanelChannelIdMock.mockResolvedValue(null);
    updatePanelMessageIdMock.mockResolvedValue(undefined);
  });

  it("guildId がない（DM）メッセージはスキップする", async () => {
    const msg = makeMessage({ guildId: null });
    await handleVcRecruitMessageDelete(msg as never);

    expect(findSetupByPanelChannelIdMock).not.toHaveBeenCalled();
  });

  it("channelId がない場合はスキップする", async () => {
    const msg = makeMessage({ channelId: null });
    await handleVcRecruitMessageDelete(msg as never);

    expect(findSetupByPanelChannelIdMock).not.toHaveBeenCalled();
  });

  it("guild が null の PartialMessage はスキップする（キャッシュなし）", async () => {
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());
    const msg = makeMessage({ guild: null });

    await handleVcRecruitMessageDelete(msg as never);

    expect(updatePanelMessageIdMock).not.toHaveBeenCalled();
  });

  it("パネルチャンネルとして登録されていないチャンネルのメッセージは何もしない", async () => {
    const msg = makeMessage();
    // findSetupByPanelChannelId が null を返す（デフォルト）

    await handleVcRecruitMessageDelete(msg as never);

    expect(updatePanelMessageIdMock).not.toHaveBeenCalled();
  });

  it("パネルチャンネルのメッセージだが panelMessageId と一致しない場合は何もしない", async () => {
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());
    const msg = makeMessage({ id: "other-msg-99" });

    await handleVcRecruitMessageDelete(msg as never);

    expect(updatePanelMessageIdMock).not.toHaveBeenCalled();
  });

  it("panelMessageId のメッセージが削除されたとき、パネルを再送信して DB を更新する", async () => {
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());
    const panelChannel = makeSendablePanelChannel();
    const msg = makeMessage({
      guild: {
        channels: {
          fetch: vi.fn().mockResolvedValue(panelChannel),
        },
      },
    });

    await handleVcRecruitMessageDelete(msg as never);

    expect(panelChannel.send).toHaveBeenCalled();
    expect(updatePanelMessageIdMock).toHaveBeenCalledWith(
      GUILD_ID,
      PANEL_CHANNEL_ID,
      NEW_MSG_ID,
    );
  });

  it("パネルチャンネルの fetch が失敗しても（削除済みなど）エラーにならない", async () => {
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());
    const msg = makeMessage({
      guild: {
        channels: {
          fetch: vi.fn().mockResolvedValue(null),
        },
      },
    });

    await expect(
      handleVcRecruitMessageDelete(msg as never),
    ).resolves.toBeUndefined();

    expect(updatePanelMessageIdMock).not.toHaveBeenCalled();
  });

  it("send が失敗してもエラーにならない", async () => {
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());
    const panelChannel = {
      ...makeSendablePanelChannel(),
      send: vi.fn().mockResolvedValue(null),
    };
    const msg = makeMessage({
      guild: {
        channels: {
          fetch: vi.fn().mockResolvedValue(panelChannel),
        },
      },
    });

    await expect(
      handleVcRecruitMessageDelete(msg as never),
    ).resolves.toBeUndefined();

    expect(updatePanelMessageIdMock).not.toHaveBeenCalled();
  });
});
