// tests/unit/bot/features/vc-recruit/handlers/ui/vcRecruitPostButton.test.ts

import { ChannelType, MessageFlags, PermissionFlagsBits } from "discord.js";
import {
  parsePostButtonIds,
  updateToEndedState,
  vcRecruitPostButtonHandler,
} from "@/bot/features/vc-recruit/handlers/ui/vcRecruitPostButton";

// ---- モック定義 ----

const safeReplyMock = vi.fn();
const tGuildMock = vi.fn(async (_guildId: string, key: string) => key);
const isCreatedVcRecruitChannelMock = vi.fn();
const removeCreatedVoiceChannelIdMock = vi.fn();

vi.mock("@/bot/utils/interaction", () => ({
  safeReply: (...args: unknown[]) => safeReplyMock(...args),
}));
vi.mock("@/bot/utils/messageResponse", () => ({
  createWarningEmbed: vi.fn((msg: string) => ({ warning: msg })),
  createSuccessEmbed: vi.fn((msg: string) => ({ success: msg })),
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
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVcRecruitRepository: () => ({
    isCreatedVcRecruitChannel: (...args: unknown[]) =>
      isCreatedVcRecruitChannelMock(...args),
    removeCreatedVoiceChannelId: (...args: unknown[]) =>
      removeCreatedVoiceChannelIdMock(...args),
  }),
}));

// ---- 定数 ----

const GUILD_ID = "guild-1";
const RECRUITER_ID = "recruiter-1";
const VC_ID = "vc-1";
const MESSAGE_ID = "msg-1";

// ---- ヘルパー ----

/** ボタンインタラクションのモックを生成する */
function makeButtonInteraction(opts: {
  customId: string;
  userId?: string;
  hasGuild?: boolean;
  hasManageChannels?: boolean;
  messageId?: string;
  messageComponents?: unknown[];
  channelMessages?: Record<string, unknown>;
}) {
  const {
    customId,
    userId = "other-user",
    hasGuild = true,
    hasManageChannels = false,
    messageId = MESSAGE_ID,
    messageComponents = [],
    channelMessages = {},
  } = opts;

  const deleteMock = vi.fn().mockResolvedValue(undefined);
  const editMock = vi.fn().mockResolvedValue(undefined);

  const guild = hasGuild
    ? {
        id: GUILD_ID,
        channels: {
          fetch: vi.fn().mockResolvedValue({
            id: VC_ID,
            type: ChannelType.GuildVoice,
            name: "テストVC",
            setName: vi.fn().mockResolvedValue(undefined),
            delete: deleteMock,
          }),
        },
        members: {
          cache: {
            get: vi.fn().mockReturnValue(
              hasManageChannels
                ? {
                    permissions: {
                      has: (perm: bigint) =>
                        perm === PermissionFlagsBits.ManageChannels,
                    },
                  }
                : {
                    permissions: { has: () => false },
                  },
            ),
          },
        },
      }
    : null;

  return {
    customId,
    guild,
    user: { id: userId },
    message: {
      id: messageId,
      components: messageComponents,
      thread: { delete: vi.fn().mockResolvedValue(undefined) },
      edit: editMock,
      delete: vi.fn().mockResolvedValue(undefined),
    },
    channel: {
      messages: {
        fetch: vi.fn(async (id: string) => {
          if (channelMessages[id]) return channelMessages[id];
          return {
            id,
            components: messageComponents,
            thread: { delete: vi.fn().mockResolvedValue(undefined) },
            edit: editMock,
            delete: vi.fn().mockResolvedValue(undefined),
          };
        }),
      },
    },
    showModal: vi.fn().mockResolvedValue(undefined),
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    _vcDeleteMock: deleteMock,
    _messageEditMock: editMock,
  };
}

// ---- テスト ----

