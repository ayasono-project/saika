// tests/integration/bot/features/vac/services/vacService.integration.test.ts
/**
 * VacService Integration Tests
 * VacService → 実ユースケース（create/delete/cleanup）の統合テスト
 * ユニットテストと異なり、ユースケースをモックせず実コードを通して検証する
 */

import { ChannelType, PermissionFlagsBits } from "discord.js";
import type { Mocked } from "vitest";
import { VacService } from "@/bot/features/vac/services/vacService";
import type { VacConfig } from "@/shared/database/types";
import type { VacConfigService } from "@/shared/features/vac/vacConfigService";

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
  tDefault: vi.fn((key: string) => `default:${key}`),
  tInteraction: (...args: unknown[]) => args[1],
}));

// VC コントロールパネルのモック
vi.mock("@/bot/features/vc-panel/vcControlPanel", () => ({
  sendVcControlPanel: vi.fn().mockResolvedValue(undefined),
}));

// errorHandling のモック（実処理に近い形で委譲）
vi.mock("@/shared/utils/errorHandling", () => ({
  executeWithLoggedError: async (
    operation: () => Promise<void>,
    _message: string,
  ) => {
    await operation();
  },
}));

function createRepositoryMock(): Mocked<VacConfigService> {
  return {
    getVacConfigOrDefault: vi.fn(),
    saveVacConfig: vi.fn(),
    addTriggerChannel: vi.fn(),
    removeTriggerChannel: vi.fn(),
    addCreatedVacChannel: vi.fn(),
    removeCreatedVacChannel: vi.fn(),
    isManagedVacChannel: vi.fn(),
  } as unknown as Mocked<VacConfigService>;
}

/** VAC が有効でトリガーと作成済みチャンネルを持つ設定を返す */
function createEnabledConfig(overrides?: Partial<VacConfig>): VacConfig {
  return {
    enabled: true,
    triggerChannelIds: ["trigger-1"],
    createdChannels: [],
    ...overrides,
  };
}

/** VoiceState のモックを組み立てるヘルパー */
function createVoiceState(options: {
  channelId: string | null;
  channelType?: ChannelType;
  guildId?: string;
  memberId?: string;
  displayName?: string;
  memberCount?: number;
  channelNames?: string[];
  parentCategoryChildrenCount?: number;
}) {
  const deleteMock = vi.fn().mockResolvedValue(undefined);
  const setChannelMock = vi.fn().mockResolvedValue(undefined);
  const fetchMock = vi.fn();
  const createMock = vi.fn().mockResolvedValue({
    id: "created-voice-1",
    type: ChannelType.GuildVoice,
  });

  const names = options.channelNames ?? [];
  const channelsCache = {
    find: (predicate: (channel: { name: string }) => boolean) =>
      names.map((name) => ({ name })).find(predicate),
  };

  const parent =
    typeof options.parentCategoryChildrenCount === "number"
      ? {
          id: "category-1",
          type: ChannelType.GuildCategory,
          children: { cache: { size: options.parentCategoryChildrenCount } },
        }
      : null;

  const channel = options.channelId
    ? {
        id: options.channelId,
        type: options.channelType ?? ChannelType.GuildVoice,
        guildId: options.guildId ?? "guild-1",
        guild: { id: options.guildId ?? "guild-1" },
        parent,
        members: { size: options.memberCount ?? 0 },
        delete: deleteMock,
      }
    : null;

  const state = {
    guild: { id: options.guildId ?? "guild-1" },
    channelId: options.channelId,
    channel,
    member: options.memberId
      ? {
          id: options.memberId,
          displayName: options.displayName ?? "TestUser",
          guild: {
            id: options.guildId ?? "guild-1",
            channels: {
              fetch: fetchMock,
              create: createMock,
              cache: channelsCache,
            },
          },
          voice: { setChannel: setChannelMock },
        }
      : null,
  };

  return { state, deleteMock, setChannelMock, fetchMock, createMock };
}

