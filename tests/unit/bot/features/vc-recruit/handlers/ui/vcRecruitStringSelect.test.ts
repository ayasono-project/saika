// tests/unit/bot/features/vc-recruit/handlers/ui/vcRecruitStringSelect.test.ts
import { vcRecruitStringSelectHandler } from "@/bot/features/vc-recruit/handlers/ui/vcRecruitStringSelect";

// ---- モック定義 ----

const updateVcRecruitSessionMock = vi.fn();
const setTeardownConfirmSessionMock = vi.fn();
const findSetupByPanelChannelIdMock = vi.fn();
const tInteractionMock = vi.fn((_locale: string, key: string) => key);

vi.mock("@/bot/features/vc-recruit/handlers/ui/vcRecruitPanelState", () => ({
  updateVcRecruitSession: (...args: unknown[]) =>
    updateVcRecruitSessionMock(...args),
  NEW_VC_VALUE: "__new__",
}));
vi.mock("@/bot/features/vc-recruit/handlers/ui/vcRecruitTeardownState", () => ({
  setTeardownConfirmSession: (...args: unknown[]) =>
    setTeardownConfirmSessionMock(...args),
  getTeardownConfirmSession: vi.fn().mockReturnValue(null),
}));
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVcRecruitRepository: () => ({
    findSetupByPanelChannelId: (...args: unknown[]) =>
      findSetupByPanelChannelIdMock(...args),
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
}));

// ---- ヘルパー定数 ----

const GUILD_ID = "guild-1";
const MENTION_PREFIX = "vc-recruit:select-mention:";
const VC_PREFIX = "vc-recruit:select-vc:";
const TEARDOWN_PREFIX = "vc-recruit:teardown-select:";

function makeInteraction(
  opts: {
    customId: string;
    values?: string[];
    guildChannels?: Record<string, { name: string }>;
  } = { customId: "" },
) {
  const { customId, values = [], guildChannels = {} } = opts;
  return {
    customId,
    values,
    locale: "ja",
    guild: {
      id: GUILD_ID,
      channels: {
        cache: {
          get: (id: string) => guildChannels[id] ?? undefined,
        },
      },
    },
    id: "interaction-1",
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
  };
}

// ---- テスト ----

describe("vcRecruitStringSelectHandler / matches()", () => {
  it("メンション選択プレフィックスに一致する", () => {
    expect(
      vcRecruitStringSelectHandler.matches(`${MENTION_PREFIX}session-1`),
    ).toBe(true);
  });

  it("VC 選択プレフィックスに一致する", () => {
    expect(vcRecruitStringSelectHandler.matches(`${VC_PREFIX}session-1`)).toBe(
      true,
    );
  });

  it("teardown 選択プレフィックスに一致する", () => {
    expect(
      vcRecruitStringSelectHandler.matches(`${TEARDOWN_PREFIX}session-1`),
    ).toBe(true);
  });

  it("無関係な customId には一致しない", () => {
    expect(vcRecruitStringSelectHandler.matches("vac:select:session-1")).toBe(
      false,
    );
  });
});

describe("vcRecruitStringSelectHandler / mention select", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("メンション選択でセッションの mentionRoleIds を values 配列で更新し deferUpdate を呼ぶ", async () => {
    const interaction = makeInteraction({
      customId: `${MENTION_PREFIX}session-1`,
      values: ["role-42"],
    });

    await vcRecruitStringSelectHandler.execute(interaction as never);

    expect(updateVcRecruitSessionMock).toHaveBeenCalledWith("session-1", {
      mentionRoleIds: ["role-42"],
    });
    expect(interaction.deferUpdate).toHaveBeenCalled();
  });

  it("複数ロール選択でセッションの mentionRoleIds を配列で更新する", async () => {
    const interaction = makeInteraction({
      customId: `${MENTION_PREFIX}session-2`,
      values: ["role-42", "role-99"],
    });

    await vcRecruitStringSelectHandler.execute(interaction as never);

    expect(updateVcRecruitSessionMock).toHaveBeenCalledWith("session-2", {
      mentionRoleIds: ["role-42", "role-99"],
    });
  });

  it("空の values 配列でセッションの mentionRoleIds を空配列で更新する", async () => {
    const interaction = makeInteraction({
      customId: `${MENTION_PREFIX}session-3`,
      values: [],
    });

    await vcRecruitStringSelectHandler.execute(interaction as never);

    expect(updateVcRecruitSessionMock).toHaveBeenCalledWith("session-3", {
      mentionRoleIds: [],
    });
  });
});

