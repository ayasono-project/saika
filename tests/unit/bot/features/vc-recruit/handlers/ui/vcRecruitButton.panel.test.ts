// tests/unit/bot/features/vc-recruit/handlers/ui/vcRecruitButton.panel.test.ts
// 「VC募集を作成」ボタン（CREATE）と「次へ（詳細入力）」ボタン（MODAL_OPEN）の動作を検証

import { MessageFlags } from "discord.js";
import { vcRecruitButtonHandler } from "@/bot/features/vc-recruit/handlers/ui/vcRecruitButton";

// ---- モック定義 ----

const findSetupByPanelChannelIdMock = vi.fn();
const getVcRecruitConfigOrDefaultMock = vi.fn();
const getVacConfigOrDefaultMock = vi.fn();
const getVcRecruitSessionMock = vi.fn();
const setVcRecruitSessionMock = vi.fn();
const safeReplyMock = vi.fn();
const tInteractionMock = vi.fn((_locale: string, key: string) => key);

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVcRecruitRepository: () => ({
    findSetupByPanelChannelId: (...args: unknown[]) =>
      findSetupByPanelChannelIdMock(...args),
    getVcRecruitConfigOrDefault: (...args: unknown[]) =>
      getVcRecruitConfigOrDefaultMock(...args),
  }),
  getBotVacConfigService: () => ({
    getVacConfigOrDefault: (...args: unknown[]) =>
      getVacConfigOrDefaultMock(...args),
  }),
}));
vi.mock("@/bot/features/vc-recruit/handlers/ui/vcRecruitPanelState", () => ({
  getVcRecruitSession: (...args: unknown[]) => getVcRecruitSessionMock(...args),
  setVcRecruitSession: (...args: unknown[]) => setVcRecruitSessionMock(...args),
  deleteVcRecruitSession: vi.fn(),
  updateVcRecruitSession: vi.fn(),
  NEW_VC_VALUE: "__new__",
}));
vi.mock("@/bot/features/vc-recruit/handlers/ui/vcRecruitTeardownState", () => ({
  getTeardownConfirmSession: vi.fn().mockReturnValue(null),
  deleteTeardownConfirmSession: vi.fn(),
  setTeardownConfirmSession: vi.fn(),
}));
vi.mock(
  "@/bot/features/vc-recruit/commands/usecases/vcRecruitConfigTeardown",
  () => ({
    buildTeardownSelectOptions: vi.fn().mockReturnValue([]),
  }),
);
vi.mock("@/bot/utils/interaction", () => ({
  safeReply: (...args: unknown[]) => safeReplyMock(...args),
}));
vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: vi.fn((msg: string) => ({ success: msg })),
  createInfoEmbed: vi.fn((msg: string) => ({ info: msg })),
  createWarningEmbed: vi.fn((msg: string) => ({ warning: msg })),
  STATUS_COLORS: {
    success: 0x57f287,
    info: 0x3498db,
    warning: 0xfee75c,
    error: 0xed4245,
  },
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

// ---- ヘルパー定数 ----

const GUILD_ID = "guild-1";
const PANEL_CH_ID = "panel-ch-1";
const CREATE_PREFIX = "vc-recruit:create:";
const MODAL_OPEN_PREFIX = "vc-recruit:open-modal:";

function makeGuild(
  opts: {
    panelChannel?: unknown;
    guildVcs?: {
      id: string;
      position: number;
      type: number;
      parentId: string | null;
    }[];
  } = {},
) {
  const { panelChannel = null, guildVcs = [] } = opts;

  const cacheMap = new Map(guildVcs.map((vc) => [vc.id, vc]));

  return {
    id: GUILD_ID,
    roles: {
      cache: new Map(),
    },
    channels: {
      fetch: vi.fn().mockResolvedValue(panelChannel),
      cache: {
        filter: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            toJSON: vi.fn().mockReturnValue(guildVcs),
          }),
        }),
        get: (id: string) => cacheMap.get(id),
      },
    },
    members: {
      me: { id: "bot-me" },
    },
  };
}

function makeCreateButtonInteraction(
  customId: string,
  guild: ReturnType<typeof makeGuild> | null = makeGuild(),
) {
  return {
    customId,
    guild,
    locale: "ja",
    user: { id: "user-1" },
    id: "interaction-create-1",
    reply: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
  };
}

function makeModalOpenButtonInteraction(
  sessionId: string,
  guild: ReturnType<typeof makeGuild> | null = makeGuild(),
) {
  return {
    customId: `${MODAL_OPEN_PREFIX}${sessionId}`,
    guild,
    locale: "ja",
    user: { id: "user-1" },
    id: "interaction-modal-1",
    reply: vi.fn().mockResolvedValue(undefined),
    showModal: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
  };
}

// ---- テスト ----

