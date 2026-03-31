// tests/integration/bot/features/vc-recruit/handlers/vcRecruitHandlers.integration.test.ts
/**
 * VC Recruit Handlers Integration Tests
 * voiceStateUpdate / channelDelete / messageDelete ハンドラの統合テスト
 * ユニットテストと異なり、ハンドラが実際にリポジトリ（モック）を呼び出し、
 * 複数のDB操作やDiscord APIコールが正しく連携することを検証する
 */

import { ChannelType, Collection } from "discord.js";
import type { Mock } from "vitest";
import type { IVcRecruitRepository } from "@/bot/features/vc-recruit/repositories/vcRecruitRepository";
import type { VcRecruitSetup } from "@/shared/database/types";

// Logger のモック
vi.mock("@/shared/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// i18n のモック
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
  tDefault: vi.fn((key: string) => key),
  tGuild: vi.fn(async (_guildId: string, key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
}));

// パネルコンポーネントビルダーのモック
vi.mock("@/bot/features/vc-recruit/commands/vcRecruitPanelEmbed", () => ({
  buildVcRecruitPanelComponents: vi.fn().mockResolvedValue({
    embed: { title: "Panel Embed" },
    row: { components: [] },
  }),
}));

// リポジトリモックの参照（ハンドラの内部で getBotVcRecruitRepository() で取得される）
const mockRepository: Record<string, Mock> = {
  getVcRecruitConfigOrDefault: vi.fn(),
  saveVcRecruitConfig: vi.fn(),
  addSetup: vi.fn(),
  removeSetup: vi.fn(),
  findSetupByCategoryId: vi.fn(),
  findSetupByPanelChannelId: vi.fn(),
  findSetupByPostChannelId: vi.fn(),
  updatePanelMessageId: vi.fn(),
  findSetupByCreatedVcId: vi.fn(),
  addCreatedVoiceChannelId: vi.fn(),
  removeCreatedVoiceChannelId: vi.fn(),
  isCreatedVcRecruitChannel: vi.fn(),
  addMentionRoleId: vi.fn(),
  removeMentionRoleId: vi.fn(),
};

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVcRecruitRepository: () =>
    mockRepository as unknown as IVcRecruitRepository,
}));

/** テスト用セットアップデータを作成する */
function createSetup(overrides?: Partial<VcRecruitSetup>): VcRecruitSetup {
  return {
    categoryId: "category-1",
    panelChannelId: "panel-ch-1",
    postChannelId: "post-ch-1",
    panelMessageId: "panel-msg-1",
    threadArchiveDuration: 1440,
    createdVoiceChannelIds: [],
    ...overrides,
  };
}

