// tests/unit/bot/features/vc-recruit/handlers/ui/vcRecruitModal.test.ts

import {
  ButtonStyle,
  ChannelType,
  DiscordAPIError,
  MessageFlags,
  RESTJSONErrorCodes,
} from "discord.js";
import {
  buildRecruitMessageButtons,
  vcRecruitModalHandler,
} from "@/bot/features/vc-recruit/handlers/ui/vcRecruitModal";

// ---- モック定義 ----

const getVcRecruitSessionMock = vi.fn();
const deleteVcRecruitSessionMock = vi.fn();
const findSetupByPanelChannelIdMock = vi.fn();
const addCreatedVoiceChannelIdMock = vi.fn();
const sendVcControlPanelMock = vi.fn();
const safeReplyMock = vi.fn();
const tGuildMock = vi.fn(async (_guildId: string, key: string) => key);

vi.mock("@/bot/features/vc-recruit/handlers/ui/vcRecruitPanelState", () => ({
  getVcRecruitSession: (...args: unknown[]) => getVcRecruitSessionMock(...args),
  deleteVcRecruitSession: (...args: unknown[]) =>
    deleteVcRecruitSessionMock(...args),
  NEW_VC_VALUE: "__new__",
}));
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVcRecruitRepository: () => ({
    findSetupByPanelChannelId: (...args: unknown[]) =>
      findSetupByPanelChannelIdMock(...args),
    addCreatedVoiceChannelId: (...args: unknown[]) =>
      addCreatedVoiceChannelIdMock(...args),
  }),
}));
vi.mock("@/bot/features/vc-panel/vcControlPanel", () => ({
  sendVcControlPanel: (...args: unknown[]) => sendVcControlPanelMock(...args),
}));
vi.mock("@/bot/utils/interaction", () => ({
  safeReply: (...args: unknown[]) => safeReplyMock(...args),
}));
vi.mock("@/bot/utils/messageResponse", () => ({
  createWarningEmbed: vi.fn((msg: string) => ({ warning: msg })),
  createSuccessEmbed: vi.fn((msg: string) => ({ success: msg })),
  createInfoEmbed: vi.fn((msg: string) => ({ info: msg })),
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
  tGuild: (...args: unknown[]) =>
    tGuildMock(...(args as Parameters<typeof tGuildMock>)),
  tInteraction: vi.fn((_locale: string, key: string) => key),
}));

// ---- ヘルパー ----

const GUILD_ID = "guild-1";
const PANEL_CH_ID = "panel-ch-1";
const POST_CH_ID = "post-ch-1";
const MODAL_PREFIX = "vc-recruit:modal:";
const SESSION_ID = "session-1";

function makeVoiceChannel(id = "vc-created-1") {
  return {
    id,
    type: ChannelType.GuildVoice,
    name: "テストVC",
  };
}

function makeSetup(opts: { categoryId?: string | null } = {}) {
  return {
    panelChannelId: PANEL_CH_ID,
    postChannelId: POST_CH_ID,
    categoryId: opts.categoryId ?? null,
    panelMessageId: "panel-msg-1",
    threadArchiveDuration: 1440,
  };
}

function makeGuild(
  opts: {
    createVcResult?: unknown;
    fetchChannelResult?: unknown;
    postChannel?: unknown;
    fetchMemberResult?: unknown;
    categorySize?: number;
  } = {},
) {
  const {
    createVcResult = makeVoiceChannel(),
    fetchChannelResult,
    postChannel,
    fetchMemberResult = null,
    categorySize = 0,
  } = opts;

  const postedMessage = {
    url: "https://discord.com/channels/guild-1/post-ch-1/posted-msg-1",
    startThread: vi.fn().mockResolvedValue(undefined),
  };
  const sendMock = vi.fn().mockResolvedValue(postedMessage);

  const resolvedPostChannel = postChannel ?? {
    id: POST_CH_ID,
    isSendable: () => true,
    send: sendMock,
  };

  return {
    id: GUILD_ID,
    channels: {
      create: vi.fn().mockResolvedValue(createVcResult),
      fetch: vi.fn(async (id: string) => {
        if (id === POST_CH_ID) return resolvedPostChannel;
        if (id === PANEL_CH_ID) return null;
        if (fetchChannelResult !== undefined) return fetchChannelResult;
        // categoryId
        return {
          id,
          type: ChannelType.GuildCategory,
          children: { cache: { size: categorySize } },
        };
      }),
    },
    members: {
      fetch: vi.fn().mockResolvedValue(fetchMemberResult),
    },
    _postChannelSendMock: sendMock,
  };
}

