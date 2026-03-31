// tests/unit/bot/events/voiceStateUpdate.test.ts

import { Events } from "discord.js";
import { voiceStateUpdateEvent } from "@/bot/events/voiceStateUpdate";

const handleVacVoiceStateUpdateMock = vi.fn();

vi.mock("@/bot/features/vac/handlers/vacVoiceStateUpdate", () => ({
  handleVacVoiceStateUpdate: (...args: unknown[]) =>
    handleVacVoiceStateUpdateMock(...args),
}));

// voiceStateUpdate イベントの検証
describe("bot/events/voiceStateUpdate", () => {
  // beforeEach: 各テストの前にモックをリセットして副作用を分離する
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("イベントメタデータが正しいことを確認", () => {
    expect(voiceStateUpdateEvent.name).toBe(Events.VoiceStateUpdate);
    expect(voiceStateUpdateEvent.once).toBe(false);
  });

  it("旧・新ボイス状態が handleVacVoiceStateUpdate へ委譲されることを確認", async () => {
    const oldState = { channelId: "old" };
    const newState = { channelId: "new" };

    await voiceStateUpdateEvent.execute(oldState as never, newState as never);

    expect(handleVacVoiceStateUpdateMock).toHaveBeenCalledWith(
      oldState,
      newState,
    );
  });

  it("VC募集の voiceStateUpdate ハンドラーは呼ばれない", async () => {
    const oldState = { channelId: "old" };
    const newState = { channelId: "new" };

    await voiceStateUpdateEvent.execute(oldState as never, newState as never);

    // VAC のみが呼ばれ、VC募集のハンドラーは存在しない
    expect(handleVacVoiceStateUpdateMock).toHaveBeenCalledTimes(1);
  });
});
