// tests/unit/bot/features/vac/commands/presenters/vacConfigViewPresenter.test.ts

import { ChannelType } from "discord.js";
import { presentVacConfigView } from "@/bot/features/vac/commands/presenters/vacConfigViewPresenter";
import type { VacConfig } from "@/shared/database/types";

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
  tInteraction: vi.fn((_locale: string, key: string) => {
    const labels: Record<string, string> = {
      "vac:embed.field.value.top": "TOP",
      "common:embed.field.value.not_configured": "未設定",
      "vac:embed.field.value.no_created_vcs": "作成済みVCなし",
      "vac:embed.title.config_view": "VAC設定",
      "vac:embed.field.name.trigger_channels": "トリガー",
      "vac:embed.field.name.created_vc_details": "作成済みVC",
    };
    return labels[key] ?? key;
  }),
}));

describe("bot/features/vac/commands/presenters/vacConfigViewPresenter", () => {
  // view 表示用の文言整形と空状態フォールバックを検証する
  it("トリガーチャンネルと作成済みVCの詳細を整形して返す", async () => {
    const guild = {
      channels: {
        fetch: vi
          .fn()
          .mockResolvedValueOnce({
            id: "trigger-1",
            parent: { type: ChannelType.GuildCategory, name: "CategoryA" },
          })
          .mockResolvedValueOnce({
            id: "trigger-2",
            parent: null,
          }),
      },
    };

    const config: VacConfig = {
      enabled: true,
      triggerChannelIds: ["trigger-1", "trigger-2"],
      createdChannels: [
        {
          voiceChannelId: "voice-1",
          ownerId: "user-1",
          createdAt: Date.now(),
        },
      ],
    };

    const result = await presentVacConfigView(guild as never, "ja", config);

    expect(result.title).toBe("VAC設定");
    expect(result.fieldTrigger).toBe("トリガー");
    expect(result.fieldCreatedDetails).toBe("作成済みVC");
    expect(result.triggerChannels).toContain("<#trigger-1> (CategoryA)");
    expect(result.triggerChannels).toContain("<#trigger-2> (TOP)");
    expect(result.createdVcDetails).toBe("<#voice-1>(<@user-1>)");
  });

  it("チャンネルが未設定の場合にフォールバックラベルを使用する", async () => {
    const guild = {
      channels: {
        fetch: vi.fn(),
      },
    };

    const config: VacConfig = {
      enabled: true,
      triggerChannelIds: [],
      createdChannels: [],
    };

    const result = await presentVacConfigView(guild as never, "ja", config);

    expect(result.triggerChannels).toBe("未設定");
    expect(result.createdVcDetails).toBe("作成済みVCなし");
    expect(guild.channels.fetch).not.toHaveBeenCalled();
  });
});
