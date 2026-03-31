// tests/unit/bot/features/vac/services/usecases/cleanupVacOnStartup.test.ts

import { ChannelType } from "discord.js";
import type { Mocked } from "vitest";
import { cleanupVacOnStartupUseCase } from "@/bot/features/vac/services/usecases/cleanupVacOnStartup";
import type { VacConfigService } from "@/shared/features/vac/vacConfigService";

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

function createGuild(params: {
  guildId: string;
  fetchedChannels: Record<string, unknown | Error>;
}) {
  const fetchMock = vi.fn(async (channelId: string) => {
    const value = params.fetchedChannels[channelId];
    if (value instanceof Error) {
      throw value;
    }
    return value;
  });

  return {
    id: params.guildId,
    channels: {
      fetch: fetchMock,
    },
  };
}

// 起動時の VAC クリーンアップユースケースが、無効なチャンネル参照の除去・空チャンネル削除・フェッチエラー処理を正しく行うことを検証
describe("bot/features/vac/services/usecases/cleanupVacOnStartup", () => {
  // 各テストケースでモックの呼び出し履歴をリセットし、独立した検証を保証
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("有効なトリガーと空でない管理済みボイスチャンネルはそのまま保持する", async () => {
    const repository = createRepositoryMock();
    repository.getVacConfigOrDefault.mockResolvedValue({
      enabled: true,
      triggerChannelIds: ["trigger-voice"],
      createdChannels: [
        {
          voiceChannelId: "created-non-empty",
          ownerId: "user-1",
          createdAt: 1,
        },
      ],
    });

    const guild = createGuild({
      guildId: "guild-1",
      fetchedChannels: {
        "trigger-voice": {
          id: "trigger-voice",
          type: ChannelType.GuildVoice,
        },
        "created-non-empty": {
          id: "created-non-empty",
          type: ChannelType.GuildVoice,
          isDMBased: () => false,
          members: { size: 2 },
          delete: vi.fn(),
        },
      },
    });

    const client = {
      guilds: {
        cache: new Map([[guild.id, guild]]),
      },
    };

    await cleanupVacOnStartupUseCase(repository, client as never);

    expect(repository.removeTriggerChannel).not.toHaveBeenCalled();
    expect(repository.removeCreatedVacChannel).not.toHaveBeenCalled();
  });

  it("存在しないチャンネルやボイス以外（テキスト）のチャンネルは、トリガー・管理済みチャンネル両方からレコードが削除されることを検証", async () => {
    const repository = createRepositoryMock();
    repository.getVacConfigOrDefault.mockResolvedValue({
      enabled: true,
      triggerChannelIds: ["trigger-missing", "trigger-text"],
      createdChannels: [
        {
          voiceChannelId: "created-missing",
          ownerId: "user-1",
          createdAt: 1,
        },
        {
          voiceChannelId: "created-text",
          ownerId: "user-1",
          createdAt: 2,
        },
      ],
    });

    const guild = createGuild({
      guildId: "guild-1",
      fetchedChannels: {
        "trigger-missing": null,
        "trigger-text": { id: "trigger-text", type: ChannelType.GuildText },
        "created-missing": null,
        "created-text": {
          id: "created-text",
          type: ChannelType.GuildText,
          isDMBased: () => false,
          members: { size: 0 },
          delete: vi.fn(),
        },
      },
    });

    const client = {
      guilds: {
        cache: new Map([[guild.id, guild]]),
      },
    };

    await cleanupVacOnStartupUseCase(repository, client as never);

    expect(repository.removeTriggerChannel).toHaveBeenCalledWith(
      "guild-1",
      "trigger-missing",
    );
    expect(repository.removeTriggerChannel).toHaveBeenCalledWith(
      "guild-1",
      "trigger-text",
    );
    expect(repository.removeCreatedVacChannel).toHaveBeenCalledWith(
      "guild-1",
      "created-missing",
    );
    expect(repository.removeCreatedVacChannel).toHaveBeenCalledWith(
      "guild-1",
      "created-text",
    );
  });

  it("空の管理済みボイスチャンネルは Discord 上でも削除を試み、削除 API が失敗しても DB レコードは除去されることを検証", async () => {
    const repository = createRepositoryMock();
    repository.getVacConfigOrDefault.mockResolvedValue({
      enabled: true,
      triggerChannelIds: [],
      createdChannels: [
        {
          voiceChannelId: "created-empty",
          ownerId: "user-1",
          createdAt: 1,
        },
        {
          voiceChannelId: "created-empty-delete-fail",
          ownerId: "user-1",
          createdAt: 2,
        },
      ],
    });

    const deleteOk = vi.fn().mockResolvedValue(undefined);
    const deleteFail = vi.fn().mockRejectedValue(new Error("delete failed"));
    const guild = createGuild({
      guildId: "guild-1",
      fetchedChannels: {
        "created-empty": {
          id: "created-empty",
          type: ChannelType.GuildVoice,
          isDMBased: () => false,
          members: { size: 0 },
          delete: deleteOk,
        },
        "created-empty-delete-fail": {
          id: "created-empty-delete-fail",
          type: ChannelType.GuildVoice,
          isDMBased: () => false,
          members: { size: 0 },
          delete: deleteFail,
        },
      },
    });

    const client = {
      guilds: {
        cache: new Map([[guild.id, guild]]),
      },
    };

    await cleanupVacOnStartupUseCase(repository, client as never);

    expect(deleteOk).toHaveBeenCalledTimes(1);
    expect(deleteFail).toHaveBeenCalledTimes(1);
    expect(repository.removeCreatedVacChannel).toHaveBeenCalledWith(
      "guild-1",
      "created-empty",
    );
    expect(repository.removeCreatedVacChannel).toHaveBeenCalledWith(
      "guild-1",
      "created-empty-delete-fail",
    );
  });

  it("channels.fetch が例外をスローした場合もチャンネル不在と同様に扱い、古くなったレコードを削除することを検証", async () => {
    const repository = createRepositoryMock();
    repository.getVacConfigOrDefault.mockResolvedValue({
      enabled: true,
      triggerChannelIds: ["trigger-fetch-error"],
      createdChannels: [
        {
          voiceChannelId: "created-fetch-error",
          ownerId: "user-1",
          createdAt: 3,
        },
      ],
    });

    const guild = createGuild({
      guildId: "guild-2",
      fetchedChannels: {
        "trigger-fetch-error": new Error("fetch failed"),
        "created-fetch-error": new Error("fetch failed"),
      },
    });

    const client = {
      guilds: {
        cache: new Map([[guild.id, guild]]),
      },
    };

    await cleanupVacOnStartupUseCase(repository, client as never);

    expect(repository.removeTriggerChannel).toHaveBeenCalledWith(
      "guild-2",
      "trigger-fetch-error",
    );
    expect(repository.removeCreatedVacChannel).toHaveBeenCalledWith(
      "guild-2",
      "created-fetch-error",
    );
  });
});