describe("vcRecruitButtonHandler / matches()", () => {
  it("CREATE ボタンプレフィックスに一致する", () => {
    expect(vcRecruitButtonHandler.matches(`${CREATE_PREFIX}panel-ch-1`)).toBe(
      true,
    );
  });

  it("MODAL_OPEN ボタンプレフィックスに一致する", () => {
    expect(
      vcRecruitButtonHandler.matches(`${MODAL_OPEN_PREFIX}session-1`),
    ).toBe(true);
  });

  it("teardown CONFIRM プレフィックスに一致する", () => {
    expect(
      vcRecruitButtonHandler.matches("vc-recruit:teardown-confirm:session-1"),
    ).toBe(true);
  });

  it("teardown CANCEL プレフィックスに一致する", () => {
    expect(
      vcRecruitButtonHandler.matches("vc-recruit:teardown-cancel:session-1"),
    ).toBe(true);
  });

  it("teardown REDO プレフィックスに一致する", () => {
    expect(
      vcRecruitButtonHandler.matches("vc-recruit:teardown-redo:session-1"),
    ).toBe(true);
  });

  it("無関係な customId には一致しない", () => {
    expect(vcRecruitButtonHandler.matches("vac:some-button")).toBe(false);
    expect(vcRecruitButtonHandler.matches("")).toBe(false);
  });
});

describe("vcRecruitButtonHandler / CREATE button (「VC募集を作成」)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getVcRecruitConfigOrDefaultMock.mockResolvedValue({
      mentionRoleIds: [],
    });
    getVacConfigOrDefaultMock.mockResolvedValue({ triggerChannelIds: [] });
    safeReplyMock.mockResolvedValue(undefined);
  });

  it("guild が null の場合は早期リターンして何もしない", async () => {
    const interaction = makeCreateButtonInteraction(
      `${CREATE_PREFIX}${PANEL_CH_ID}`,
      null,
    );
    await vcRecruitButtonHandler.execute(interaction as never);

    expect(safeReplyMock).not.toHaveBeenCalled();
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it("パネルチャンネルが見つからない場合はエラー返信する", async () => {
    const guild = makeGuild({ panelChannel: null });
    const interaction = makeCreateButtonInteraction(
      `${CREATE_PREFIX}${PANEL_CH_ID}`,
      guild,
    );
    await vcRecruitButtonHandler.execute(interaction as never);

    expect(safeReplyMock).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
  });

  it("セットアップが見つからない場合はエラー返信する", async () => {
    const panelChannel = { id: PANEL_CH_ID, name: "panel" };
    const guild = makeGuild({ panelChannel });
    findSetupByPanelChannelIdMock.mockResolvedValue(null);

    const interaction = makeCreateButtonInteraction(
      `${CREATE_PREFIX}${PANEL_CH_ID}`,
      guild,
    );
    await vcRecruitButtonHandler.execute(interaction as never);

    expect(safeReplyMock).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
  });

  it("正常なケースではセレクトメニューと「次へ」ボタンを含むエフェメラルで返信する", async () => {
    const panelChannel = { id: PANEL_CH_ID, name: "panel" };
    const guild = makeGuild({ panelChannel });
    findSetupByPanelChannelIdMock.mockResolvedValue({
      categoryId: null,
      panelChannelId: PANEL_CH_ID,
      postChannelId: "post-ch-1",
    });

    const interaction = makeCreateButtonInteraction(
      `${CREATE_PREFIX}${PANEL_CH_ID}`,
      guild,
    );
    await vcRecruitButtonHandler.execute(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        components: expect.any(Array),
        flags: MessageFlags.Ephemeral,
      }),
    );
    // セッションが保存される
    expect(setVcRecruitSessionMock).toHaveBeenCalledWith(
      interaction.id,
      expect.objectContaining({ panelChannelId: PANEL_CH_ID }),
    );
  });
});

describe("vcRecruitButtonHandler / MODAL_OPEN button (「次へ（詳細入力）」)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    safeReplyMock.mockResolvedValue(undefined);
  });

  it("セッションが見つからない場合はタイムアウトエラーを返す", async () => {
    getVcRecruitSessionMock.mockReturnValue(null);

    const interaction = makeModalOpenButtonInteraction("session-expired");
    await vcRecruitButtonHandler.execute(interaction as never);

    expect(safeReplyMock).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
    expect(interaction.showModal).not.toHaveBeenCalled();
  });

  it("selectedVcId が NEW_VC_VALUE（__new__）の場合は VC 名フィールドを含むモーダルを表示する", async () => {
    getVcRecruitSessionMock.mockReturnValue({
      panelChannelId: PANEL_CH_ID,
      mentionRoleIds: [],
      selectedVcId: "__new__",
      createdAt: Date.now(),
    });

    const interaction = makeModalOpenButtonInteraction("session-1");
    await vcRecruitButtonHandler.execute(interaction as never);

    expect(interaction.showModal).toHaveBeenCalled();
    const modalArg = (interaction.showModal as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as { toJSON: () => { components: unknown[] } };
    // VC名フィールドを含む（2コンポーネント = コンテンツ + VC名）
    expect(modalArg.toJSON().components).toHaveLength(2);
  });

  it("selectedVcId が既存 VC の ID の場合は VC 名フィールドなしのモーダルを表示する", async () => {
    getVcRecruitSessionMock.mockReturnValue({
      panelChannelId: PANEL_CH_ID,
      mentionRoleIds: [],
      selectedVcId: "existing-vc-1",
      createdAt: Date.now(),
    });

    const interaction = makeModalOpenButtonInteraction("session-2");
    await vcRecruitButtonHandler.execute(interaction as never);

    expect(interaction.showModal).toHaveBeenCalled();
    const modalArg = (interaction.showModal as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as { toJSON: () => { components: unknown[] } };
    // VC名フィールドなし（1コンポーネント = コンテンツのみ）
    expect(modalArg.toJSON().components).toHaveLength(1);
  });
});
