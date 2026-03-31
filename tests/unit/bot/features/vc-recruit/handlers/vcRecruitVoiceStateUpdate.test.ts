// tests/unit/bot/features/vc-recruit/handlers/vcRecruitVoiceStateUpdate.test.ts

import { ChannelType } from "discord.js";
import { handleVcRecruitVoiceStateUpdate } from "@/bot/features/vc-recruit/handlers/vcRecruitVoiceStateUpdate";

// ---- モック定義 ----

const findSetupByCreatedVcIdMock = vi.fn();
const removeCreatedVoiceChannelIdMock = vi.fn();

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVcRecruitRepository: () => ({
    findSetupByCreatedVcId: (...args: unknown[]) =>
      findSetupByCreatedVcIdMock(...args),
    removeCreatedVoiceChannelId: (...args: unknown[]) =>
      removeCreatedVoiceChannelIdMock(...args),
  }),
}));
vi.mock("@/shared/utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ---- ヘルパー ----

const GUILD_ID = "guild-1";
const CHANNEL_ID = "vc-1";

/**
 * VoiceState モックを作成する
 */
function makeVoiceState(
  opts: {
    channelId?: string | null;
    channelType?: number;
    memberSize?: number;
    deleteFn?: ReturnType<typeof vi.fn>;
  } = {},
) {
  const {
    channelId = CHANNEL_ID,
    channelType = ChannelType.GuildVoice,
    memberSize = 0,
    deleteFn = vi.fn().mockResolvedValue(undefined),
  } = opts;

  const channel = channelId
    ? {
        id: channelId,
        type: channelType,
        name: "テストVC",
        members: { size: memberSize },
        guild: { id: GUILD_ID },
        delete: deleteFn,
      }
    : null;

  return { channel, channelId };
}

describe("bot/features/vc-recruit/handlers/vcRecruitVoiceStateUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findSetupByCreatedVcIdMock.mockResolvedValue(null);
    removeCreatedVoiceChannelIdMock.mockResolvedValue(undefined);
  });

  it("oldState.channel が null の場合は何もしない", async () => {
    const old = makeVoiceState({ channelId: null });
    const newState = makeVoiceState({ channelId: "vc-2" });
    await handleVcRecruitVoiceStateUpdate(old as never, newState as never);

    expect(findSetupByCreatedVcIdMock).not.toHaveBeenCalled();
  });

  it("channel.type が GuildVoice でない場合は何もしない", async () => {
    const old = makeVoiceState({ channelType: ChannelType.GuildText });
    const newState = makeVoiceState({ channelId: "vc-2" });
    await handleVcRecruitVoiceStateUpdate(old as never, newState as never);

    expect(findSetupByCreatedVcIdMock).not.toHaveBeenCalled();
  });

  it("同一チャンネルへの移動（リージョン変更など）は無視する", async () => {
    const old = makeVoiceState({ channelId: CHANNEL_ID });
    const newState = makeVoiceState({ channelId: CHANNEL_ID });
    await handleVcRecruitVoiceStateUpdate(old as never, newState as never);

    expect(findSetupByCreatedVcIdMock).not.toHaveBeenCalled();
  });

  it("VC募集で作成した VC でない場合は何もしない", async () => {
    findSetupByCreatedVcIdMock.mockResolvedValue(null);

    const old = makeVoiceState({ channelId: CHANNEL_ID });
    const newState = makeVoiceState({ channelId: "vc-2" });
    await handleVcRecruitVoiceStateUpdate(old as never, newState as never);

    expect(removeCreatedVoiceChannelIdMock).not.toHaveBeenCalled();
  });

  it("メンバーが残っている場合はチャンネルを削除しない", async () => {
    findSetupByCreatedVcIdMock.mockResolvedValue({ panelChannelId: "panel-1" });
    const deleteFn = vi.fn().mockResolvedValue(undefined);
    const old = makeVoiceState({
      channelId: CHANNEL_ID,
      memberSize: 2,
      deleteFn,
    });
    const newState = makeVoiceState({ channelId: "vc-2" });
    await handleVcRecruitVoiceStateUpdate(old as never, newState as never);

    expect(deleteFn).not.toHaveBeenCalled();
    expect(removeCreatedVoiceChannelIdMock).not.toHaveBeenCalled();
  });

  it("空 VC になったらチャンネルを削除して DB から追跡リストを更新する", async () => {
    findSetupByCreatedVcIdMock.mockResolvedValue({ panelChannelId: "panel-1" });
    const deleteFn = vi.fn().mockResolvedValue(undefined);
    const old = makeVoiceState({
      channelId: CHANNEL_ID,
      memberSize: 0,
      deleteFn,
    });
    const newState = makeVoiceState({ channelId: "vc-2" });
    await handleVcRecruitVoiceStateUpdate(old as never, newState as never);

    expect(deleteFn).toHaveBeenCalled();
    expect(removeCreatedVoiceChannelIdMock).toHaveBeenCalledWith(
      GUILD_ID,
      CHANNEL_ID,
    );
  });

  it("リポジトリがエラーを throw してもクラッシュせずにエラーをログに記録して処理を継続する", async () => {
    findSetupByCreatedVcIdMock.mockRejectedValue(new Error("DB エラー"));

    const old = makeVoiceState({ channelId: CHANNEL_ID, memberSize: 0 });
    const newState = makeVoiceState({ channelId: "vc-2" });

    await expect(
      handleVcRecruitVoiceStateUpdate(old as never, newState as never),
    ).resolves.not.toThrow();
  });
});