describe("vcRecruitStringSelectHandler / VC select", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("VC 選択でセッションの selectedVcId を更新し deferUpdate を呼ぶ", async () => {
    const interaction = makeInteraction({
      customId: `${VC_PREFIX}session-3`,
      values: ["existing-vc-1"],
    });

    await vcRecruitStringSelectHandler.execute(interaction as never);

    expect(updateVcRecruitSessionMock).toHaveBeenCalledWith("session-3", {
      selectedVcId: "existing-vc-1",
    });
    expect(interaction.deferUpdate).toHaveBeenCalled();
  });

  it("__new__ 選択でもセッションを更新できる", async () => {
    const interaction = makeInteraction({
      customId: `${VC_PREFIX}session-4`,
      values: ["__new__"],
    });

    await vcRecruitStringSelectHandler.execute(interaction as never);

    expect(updateVcRecruitSessionMock).toHaveBeenCalledWith("session-4", {
      selectedVcId: "__new__",
    });
  });
});

describe("vcRecruitStringSelectHandler / teardown select", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("リポジトリに存在しないパネルチャンネル ID はスキップする", async () => {
    findSetupByPanelChannelIdMock.mockResolvedValue(null);

    const interaction = makeInteraction({
      customId: `${TEARDOWN_PREFIX}session-5`,
      values: ["panel-not-found"],
    });

    await vcRecruitStringSelectHandler.execute(interaction as never);

    expect(setTeardownConfirmSessionMock).toHaveBeenCalledWith(
      "interaction-1",
      expect.objectContaining({ selectedSetups: [] }),
    );
    expect(interaction.update).toHaveBeenCalled();
  });

  it("有効なセットアップが存在する場合は teardown 確認パネルを表示する", async () => {
    findSetupByPanelChannelIdMock.mockResolvedValue({
      panelChannelId: "panel-ch-1",
      categoryId: null,
    });

    const interaction = makeInteraction({
      customId: `${TEARDOWN_PREFIX}session-6`,
      values: ["panel-ch-1"],
    });

    await vcRecruitStringSelectHandler.execute(interaction as never);

    expect(setTeardownConfirmSessionMock).toHaveBeenCalledWith(
      "interaction-1",
      expect.objectContaining({
        guildId: GUILD_ID,
        selectedSetups: expect.arrayContaining([
          expect.objectContaining({ panelChannelId: "panel-ch-1" }),
        ]),
      }),
    );
    expect(interaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        components: expect.any(Array),
      }),
    );
  });

  it("categoryId が既知のチャンネルの場合はチャンネル名をラベルに使用する", async () => {
    findSetupByPanelChannelIdMock.mockResolvedValue({
      panelChannelId: "panel-ch-1",
      categoryId: "cat-1",
    });

    const interaction = makeInteraction({
      customId: `${TEARDOWN_PREFIX}session-7`,
      values: ["panel-ch-1"],
      guildChannels: { "cat-1": { name: "ゲームカテゴリー" } },
    });

    await vcRecruitStringSelectHandler.execute(interaction as never);

    expect(setTeardownConfirmSessionMock).toHaveBeenCalledWith(
      "interaction-1",
      expect.objectContaining({
        selectedSetups: expect.arrayContaining([
          expect.objectContaining({
            categoryLabel: "ゲームカテゴリー",
          }),
        ]),
      }),
    );
  });

  it("categoryId がキャッシュに存在しない場合は unknown_category ラベルを使用する", async () => {
    findSetupByPanelChannelIdMock.mockResolvedValue({
      panelChannelId: "panel-ch-1",
      categoryId: "cat-unknown",
    });

    // cat-unknown がキャッシュにないインタラクション
    const interaction = makeInteraction({
      customId: `${TEARDOWN_PREFIX}session-unknown`,
      values: ["panel-ch-1"],
      guildChannels: {}, // キャッシュに何もない
    });

    await vcRecruitStringSelectHandler.execute(interaction as never);

    expect(setTeardownConfirmSessionMock).toHaveBeenCalledWith(
      "interaction-1",
      expect.objectContaining({
        selectedSetups: expect.arrayContaining([
          expect.objectContaining({ panelChannelId: "panel-ch-1" }),
        ]),
      }),
    );
    // tInteraction が unknown_category キーで呼ばれる
    expect(tInteractionMock).toHaveBeenCalledWith(
      expect.any(String),
      "vcRecruit:ui.select.teardown_unknown_category",
      expect.objectContaining({ id: "cat-unknown" }),
    );
  });

  it("60秒後に確認ボタンが無効化される", async () => {
    vi.useFakeTimers();
    findSetupByPanelChannelIdMock.mockResolvedValue({
      panelChannelId: "panel-ch-1",
      categoryId: null,
    });

    const interaction = makeInteraction({
      customId: `${TEARDOWN_PREFIX}session-8`,
      values: ["panel-ch-1"],
    });

    await vcRecruitStringSelectHandler.execute(interaction as never);

    expect(interaction.editReply).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60_000);
    await vi.runAllTimersAsync();

    expect(interaction.editReply).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