// matches() の検証
describe("vcRecruitPostButtonHandler / matches()", () => {
  it("rename-vc プレフィックスに一致する", () => {
    expect(
      vcRecruitPostButtonHandler.matches(
        `vc-recruit:rename-vc:${RECRUITER_ID}:${VC_ID}`,
      ),
    ).toBe(true);
  });

  it("end-vc プレフィックスに一致する", () => {
    expect(
      vcRecruitPostButtonHandler.matches(
        `vc-recruit:end-vc:${RECRUITER_ID}:${VC_ID}`,
      ),
    ).toBe(true);
  });

  it("delete-post プレフィックスに一致する", () => {
    expect(
      vcRecruitPostButtonHandler.matches(
        `vc-recruit:delete-post:${RECRUITER_ID}:${VC_ID}`,
      ),
    ).toBe(true);
  });

  it("confirm-end-vc プレフィックスに一致する", () => {
    expect(
      vcRecruitPostButtonHandler.matches(
        `vc-recruit:confirm-end-vc:${RECRUITER_ID}:${VC_ID}:${MESSAGE_ID}`,
      ),
    ).toBe(true);
  });

  it("cancel-end-vc プレフィックスに一致する", () => {
    expect(
      vcRecruitPostButtonHandler.matches(
        `vc-recruit:cancel-end-vc:${RECRUITER_ID}:${VC_ID}:${MESSAGE_ID}`,
      ),
    ).toBe(true);
  });

  it("confirm-delete プレフィックスに一致する", () => {
    expect(
      vcRecruitPostButtonHandler.matches(
        `vc-recruit:confirm-delete:${RECRUITER_ID}:${VC_ID}:${MESSAGE_ID}`,
      ),
    ).toBe(true);
  });

  it("cancel-delete プレフィックスに一致する", () => {
    expect(
      vcRecruitPostButtonHandler.matches(
        `vc-recruit:cancel-delete:${RECRUITER_ID}:${VC_ID}:${MESSAGE_ID}`,
      ),
    ).toBe(true);
  });

  it("無関係な customId には一致しない", () => {
    expect(vcRecruitPostButtonHandler.matches("vc-recruit:create:abc")).toBe(
      false,
    );
    expect(vcRecruitPostButtonHandler.matches("unrelated-button")).toBe(false);
  });
});

// execute() guild=null の検証
describe("vcRecruitPostButtonHandler / execute() guild=null", () => {
  // beforeEach: 各テストの前にモックをリセットして副作用を分離する
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("guild が null の場合は早期リターンして何もしない", async () => {
    const interaction = makeButtonInteraction({
      customId: `vc-recruit:rename-vc:${RECRUITER_ID}:${VC_ID}`,
      hasGuild: false,
    });

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(safeReplyMock).not.toHaveBeenCalled();
    expect(interaction.showModal).not.toHaveBeenCalled();
  });
});

// VC名変更ボタンの検証
describe("vcRecruitPostButtonHandler / handleRenameVc", () => {
  // beforeEach: 各テストの前にモックをリセットして副作用を分離する
  beforeEach(() => {
    vi.clearAllMocks();
    safeReplyMock.mockResolvedValue(undefined);
  });

  it("権限がない場合はエラーを返す", async () => {
    const interaction = makeButtonInteraction({
      customId: `vc-recruit:rename-vc:${RECRUITER_ID}:${VC_ID}`,
      userId: "other-user",
      hasManageChannels: false,
    });

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(safeReplyMock).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({
        embeds: [{ warning: "vcRecruit:user-response.no_permission" }],
        flags: MessageFlags.Ephemeral,
      }),
    );
  });

  it("投稿者本人の場合は権限チェックを通過してモーダルを表示する", async () => {
    const interaction = makeButtonInteraction({
      customId: `vc-recruit:rename-vc:${RECRUITER_ID}:${VC_ID}`,
      userId: RECRUITER_ID,
    });

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(safeReplyMock).not.toHaveBeenCalled();
    expect(interaction.showModal).toHaveBeenCalled();
  });

  it("ManageChannels 権限を持つユーザーは権限チェックを通過する", async () => {
    const interaction = makeButtonInteraction({
      customId: `vc-recruit:rename-vc:${RECRUITER_ID}:${VC_ID}`,
      userId: "admin-user",
      hasManageChannels: true,
    });

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(safeReplyMock).not.toHaveBeenCalled();
    expect(interaction.showModal).toHaveBeenCalled();
  });

  it("VC が削除済みの場合はエラーを返す", async () => {
    const interaction = makeButtonInteraction({
      customId: `vc-recruit:rename-vc:${RECRUITER_ID}:${VC_ID}`,
      userId: RECRUITER_ID,
    });

    // VC fetch が null を返す
    interaction.guild!.channels.fetch = vi.fn().mockResolvedValue(null);

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(safeReplyMock).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({
        embeds: [{ warning: "vcRecruit:user-response.vc_already_deleted" }],
        flags: MessageFlags.Ephemeral,
      }),
    );
    expect(interaction.showModal).not.toHaveBeenCalled();
  });

  it("VC が存在する場合はモーダルを表示する", async () => {
    const interaction = makeButtonInteraction({
      customId: `vc-recruit:rename-vc:${RECRUITER_ID}:${VC_ID}`,
      userId: RECRUITER_ID,
    });

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(interaction.showModal).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          custom_id: `vc-recruit:rename-vc-modal:${VC_ID}`,
        }),
      }),
    );
  });
});

