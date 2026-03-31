// tests/unit/bot/features/vac/commands/usecases/vacConfigCreateTrigger.test.ts

import { ChannelType, MessageFlags } from "discord.js";
import type { Mock } from "vitest";
import {
  findTriggerChannelByCategory,
  resolveTargetCategory,
} from "@/bot/features/vac/commands/helpers/vacConfigTargetResolver";
import { handleVacConfigCreateTrigger } from "@/bot/features/vac/commands/usecases/vacConfigCreateTrigger";
import { getBotVacConfigService } from "@/bot/services/botCompositionRoot";
import { createSuccessEmbed } from "@/bot/utils/messageResponse";
import { ValidationError } from "@/shared/errors/customErrors";

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

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVacConfigService: vi.fn(),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: vi.fn((description: string, _options?: object) => ({
    description,
  })),
}));

vi.mock("@/bot/features/vac/commands/helpers/vacConfigTargetResolver", () => ({
  resolveTargetCategory: vi.fn(),
  findTriggerChannelByCategory: vi.fn(),
}));

describe("bot/features/vac/commands/usecases/vacConfigCreateTrigger", () => {
  // create-trigger-vc のガード分岐と成功経路を検証する
  beforeEach(() => {
    vi.clearAllMocks();
    (findTriggerChannelByCategory as Mock).mockResolvedValue(null);
    (resolveTargetCategory as Mock).mockResolvedValue(null);
  });

  it("ギルドコンテキストが存在しない場合にValidationErrorをスローする", async () => {
    const interaction = {
      guild: null,
      channelId: "ch-1",
      options: { getString: vi.fn() },
      reply: vi.fn(),
    };

    await expect(
      handleVacConfigCreateTrigger(interaction as never, "guild-1"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("対象カテゴリにトリガーが既存する場合にValidationErrorをスローする", async () => {
    const getVacConfigOrDefault = vi.fn().mockResolvedValue({
      triggerChannelIds: ["trigger-1"],
    });
    (getBotVacConfigService as Mock).mockReturnValue({
      getVacConfigOrDefault,
      addTriggerChannel: vi.fn(),
    });
    (findTriggerChannelByCategory as Mock).mockResolvedValue({
      id: "trigger-1",
      type: ChannelType.GuildVoice,
    });

    const interaction = {
      guild: {
        channels: { create: vi.fn() },
      },
      channelId: "ch-1",
      options: { getString: vi.fn(() => "cat-1") },
      reply: vi.fn(),
    };

    await expect(
      handleVacConfigCreateTrigger(interaction as never, "guild-1"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("対象カテゴリのチャンネル数が上限に達している場合にValidationErrorをスローする", async () => {
    const getVacConfigOrDefault = vi.fn().mockResolvedValue({
      triggerChannelIds: [],
    });
    (getBotVacConfigService as Mock).mockReturnValue({
      getVacConfigOrDefault,
      addTriggerChannel: vi.fn(),
    });
    (resolveTargetCategory as Mock).mockResolvedValue({
      id: "cat-1",
      children: { cache: { size: 50 } },
    });

    const interaction = {
      guild: {
        channels: { create: vi.fn() },
      },
      channelId: "ch-1",
      options: { getString: vi.fn(() => "cat-1") },
      reply: vi.fn(),
    };

    await expect(
      handleVacConfigCreateTrigger(interaction as never, "guild-1"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("トリガーチャンネルを作成してDBに保存し、エフェメラルで成功応答する", async () => {
    const addTriggerChannel = vi.fn().mockResolvedValue(undefined);
    const getVacConfigOrDefault = vi.fn().mockResolvedValue({
      triggerChannelIds: [],
    });
    (getBotVacConfigService as Mock).mockReturnValue({
      getVacConfigOrDefault,
      addTriggerChannel,
    });
    (resolveTargetCategory as Mock).mockResolvedValue({
      id: "cat-1",
      children: { cache: { size: 0 } },
    });

    const create = vi.fn().mockResolvedValue({ id: "trigger-new" });
    const reply = vi.fn().mockResolvedValue(undefined);
    const interaction = {
      guild: { channels: { create } },
      channelId: "ch-1",
      options: { getString: vi.fn(() => "cat-1") },
      reply,
    };

    await handleVacConfigCreateTrigger(interaction as never, "guild-1");

    expect(create).toHaveBeenCalledWith({
      name: "CreateVC",
      type: ChannelType.GuildVoice,
      parent: "cat-1",
    });
    expect(addTriggerChannel).toHaveBeenCalledWith("guild-1", "trigger-new");
    expect(createSuccessEmbed).toHaveBeenCalledWith(
      "vac:user-response.trigger_created",
      { title: "common:embed.title.success" },
    );
    expect(reply).toHaveBeenCalledWith({
      embeds: [{ description: "vac:user-response.trigger_created" }],
      flags: MessageFlags.Ephemeral,
    });
  });
});
