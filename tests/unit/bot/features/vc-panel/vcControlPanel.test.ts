// tests/unit/bot/features/vc-panel/vcControlPanel.test.ts
import {
  getVacPanelChannelId,
  sendVcControlPanel,
  VAC_PANEL_CUSTOM_ID,
} from "@/bot/features/vc-panel/vcControlPanel";
import { createInfoEmbed } from "@/bot/utils/messageResponse";
import { tGuild } from "@/shared/locale/localeManager";

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
  tGuild: vi.fn(async (_guildId: string, key: string) => key),
  tInteraction: vi.fn((_locale: string, key: string) => key),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createInfoEmbed: vi.fn(
    (description: string, options?: { title?: string }) => ({
      description,
      title: options?.title,
    }),
  ),
}));

// VCコントロールパネルのカスタムIDパース・送信可否チェック・送信ペイロード内容を検証する
describe("bot/features/vc-panel/vcControlPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("期待するプレフィックスを持つcustomIdからチャンネルIDを抽出する", () => {
    expect(
      getVacPanelChannelId(
        "vac:rename:voice-1",
        VAC_PANEL_CUSTOM_ID.RENAME_BUTTON_PREFIX,
      ),
    ).toBe("voice-1");
  });

  it("customIdがプレフィックスに一致しない場合は空文字を返す", () => {
    expect(
      getVacPanelChannelId(
        "vac:limit:voice-1",
        VAC_PANEL_CUSTOM_ID.RENAME_BUTTON_PREFIX,
      ),
    ).toBe("");
  });

  it("ボイスチャンネルがテキストベースでない場合は早期リターンする", async () => {
    const send = vi.fn();
    const voiceChannel = {
      id: "voice-1",
      guild: { id: "guild-1" },
      isTextBased: vi.fn(() => false),
      isSendable: vi.fn(() => true),
      send,
    };

    await sendVcControlPanel(voiceChannel as never);

    expect(voiceChannel.isSendable).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("ボイスチャンネルが送信可能でない場合は早期リターンする", async () => {
    const send = vi.fn();
    const voiceChannel = {
      id: "voice-1",
      guild: { id: "guild-1" },
      isTextBased: vi.fn(() => true),
      isSendable: vi.fn(() => false),
      send,
    };

    await sendVcControlPanel(voiceChannel as never);

    expect(send).not.toHaveBeenCalled();
  });

  it("VCコントロールパネルを4つのボタン行で送信する", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const voiceChannel = {
      id: "voice-1",
      guild: { id: "guild-1" },
      isTextBased: vi.fn(() => true),
      isSendable: vi.fn(() => true),
      send,
    };

    await sendVcControlPanel(voiceChannel as never);

    expect(tGuild).toHaveBeenCalledWith("guild-1", "vac:embed.title.panel");
    expect(createInfoEmbed).toHaveBeenCalledWith(
      "vac:embed.description.panel",
      {
        title: "vac:embed.title.panel",
      },
    );

    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0][0];
    expect(payload.embeds).toHaveLength(1);
    expect(payload.components).toHaveLength(4);
    expect(payload.components[0].toJSON().components[0].custom_id).toBe(
      `${VAC_PANEL_CUSTOM_ID.RENAME_BUTTON_PREFIX}voice-1`,
    );
    expect(payload.components[1].toJSON().components[0].custom_id).toBe(
      `${VAC_PANEL_CUSTOM_ID.LIMIT_BUTTON_PREFIX}voice-1`,
    );
    expect(payload.components[2].toJSON().components[0].custom_id).toBe(
      `${VAC_PANEL_CUSTOM_ID.AFK_BUTTON_PREFIX}voice-1`,
    );
    expect(payload.components[3].toJSON().components[0].custom_id).toBe(
      `${VAC_PANEL_CUSTOM_ID.REFRESH_BUTTON_PREFIX}voice-1`,
    );
  });
});