// VCを終了ボタンの検証
describe("vcRecruitPostButtonHandler / handleEndVc", () => {
  // beforeEach: 各テストの前にモックをリセットして副作用を分離する
  beforeEach(() => {
    vi.clearAllMocks();
    safeReplyMock.mockResolvedValue(undefined);
    isCreatedVcRecruitChannelMock.mockResolvedValue(false);
  });

  it("権限がない場合はエラーを返す", async () => {
    const interaction = makeButtonInteraction({
      customId: `vc-recruit:end-vc:${RECRUITER_ID}:${VC_ID}`,
      userId: "other-user",
      hasManageChannels: false,
    });

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(safeReplyMock).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({
        embeds: [{ warning: "vcRecruit:user-response.no_permission" }],
        flags: MessageFlags.Ephemeral,
      }),
    );
  });

  it("作成されたVCの場合は end_vc_created の確認テキストを表示する", async () => {
    isCreatedVcRecruitChannelMock.mockResolvedValue(true);

    const interaction = makeButtonInteraction({
      customId: `vc-recruit:end-vc:${RECRUITER_ID}:${VC_ID}`,
      userId: RECRUITER_ID,
    });

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(safeReplyMock).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({
        content: "vcRecruit:user-response.end_vc_created",
        components: expect.any(Array),
        flags: MessageFlags.Ephemeral,
      }),
    );
  });

  it("既存VCの場合は end_vc_existing の確認テキストを表示する", async () => {
    isCreatedVcRecruitChannelMock.mockResolvedValue(false);

    const interaction = makeButtonInteraction({
      customId: `vc-recruit:end-vc:${RECRUITER_ID}:${VC_ID}`,
      userId: RECRUITER_ID,
    });

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(safeReplyMock).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({
        content: "vcRecruit:user-response.end_vc_existing",
        components: expect.any(Array),
        flags: MessageFlags.Ephemeral,
      }),
    );
  });
});

// 募集を削除ボタンの検証
describe("vcRecruitPostButtonHandler / handleDeletePost", () => {
  // beforeEach: 各テストの前にモックをリセットして副作用を分離する
  beforeEach(() => {
    vi.clearAllMocks();
    safeReplyMock.mockResolvedValue(undefined);
    isCreatedVcRecruitChannelMock.mockResolvedValue(false);
  });

  it("権限がない場合はエラーを返す", async () => {
    const interaction = makeButtonInteraction({
      customId: `vc-recruit:delete-post:${RECRUITER_ID}:${VC_ID}`,
      userId: "other-user",
      hasManageChannels: false,
    });

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(safeReplyMock).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({
        embeds: [{ warning: "vcRecruit:user-response.no_permission" }],
        flags: MessageFlags.Ephemeral,
      }),
    );
  });

  it("作成されたVCの場合は delete_created の確認テキストを表示する", async () => {
    isCreatedVcRecruitChannelMock.mockResolvedValue(true);

    const interaction = makeButtonInteraction({
      customId: `vc-recruit:delete-post:${RECRUITER_ID}:${VC_ID}`,
      userId: RECRUITER_ID,
    });

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(safeReplyMock).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({
        content: "vcRecruit:user-response.delete_created",
        components: expect.any(Array),
        flags: MessageFlags.Ephemeral,
      }),
    );
  });

  it("既存VCの場合は delete_existing の確認テキストを表示する", async () => {
    isCreatedVcRecruitChannelMock.mockResolvedValue(false);

    const interaction = makeButtonInteraction({
      customId: `vc-recruit:delete-post:${RECRUITER_ID}:${VC_ID}`,
      userId: RECRUITER_ID,
    });

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(safeReplyMock).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({
        content: "vcRecruit:user-response.delete_existing",
        components: expect.any(Array),
        flags: MessageFlags.Ephemeral,
      }),
    );
  });
});

