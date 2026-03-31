// tests/unit/shared/features/vac/vacConfigService.test.ts
// VacConfigService のビジネスロジック・分岐・ファクトリ関数を検証する

import type { VacChannelPair, VacConfig } from "@/shared/database/types";
import {
  DEFAULT_VAC_CONFIG,
  VacConfigService,
} from "@/shared/features/vac/vacConfigService";

describe("shared/features/vac/vacConfigService", () => {
  const createRepositoryMock = () => ({
    getVacConfig: vi.fn<() => Promise<VacConfig | null>>(),
    updateVacConfig:
      vi.fn<(guildId: string, config: VacConfig) => Promise<void>>(),
  });

  const makeChannel = (
    voiceChannelId: string,
    overrides: Partial<VacChannelPair> = {},
  ): VacChannelPair => ({
    voiceChannelId,
    ownerId: "owner-1",
    createdAt: 1000000,
    ...overrides,
  });

  const makeConfig = (overrides: Partial<VacConfig> = {}): VacConfig => ({
    enabled: true,
    triggerChannelIds: [],
    createdChannels: [],
    ...overrides,
  });

  // ──────────────────────────────────────────────────────────
  // getVacConfigOrDefault
  // ──────────────────────────────────────────────────────────

  it("設定が未登録の場合はデフォルト値を返し、呼び出しごとに別インスタンスになること", async () => {
    const repository = createRepositoryMock();
    repository.getVacConfig.mockResolvedValue(null);
    const service = new VacConfigService(repository);

    const first = await service.getVacConfigOrDefault("g1");
    const second = await service.getVacConfigOrDefault("g1");

    expect(first).toEqual(DEFAULT_VAC_CONFIG);
    // 毎回新しいオブジェクトが返ることを確認（参照共有なし）
    expect(first).not.toBe(second);
  });

  it("設定が存在する場合は内容が一致した正規化コピーを返し、配列は元と別参照であること", async () => {
    const repository = createRepositoryMock();
    const raw = makeConfig({
      triggerChannelIds: ["ch-1"],
      createdChannels: [makeChannel("vc-1")],
    });
    repository.getVacConfig.mockResolvedValue(raw);
    const service = new VacConfigService(repository);

    const config = await service.getVacConfigOrDefault("g1");

    expect(config).toEqual(raw);
    // 配列は元オブジェクトとは別インスタンス（正規化コピー）
    expect(config.triggerChannelIds).not.toBe(raw.triggerChannelIds);
    expect(config.createdChannels).not.toBe(raw.createdChannels);
  });

  // ──────────────────────────────────────────────────────────
  // saveVacConfig
  // ──────────────────────────────────────────────────────────

  it("保存時に正規化済みコピーが repository へ渡され、入力オブジェクトとは別参照であること", async () => {
    const repository = createRepositoryMock();
    repository.updateVacConfig.mockResolvedValue(undefined);
    const service = new VacConfigService(repository);

    const input = makeConfig({ triggerChannelIds: ["ch-1"] });
    await service.saveVacConfig("g1", input);

    expect(repository.updateVacConfig).toHaveBeenCalledWith(
      "g1",
      expect.objectContaining({ triggerChannelIds: ["ch-1"] }),
    );
    // 渡されたオブジェクトが元と別参照であること（正規化コピー）
    const saved = repository.updateVacConfig.mock.calls[0][1] as VacConfig;
    expect(saved).not.toBe(input);
  });

  // ──────────────────────────────────────────────────────────
  // addTriggerChannel
  // ──────────────────────────────────────────────────────────

  it("新規チャンネルを追加すると一覧に含まれ、機能が有効化されること", async () => {
    const repository = createRepositoryMock();
    repository.getVacConfig.mockResolvedValue(
      makeConfig({ enabled: false, triggerChannelIds: [] }),
    );
    repository.updateVacConfig.mockResolvedValue(undefined);
    const service = new VacConfigService(repository);

    const result = await service.addTriggerChannel("g1", "ch-1");

    expect(result.enabled).toBe(true);
    expect(result.triggerChannelIds).toContain("ch-1");
    expect(repository.updateVacConfig).toHaveBeenCalledOnce();
  });

  it("すでに登録済みのチャンネルを追加しても重複せず、保存が呼ばれないこと", async () => {
    const repository = createRepositoryMock();
    repository.getVacConfig.mockResolvedValue(
      makeConfig({ enabled: true, triggerChannelIds: ["ch-1"] }),
    );
    repository.updateVacConfig.mockResolvedValue(undefined);
    const service = new VacConfigService(repository);

    const result = await service.addTriggerChannel("g1", "ch-1");

    expect(result.triggerChannelIds).toEqual(["ch-1"]);
    // 変更なしのため保存は呼ばれない
    expect(repository.updateVacConfig).not.toHaveBeenCalled();
  });

  it("チャンネルが既存でも enabled=false の場合は有効化されて保存されること", async () => {
    const repository = createRepositoryMock();
    repository.getVacConfig.mockResolvedValue(
      makeConfig({ enabled: false, triggerChannelIds: ["ch-1"] }),
    );
    repository.updateVacConfig.mockResolvedValue(undefined);
    const service = new VacConfigService(repository);

    const result = await service.addTriggerChannel("g1", "ch-1");

    expect(result.enabled).toBe(true);
    expect(repository.updateVacConfig).toHaveBeenCalledOnce();
  });

  // ──────────────────────────────────────────────────────────
  // removeTriggerChannel
  // ──────────────────────────────────────────────────────────

  it("登録済みチャンネルを削除すると一覧から除去され、保存が呼ばれること", async () => {
    const repository = createRepositoryMock();
    repository.getVacConfig.mockResolvedValue(
      makeConfig({ triggerChannelIds: ["ch-1", "ch-2"] }),
    );
    repository.updateVacConfig.mockResolvedValue(undefined);
    const service = new VacConfigService(repository);

    const result = await service.removeTriggerChannel("g1", "ch-1");

    expect(result.triggerChannelIds).toEqual(["ch-2"]);
    expect(repository.updateVacConfig).toHaveBeenCalledOnce();
  });

  it("未登録チャンネルの削除は一覧を変更せず、保存が呼ばれないこと", async () => {
    const repository = createRepositoryMock();
    repository.getVacConfig.mockResolvedValue(
      makeConfig({ triggerChannelIds: ["ch-1"] }),
    );
    const service = new VacConfigService(repository);

    const result = await service.removeTriggerChannel("g1", "ch-unknown");

    expect(result.triggerChannelIds).toEqual(["ch-1"]);
    expect(repository.updateVacConfig).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // addCreatedVacChannel
  // ──────────────────────────────────────────────────────────

  it("新規 VC を登録すると管理対象に追加され、保存が呼ばれること", async () => {
    const repository = createRepositoryMock();
    repository.getVacConfig.mockResolvedValue(makeConfig());
    repository.updateVacConfig.mockResolvedValue(undefined);
    const service = new VacConfigService(repository);

    const channel = makeChannel("vc-1");
    const result = await service.addCreatedVacChannel("g1", channel);

    expect(result.createdChannels).toHaveLength(1);
    expect(result.createdChannels[0].voiceChannelId).toBe("vc-1");
    expect(repository.updateVacConfig).toHaveBeenCalledOnce();
  });

  it("すでに管理対象の VC を再登録しても重複せず、保存が呼ばれないこと", async () => {
    const repository = createRepositoryMock();
    repository.getVacConfig.mockResolvedValue(
      makeConfig({ createdChannels: [makeChannel("vc-1")] }),
    );
    const service = new VacConfigService(repository);

    const result = await service.addCreatedVacChannel(
      "g1",
      makeChannel("vc-1"),
    );

    expect(result.createdChannels).toHaveLength(1);
    expect(repository.updateVacConfig).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // removeCreatedVacChannel
  // ──────────────────────────────────────────────────────────

  it("管理対象 VC を削除すると一覧から除去され、保存が呼ばれること", async () => {
    const repository = createRepositoryMock();
    repository.getVacConfig.mockResolvedValue(
      makeConfig({
        createdChannels: [makeChannel("vc-1"), makeChannel("vc-2")],
      }),
    );
    repository.updateVacConfig.mockResolvedValue(undefined);
    const service = new VacConfigService(repository);

    const result = await service.removeCreatedVacChannel("g1", "vc-1");

    expect(result.createdChannels).toHaveLength(1);
    expect(result.createdChannels[0].voiceChannelId).toBe("vc-2");
    expect(repository.updateVacConfig).toHaveBeenCalledOnce();
  });

  it("管理対象外 VC の削除は一覧を変更せず、保存が呼ばれないこと", async () => {
    const repository = createRepositoryMock();
    repository.getVacConfig.mockResolvedValue(
      makeConfig({ createdChannels: [makeChannel("vc-1")] }),
    );
    const service = new VacConfigService(repository);

    const result = await service.removeCreatedVacChannel("g1", "vc-unknown");

    expect(result.createdChannels).toHaveLength(1);
    expect(repository.updateVacConfig).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────
  // isManagedVacChannel
  // ──────────────────────────────────────────────────────────

  it("管理対象に含まれる VC ID の場合は true を返すこと", async () => {
    const repository = createRepositoryMock();
    repository.getVacConfig.mockResolvedValue(
      makeConfig({ createdChannels: [makeChannel("vc-1")] }),
    );
    const service = new VacConfigService(repository);

    await expect(service.isManagedVacChannel("g1", "vc-1")).resolves.toBe(true);
  });

  it("管理対象に含まれない VC ID の場合は false を返すこと", async () => {
    const repository = createRepositoryMock();
    repository.getVacConfig.mockResolvedValue(makeConfig());
    const service = new VacConfigService(repository);

    await expect(service.isManagedVacChannel("g1", "vc-x")).resolves.toBe(
      false,
    );
  });

  it("設定が未登録（null）の場合は false を返すこと", async () => {
    const repository = createRepositoryMock();
    repository.getVacConfig.mockResolvedValue(null);
    const service = new VacConfigService(repository);

    await expect(service.isManagedVacChannel("g1", "vc-1")).resolves.toBe(
      false,
    );
  });

  // ──────────────────────────────────────────────────────────
  // createVacConfigService ファクトリ関数
  // ──────────────────────────────────────────────────────────

  it("createVacConfigService は VacConfigService のインスタンスを返すこと", async () => {
    const { createVacConfigService } = await import(
      "@/shared/features/vac/vacConfigService"
    );
    const repository = createRepositoryMock();
    const service = createVacConfigService(repository);
    expect(service).toBeInstanceOf(
      (await import("@/shared/features/vac/vacConfigService")).VacConfigService,
    );
  });
});