function makeInteraction(
  opts: {
    hasGuild?: boolean;
    sessionId?: string;
    content?: string;
    vcName?: string;
    memberVoiceChannel?: unknown;
  } = {},
) {
  const {
    hasGuild = true,
    sessionId = SESSION_ID,
    content = "一緒に遊びましょう！",
    vcName = "",
    memberVoiceChannel = { id: "user-vc-1" },
  } = opts;

  const guild = hasGuild ? makeGuild() : null;

  return {
    customId: `${MODAL_PREFIX}${sessionId}`,
    guild,
    user: { id: "user-1", username: "testuser", displayName: "testuser" },
    fields: {
      getTextInputValue: (key: string) => {
        if (key === "vc-recruit:content-modal-input") return content;
        if (key === "vc-recruit:vc-name-modal-input") return vcName;
        return "";
      },
    },
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    _guildObj: guild,
    _memberVoiceChannel: memberVoiceChannel,
  };
}

/** guild.members.fetch の戻り値にボイスチャンネル情報を付与 */
function makeMember(voiceChannel: unknown | null, setChannelSuccess = true) {
  return {
    id: "user-1",
    displayName: "testuser",
    voice: {
      channel: voiceChannel,
      setChannel: vi
        .fn()
        .mockImplementation(() =>
          setChannelSuccess
            ? Promise.resolve()
            : Promise.reject(new Error("移動失敗")),
        ),
    },
  };
}

// ---- テスト ----

// matches() の検証
describe("vcRecruitModalHandler / matches()", () => {
  it("モーダルプレフィックスに一致する", () => {
    expect(vcRecruitModalHandler.matches(`${MODAL_PREFIX}session-1`)).toBe(
      true,
    );
  });

  it("無関係な customId には一致しない", () => {
    expect(vcRecruitModalHandler.matches("vac:modal:session-1")).toBe(false);
  });
});