// VCを終了 確認ボタンの検証
describe("vcRecruitPostButtonHandler / handleConfirmEndVc", () => {
  // beforeEach: 各テストの前にモックをリセットして副作用を分離する
  beforeEach(() => {
    vi.clearAllMocks();
    isCreatedVcRecruitChannelMock.mockResolvedValue(false);
    removeCreatedVoiceChannelIdMock.mockResolvedValue(undefined);
  });

  it("作成されたVCの場合はDBから削除してVCを削除し、ボタンを終了状態に更新する", async () => {
    isCreatedVcRecruitChannelMock.mockResolvedValue(true);

    const vcDeleteMock = vi.fn().mockResolvedValue(undefined);
    const messageEditMock = vi.fn().mockResolvedValue(undefined);

    const postMessage = {
      id: MESSAGE_ID,
      components: [
        {
          components: [
            {
              customId: `vc-recruit:delete-post:${RECRUITER_ID}:${VC_ID}`,
            },
          ],
        },
      ],
      embeds: [{ toJSON: () => ({ title: "📢 VC募集" }) }],
      edit: messageEditMock,
    };

    const interaction = makeButtonInteraction({
      customId: `vc-recruit:confirm-end-vc:${RECRUITER_ID}:${VC_ID}:${MESSAGE_ID}`,
      userId: RECRUITER_ID,
    });

    // VC fetch がチャンネルを返す
    const vcMock = {
      id: VC_ID,
      type: ChannelType.GuildVoice,
      delete: vcDeleteMock,
    };
    interaction.guild!.channels.fetch = vi.fn().mockResolvedValue(vcMock);

    // メッセージ fetch がポストメッセージを返す
    interaction.channel!.messages.fetch = vi
      .fn()
      .mockResolvedValue(postMessage);

    await vcRecruitPostButtonHandler.execute(interaction as never);

    // Arrange: deferUpdate が呼ばれる
    expect(interaction.deferUpdate).toHaveBeenCalled();
    // Assert: DB からVCを削除
    expect(removeCreatedVoiceChannelIdMock).toHaveBeenCalledWith(
      GUILD_ID,
      VC_ID,
    );
    // Assert: VCを削除
    expect(vcDeleteMock).toHaveBeenCalled();
    // Assert: メッセージのボタンを終了状態に更新
    expect(messageEditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        components: expect.any(Array),
      }),
    );
    // Assert: 成功メッセージを表示
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [{ success: "vcRecruit:user-response.end_vc_success" }],
        components: [],
      }),
    );
  });

  it("既存VCの場合はVCを削除せず、ボタンを終了状態に更新する", async () => {
    isCreatedVcRecruitChannelMock.mockResolvedValue(false);

    const messageEditMock = vi.fn().mockResolvedValue(undefined);
    const postMessage = {
      id: MESSAGE_ID,
      components: [],
      embeds: [],
      edit: messageEditMock,
    };

    const interaction = makeButtonInteraction({
      customId: `vc-recruit:confirm-end-vc:${RECRUITER_ID}:${VC_ID}:${MESSAGE_ID}`,
      userId: RECRUITER_ID,
    });
    interaction.channel!.messages.fetch = vi
      .fn()
      .mockResolvedValue(postMessage);

    await vcRecruitPostButtonHandler.execute(interaction as never);

    // Assert: VCは削除しない
    expect(removeCreatedVoiceChannelIdMock).not.toHaveBeenCalled();
    // Assert: メッセージのボタンを終了状態に更新
    expect(messageEditMock).toHaveBeenCalled();
    // Assert: 成功メッセージを表示
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [{ success: "vcRecruit:user-response.end_vc_success" }],
        components: [],
      }),
    );
  });
});

