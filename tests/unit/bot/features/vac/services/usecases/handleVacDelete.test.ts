// tests/unit/bot/features/vac/services/usecases/handleVacDelete.test.ts

import { ChannelType } from "discord.js";
import type { Mocked } from "vitest";
import { handleVacDeleteUseCase } from "@/bot/features/vac/services/usecases/handleVacDelete";
import type { VacConfigService } from "@/shared/features/vac/vacConfigService";

const loggerInfoMock = vi.fn();

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

// VAC が管理するボイスチャンネルが空になった際に自動削除とDBレコード除去が行われるか、
// また各種早期リターン条件（チャンネルなし・テキストチャンネル・管理外・人数残存）が守られるかを検証する
describe("bot/features/vac/services/usecases/handleVacDelete", () => {
  // テスト間でリポジトリモックやロガーモックの呼び出し履歴が混在しないようリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("oldStateにチャンネルが存在しない場合は早期リターンする", async () => {
    const repository = createRepositoryMock();

    await handleVacDeleteUseCase(repository, { channel: null } as never);

    expect(repository.getVacConfigOrDefault).not.toHaveBeenCalled();
  });

  it("退出チャンネルがボイスチャンネルでない場合は早期リターンする", async () => {
    const repository = createRepositoryMock();

    await handleVacDeleteUseCase(repository, {
      channel: { type: ChannelType.GuildText },
    } as never);

    expect(repository.getVacConfigOrDefault).not.toHaveBeenCalled();
  });

  it("createdChannels に ID が含まれない管理外チャンネルでは削除処理もレコード除去も行われないことを確認", async () => {
    const repository = createRepositoryMock();
    repository.getVacConfigOrDefault.mockResolvedValue({
      enabled: true,
      triggerChannelIds: [],
      createdChannels: [],
    });
    const deleteMock = vi.fn().mockResolvedValue(undefined);

    await handleVacDeleteUseCase(repository, {
      channel: {
        id: "voice-1",
        guild: { id: "guild-1" },
        type: ChannelType.GuildVoice,
        members: { size: 0 },
        delete: deleteMock,
      },
    } as never);

    expect(deleteMock).not.toHaveBeenCalled();
    expect(repository.removeCreatedVacChannel).not.toHaveBeenCalled();
    expect(loggerInfoMock).not.toHaveBeenCalled();
  });

  it("VAC 管理チャンネルであっても members.size > 0 の場合は削除しないことを確認（早期リターン）", async () => {
    const repository = createRepositoryMock();
    repository.getVacConfigOrDefault.mockResolvedValue({
      enabled: true,
      triggerChannelIds: [],
      createdChannels: [
        {
          voiceChannelId: "voice-1",
          ownerId: "user-1",
          createdAt: 1,
        },
      ],
    });
    const deleteMock = vi.fn().mockResolvedValue(undefined);

    await handleVacDeleteUseCase(repository, {
      channel: {
        id: "voice-1",
        guild: { id: "guild-1" },
        type: ChannelType.GuildVoice,
        members: { size: 2 },
        delete: deleteMock,
      },
    } as never);

    expect(deleteMock).not.toHaveBeenCalled();
    expect(repository.removeCreatedVacChannel).not.toHaveBeenCalled();
    expect(loggerInfoMock).not.toHaveBeenCalled();
  });

  it("管理済みの空チャンネルを削除してDBレコードを除去する", async () => {
    const repository = createRepositoryMock();
    repository.getVacConfigOrDefault.mockResolvedValue({
      enabled: true,
      triggerChannelIds: [],
      createdChannels: [
        {
          voiceChannelId: "voice-1",
          ownerId: "user-1",
          createdAt: 1,
        },
      ],
    });
    const deleteMock = vi.fn().mockResolvedValue(undefined);

    await handleVacDeleteUseCase(repository, {
      channel: {
        id: "voice-1",
        guild: { id: "guild-1" },
        type: ChannelType.GuildVoice,
        members: { size: 0 },
        delete: deleteMock,
      },
    } as never);

    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(repository.removeCreatedVacChannel).toHaveBeenCalledWith(
      "guild-1",
      "voice-1",
    );
    expect(loggerInfoMock).toHaveBeenCalledTimes(1);
  });

  it("Discord API の channel.delete() が失敗しても removeCreatedVacChannel が呼ばれ、エラーを握りつぶしてクリーンアップを継続する耐障害性を検証する", async () => {
    const repository = createRepositoryMock();
    repository.getVacConfigOrDefault.mockResolvedValue({
      enabled: true,
      triggerChannelIds: [],
      createdChannels: [
        {
          voiceChannelId: "voice-1",
          ownerId: "user-1",
          createdAt: 1,
        },
      ],
    });
    const deleteMock = vi.fn().mockRejectedValue(new Error("delete failed"));

    await handleVacDeleteUseCase(repository, {
      channel: {
        id: "voice-1",
        guild: { id: "guild-1" },
        type: ChannelType.GuildVoice,
        members: { size: 0 },
        delete: deleteMock,
      },
    } as never);

    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(repository.removeCreatedVacChannel).toHaveBeenCalledWith(
      "guild-1",
      "voice-1",
    );
  });
});