// execute() の検証
describe("vcRecruitModalHandler / execute()", () => {
  // beforeEach: 各テストの前にモックをリセットして副作用を分離する
  beforeEach(() => {
    vi.clearAllMocks();
    safeReplyMock.mockResolvedValue(undefined);
    sendVcControlPanelMock.mockResolvedValue(undefined);
    addCreatedVoiceChannelIdMock.mockResolvedValue(undefined);
  });

  it("guild が null の場合は早期リターンして何もしない", async () => {
    const interaction = makeInteraction({ hasGuild: false });
    await vcRecruitModalHandler.execute(interaction as never);

    expect(getVcRecruitSessionMock).not.toHaveBeenCalled();
  });

  it("セッションが見つからない場合はタイムアウトエラーを返す", async () => {
    getVcRecruitSessionMock.mockReturnValue(null);

    const interaction = makeInteraction();
    await vcRecruitModalHandler.execute(interaction as never);

    expect(safeReplyMock).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
  });

  it("セットアップが見つからない場合はエラーを返す", async () => {
    getVcRecruitSessionMock.mockReturnValue({
      panelChannelId: PANEL_CH_ID,
      mentionRoleIds: [],
      selectedVcId: "__new__",
      createdAt: Date.now(),
    });
    findSetupByPanelChannelIdMock.mockResolvedValue(null);

    const interaction = makeInteraction();
    await vcRecruitModalHandler.execute(interaction as never);

    expect(safeReplyMock).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    );
  });

  it("新規 VC 作成時にメンバーが VC にいる場合は VC を作成して成功メッセージとリンクボタンを表示する", async () => {
    getVcRecruitSessionMock.mockReturnValue({
      panelChannelId: PANEL_CH_ID,
      mentionRoleIds: [],
      selectedVcId: "__new__",
      createdAt: Date.now(),
    });
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());

    const newVc = makeVoiceChannel("new-vc-1");
    const guild = makeGuild({ createVcResult: newVc });
    const member = makeMember({ id: "user-vc-1" }, true);
    guild.members.fetch = vi.fn().mockResolvedValue(member);

    const interaction = makeInteraction();
    interaction._guildObj = guild;
    // guild を差し替え
    (interaction as Record<string, unknown>).guild = guild;

    await vcRecruitModalHandler.execute(interaction as never);

    expect(guild.channels.create).toHaveBeenCalled();
    expect(addCreatedVoiceChannelIdMock).toHaveBeenCalledWith(
      GUILD_ID,
      PANEL_CH_ID,
      "new-vc-1",
    );
    expect(sendVcControlPanelMock).toHaveBeenCalledWith(newVc);
    // send() にはコンポーネント（ボタン行）が含まれる
    expect(guild._postChannelSendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        components: expect.any(Array),
      }),
    );
    // 成功メッセージ + リンクボタンで editReply
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [{ success: "vcRecruit:user-response.post_success" }],
        components: expect.any(Array),
      }),
    );
  });

  it("新規 VC 作成時にメンバーが VC にいない場合も成功メッセージを表示する", async () => {
    getVcRecruitSessionMock.mockReturnValue({
      panelChannelId: PANEL_CH_ID,
      mentionRoleIds: [],
      selectedVcId: "__new__",
      createdAt: Date.now(),
    });
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());

    const newVc = makeVoiceChannel("new-vc-1");
    const guild = makeGuild({ createVcResult: newVc });
    // VC にいないメンバー
    const member = makeMember(null);
    guild.members.fetch = vi.fn().mockResolvedValue(member);

    const interaction = makeInteraction();
    (interaction as Record<string, unknown>).guild = guild;

    await vcRecruitModalHandler.execute(interaction as never);

    // editReply で成功メッセージが表示される
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [{ success: "vcRecruit:user-response.post_success" }],
      }),
    );
  });

  it("既存 VC を選択したが VC が削除済みの場合はエラー返信をする", async () => {
    const EXISTING_VC_ID = "existing-vc-deleted";
    getVcRecruitSessionMock.mockReturnValue({
      panelChannelId: PANEL_CH_ID,
      mentionRoleIds: [],
      selectedVcId: EXISTING_VC_ID,
      createdAt: Date.now(),
    });
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());

    const guild = makeGuild({ fetchChannelResult: null });
    const interaction = makeInteraction();
    (interaction as Record<string, unknown>).guild = guild;

    await vcRecruitModalHandler.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ embeds: expect.any(Array) }),
    );
  });

  it("既存 VC を選択して正常に処理された場合は VC 作成をスキップして成功メッセージを表示する", async () => {
    const EXISTING_VC_ID = "existing-vc-1";
    getVcRecruitSessionMock.mockReturnValue({
      panelChannelId: PANEL_CH_ID,
      mentionRoleIds: [],
      selectedVcId: EXISTING_VC_ID,
      createdAt: Date.now(),
    });
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());

    const existingVc = { id: EXISTING_VC_ID, type: ChannelType.GuildVoice };
    const guild = makeGuild({ fetchChannelResult: existingVc });
    const member = makeMember({ id: "user-vc-1" }, true);
    guild.members.fetch = vi.fn().mockResolvedValue(member);

    const interaction = makeInteraction();
    (interaction as Record<string, unknown>).guild = guild;

    await vcRecruitModalHandler.execute(interaction as never);

    expect(guild.channels.create).not.toHaveBeenCalled();
    // 成功メッセージで editReply が呼ばれる
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [{ success: "vcRecruit:user-response.post_success" }],
      }),
    );
    expect(deleteVcRecruitSessionMock).toHaveBeenCalledWith(SESSION_ID);
  });

  it("guild.channels.create で MissingPermissions エラーが発生した場合は上位ハンドラへ伝播する", async () => {
    getVcRecruitSessionMock.mockReturnValue({
      panelChannelId: PANEL_CH_ID,
      mentionRoleIds: [],
      selectedVcId: "__new__",
      createdAt: Date.now(),
    });
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());

    const apiError = new DiscordAPIError(
      {
        code: RESTJSONErrorCodes.MissingPermissions,
        message: "Missing Permissions",
      },
      RESTJSONErrorCodes.MissingPermissions,
      403,
      "POST",
      "/guilds/guild-1/channels",
      {},
    );
    const guild = makeGuild();
    guild.channels.create = vi.fn().mockRejectedValue(apiError);
    const member = makeMember({ id: "user-vc-1" });
    guild.members.fetch = vi.fn().mockResolvedValue(member);

    const interaction = makeInteraction();
    (interaction as Record<string, unknown>).guild = guild;

    await expect(
      vcRecruitModalHandler.execute(interaction as never),
    ).rejects.toBe(apiError);
  });

  it("カテゴリーチャンネル数が上限に達している場合は category_full エラーを返して VC を作成しない", async () => {
    getVcRecruitSessionMock.mockReturnValue({
      panelChannelId: PANEL_CH_ID,
      mentionRoleIds: [],
      selectedVcId: "__new__",
      createdAt: Date.now(),
    });
    findSetupByPanelChannelIdMock.mockResolvedValue(
      makeSetup({ categoryId: "cat-1" }),
    );

    // CATEGORY_CHANNEL_LIMIT = 50 なので size=50 で上限到達
    const guild = makeGuild({ categorySize: 50 });
    const interaction = makeInteraction();
    (interaction as Record<string, unknown>).guild = guild;

    await vcRecruitModalHandler.execute(interaction as never);

    expect(guild.channels.create).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ embeds: expect.any(Array) }),
    );
    expect(deleteVcRecruitSessionMock).toHaveBeenCalledWith(SESSION_ID);
  });

  it("setChannel が throw した場合でも成功メッセージが表示される", async () => {
    getVcRecruitSessionMock.mockReturnValue({
      panelChannelId: PANEL_CH_ID,
      mentionRoleIds: [],
      selectedVcId: "__new__",
      createdAt: Date.now(),
    });
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());

    const newVc = makeVoiceChannel("new-vc-setfail");
    const guild = makeGuild({ createVcResult: newVc });
    // setChannelSuccess=false → setChannel が throw する
    const member = makeMember({ id: "user-vc-1" }, false);
    guild.members.fetch = vi.fn().mockResolvedValue(member);

    const interaction = makeInteraction();
    (interaction as Record<string, unknown>).guild = guild;

    await vcRecruitModalHandler.execute(interaction as never);

    expect(member.voice.setChannel).toHaveBeenCalledWith(newVc);
    // 成功メッセージで editReply が呼ばれる（setChannel失敗はcatchされる）
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [{ success: "vcRecruit:user-response.post_success" }],
      }),
    );
  });

  it("投稿チャンネルが送信不可の場合はリンクなしの成功メッセージを表示する", async () => {
    getVcRecruitSessionMock.mockReturnValue({
      panelChannelId: PANEL_CH_ID,
      mentionRoleIds: [],
      selectedVcId: "__new__",
      createdAt: Date.now(),
    });
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());

    const newVc = makeVoiceChannel("new-vc-nosend");
    // postChannel が isSendable() = false を返す
    const guild = makeGuild({
      createVcResult: newVc,
      postChannel: {
        id: POST_CH_ID,
        isSendable: () => false,
        send: vi.fn(),
      },
    });
    const member = makeMember(null);
    guild.members.fetch = vi.fn().mockResolvedValue(member);

    const interaction = makeInteraction();
    (interaction as Record<string, unknown>).guild = guild;

    await vcRecruitModalHandler.execute(interaction as never);

    // postedMessageUrl が null なのでリンクボタンなしの editReply
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [{ success: "vcRecruit:user-response.post_success" }],
      }),
    );
    // components が含まれないことを確認
    const callArgs = (interaction.editReply as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArgs?.components).toBeUndefined();
  });

  it("投稿チャンネルが取得できない場合はリンクなしの成功メッセージを表示する", async () => {
    getVcRecruitSessionMock.mockReturnValue({
      panelChannelId: PANEL_CH_ID,
      mentionRoleIds: [],
      selectedVcId: "__new__",
      createdAt: Date.now(),
    });
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());

    const newVc = makeVoiceChannel("new-vc-nopostch");
    const guild = makeGuild({ createVcResult: newVc });
    const member = makeMember(null);
    guild.members.fetch = vi.fn().mockResolvedValue(member);
    // postChannelId の fetch が null を返すようにオーバーライド
    const originalFetch = guild.channels.fetch;
    guild.channels.fetch = vi.fn(async (id: string) => {
      if (id === POST_CH_ID) return null;
      return originalFetch(id);
    });

    const interaction = makeInteraction();
    (interaction as Record<string, unknown>).guild = guild;

    await vcRecruitModalHandler.execute(interaction as never);

    // postedMessageUrl が null なのでリンクボタンなしの editReply
    const callArgs = (interaction.editReply as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(callArgs?.components).toBeUndefined();
  });

  it("startThread が失敗しても成功メッセージを表示する", async () => {
    getVcRecruitSessionMock.mockReturnValue({
      panelChannelId: PANEL_CH_ID,
      mentionRoleIds: [],
      selectedVcId: "__new__",
      createdAt: Date.now(),
    });
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());

    const newVc = makeVoiceChannel("new-vc-threadfail");
    const postedMessage = {
      url: "https://discord.com/channels/guild-1/post-ch-1/msg-threadfail",
      startThread: vi.fn().mockRejectedValue(new Error("スレッド作成失敗")),
    };
    const sendMock = vi.fn().mockResolvedValue(postedMessage);
    const guild = makeGuild({
      createVcResult: newVc,
      postChannel: {
        id: POST_CH_ID,
        isSendable: () => true,
        send: sendMock,
      },
    });
    const member = makeMember(null);
    guild.members.fetch = vi.fn().mockResolvedValue(member);

    const interaction = makeInteraction();
    (interaction as Record<string, unknown>).guild = guild;

    await vcRecruitModalHandler.execute(interaction as never);

    // startThread が呼ばれたがエラーは握りつぶされる
    expect(postedMessage.startThread).toHaveBeenCalled();
    // 成功メッセージ + リンクボタンが表示される
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [{ success: "vcRecruit:user-response.post_success" }],
        components: expect.any(Array),
      }),
    );
  });

  it("editReply が失敗しても例外がスローされない（ポストURL あり）", async () => {
    getVcRecruitSessionMock.mockReturnValue({
      panelChannelId: PANEL_CH_ID,
      mentionRoleIds: [],
      selectedVcId: "__new__",
      createdAt: Date.now(),
    });
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());

    const newVc = makeVoiceChannel("new-vc-editfail");
    const guild = makeGuild({ createVcResult: newVc });
    const member = makeMember(null);
    guild.members.fetch = vi.fn().mockResolvedValue(member);

    const interaction = makeInteraction();
    (interaction as Record<string, unknown>).guild = guild;
    interaction.editReply = vi
      .fn()
      .mockRejectedValue(new Error("editReply失敗"));

    await expect(
      vcRecruitModalHandler.execute(interaction as never),
    ).resolves.toBeUndefined();
  });

  it("editReply が失敗しても例外がスローされない（ポストURL なし）", async () => {
    getVcRecruitSessionMock.mockReturnValue({
      panelChannelId: PANEL_CH_ID,
      mentionRoleIds: [],
      selectedVcId: "__new__",
      createdAt: Date.now(),
    });
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());

    const newVc = makeVoiceChannel("new-vc-editfail2");
    const guild = makeGuild({
      createVcResult: newVc,
      postChannel: {
        id: POST_CH_ID,
        isSendable: () => false,
        send: vi.fn(),
      },
    });
    const member = makeMember(null);
    guild.members.fetch = vi.fn().mockResolvedValue(member);

    const interaction = makeInteraction();
    (interaction as Record<string, unknown>).guild = guild;
    interaction.editReply = vi
      .fn()
      .mockRejectedValue(new Error("editReply失敗"));

    await expect(
      vcRecruitModalHandler.execute(interaction as never),
    ).resolves.toBeUndefined();
  });

  it("メンションロールが指定されている場合はメンションテキスト付きで送信する", async () => {
    getVcRecruitSessionMock.mockReturnValue({
      panelChannelId: PANEL_CH_ID,
      mentionRoleIds: ["role-123"],
      selectedVcId: "__new__",
      createdAt: Date.now(),
    });
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());

    const newVc = makeVoiceChannel("new-vc-mention");
    const guild = makeGuild({ createVcResult: newVc });
    const member = makeMember(null);
    guild.members.fetch = vi.fn().mockResolvedValue(member);

    const interaction = makeInteraction();
    (interaction as Record<string, unknown>).guild = guild;

    await vcRecruitModalHandler.execute(interaction as never);

    expect(guild._postChannelSendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "<@&role-123>",
      }),
    );
  });

  it("メンションロールが複数指定されている場合はスペース区切りで送信する", async () => {
    getVcRecruitSessionMock.mockReturnValue({
      panelChannelId: PANEL_CH_ID,
      mentionRoleIds: ["role-123", "role-456"],
      selectedVcId: "__new__",
      createdAt: Date.now(),
    });
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());

    const newVc = makeVoiceChannel("new-vc-multi-mention");
    const guild = makeGuild({ createVcResult: newVc });
    const member = makeMember(null);
    guild.members.fetch = vi.fn().mockResolvedValue(member);

    const interaction = makeInteraction();
    (interaction as Record<string, unknown>).guild = guild;

    await vcRecruitModalHandler.execute(interaction as never);

    expect(guild._postChannelSendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "<@&role-123> <@&role-456>",
      }),
    );
  });

  it("メンションロールが空配列の場合はメンションなしで送信する", async () => {
    getVcRecruitSessionMock.mockReturnValue({
      panelChannelId: PANEL_CH_ID,
      mentionRoleIds: [],
      selectedVcId: "__new__",
      createdAt: Date.now(),
    });
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());

    const newVc = makeVoiceChannel("new-vc-nomention");
    const guild = makeGuild({ createVcResult: newVc });
    const member = makeMember(null);
    guild.members.fetch = vi.fn().mockResolvedValue(member);

    const interaction = makeInteraction();
    (interaction as Record<string, unknown>).guild = guild;

    await vcRecruitModalHandler.execute(interaction as never);

    expect(guild._postChannelSendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        content: undefined,
      }),
    );
  });

  it("members.fetch が失敗した場合でも処理が続行される", async () => {
    getVcRecruitSessionMock.mockReturnValue({
      panelChannelId: PANEL_CH_ID,
      mentionRoleIds: [],
      selectedVcId: "__new__",
      createdAt: Date.now(),
    });
    findSetupByPanelChannelIdMock.mockResolvedValue(makeSetup());

    const newVc = makeVoiceChannel("new-vc-nofetch");
    const guild = makeGuild({ createVcResult: newVc });
    guild.members.fetch = vi
      .fn()
      .mockRejectedValue(new Error("メンバー取得失敗"));

    const interaction = makeInteraction();
    (interaction as Record<string, unknown>).guild = guild;

    await vcRecruitModalHandler.execute(interaction as never);

    // member が null なので setChannel は呼ばれない
    expect(interaction.editReply).toHaveBeenCalled();
  });
});