// 募集を削除 確認ボタンの検証
describe("vcRecruitPostButtonHandler / handleConfirmDelete", () => {
  // beforeEach: 各テストの前にモックをリセットして副作用を分離する
  beforeEach(() => {
    vi.clearAllMocks();
    isCreatedVcRecruitChannelMock.mockResolvedValue(false);
    removeCreatedVoiceChannelIdMock.mockResolvedValue(undefined);
  });

  it("作成されたVCの場合はVC削除・スレッド削除・メッセージ削除を行う", async () => {
    isCreatedVcRecruitChannelMock.mockResolvedValue(true);

    const vcDeleteMock = vi.fn().mockResolvedValue(undefined);
    const threadDeleteMock = vi.fn().mockResolvedValue(undefined);
    const messageDeleteMock = vi.fn().mockResolvedValue(undefined);

    const postMessage = {
      id: MESSAGE_ID,
      thread: { delete: threadDeleteMock },
      delete: messageDeleteMock,
    };

    const interaction = makeButtonInteraction({
      customId: `vc-recruit:confirm-delete:${RECRUITER_ID}:${VC_ID}:${MESSAGE_ID}`,
      userId: RECRUITER_ID,
    });

    // VC fetch
    const vcMock = {
      id: VC_ID,
      type: ChannelType.GuildVoice,
      delete: vcDeleteMock,
    };
    interaction.guild!.channels.fetch = vi.fn().mockResolvedValue(vcMock);
    interaction.channel!.messages.fetch = vi
      .fn()
      .mockResolvedValue(postMessage);

    await vcRecruitPostButtonHandler.execute(interaction as never);

    // Assert: DB からVCを削除
    expect(removeCreatedVoiceChannelIdMock).toHaveBeenCalledWith(
      GUILD_ID,
      VC_ID,
    );
    // Assert: VCを削除
    expect(vcDeleteMock).toHaveBeenCalled();
    // Assert: スレッドを削除
    expect(threadDeleteMock).toHaveBeenCalled();
    // Assert: メッセージを削除
    expect(messageDeleteMock).toHaveBeenCalled();
  });

  it("既存VCの場合はVC削除をスキップし、スレッド・メッセージのみ削除する", async () => {
    isCreatedVcRecruitChannelMock.mockResolvedValue(false);

    const threadDeleteMock = vi.fn().mockResolvedValue(undefined);
    const messageDeleteMock = vi.fn().mockResolvedValue(undefined);

    const postMessage = {
      id: MESSAGE_ID,
      thread: { delete: threadDeleteMock },
      delete: messageDeleteMock,
    };

    const interaction = makeButtonInteraction({
      customId: `vc-recruit:confirm-delete:${RECRUITER_ID}:${VC_ID}:${MESSAGE_ID}`,
      userId: RECRUITER_ID,
    });
    interaction.channel!.messages.fetch = vi
      .fn()
      .mockResolvedValue(postMessage);

    await vcRecruitPostButtonHandler.execute(interaction as never);

    // Assert: VCは削除しない
    expect(removeCreatedVoiceChannelIdMock).not.toHaveBeenCalled();
    // Assert: スレッドを削除
    expect(threadDeleteMock).toHaveBeenCalled();
    // Assert: メッセージを削除
    expect(messageDeleteMock).toHaveBeenCalled();
  });
});

// キャンセルボタンの検証
describe("vcRecruitPostButtonHandler / handleCancel", () => {
  // beforeEach: 各テストの前にモックをリセットして副作用を分離する
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cancel-end-vc ボタンでキャンセルメッセージが表示される", async () => {
    const interaction = makeButtonInteraction({
      customId: `vc-recruit:cancel-end-vc:${RECRUITER_ID}:${VC_ID}:${MESSAGE_ID}`,
      userId: RECRUITER_ID,
    });

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(interaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        content: null,
        embeds: [{ success: "vcRecruit:user-response.cancelled" }],
        components: [],
      }),
    );
  });

  it("cancel-delete ボタンでキャンセルメッセージが表示される", async () => {
    const interaction = makeButtonInteraction({
      customId: `vc-recruit:cancel-delete:${RECRUITER_ID}:${VC_ID}:${MESSAGE_ID}`,
      userId: RECRUITER_ID,
    });

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(interaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        content: null,
        embeds: [{ success: "vcRecruit:user-response.cancelled" }],
        components: [],
      }),
    );
  });

  it("guild が null の場合は早期リターンする", async () => {
    const interaction = makeButtonInteraction({
      customId: `vc-recruit:cancel-end-vc:${RECRUITER_ID}:${VC_ID}:${MESSAGE_ID}`,
      hasGuild: false,
    });

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(interaction.update).not.toHaveBeenCalled();
  });

  it("update が失敗しても例外を投げない", async () => {
    const interaction = makeButtonInteraction({
      customId: `vc-recruit:cancel-end-vc:${RECRUITER_ID}:${VC_ID}:${MESSAGE_ID}`,
      userId: RECRUITER_ID,
    });
    interaction.update = vi.fn().mockRejectedValue(new Error("update failed"));

    await expect(
      vcRecruitPostButtonHandler.execute(interaction as never),
    ).resolves.toBeUndefined();
  });
});