describe("VC Recruit Handlers Integration", () => {
  // VC募集ハンドラとリポジトリの統合動作を検証する

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // VoiceStateUpdate ハンドラ
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("voiceStateUpdate: 空室VC自動削除", () => {
    async function loadHandler() {
      const mod = await import(
        "@/bot/features/vc-recruit/handlers/vcRecruitVoiceStateUpdate"
      );
      return mod.handleVcRecruitVoiceStateUpdate;
    }

    it("募集VCが空室になったらチャンネル削除 + DB更新を行うこと", async () => {
      const handler = await loadHandler();

      const setup = createSetup({
        createdVoiceChannelIds: ["vc-recruit-1"],
      });
      mockRepository.findSetupByCreatedVcId.mockResolvedValue(setup);
      mockRepository.removeCreatedVoiceChannelId.mockResolvedValue({});

      const channelDeleteMock = vi.fn().mockResolvedValue(undefined);
      const oldState = {
        channel: {
          id: "vc-recruit-1",
          type: ChannelType.GuildVoice,
          name: "Alice's Room",
          guild: { id: "guild-1" },
          members: { size: 0 },
          delete: channelDeleteMock,
        },
        channelId: "vc-recruit-1",
      };
      const newState = { channelId: null };

      await handler(oldState as never, newState as never);

      // チャンネルを削除
      expect(channelDeleteMock).toHaveBeenCalledTimes(1);
      // DB から VC ID を除去
      expect(mockRepository.removeCreatedVoiceChannelId).toHaveBeenCalledWith(
        "guild-1",
        "vc-recruit-1",
      );
    });

    it("募集VCにメンバーが残っていれば削除しないこと", async () => {
      const handler = await loadHandler();

      const setup = createSetup({
        createdVoiceChannelIds: ["vc-recruit-1"],
      });
      mockRepository.findSetupByCreatedVcId.mockResolvedValue(setup);

      const channelDeleteMock = vi.fn();
      const oldState = {
        channel: {
          id: "vc-recruit-1",
          type: ChannelType.GuildVoice,
          name: "Alice's Room",
          guild: { id: "guild-1" },
          members: { size: 2 },
          delete: channelDeleteMock,
        },
        channelId: "vc-recruit-1",
      };
      const newState = { channelId: null };

      await handler(oldState as never, newState as never);

      expect(channelDeleteMock).not.toHaveBeenCalled();
      expect(mockRepository.removeCreatedVoiceChannelId).not.toHaveBeenCalled();
    });

    it("募集管理外のVCから退出しても何もしないこと", async () => {
      const handler = await loadHandler();

      mockRepository.findSetupByCreatedVcId.mockResolvedValue(null);

      const oldState = {
        channel: {
          id: "random-vc",
          type: ChannelType.GuildVoice,
          guild: { id: "guild-1" },
          members: { size: 0 },
          delete: vi.fn(),
        },
        channelId: "random-vc",
      };
      const newState = { channelId: null };

      await handler(oldState as never, newState as never);

      expect(mockRepository.removeCreatedVoiceChannelId).not.toHaveBeenCalled();
    });

    it("同一チャンネル内の移動（リージョン変更等）は無視すること", async () => {
      const handler = await loadHandler();

      const oldState = {
        channel: {
          id: "vc-recruit-1",
          type: ChannelType.GuildVoice,
          guild: { id: "guild-1" },
          members: { size: 0 },
        },
        channelId: "vc-recruit-1",
      };
      const newState = { channelId: "vc-recruit-1" };

      await handler(oldState as never, newState as never);

      expect(mockRepository.findSetupByCreatedVcId).not.toHaveBeenCalled();
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ChannelDelete ハンドラ
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("channelDelete: セットアップチャンネルのカスケード削除", () => {
    async function loadHandler() {
      const mod = await import(
        "@/bot/features/vc-recruit/handlers/vcRecruitChannelDeleteHandler"
      );
      return mod.handleVcRecruitChannelDelete;
    }

    it("パネルチャンネル削除時にペアの投稿チャンネルも削除し、DBからセットアップを除去すること", async () => {
      const handler = await loadHandler();

      const setup = createSetup();
      mockRepository.findSetupByPanelChannelId.mockResolvedValue(setup);
      mockRepository.removeSetup.mockResolvedValue({});

      const postChannelDeleteMock = vi.fn().mockResolvedValue(undefined);
      const postChannel = { delete: postChannelDeleteMock };

      const channel = {
        id: "panel-ch-1",
        guildId: "guild-1",
        isDMBased: () => false,
        guild: {
          channels: {
            fetch: vi.fn().mockResolvedValue(postChannel),
          },
        },
      };

      await handler(channel as never);

      // ペアの投稿チャンネルを削除
      expect(postChannelDeleteMock).toHaveBeenCalledTimes(1);
      // DB からセットアップを除去
      expect(mockRepository.removeSetup).toHaveBeenCalledWith(
        "guild-1",
        "panel-ch-1",
      );
    });

    it("投稿チャンネル削除時にペアのパネルチャンネルも削除し、DBからセットアップを除去すること", async () => {
      const handler = await loadHandler();

      mockRepository.findSetupByPanelChannelId.mockResolvedValue(null);
      const setup = createSetup();
      mockRepository.findSetupByPostChannelId.mockResolvedValue(setup);
      mockRepository.removeSetup.mockResolvedValue({});

      const panelChannelDeleteMock = vi.fn().mockResolvedValue(undefined);
      const panelChannel = { delete: panelChannelDeleteMock };

      const channel = {
        id: "post-ch-1",
        guildId: "guild-1",
        isDMBased: () => false,
        guild: {
          channels: {
            fetch: vi.fn().mockResolvedValue(panelChannel),
          },
        },
      };

      await handler(channel as never);

      // ペアのパネルチャンネルを削除
      expect(panelChannelDeleteMock).toHaveBeenCalledTimes(1);
      // DB からセットアップを除去（パネルチャンネルIDをキーに）
      expect(mockRepository.removeSetup).toHaveBeenCalledWith(
        "guild-1",
        "panel-ch-1",
      );
    });

    it("パネルチャンネル削除時にペアチャンネルが既に存在しない場合でもDBセットアップを除去すること", async () => {
      const handler = await loadHandler();

      const setup = createSetup();
      mockRepository.findSetupByPanelChannelId.mockResolvedValue(setup);
      mockRepository.removeSetup.mockResolvedValue({});

      const channel = {
        id: "panel-ch-1",
        guildId: "guild-1",
        isDMBased: () => false,
        guild: {
          channels: {
            fetch: vi.fn().mockResolvedValue(null),
          },
        },
      };

      await handler(channel as never);

      // ペアチャンネルは既にないのでdeleteは呼ばない
      // DB からセットアップは除去する
      expect(mockRepository.removeSetup).toHaveBeenCalledWith(
        "guild-1",
        "panel-ch-1",
      );
    });

    it("募集VCが外部削除された場合にDB記録を更新し、募集メッセージのボタンを終了状態にすること", async () => {
      const handler = await loadHandler();

      mockRepository.findSetupByPanelChannelId.mockResolvedValue(null);
      mockRepository.findSetupByPostChannelId.mockResolvedValue(null);

      const setup = createSetup({
        postChannelId: "post-ch-1",
        createdVoiceChannelIds: ["vc-recruit-1"],
      });
      mockRepository.findSetupByCreatedVcId.mockResolvedValue(setup);
      mockRepository.removeCreatedVoiceChannelId.mockResolvedValue({});

      // 募集メッセージのモック
      const msgEditMock = vi.fn().mockResolvedValue(undefined);
      const recruitMessage = {
        id: "recruit-msg-1",
        embeds: [{ title: "Recruit Post" }],
        components: [
          {
            components: [
              { customId: "vc-recruit:post:join:vc-recruit-1" },
              { customId: "vc-recruit:post:delete:recruit-msg-1" },
            ],
          },
        ],
        edit: msgEditMock,
      };
      const noMatchMessage = {
        id: "other-msg",
        embeds: [],
        components: [
          {
            components: [{ customId: "vc-recruit:post:join:other-vc" }],
          },
        ],
        edit: vi.fn(),
      };

      const messagesCollection = new Collection<
        string,
        typeof recruitMessage
      >();
      messagesCollection.set("recruit-msg-1", recruitMessage);
      messagesCollection.set("other-msg", noMatchMessage as never);

      const postChannel = {
        messages: {
          fetch: vi.fn().mockResolvedValue(messagesCollection),
        },
      };

      const channel = {
        id: "vc-recruit-1",
        guildId: "guild-1",
        isDMBased: () => false,
        guild: {
          channels: {
            fetch: vi.fn().mockResolvedValue(postChannel),
          },
        },
      };

      await handler(channel as never);

      // DB から VC ID を除去
      expect(mockRepository.removeCreatedVoiceChannelId).toHaveBeenCalledWith(
        "guild-1",
        "vc-recruit-1",
      );
      // 該当する募集メッセージを「終了済み」に更新
      expect(msgEditMock).toHaveBeenCalledTimes(1);
      // マッチしないメッセージは更新しない
      expect(noMatchMessage.edit).not.toHaveBeenCalled();
    });

    it("セットアップに無関係なチャンネルの削除は何もしないこと", async () => {
      const handler = await loadHandler();

      mockRepository.findSetupByPanelChannelId.mockResolvedValue(null);
      mockRepository.findSetupByPostChannelId.mockResolvedValue(null);
      mockRepository.findSetupByCreatedVcId.mockResolvedValue(null);

      const channel = {
        id: "random-ch",
        guildId: "guild-1",
        isDMBased: () => false,
        guild: {
          channels: { fetch: vi.fn() },
        },
      };

      await handler(channel as never);

      expect(mockRepository.removeSetup).not.toHaveBeenCalled();
      expect(mockRepository.removeCreatedVoiceChannelId).not.toHaveBeenCalled();
    });

    it("DMチャンネルの削除は無視すること", async () => {
      const handler = await loadHandler();

      const channel = {
        isDMBased: () => true,
      };

      await handler(channel as never);

      expect(mockRepository.findSetupByPanelChannelId).not.toHaveBeenCalled();
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MessageDelete ハンドラ（パネル自己修復）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("messageDelete: パネルメッセージの自己修復", () => {
    async function loadHandler() {
      const mod = await import(
        "@/bot/features/vc-recruit/handlers/vcRecruitMessageDeleteHandler"
      );
      return mod.handleVcRecruitMessageDelete;
    }

    it("パネルメッセージが削除された場合に再送信してDB上のメッセージIDを更新すること", async () => {
      const handler = await loadHandler();

      const setup = createSetup({ panelMessageId: "deleted-msg-1" });
      mockRepository.findSetupByPanelChannelId.mockResolvedValue(setup);
      mockRepository.updatePanelMessageId.mockResolvedValue({});

      const sendMock = vi.fn().mockResolvedValue({ id: "new-panel-msg-1" });
      const panelChannel = {
        isSendable: () => true,
        send: sendMock,
      };

      const message = {
        id: "deleted-msg-1",
        guildId: "guild-1",
        channelId: "panel-ch-1",
        guild: {
          channels: {
            fetch: vi.fn().mockResolvedValue(panelChannel),
          },
        },
      };

      await handler(message as never);

      // パネルメッセージを再送信
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [expect.any(Object)],
          components: [expect.any(Object)],
        }),
      );
      // DB の panelMessageId を新しいIDに更新
      expect(mockRepository.updatePanelMessageId).toHaveBeenCalledWith(
        "guild-1",
        "panel-ch-1",
        "new-panel-msg-1",
      );
    });

    it("パネルメッセージ以外のメッセージが削除されても何もしないこと", async () => {
      const handler = await loadHandler();

      const setup = createSetup({ panelMessageId: "panel-msg-1" });
      mockRepository.findSetupByPanelChannelId.mockResolvedValue(setup);

      const message = {
        id: "other-msg-999",
        guildId: "guild-1",
        channelId: "panel-ch-1",
        guild: { channels: { fetch: vi.fn() } },
      };

      await handler(message as never);

      expect(mockRepository.updatePanelMessageId).not.toHaveBeenCalled();
    });

    it("パネルチャンネルとして登録されていないチャンネルのメッセージ削除は無視すること", async () => {
      const handler = await loadHandler();

      mockRepository.findSetupByPanelChannelId.mockResolvedValue(null);

      const message = {
        id: "some-msg",
        guildId: "guild-1",
        channelId: "random-ch",
      };

      await handler(message as never);

      expect(mockRepository.updatePanelMessageId).not.toHaveBeenCalled();
    });

    it("パネルチャンネルが送信不可になっている場合は再送信をスキップすること", async () => {
      const handler = await loadHandler();

      const setup = createSetup({ panelMessageId: "deleted-msg-1" });
      mockRepository.findSetupByPanelChannelId.mockResolvedValue(setup);

      const panelChannel = {
        isSendable: () => false,
      };

      const message = {
        id: "deleted-msg-1",
        guildId: "guild-1",
        channelId: "panel-ch-1",
        guild: {
          channels: {
            fetch: vi.fn().mockResolvedValue(panelChannel),
          },
        },
      };

      await handler(message as never);

      expect(mockRepository.updatePanelMessageId).not.toHaveBeenCalled();
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ハンドラ間の統合シナリオ
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe("統合シナリオ: VC作成 → 空室 → 自動削除 → 募集メッセージ更新", () => {
    it("VCから全員退出すると自動削除され、channelDeleteハンドラが募集メッセージを更新すること", async () => {
      const voiceHandler = (
        await import(
          "@/bot/features/vc-recruit/handlers/vcRecruitVoiceStateUpdate"
        )
      ).handleVcRecruitVoiceStateUpdate;

      const channelDeleteHandler = (
        await import(
          "@/bot/features/vc-recruit/handlers/vcRecruitChannelDeleteHandler"
        )
      ).handleVcRecruitChannelDelete;

      const setup = createSetup({
        postChannelId: "post-ch-1",
        createdVoiceChannelIds: ["vc-recruit-1"],
      });

      // Phase 1: voiceStateUpdate — VC が空になったので削除
      mockRepository.findSetupByCreatedVcId.mockResolvedValue(setup);
      mockRepository.removeCreatedVoiceChannelId.mockResolvedValue({});

      const channelDeleteMock = vi.fn().mockResolvedValue(undefined);
      const oldState = {
        channel: {
          id: "vc-recruit-1",
          type: ChannelType.GuildVoice,
          name: "Alice's Room",
          guild: { id: "guild-1" },
          members: { size: 0 },
          delete: channelDeleteMock,
        },
        channelId: "vc-recruit-1",
      };
      const newState = { channelId: null };

      await voiceHandler(oldState as never, newState as never);

      expect(channelDeleteMock).toHaveBeenCalledTimes(1);
      expect(mockRepository.removeCreatedVoiceChannelId).toHaveBeenCalledWith(
        "guild-1",
        "vc-recruit-1",
      );

      // Phase 2: channelDelete — Discord が channelDelete イベントを発火
      // この時点でDB上は既に removeCreatedVoiceChannelId 済み
      mockRepository.findSetupByPanelChannelId.mockResolvedValue(null);
      mockRepository.findSetupByPostChannelId.mockResolvedValue(null);
      // 既にDB除去済みなので findSetupByCreatedVcId は null を返す
      mockRepository.findSetupByCreatedVcId.mockResolvedValue(null);

      const deletedChannel = {
        id: "vc-recruit-1",
        guildId: "guild-1",
        isDMBased: () => false,
        guild: {
          channels: { fetch: vi.fn() },
        },
      };

      await channelDeleteHandler(deletedChannel as never);

      // 既にDB除去済みなので追加の removeSetup/removeCreatedVoiceChannelId は呼ばれない
      expect(mockRepository.removeSetup).not.toHaveBeenCalled();
    });
  });

  describe("統合シナリオ: パネル削除 → 自己修復", () => {
    it("パネルメッセージが削除されたら再送信し、新しいメッセージIDでDBを更新すること", async () => {
      const messageDeleteHandler = (
        await import(
          "@/bot/features/vc-recruit/handlers/vcRecruitMessageDeleteHandler"
        )
      ).handleVcRecruitMessageDelete;

      const setup = createSetup({ panelMessageId: "old-panel-msg" });

      // Phase 1: messageDelete — パネルメッセージが削除された
      mockRepository.findSetupByPanelChannelId.mockResolvedValue(setup);
      mockRepository.updatePanelMessageId.mockResolvedValue({});

      const sendMock = vi.fn().mockResolvedValue({ id: "new-panel-msg" });
      const panelChannel = {
        isSendable: () => true,
        send: sendMock,
      };

      const deletedMessage = {
        id: "old-panel-msg",
        guildId: "guild-1",
        channelId: "panel-ch-1",
        guild: {
          channels: {
            fetch: vi.fn().mockResolvedValue(panelChannel),
          },
        },
      };

      await messageDeleteHandler(deletedMessage as never);

      // 再送信 + DB 更新
      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(mockRepository.updatePanelMessageId).toHaveBeenCalledWith(
        "guild-1",
        "panel-ch-1",
        "new-panel-msg",
      );

      // Phase 2: 再度同じことが起きても、新しい panelMessageId で正しく判定できる
      const updatedSetup = createSetup({ panelMessageId: "new-panel-msg" });
      mockRepository.findSetupByPanelChannelId.mockResolvedValue(updatedSetup);

      // 古いIDのメッセージが削除されても無視（パネルメッセージではない）
      const oldMessage = {
        id: "old-panel-msg",
        guildId: "guild-1",
        channelId: "panel-ch-1",
        guild: { channels: { fetch: vi.fn() } },
      };

      await messageDeleteHandler(oldMessage as never);

      // updatePanelMessageId は Phase 1 の1回のみ
      expect(mockRepository.updatePanelMessageId).toHaveBeenCalledTimes(1);
    });
  });

  describe("統合シナリオ: セットアップチャンネルのカスケード削除の連鎖防止", () => {
    it("パネル削除でペアチャンネルを削除後、ペア側のchannelDeleteイベントで二重削除しないこと", async () => {
      const channelDeleteHandler = (
        await import(
          "@/bot/features/vc-recruit/handlers/vcRecruitChannelDeleteHandler"
        )
      ).handleVcRecruitChannelDelete;

      const setup = createSetup();

      // Phase 1: パネルチャンネル削除 → 投稿チャンネルも削除
      mockRepository.findSetupByPanelChannelId.mockResolvedValue(setup);
      mockRepository.removeSetup.mockResolvedValue({});

      const postChannelDeleteMock = vi.fn().mockResolvedValue(undefined);

      const panelChannel = {
        id: "panel-ch-1",
        guildId: "guild-1",
        isDMBased: () => false,
        guild: {
          channels: {
            fetch: vi.fn().mockResolvedValue({
              delete: postChannelDeleteMock,
            }),
          },
        },
      };

      await channelDeleteHandler(panelChannel as never);

      expect(postChannelDeleteMock).toHaveBeenCalledTimes(1);
      expect(mockRepository.removeSetup).toHaveBeenCalledWith(
        "guild-1",
        "panel-ch-1",
      );

      vi.clearAllMocks();

      // Phase 2: 投稿チャンネルの channelDelete イベントが発火
      // しかし既に removeSetup 済みなので何もしない
      mockRepository.findSetupByPanelChannelId.mockResolvedValue(null);
      mockRepository.findSetupByPostChannelId.mockResolvedValue(null);
      mockRepository.findSetupByCreatedVcId.mockResolvedValue(null);

      const postChannel = {
        id: "post-ch-1",
        guildId: "guild-1",
        isDMBased: () => false,
        guild: {
          channels: { fetch: vi.fn() },
        },
      };

      await channelDeleteHandler(postChannel as never);

      // 二重削除は発生しない
      expect(mockRepository.removeSetup).not.toHaveBeenCalled();
    });
  });
});