describe("VacService Integration", () => {
  // VacService と実ユースケースを結合し、作成→削除→クリーンアップのフローを検証する

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("VAC ライフサイクル: 作成 → 追跡 → 削除", () => {
    it("トリガーVC参加でチャンネル作成し、退出時に空室のため自動削除されること", async () => {
      const repository = createRepositoryMock();
      const service = new VacService(repository);

      // --- Phase 1: トリガーVC参加 → チャンネル作成 ---
      repository.getVacConfigOrDefault.mockResolvedValue(createEnabledConfig());

      const {
        state: joinState,
        createMock,
        setChannelMock: joinSetChannel,
      } = createVoiceState({
        channelId: "trigger-1",
        memberId: "user-1",
        displayName: "Alice",
      });

      const oldJoin = createVoiceState({ channelId: null }).state;

      await service.handleVoiceStateUpdate(
        oldJoin as never,
        joinState as never,
      );

      // チャンネル作成を確認
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Alice's Room",
          type: ChannelType.GuildVoice,
          userLimit: 99,
          permissionOverwrites: [
            { id: "user-1", allow: [PermissionFlagsBits.ManageChannels] },
          ],
        }),
      );
      // ユーザー移動を確認
      expect(joinSetChannel).toHaveBeenCalledWith({
        id: "created-voice-1",
        type: ChannelType.GuildVoice,
      });
      // DB にチャンネルが登録されたことを確認
      expect(repository.addCreatedVacChannel).toHaveBeenCalledWith("guild-1", {
        voiceChannelId: "created-voice-1",
        ownerId: "user-1",
        createdAt: 1700000000000,
      });

      // --- Phase 2: 作成されたVCから退出 → 空室で自動削除 ---
      repository.getVacConfigOrDefault.mockResolvedValue(
        createEnabledConfig({
          createdChannels: [
            {
              voiceChannelId: "created-voice-1",
              ownerId: "user-1",
              createdAt: 1700000000000,
            },
          ],
        }),
      );

      const { state: leaveOldState, deleteMock } = createVoiceState({
        channelId: "created-voice-1",
        memberId: "user-1",
        memberCount: 0,
      });
      const leaveNewState = createVoiceState({ channelId: null }).state;

      await service.handleVoiceStateUpdate(
        leaveOldState as never,
        leaveNewState as never,
      );

      // チャンネル削除を確認
      expect(deleteMock).toHaveBeenCalledTimes(1);
      // DB からチャンネルが除去されたことを確認
      expect(repository.removeCreatedVacChannel).toHaveBeenCalledWith(
        "guild-1",
        "created-voice-1",
      );
    });

    it("管理VCに他のメンバーが残っている場合は削除されないこと", async () => {
      const repository = createRepositoryMock();
      const service = new VacService(repository);

      repository.getVacConfigOrDefault.mockResolvedValue(
        createEnabledConfig({
          createdChannels: [
            {
              voiceChannelId: "created-voice-1",
              ownerId: "user-1",
              createdAt: 1,
            },
          ],
        }),
      );

      const { state: leaveOldState, deleteMock } = createVoiceState({
        channelId: "created-voice-1",
        memberId: "user-1",
        memberCount: 2,
      });
      const leaveNewState = createVoiceState({ channelId: null }).state;

      await service.handleVoiceStateUpdate(
        leaveOldState as never,
        leaveNewState as never,
      );

      expect(deleteMock).not.toHaveBeenCalled();
      expect(repository.removeCreatedVacChannel).not.toHaveBeenCalled();
    });
  });

  describe("既存チャンネル再利用", () => {
    it("同一ユーザーが既に所有するVACがある場合は新規作成をスキップして既存チャンネルに移動すること", async () => {
      const repository = createRepositoryMock();
      const service = new VacService(repository);

      repository.getVacConfigOrDefault.mockResolvedValue(
        createEnabledConfig({
          createdChannels: [
            {
              voiceChannelId: "existing-vc-1",
              ownerId: "user-1",
              createdAt: 1,
            },
          ],
        }),
      );

      const {
        state: joinState,
        fetchMock,
        createMock,
        setChannelMock,
      } = createVoiceState({
        channelId: "trigger-1",
        memberId: "user-1",
      });

      const existingChannel = {
        id: "existing-vc-1",
        type: ChannelType.GuildVoice,
      };
      fetchMock.mockResolvedValue(existingChannel);

      const oldState = createVoiceState({ channelId: null }).state;

      await service.handleVoiceStateUpdate(
        oldState as never,
        joinState as never,
      );

      // 既存チャンネルに移動
      expect(setChannelMock).toHaveBeenCalledWith(existingChannel);
      // 新規チャンネルは作成しない
      expect(createMock).not.toHaveBeenCalled();
      expect(repository.addCreatedVacChannel).not.toHaveBeenCalled();
    });

    it("既存の所有チャンネルが利用不可になっている場合は古いレコードを削除して新規作成すること", async () => {
      const repository = createRepositoryMock();
      const service = new VacService(repository);

      repository.getVacConfigOrDefault.mockResolvedValue(
        createEnabledConfig({
          createdChannels: [
            { voiceChannelId: "stale-vc-1", ownerId: "user-1", createdAt: 1 },
          ],
        }),
      );

      const {
        state: joinState,
        fetchMock,
        createMock,
        setChannelMock,
      } = createVoiceState({
        channelId: "trigger-1",
        memberId: "user-1",
        displayName: "Alice",
      });

      // 既存チャンネルの fetch が失敗
      fetchMock.mockRejectedValue(new Error("not found"));

      const oldState = createVoiceState({ channelId: null }).state;

      await service.handleVoiceStateUpdate(
        oldState as never,
        joinState as never,
      );

      // 古いレコードを削除
      expect(repository.removeCreatedVacChannel).toHaveBeenCalledWith(
        "guild-1",
        "stale-vc-1",
      );
      // 新規チャンネルを作成
      expect(createMock).toHaveBeenCalledTimes(1);
      expect(setChannelMock).toHaveBeenCalledTimes(1);
      expect(repository.addCreatedVacChannel).toHaveBeenCalledWith("guild-1", {
        voiceChannelId: "created-voice-1",
        ownerId: "user-1",
        createdAt: 1700000000000,
      });
    });
  });

  describe("同一イベントでの create + delete 協調", () => {
    it("チャンネル移動時に移動先でVAC作成し、移動元の空室VACを同時に削除すること", async () => {
      const repository = createRepositoryMock();
      const service = new VacService(repository);

      // 移動先はトリガーVC、移動元は空室の管理VAC
      repository.getVacConfigOrDefault.mockResolvedValue(
        createEnabledConfig({
          createdChannels: [
            {
              voiceChannelId: "old-managed-vc",
              ownerId: "user-2",
              createdAt: 1,
            },
          ],
        }),
      );

      // 移動先（newState）: トリガーVC
      const {
        state: newState,
        createMock,
        setChannelMock,
      } = createVoiceState({
        channelId: "trigger-1",
        memberId: "user-1",
        displayName: "Bob",
      });

      // 移動元（oldState）: 空室の管理VAC
      const { state: oldState, deleteMock } = createVoiceState({
        channelId: "old-managed-vc",
        memberId: "user-1",
        memberCount: 0,
      });

      await service.handleVoiceStateUpdate(
        oldState as never,
        newState as never,
      );

      // 新規VAC作成
      expect(createMock).toHaveBeenCalledTimes(1);
      expect(setChannelMock).toHaveBeenCalledTimes(1);
      // 旧VAC削除
      expect(deleteMock).toHaveBeenCalledTimes(1);
      expect(repository.removeCreatedVacChannel).toHaveBeenCalledWith(
        "guild-1",
        "old-managed-vc",
      );
    });
  });

  describe("カテゴリ上限チェック", () => {
    it("親カテゴリのチャンネル数が上限に達している場合はVACを作成しないこと", async () => {
      const repository = createRepositoryMock();
      const service = new VacService(repository);

      repository.getVacConfigOrDefault.mockResolvedValue(createEnabledConfig());

      const { state: joinState, createMock } = createVoiceState({
        channelId: "trigger-1",
        memberId: "user-1",
        parentCategoryChildrenCount: 50,
      });
      const oldState = createVoiceState({ channelId: null }).state;

      await service.handleVoiceStateUpdate(
        oldState as never,
        joinState as never,
      );

      expect(createMock).not.toHaveBeenCalled();
      expect(repository.addCreatedVacChannel).not.toHaveBeenCalled();
    });
  });

  describe("ユーザー移動失敗時のロールバック", () => {
    it("setChannel が失敗した場合は作成したチャンネルを削除してロールバックすること", async () => {
      const repository = createRepositoryMock();
      const service = new VacService(repository);

      repository.getVacConfigOrDefault.mockResolvedValue(createEnabledConfig());

      const channelDeleteMock = vi.fn().mockResolvedValue(undefined);
      const createMock = vi.fn().mockResolvedValue({
        id: "created-voice-1",
        type: ChannelType.GuildVoice,
        delete: channelDeleteMock,
      });

      const setChannelMock = vi
        .fn()
        .mockRejectedValue(new Error("user disconnected"));

      const newState = {
        guild: { id: "guild-1" },
        channelId: "trigger-1",
        channel: {
          id: "trigger-1",
          type: ChannelType.GuildVoice,
          parent: null,
        },
        member: {
          id: "user-1",
          displayName: "Alice",
          guild: {
            id: "guild-1",
            channels: {
              fetch: vi.fn(),
              create: createMock,
              cache: { find: () => undefined },
            },
          },
          voice: { setChannel: setChannelMock },
        },
      };
      const oldState = createVoiceState({ channelId: null }).state;

      await service.handleVoiceStateUpdate(
        oldState as never,
        newState as never,
      );

      // チャンネルは作成された
      expect(createMock).toHaveBeenCalledTimes(1);
      // 移動失敗 → チャンネル削除（ロールバック）
      expect(channelDeleteMock).toHaveBeenCalledTimes(1);
      // DB には保存されない
      expect(repository.addCreatedVacChannel).not.toHaveBeenCalled();
    });
  });

  describe("チャンネル削除イベントの同期", () => {
    it("トリガーチャンネルが削除された場合に設定からトリガーを除去すること", async () => {
      const repository = createRepositoryMock();
      const service = new VacService(repository);

      repository.getVacConfigOrDefault.mockResolvedValue(
        createEnabledConfig({ triggerChannelIds: ["trigger-1", "trigger-2"] }),
      );

      const channel = {
        id: "trigger-1",
        guildId: "guild-1",
        type: ChannelType.GuildVoice,
        isDMBased: vi.fn(() => false),
      };

      await service.handleChannelDelete(channel as never);

      expect(repository.removeTriggerChannel).toHaveBeenCalledWith(
        "guild-1",
        "trigger-1",
      );
    });

    it("管理VACが外部削除された場合にDB記録を除去すること", async () => {
      const repository = createRepositoryMock();
      const service = new VacService(repository);

      repository.getVacConfigOrDefault.mockResolvedValue(
        createEnabledConfig({
          createdChannels: [
            { voiceChannelId: "managed-1", ownerId: "user-1", createdAt: 1 },
          ],
        }),
      );

      const channel = {
        id: "managed-1",
        guildId: "guild-1",
        type: ChannelType.GuildVoice,
        isDMBased: vi.fn(() => false),
      };

      await service.handleChannelDelete(channel as never);

      expect(repository.removeCreatedVacChannel).toHaveBeenCalledWith(
        "guild-1",
        "managed-1",
      );
    });

    it("トリガーと管理VACの両方に登録されたチャンネルが削除された場合に両方のレコードを除去すること", async () => {
      const repository = createRepositoryMock();
      const service = new VacService(repository);

      repository.getVacConfigOrDefault.mockResolvedValue(
        createEnabledConfig({
          triggerChannelIds: ["dual-channel"],
          createdChannels: [
            { voiceChannelId: "dual-channel", ownerId: "user-1", createdAt: 1 },
          ],
        }),
      );

      const channel = {
        id: "dual-channel",
        guildId: "guild-1",
        type: ChannelType.GuildVoice,
        isDMBased: vi.fn(() => false),
      };

      await service.handleChannelDelete(channel as never);

      expect(repository.removeTriggerChannel).toHaveBeenCalledWith(
        "guild-1",
        "dual-channel",
      );
      expect(repository.removeCreatedVacChannel).toHaveBeenCalledWith(
        "guild-1",
        "dual-channel",
      );
    });
  });

  describe("起動時クリーンアップ", () => {
    it("存在しないトリガーチャンネルと孤立した管理VACを起動時に一括掃除すること", async () => {
      const repository = createRepositoryMock();
      const service = new VacService(repository);

      const deleteMock = vi.fn().mockResolvedValue(undefined);

      repository.getVacConfigOrDefault.mockResolvedValue(
        createEnabledConfig({
          triggerChannelIds: ["valid-trigger", "stale-trigger"],
          createdChannels: [
            { voiceChannelId: "orphaned-vc", ownerId: "user-1", createdAt: 1 },
            { voiceChannelId: "empty-vc", ownerId: "user-2", createdAt: 2 },
            { voiceChannelId: "active-vc", ownerId: "user-3", createdAt: 3 },
          ],
        }),
      );

      const guildFetchMock = vi
        .fn()
        // トリガーチャンネルの fetch
        .mockResolvedValueOnce({
          id: "valid-trigger",
          type: ChannelType.GuildVoice,
        })
        .mockResolvedValueOnce(null) // stale-trigger は存在しない
        // 作成済みチャンネルの fetch
        .mockResolvedValueOnce(null) // orphaned-vc は存在しない
        .mockResolvedValueOnce({
          id: "empty-vc",
          type: ChannelType.GuildVoice,
          isDMBased: () => false,
          members: { size: 0 },
          delete: deleteMock,
        })
        .mockResolvedValueOnce({
          id: "active-vc",
          type: ChannelType.GuildVoice,
          isDMBased: () => false,
          members: { size: 3 },
          delete: vi.fn(),
        });

      const client = {
        guilds: {
          cache: new Map([
            ["guild-1", { id: "guild-1", channels: { fetch: guildFetchMock } }],
          ]),
        },
      };

      await service.cleanupOnStartup(client as never);

      // 存在しないトリガーを除去
      expect(repository.removeTriggerChannel).toHaveBeenCalledWith(
        "guild-1",
        "stale-trigger",
      );
      // 有効なトリガーは維持
      expect(repository.removeTriggerChannel).toHaveBeenCalledTimes(1);

      // 孤立チャンネル（fetch で null）を除去
      expect(repository.removeCreatedVacChannel).toHaveBeenCalledWith(
        "guild-1",
        "orphaned-vc",
      );
      // 空室チャンネルを Discord 削除 + DB 除去
      expect(deleteMock).toHaveBeenCalledTimes(1);
      expect(repository.removeCreatedVacChannel).toHaveBeenCalledWith(
        "guild-1",
        "empty-vc",
      );
      // アクティブなチャンネルは維持
      expect(repository.removeCreatedVacChannel).not.toHaveBeenCalledWith(
        "guild-1",
        "active-vc",
      );
      // 合計: orphaned-vc + empty-vc = 2回
      expect(repository.removeCreatedVacChannel).toHaveBeenCalledTimes(2);
    });

    it("複数ギルドにまたがるクリーンアップを正しく処理すること", async () => {
      const repository = createRepositoryMock();
      const service = new VacService(repository);

      const guild1Config = createEnabledConfig({
        triggerChannelIds: ["g1-trigger"],
        createdChannels: [],
      });
      const guild2Config = createEnabledConfig({
        triggerChannelIds: [],
        createdChannels: [
          { voiceChannelId: "g2-orphaned", ownerId: "user-1", createdAt: 1 },
        ],
      });

      repository.getVacConfigOrDefault
        .mockResolvedValueOnce(guild1Config)
        .mockResolvedValueOnce(guild2Config);

      const guild1Fetch = vi.fn().mockResolvedValue({
        id: "g1-trigger",
        type: ChannelType.GuildVoice,
      });
      const guild2Fetch = vi.fn().mockResolvedValue(null);

      const client = {
        guilds: {
          cache: new Map([
            ["guild-1", { id: "guild-1", channels: { fetch: guild1Fetch } }],
            ["guild-2", { id: "guild-2", channels: { fetch: guild2Fetch } }],
          ]),
        },
      };

      await service.cleanupOnStartup(client as never);

      // guild-1 のトリガーは有効なので除去しない
      expect(repository.removeTriggerChannel).not.toHaveBeenCalled();
      // guild-2 の孤立チャンネルを除去
      expect(repository.removeCreatedVacChannel).toHaveBeenCalledWith(
        "guild-2",
        "g2-orphaned",
      );
    });

    it("全ての設定が正常な場合はレコードを一切変更しないこと", async () => {
      const repository = createRepositoryMock();
      const service = new VacService(repository);

      repository.getVacConfigOrDefault.mockResolvedValue(
        createEnabledConfig({
          triggerChannelIds: ["trigger-1"],
          createdChannels: [
            { voiceChannelId: "active-vc", ownerId: "user-1", createdAt: 1 },
          ],
        }),
      );

      const guildFetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          id: "trigger-1",
          type: ChannelType.GuildVoice,
        })
        .mockResolvedValueOnce({
          id: "active-vc",
          type: ChannelType.GuildVoice,
          isDMBased: () => false,
          members: { size: 1 },
        });

      const client = {
        guilds: {
          cache: new Map([
            ["guild-1", { id: "guild-1", channels: { fetch: guildFetchMock } }],
          ]),
        },
      };

      await service.cleanupOnStartup(client as never);

      expect(repository.removeTriggerChannel).not.toHaveBeenCalled();
      expect(repository.removeCreatedVacChannel).not.toHaveBeenCalled();
    });
  });

  describe("ガード条件の統合動作", () => {
    it("同一チャンネルに留まった場合はユースケースを実行しないこと", async () => {
      const repository = createRepositoryMock();
      const service = new VacService(repository);

      const oldState = { channelId: "same-ch", guild: { id: "guild-1" } };
      const newState = { guild: { id: "guild-1" }, channelId: "same-ch" };

      await service.handleVoiceStateUpdate(
        oldState as never,
        newState as never,
      );

      expect(repository.getVacConfigOrDefault).not.toHaveBeenCalled();
    });

    it("VAC が無効な場合はトリガーVCに参加してもチャンネルを作成しないこと", async () => {
      const repository = createRepositoryMock();
      const service = new VacService(repository);

      repository.getVacConfigOrDefault.mockResolvedValue({
        enabled: false,
        triggerChannelIds: ["trigger-1"],
        createdChannels: [],
      });

      const { state: joinState, createMock } = createVoiceState({
        channelId: "trigger-1",
        memberId: "user-1",
      });
      const oldState = createVoiceState({ channelId: null }).state;

      await service.handleVoiceStateUpdate(
        oldState as never,
        joinState as never,
      );

      expect(createMock).not.toHaveBeenCalled();
    });

    it("トリガーVC以外に参加した場合はVACを作成しないこと", async () => {
      const repository = createRepositoryMock();
      const service = new VacService(repository);

      repository.getVacConfigOrDefault.mockResolvedValue(
        createEnabledConfig({ triggerChannelIds: ["trigger-1"] }),
      );

      const { state: joinState, createMock } = createVoiceState({
        channelId: "non-trigger-vc",
        memberId: "user-1",
      });
      const oldState = createVoiceState({ channelId: null }).state;

      await service.handleVoiceStateUpdate(
        oldState as never,
        joinState as never,
      );

      expect(createMock).not.toHaveBeenCalled();
    });

    it("管理外のVCから退出してもチャンネル削除を行わないこと", async () => {
      const repository = createRepositoryMock();
      const service = new VacService(repository);

      repository.getVacConfigOrDefault.mockResolvedValue(
        createEnabledConfig({
          createdChannels: [
            { voiceChannelId: "managed-1", ownerId: "user-1", createdAt: 1 },
          ],
        }),
      );

      const { state: leaveOldState, deleteMock } = createVoiceState({
        channelId: "unmanaged-vc",
        memberCount: 0,
      });
      const leaveNewState = createVoiceState({ channelId: null }).state;

      await service.handleVoiceStateUpdate(
        leaveOldState as never,
        leaveNewState as never,
      );

      expect(deleteMock).not.toHaveBeenCalled();
      expect(repository.removeCreatedVacChannel).not.toHaveBeenCalled();
    });
  });

  describe("チャンネル名の一意性", () => {
    it("同名チャンネルが存在する場合にサフィックス付きの名前で作成されること", async () => {
      const repository = createRepositoryMock();
      const service = new VacService(repository);

      repository.getVacConfigOrDefault.mockResolvedValue(createEnabledConfig());

      const { state: joinState, createMock } = createVoiceState({
        channelId: "trigger-1",
        memberId: "user-1",
        displayName: "Alice",
        channelNames: ["Alice's Room", "Alice's Room (2)"],
      });
      const oldState = createVoiceState({ channelId: null }).state;

      await service.handleVoiceStateUpdate(
        oldState as never,
        joinState as never,
      );

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Alice's Room (3)" }),
      );
    });
  });
});