// parsePostButtonIds の検証
describe("parsePostButtonIds", () => {
  it("正しいフォーマットの場合 recruiterId と voiceChannelId を返す", () => {
    const result = parsePostButtonIds(
      "vc-recruit:rename-vc:recruiter-1:vc-1",
      "vc-recruit:rename-vc:",
    );
    expect(result).toEqual({
      recruiterId: "recruiter-1",
      voiceChannelId: "vc-1",
    });
  });

  it("コロンがない場合は null を返す", () => {
    const result = parsePostButtonIds(
      "vc-recruit:rename-vc:no-colon-here",
      "vc-recruit:rename-vc:no-colon-here",
    );
    expect(result).toBeNull();
  });
});

// updateToEndedState の検証
describe("updateToEndedState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("削除ボタンのカスタムIDを維持してボタンを終了状態に更新する", async () => {
    const editMock = vi.fn().mockResolvedValue(undefined);
    const message = {
      components: [
        {
          components: [
            {
              customId: `vc-recruit:delete-post:${RECRUITER_ID}:${VC_ID}`,
            },
          ],
        },
      ],
      embeds: [{ toJSON: () => ({ title: "📢 VC募集" }) }],
      edit: editMock,
    };

    await updateToEndedState(message as never, GUILD_ID);

    expect(editMock).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        components: expect.any(Array),
      }),
    );
  });

  it("削除ボタンが見つからない場合はフォールバックIDを使用する", async () => {
    const editMock = vi.fn().mockResolvedValue(undefined);
    const message = {
      components: [],
      embeds: [],
      edit: editMock,
    };

    await updateToEndedState(message as never, GUILD_ID);

    expect(editMock).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        components: expect.any(Array),
      }),
    );
  });

  it("components に components プロパティがない行はスキップする", async () => {
    const editMock = vi.fn().mockResolvedValue(undefined);
    const message = {
      components: [{ noComponents: true }],
      embeds: [],
      edit: editMock,
    };

    await updateToEndedState(message as never, GUILD_ID);

    expect(editMock).toHaveBeenCalled();
  });
});

// handleRenameVc パース失敗の検証
describe("vcRecruitPostButtonHandler / handleRenameVc パース失敗", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("カスタムIDのパースに失敗した場合は早期リターンする", async () => {
    // プレフィックスの後にコロンがない不正なID
    const interaction = makeButtonInteraction({
      customId: "vc-recruit:rename-vc:",
      userId: RECRUITER_ID,
    });

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(safeReplyMock).not.toHaveBeenCalled();
    expect(interaction.showModal).not.toHaveBeenCalled();
  });

  it("VCの種類が GuildVoice でない場合はエラーを返す", async () => {
    const interaction = makeButtonInteraction({
      customId: `vc-recruit:rename-vc:${RECRUITER_ID}:${VC_ID}`,
      userId: RECRUITER_ID,
    });

    interaction.guild!.channels.fetch = vi.fn().mockResolvedValue({
      id: VC_ID,
      type: ChannelType.GuildText,
      name: "テストチャンネル",
    });

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(safeReplyMock).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({
        embeds: [{ warning: "vcRecruit:user-response.vc_already_deleted" }],
        flags: MessageFlags.Ephemeral,
      }),
    );
    expect(interaction.showModal).not.toHaveBeenCalled();
  });
});

