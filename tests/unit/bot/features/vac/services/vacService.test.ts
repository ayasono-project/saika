// tests/unit/bot/features/vac/services/vacService.test.ts

import { ChannelType } from "discord.js";
import type { Mocked } from "vitest";
import { cleanupVacOnStartupUseCase } from "@/bot/features/vac/services/usecases/cleanupVacOnStartup";
import { handleVacCreateUseCase } from "@/bot/features/vac/services/usecases/handleVacCreate";
import { handleVacDeleteUseCase } from "@/bot/features/vac/services/usecases/handleVacDelete";
import {
  createVacService,
  getVacService,
  VacService,
} from "@/bot/features/vac/services/vacService";
import type { VacConfigService } from "@/shared/features/vac/vacConfigService";

const executeWithLoggedErrorMock = vi.fn(
  async (operation: () => Promise<void>, _message: string) => {
    await operation();
  },
);
const loggerInfoMock = vi.fn();
const getVacConfigServiceMock = vi.fn();

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

vi.mock("@/shared/utils/errorHandling", () => ({
  executeWithLoggedError: (operation: () => Promise<void>, message: string) =>
    executeWithLoggedErrorMock(operation, message),
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    info: (...args: unknown[]) => loggerInfoMock(...args),
  },
}));

vi.mock("@/shared/features/vac/vacConfigService", () => ({
  getVacConfigService: (service?: VacConfigService) =>
    getVacConfigServiceMock(service),
}));

vi.mock("@/bot/features/vac/services/usecases/handleVacCreate", () => ({
  handleVacCreateUseCase: vi.fn(),
}));

vi.mock("@/bot/features/vac/services/usecases/handleVacDelete", () => ({
  handleVacDeleteUseCase: vi.fn(),
}));

vi.mock("@/bot/features/vac/services/usecases/cleanupVacOnStartup", () => ({
  cleanupVacOnStartupUseCase: vi.fn(),
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

// VacService クラスがボイス状態変化・チャンネル削除・起動時クリーンアップの各しきいを
// 適切なユースケースに委譲し、シングルトン管理も正しく機能することを検証するテスト群
describe("bot/features/vac/services/vacService", () => {
  const defaultRepository = createRepositoryMock();

  // 各テストのモック呼び出し記録をリセットし、
  // getVacConfigServiceMock が注入されたサービスをそのまま返すデフォルト動作を再設定する
  beforeEach(() => {
    vi.clearAllMocks();
    getVacConfigServiceMock.mockImplementation(
      (service?: VacConfigService) => service ?? defaultRepository,
    );
  });

  it("ボイス状態変化時にcreate/deleteユースケースへ委譲する", async () => {
    const repository = createRepositoryMock();
    const service = new VacService(repository);

    const oldState = { channelId: "old-1" };
    const newState = { guild: { id: "guild-1" }, channelId: "new-1" };

    await service.handleVoiceStateUpdate(oldState as never, newState as never);

    expect(executeWithLoggedErrorMock).toHaveBeenCalledTimes(1);
    expect(handleVacCreateUseCase).toHaveBeenCalledWith(repository, newState);
    expect(handleVacDeleteUseCase).toHaveBeenCalledWith(repository, oldState);
  });

  it("guild が null の場合と、同じチャンネルに留まった場合の 2 つのガード条件を一度で検証", async () => {
    const repository = createRepositoryMock();
    const service = new VacService(repository);

    await service.handleVoiceStateUpdate(
      { channelId: "same" } as never,
      { guild: null, channelId: "other" } as never,
    );

    await service.handleVoiceStateUpdate(
      { channelId: "same" } as never,
      { guild: { id: "guild-1" }, channelId: "same" } as never,
    );

    expect(handleVacCreateUseCase).not.toHaveBeenCalled();
    expect(handleVacDeleteUseCase).not.toHaveBeenCalled();
  });

  it("トリガーチャンネルにも作成チャンネルにも登録されているボイスチャンネルが削除された際に両方のレコードが同時に確実に削除されることを検証", async () => {
    const repository = createRepositoryMock();
    repository.getVacConfigOrDefault.mockResolvedValue({
      enabled: true,
      triggerChannelIds: ["voice-1"],
      createdChannels: [
        {
          voiceChannelId: "voice-1",
          ownerId: "user-1",
          createdAt: 1,
        },
      ],
    });
    const service = new VacService(repository);

    const channel = {
      id: "voice-1",
      guildId: "guild-1",
      type: ChannelType.GuildVoice,
      isDMBased: vi.fn(() => false),
    };

    await service.handleChannelDelete(channel as never);

    expect(repository.getVacConfigOrDefault).toHaveBeenCalledWith("guild-1");
    expect(repository.removeTriggerChannel).toHaveBeenCalledWith(
      "guild-1",
      "voice-1",
    );
    expect(repository.removeCreatedVacChannel).toHaveBeenCalledWith(
      "guild-1",
      "voice-1",
    );
    expect(loggerInfoMock).toHaveBeenCalledTimes(1);
  });

  it("削除されたボイスチャンネルが追跡対象でない場合はレコードを削除しない", async () => {
    const repository = createRepositoryMock();
    repository.getVacConfigOrDefault.mockResolvedValue({
      enabled: true,
      triggerChannelIds: ["trigger-1"],
      createdChannels: [
        {
          voiceChannelId: "managed-1",
          ownerId: "user-1",
          createdAt: 1,
        },
      ],
    });
    const service = new VacService(repository);

    const channel = {
      id: "other-voice",
      guildId: "guild-1",
      type: ChannelType.GuildVoice,
      isDMBased: vi.fn(() => false),
    };

    await service.handleChannelDelete(channel as never);

    expect(repository.removeTriggerChannel).not.toHaveBeenCalled();
    expect(repository.removeCreatedVacChannel).not.toHaveBeenCalled();
  });

  it("DMベースのチャンネルおよびボイス以外のチャンネル削除を無視する", async () => {
    const repository = createRepositoryMock();
    const service = new VacService(repository);

    await service.handleChannelDelete({
      isDMBased: vi.fn(() => true),
    } as never);

    await service.handleChannelDelete({
      isDMBased: vi.fn(() => false),
      type: ChannelType.GuildText,
    } as never);

    expect(repository.getVacConfigOrDefault).not.toHaveBeenCalled();
    expect(repository.removeTriggerChannel).not.toHaveBeenCalled();
    expect(repository.removeCreatedVacChannel).not.toHaveBeenCalled();
  });

  it("起動時クリーンアップユースケースへ委譲する", async () => {
    const repository = createRepositoryMock();
    const service = new VacService(repository);
    const client = { guilds: { cache: new Map() } };

    await service.cleanupOnStartup(client as never);

    expect(cleanupVacOnStartupUseCase).toHaveBeenCalledWith(repository, client);
  });

  it("ファクトリ関数からサービスインスタンスを生成する", () => {
    const repository = createRepositoryMock();

    const service = createVacService(repository);

    expect(service).toBeInstanceOf(VacService);
  });

  it("同じリポジトリは同一インスタンスを返し、別のリポジトリを渡すと新たなインスタンスが生成されることを検証", () => {
    const repositoryA = createRepositoryMock();
    const repositoryB = createRepositoryMock();

    const serviceA1 = getVacService(repositoryA);
    const serviceA2 = getVacService(repositoryA);
    const serviceB = getVacService(repositoryB);

    expect(serviceA1).toBe(serviceA2);
    expect(serviceB).not.toBe(serviceA1);
  });
});
