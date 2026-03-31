// tests/unit/bot/features/vac/services/usecases/handleVacCreate.test.ts

import {
  ChannelType,
  DiscordAPIError,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
} from "discord.js";
import type { Mock, Mocked } from "vitest";
import { handleVacCreateUseCase } from "@/bot/features/vac/services/usecases/handleVacCreate";
import { sendVcControlPanel } from "@/bot/features/vc-panel/vcControlPanel";
import { notifyErrorChannel } from "@/bot/shared/errorChannelNotifier";
import type { VacConfigService } from "@/shared/features/vac/vacConfigService";

const loggerInfoMock = vi.fn();
const loggerWarnMock = vi.fn();
const loggerErrorMock = vi.fn();

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

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    info: (...args: unknown[]) => loggerInfoMock(...args),
    warn: (...args: unknown[]) => loggerWarnMock(...args),
    error: (...args: unknown[]) => loggerErrorMock(...args),
  },
}));

vi.mock("@/bot/features/vc-panel/vcControlPanel", () => ({
  sendVcControlPanel: vi.fn(),
}));

vi.mock("@/bot/shared/errorChannelNotifier", () => ({
  notifyErrorChannel: vi.fn(),
  notifyWarnChannel: vi.fn(),
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

function createVoiceStateInput(options?: {
  displayName?: string;
  triggerChannelId?: string;
  parentCategoryChildrenCount?: number;
  channelNames?: string[];
  createdChannel?: { id: string; type: ChannelType };
}) {
  const setChannelMock = vi.fn().mockResolvedValue(undefined);
  const fetchMock = vi.fn();
  const createMock = vi.fn().mockResolvedValue(
    options?.createdChannel ?? {
      id: "created-voice-1",
      type: ChannelType.GuildVoice,
    },
  );

  const names = options?.channelNames ?? [];
  const channelsCache = {
    find: (predicate: (channel: { name: string }) => boolean) =>
      names.map((name) => ({ name })).find(predicate),
  };

  const member = {
    id: "user-1",
    displayName: options?.displayName ?? "Alice",
    guild: {
      id: "guild-1",
      channels: {
        fetch: fetchMock,
        create: createMock,
        cache: channelsCache,
      },
    },
    voice: {
      setChannel: setChannelMock,
    },
  };

  const parent =
    typeof options?.parentCategoryChildrenCount === "number"
      ? {
          id: "category-1",
          type: ChannelType.GuildCategory,
          children: {
            cache: {
              size: options.parentCategoryChildrenCount,
            },
          },
        }
      : null;

  const newChannel = {
    id: options?.triggerChannelId ?? "trigger-1",
    type: ChannelType.GuildVoice,
    parent,
  };

  const newState = {
    member,
    channel: newChannel,
  };

  return {
    newState,
    member,
    fetchMock,
    createMock,
    setChannelMock,
  };
}

// VAC (Voice Auto Channel) の作成ユースケースがトリガー・権限・チャンネル作成・ユーザー移動を正しく制御することを検証
describe("bot/features/vac/services/usecases/handleVacCreate", () => {
  // 各テストでモック状態をリセットし、createdAt の決定論的な動作のため Date.now を固定値にする
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);
    (sendVcControlPanel as Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("memberかchannelが存在しない、またはchannelがボイスでない場合は早期リターンする", async () => {
    const repository = createRepositoryMock();

    await handleVacCreateUseCase(repository, { member: null } as never);
    await handleVacCreateUseCase(repository, {
      member: { id: "user-1" },
      channel: null,
    } as never);
    await handleVacCreateUseCase(repository, {
      member: { id: "user-1" },
      channel: { type: ChannelType.GuildText },
    } as never);

    expect(repository.getVacConfigOrDefault).not.toHaveBeenCalled();
  });

  it("VACが無効または参加チャンネルがトリガーでない場合は早期リターンする", async () => {
    const repository = createRepositoryMock();
    const { newState } = createVoiceStateInput({
      triggerChannelId: "trigger-1",
    });

    repository.getVacConfigOrDefault.mockResolvedValueOnce({
      enabled: false,
      triggerChannelIds: ["trigger-1"],
      createdChannels: [],
    });
    await handleVacCreateUseCase(repository, newState as never);

    repository.getVacConfigOrDefault.mockResolvedValueOnce({
      enabled: true,
      triggerChannelIds: ["trigger-2"],
      createdChannels: [],
    });
    await handleVacCreateUseCase(repository, newState as never);

    expect(repository.addCreatedVacChannel).not.toHaveBeenCalled();
  });

  it("ユーザー所有の管理チャンネルが既存する場合は新規作成をスキップしてそちらへ移動すること", async () => {
    const repository = createRepositoryMock();
    const { newState, fetchMock, createMock, setChannelMock } =
      createVoiceStateInput();

    repository.getVacConfigOrDefault.mockResolvedValue({
      enabled: true,
      triggerChannelIds: ["trigger-1"],
      createdChannels: [
        {
          voiceChannelId: "owned-1",
          ownerId: "user-1",
          createdAt: 1,
        },
      ],
    });
    const ownedChannel = { id: "owned-1", type: ChannelType.GuildVoice };
    fetchMock.mockResolvedValue(ownedChannel);

    await handleVacCreateUseCase(repository, newState as never);

    expect(fetchMock).toHaveBeenCalledWith("owned-1");
    expect(setChannelMock).toHaveBeenCalledWith(ownedChannel);
    expect(createMock).not.toHaveBeenCalled();
    expect(repository.removeCreatedVacChannel).not.toHaveBeenCalled();
  });

  it("既存の所有チャンネルが利用不可の場合に古いレコードを削除する", async () => {
    const repository = createRepositoryMock();
    const { newState, fetchMock } = createVoiceStateInput();

    repository.getVacConfigOrDefault.mockResolvedValue({
      enabled: true,
      triggerChannelIds: ["trigger-1"],
      createdChannels: [
        {
          voiceChannelId: "owned-1",
          ownerId: "user-1",
          createdAt: 1,
        },
      ],
    });
    fetchMock.mockRejectedValue(new Error("not found"));

    await handleVacCreateUseCase(repository, newState as never);

    expect(repository.removeCreatedVacChannel).toHaveBeenCalledWith(
      "guild-1",
      "owned-1",
    );
  });

  it("親カテゴリがチャンネル上限に達している場合は早期リターンする", async () => {
    const repository = createRepositoryMock();
    const { newState, createMock } = createVoiceStateInput({
      parentCategoryChildrenCount: 50,
    });

    repository.getVacConfigOrDefault.mockResolvedValue({
      enabled: true,
      triggerChannelIds: ["trigger-1"],
      createdChannels: [],
    });

    await handleVacCreateUseCase(repository, newState as never);

    expect(createMock).not.toHaveBeenCalled();
    expect(loggerWarnMock).toHaveBeenCalledTimes(1);
  });

  it("VACチャンネル作成からコントロールパネル送信・ユーザー移動・レコード保存まで一連する処理が正しく実行されること", async () => {
    const repository = createRepositoryMock();
    const { newState, createMock, setChannelMock } = createVoiceStateInput({
      displayName: "Alice",
      channelNames: ["Alice's Room"],
    });

    repository.getVacConfigOrDefault.mockResolvedValue({
      enabled: true,
      triggerChannelIds: ["trigger-1"],
      createdChannels: [],
    });

    await handleVacCreateUseCase(repository, newState as never);

    expect(createMock).toHaveBeenCalledWith({
      name: "Alice's Room (2)",
      type: ChannelType.GuildVoice,
      parent: null,
      userLimit: 99,
      permissionOverwrites: [
        {
          id: "user-1",
          allow: [PermissionFlagsBits.ManageChannels],
        },
      ],
    });
    expect(sendVcControlPanel).toHaveBeenCalledTimes(1);
    expect(setChannelMock).toHaveBeenCalledWith({
      id: "created-voice-1",
      type: ChannelType.GuildVoice,
    });
    expect(repository.addCreatedVacChannel).toHaveBeenCalledWith("guild-1", {
      voiceChannelId: "created-voice-1",
      ownerId: "user-1",
      createdAt: 1700000000000,
    });
    expect(loggerInfoMock).toHaveBeenCalledTimes(1);
  });

  it("作成されたチャンネルがボイスチャンネルでない場合は早期リターンする", async () => {
    const repository = createRepositoryMock();
    const { newState, createMock, setChannelMock } = createVoiceStateInput({
      createdChannel: {
        id: "created-text-1",
        type: ChannelType.GuildText,
      },
    });

    repository.getVacConfigOrDefault.mockResolvedValue({
      enabled: true,
      triggerChannelIds: ["trigger-1"],
      createdChannels: [],
    });

    await handleVacCreateUseCase(repository, newState as never);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(sendVcControlPanel).not.toHaveBeenCalled();
    expect(setChannelMock).not.toHaveBeenCalled();
    expect(repository.addCreatedVacChannel).not.toHaveBeenCalled();
  });

  it("チャンネル作成時にMissingPermissionsエラーが発生した場合はエラーチャンネルへ通知して早期リターンする", async () => {
    const repository = createRepositoryMock();
    const { newState, createMock, setChannelMock } = createVoiceStateInput();

    repository.getVacConfigOrDefault.mockResolvedValue({
      enabled: true,
      triggerChannelIds: ["trigger-1"],
      createdChannels: [],
    });

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
    createMock.mockRejectedValueOnce(apiError);

    await handleVacCreateUseCase(repository, newState as never);

    expect(notifyErrorChannel).toHaveBeenCalledWith(
      expect.objectContaining({ id: "guild-1" }),
      apiError,
      expect.objectContaining({ feature: "VAC" }),
    );
    expect(setChannelMock).not.toHaveBeenCalled();
    expect(repository.addCreatedVacChannel).not.toHaveBeenCalled();
  });

  it("チャンネル作成時にMissingPermissions以外のエラーが発生した場合は再throwする", async () => {
    const repository = createRepositoryMock();
    const { newState, createMock } = createVoiceStateInput();

    repository.getVacConfigOrDefault.mockResolvedValue({
      enabled: true,
      triggerChannelIds: ["trigger-1"],
      createdChannels: [],
    });

    const otherError = new Error("Unknown error");
    createMock.mockRejectedValueOnce(otherError);

    await expect(
      handleVacCreateUseCase(repository, newState as never),
    ).rejects.toThrow("Unknown error");
  });

  it("既存所有チャンネルへの移動時にMissingPermissionsエラーが発生した場合はエラーチャンネルへ通知する", async () => {
    const repository = createRepositoryMock();
    const { newState, fetchMock, createMock, setChannelMock } =
      createVoiceStateInput();

    repository.getVacConfigOrDefault.mockResolvedValue({
      enabled: true,
      triggerChannelIds: ["trigger-1"],
      createdChannels: [
        {
          voiceChannelId: "owned-1",
          ownerId: "user-1",
          createdAt: 1,
        },
      ],
    });
    const ownedChannel = { id: "owned-1", type: ChannelType.GuildVoice };
    fetchMock.mockResolvedValue(ownedChannel);

    const apiError = new DiscordAPIError(
      {
        code: RESTJSONErrorCodes.MissingPermissions,
        message: "Missing Permissions",
      },
      RESTJSONErrorCodes.MissingPermissions,
      403,
      "PATCH",
      "/guilds/guild-1/members/user-1",
      {},
    );
    setChannelMock.mockRejectedValueOnce(apiError);

    await handleVacCreateUseCase(repository, newState as never);

    expect(notifyErrorChannel).toHaveBeenCalledWith(
      expect.objectContaining({ id: "guild-1" }),
      apiError,
      expect.objectContaining({ feature: "VAC" }),
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it("コントロールパネル送信が失敗してもユーザー移動とチャンネル保存は続行されること", async () => {
    const repository = createRepositoryMock();
    const { newState, setChannelMock } = createVoiceStateInput();
    repository.getVacConfigOrDefault.mockResolvedValue({
      enabled: true,
      triggerChannelIds: ["trigger-1"],
      createdChannels: [],
    });
    (sendVcControlPanel as Mock).mockRejectedValueOnce(
      new Error("panel failed"),
    );

    await handleVacCreateUseCase(repository, newState as never);

    expect(loggerErrorMock).toHaveBeenCalledTimes(1);
    expect(setChannelMock).toHaveBeenCalledTimes(1);
    expect(repository.addCreatedVacChannel).toHaveBeenCalledTimes(1);
  });
});