// handleEndVc パース失敗の検証
describe("vcRecruitPostButtonHandler / handleEndVc パース失敗", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("guild が null の場合は早期リターンする", async () => {
    const interaction = makeButtonInteraction({
      customId: `vc-recruit:end-vc:${RECRUITER_ID}:${VC_ID}`,
      hasGuild: false,
    });

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(safeReplyMock).not.toHaveBeenCalled();
  });

  it("カスタムIDのパースに失敗した場合は早期リターンする", async () => {
    const interaction = makeButtonInteraction({
      customId: "vc-recruit:end-vc:",
      userId: RECRUITER_ID,
    });

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(safeReplyMock).not.toHaveBeenCalled();
  });
});

// handleDeletePost パース失敗の検証
describe("vcRecruitPostButtonHandler / handleDeletePost パース失敗", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("guild が null の場合は早期リターンする", async () => {
    const interaction = makeButtonInteraction({
      customId: `vc-recruit:delete-post:${RECRUITER_ID}:${VC_ID}`,
      hasGuild: false,
    });

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(safeReplyMock).not.toHaveBeenCalled();
  });

  it("カスタムIDのパースに失敗した場合は早期リターンする", async () => {
    const interaction = makeButtonInteraction({
      customId: "vc-recruit:delete-post:",
      userId: RECRUITER_ID,
    });

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(safeReplyMock).not.toHaveBeenCalled();
  });
});

// handleConfirmEndVc 追加パスの検証
describe("vcRecruitPostButtonHandler / handleConfirmEndVc 追加パス", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isCreatedVcRecruitChannelMock.mockResolvedValue(false);
    removeCreatedVoiceChannelIdMock.mockResolvedValue(undefined);
  });

  it("guild が null の場合は早期リターンする", async () => {
    const interaction = makeButtonInteraction({
      customId: `vc-recruit:confirm-end-vc:${RECRUITER_ID}:${VC_ID}:${MESSAGE_ID}`,
      hasGuild: false,
    });

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(interaction.deferUpdate).not.toHaveBeenCalled();
  });

  it("カスタムIDのパースに失敗した場合は早期リターンする", async () => {
    const interaction = makeButtonInteraction({
      customId: "vc-recruit:confirm-end-vc:",
      userId: RECRUITER_ID,
    });

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(interaction.deferUpdate).not.toHaveBeenCalled();
  });

  it("メッセージの取得に失敗した場合でも成功メッセージを表示する", async () => {
    isCreatedVcRecruitChannelMock.mockResolvedValue(false);

    const interaction = makeButtonInteraction({
      customId: `vc-recruit:confirm-end-vc:${RECRUITER_ID}:${VC_ID}:${MESSAGE_ID}`,
      userId: RECRUITER_ID,
    });
    interaction.channel!.messages.fetch = vi
      .fn()
      .mockRejectedValue(new Error("not found"));

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(interaction.deferUpdate).toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [{ success: "vcRecruit:user-response.end_vc_success" }],
        components: [],
      }),
    );
  });

  it("作成されたVCのfetchが失敗した場合でもエラーにならない", async () => {
    isCreatedVcRecruitChannelMock.mockResolvedValue(true);

    const interaction = makeButtonInteraction({
      customId: `vc-recruit:confirm-end-vc:${RECRUITER_ID}:${VC_ID}:${MESSAGE_ID}`,
      userId: RECRUITER_ID,
    });
    interaction.guild!.channels.fetch = vi
      .fn()
      .mockRejectedValue(new Error("channel not found"));
    interaction.channel!.messages.fetch = vi
      .fn()
      .mockRejectedValue(new Error("not found"));

    await expect(
      vcRecruitPostButtonHandler.execute(interaction as never),
    ).resolves.toBeUndefined();

    expect(removeCreatedVoiceChannelIdMock).toHaveBeenCalledWith(
      GUILD_ID,
      VC_ID,
    );
  });

  it("editReply が失敗しても例外を投げない", async () => {
    isCreatedVcRecruitChannelMock.mockResolvedValue(false);

    const interaction = makeButtonInteraction({
      customId: `vc-recruit:confirm-end-vc:${RECRUITER_ID}:${VC_ID}:${MESSAGE_ID}`,
      userId: RECRUITER_ID,
    });
    interaction.channel!.messages.fetch = vi.fn().mockResolvedValue({
      id: MESSAGE_ID,
      components: [],
      embeds: [],
      edit: vi.fn().mockResolvedValue(undefined),
    });
    interaction.editReply = vi
      .fn()
      .mockRejectedValue(new Error("editReply failed"));

    await expect(
      vcRecruitPostButtonHandler.execute(interaction as never),
    ).resolves.toBeUndefined();
  });
});