// buildRecruitMessageButtons() の検証
describe("buildRecruitMessageButtons()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正しい構造のボタン行を返す", async () => {
    const rows = await buildRecruitMessageButtons("guild-1", "user-1", "vc-1");

    expect(rows).toHaveLength(1);
    // ActionRowBuilder のコンポーネントが4つ
    const row = rows[0]!;
    expect(row.components).toHaveLength(4);
  });

  it("参加ボタンがリンクスタイルで正しいURLを持つ", async () => {
    const rows = await buildRecruitMessageButtons("guild-1", "user-1", "vc-1");
    const joinButton = rows[0]!.components[0]!;

    // ButtonBuilder の data を確認
    const data = joinButton.toJSON() as unknown as Record<string, unknown>;
    expect(data.style).toBe(ButtonStyle.Link);
    expect(data.url).toBe("https://discord.com/channels/guild-1/vc-1");
  });

  it("VC名変更ボタンのカスタムIDに正しいプレフィックスとサフィックスが含まれる", async () => {
    const rows = await buildRecruitMessageButtons("guild-1", "user-1", "vc-1");
    const renameButton = rows[0]!.components[1]!;

    const data = renameButton.toJSON() as unknown as Record<string, unknown>;
    expect(data.style).toBe(ButtonStyle.Secondary);
    expect(data.custom_id).toBe("vc-recruit:rename-vc:user-1:vc-1");
  });

  it("VC終了ボタンのカスタムIDに正しいプレフィックスとサフィックスが含まれる", async () => {
    const rows = await buildRecruitMessageButtons("guild-1", "user-1", "vc-1");
    const endButton = rows[0]!.components[2]!;

    const data = endButton.toJSON() as unknown as Record<string, unknown>;
    expect(data.style).toBe(ButtonStyle.Secondary);
    expect(data.custom_id).toBe("vc-recruit:end-vc:user-1:vc-1");
  });

  it("募集削除ボタンが Danger スタイルで正しいカスタムIDを持つ", async () => {
    const rows = await buildRecruitMessageButtons("guild-1", "user-1", "vc-1");
    const deleteButton = rows[0]!.components[3]!;

    const data = deleteButton.toJSON() as unknown as Record<string, unknown>;
    expect(data.style).toBe(ButtonStyle.Danger);
    expect(data.custom_id).toBe("vc-recruit:delete-post:user-1:vc-1");
  });

  it("tGuild がボタンラベル用に呼ばれる", async () => {
    await buildRecruitMessageButtons("guild-1", "user-1", "vc-1");

    expect(tGuildMock).toHaveBeenCalledWith(
      "guild-1",
      "vcRecruit:ui.button.join_vc",
    );
    expect(tGuildMock).toHaveBeenCalledWith(
      "guild-1",
      "vcRecruit:ui.button.rename_vc",
    );
    expect(tGuildMock).toHaveBeenCalledWith(
      "guild-1",
      "vcRecruit:ui.button.end_vc",
    );
    expect(tGuildMock).toHaveBeenCalledWith(
      "guild-1",
      "vcRecruit:ui.button.delete_post",
    );
  });
});
