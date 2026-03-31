// tests/unit/bot/events/channelDelete.test.ts

import { ChannelType, Events } from "discord.js";
import { channelDeleteEvent } from "@/bot/events/channelDelete";

const handleVacChannelDeleteMock = vi.fn();
const handleStickyMessageChannelDeleteMock = vi.fn();
const handleVcRecruitChannelDeleteMock = vi.fn();
const handleTicketChannelDeleteMock = vi.fn();

vi.mock("@/bot/features/vac/handlers/vacChannelDelete", () => ({
  handleVacChannelDelete: (...args: unknown[]) =>
    handleVacChannelDeleteMock(...args),
}));

vi.mock(
  "@/bot/features/sticky-message/handlers/stickyMessageChannelDeleteHandler",
  () => ({
    handleStickyMessageChannelDelete: (...args: unknown[]) =>
      handleStickyMessageChannelDeleteMock(...args),
  }),
);

vi.mock(
  "@/bot/features/vc-recruit/handlers/vcRecruitChannelDeleteHandler",
  () => ({
    handleVcRecruitChannelDelete: (...args: unknown[]) =>
      handleVcRecruitChannelDeleteMock(...args),
  }),
);

vi.mock("@/bot/features/ticket/handlers/ticketChannelDeleteHandler", () => ({
  handleTicketChannelDelete: (...args: unknown[]) =>
    handleTicketChannelDeleteMock(...args),
}));

const handleReactionRoleChannelDeleteMock = vi.fn();
vi.mock(
  "@/bot/features/reaction-role/handlers/reactionRoleChannelDeleteHandler",
  () => ({
    handleReactionRoleChannelDelete: (...args: unknown[]) =>
      handleReactionRoleChannelDeleteMock(...args),
  }),
);

type ChannelLike = {
  guildId: string;
  id: string;
  type: ChannelType;
  isDMBased: () => boolean;
};

// channelDelete イベント検証に必要な最小チャンネルモック
function createChannel(overrides?: Partial<ChannelLike>): ChannelLike {
  return {
    guildId: "guild-1",
    id: "channel-1",
    type: ChannelType.GuildVoice,
    isDMBased: () => false,
    ...overrides,
  };
}

describe("bot/events/channelDelete", () => {
  // 各ケース前にモック履歴を初期化する
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("イベントメタデータが正しいことを確認", () => {
    expect(channelDeleteEvent.name).toBe(Events.ChannelDelete);
    expect(channelDeleteEvent.once).toBe(false);
  });

  it("チャンネルが handleVacChannelDelete へ委譲されることを確認", async () => {
    const channel = createChannel({ type: ChannelType.GuildText });

    await channelDeleteEvent.execute(channel as never);

    expect(handleVacChannelDeleteMock).toHaveBeenCalledWith(channel);
  });

  it("チャンネルが handleStickyMessageChannelDelete へ委譲されることを確認", async () => {
    const channel = createChannel({ type: ChannelType.GuildText });

    await channelDeleteEvent.execute(channel as never);

    expect(handleStickyMessageChannelDeleteMock).toHaveBeenCalledWith(channel);
  });

  it("チャンネルが handleVcRecruitChannelDelete へ委譲されることを確認", async () => {
    const channel = createChannel({ type: ChannelType.GuildText });

    await channelDeleteEvent.execute(channel as never);

    expect(handleVcRecruitChannelDeleteMock).toHaveBeenCalledWith(channel);
  });
});