// handleConfirmDelete 追加パスの検証
describe("vcRecruitPostButtonHandler / handleConfirmDelete 追加パス", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isCreatedVcRecruitChannelMock.mockResolvedValue(false);
    removeCreatedVoiceChannelIdMock.mockResolvedValue(undefined);
  });

  it("guild が null の場合は早期リターンする", async () => {
    const interaction = makeButtonInteraction({
      customId: `vc-recruit:confirm-delete:${RECRUITER_ID}:${VC_ID}:${MESSAGE_ID}`,
      hasGuild: false,
    });

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(interaction.deferUpdate).not.toHaveBeenCalled();
  });

  it("カスタムIDのパースに失敗した場合は早期リターンする", async () => {
    const interaction = makeButtonInteraction({
      customId: "vc-recruit:confirm-delete:",
      userId: RECRUITER_ID,
    });

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(interaction.deferUpdate).not.toHaveBeenCalled();
  });

  it("メッセージの取得に失敗した場合でもエフェメラルを更新する", async () => {
    isCreatedVcRecruitChannelMock.mockResolvedValue(false);

    const interaction = makeButtonInteraction({
      customId: `vc-recruit:confirm-delete:${RECRUITER_ID}:${VC_ID}:${MESSAGE_ID}`,
      userId: RECRUITER_ID,
    });
    interaction.channel!.messages.fetch = vi
      .fn()
      .mockRejectedValue(new Error("not found"));

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(interaction.deferUpdate).toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [{ success: "vcRecruit:user-response.delete_success" }],
        components: [],
      }),
    );
  });

  it("スレッドがない場合はスレッド削除をスキップしてメッセージのみ削除する", async () => {
    isCreatedVcRecruitChannelMock.mockResolvedValue(false);

    const messageDeleteMock = vi.fn().mockResolvedValue(undefined);
    const postMessage = {
      id: MESSAGE_ID,
      thread: null,
      delete: messageDeleteMock,
    };

    const interaction = makeButtonInteraction({
      customId: `vc-recruit:confirm-delete:${RECRUITER_ID}:${VC_ID}:${MESSAGE_ID}`,
      userId: RECRUITER_ID,
    });
    interaction.channel!.messages.fetch = vi
      .fn()
      .mockResolvedValue(postMessage);

    await vcRecruitPostButtonHandler.execute(interaction as never);

    expect(messageDeleteMock).toHaveBeenCalled();
  });

  it("editReply が失敗しても例外を投げない", async () => {
    isCreatedVcRecruitChannelMock.mockResolvedValue(false);

    const interaction = makeButtonInteraction({
      customId: `vc-recruit:confirm-delete:${RECRUITER_ID}:${VC_ID}:${MESSAGE_ID}`,
      userId: RECRUITER_ID,
    });
    interaction.channel!.messages.fetch = vi
      .fn()
      .mockRejectedValue(new Error("not found"));
    interaction.editReply = vi
      .fn()
      .mockRejectedValue(new Error("editReply failed"));

    await expect(
      vcRecruitPostButtonHandler.execute(interaction as never),
    ).resolves.toBeUndefined();
  });

  it("作成されたVCのfetchが失敗した場合でもエラーにならない", async () => {
    isCreatedVcRecruitChannelMock.mockResolvedValue(true);

    const interaction = makeButtonInteraction({
      customId: `vc-recruit:confirm-delete:${RECRUITER_ID}:${VC_ID}:${MESSAGE_ID}`,
      userId: RECRUITER_ID,
    });
    interaction.guild!.channels.fetch = vi
      .fn()
      .mockRejectedValue(new Error("channel not found"));
    interaction.channel!.messages.fetch = vi
      .fn()
      .mockRejectedValue(new Error("not found"));

    await expect(
      vcRecruitPostButtonHandler.execute(interaction as never),
    ).resolves.toBeUndefined();

    expect(removeCreatedVoiceChannelIdMock).toHaveBeenCalledWith(
      GUILD_ID,
      VC_ID,
    );
  });
});
