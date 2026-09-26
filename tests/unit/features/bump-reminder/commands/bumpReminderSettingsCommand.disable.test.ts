import { handleBumpReminderSettingsDisable } from "@/features/bump-reminder/commands/bumpReminderSettingsCommand.disable";

const cancelGuildBumpRemindersMock = vi.fn();
const setEnabledMock = vi.fn();
const createSuccessEmbedMock = vi.fn((description: string) => ({
  description,
}));

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
  tGuild: vi.fn(async () => "translated"),
  tInteraction: (...args: unknown[]) => args[1],
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { info: vi.fn() },
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotBumpReminderSettingsService: () => ({
    setBumpReminderEnabled: (...args: unknown[]) => setEnabledMock(...args),
  }),
}));

vi.mock(
  "@/features/bump-reminder/handlers/usecases/cancelGuildBumpReminders",
  () => ({
    cancelGuildBumpReminders: (...args: unknown[]) =>
      cancelGuildBumpRemindersMock(...args),
  }),
);

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: (description: string) =>
    createSuccessEmbedMock(description),
}));

// disable が無効化の保存と、予約・パネルの取り消しを行って成功応答を返すことを検証
describe("bot/features/bump-reminder/commands/bumpReminderSettingsCommand.disable", () => {
  // ケースごとに呼び出し記録を消し、保存・取り消しとも成功させる
  beforeEach(() => {
    vi.clearAllMocks();
    cancelGuildBumpRemindersMock.mockResolvedValue(0);
    setEnabledMock.mockResolvedValue(undefined);
  });

  it("設定を無効化してから、ギルドの予約とパネルをすべて取り消し、成功応答を返す", async () => {
    const client = { channels: { fetch: vi.fn() } };
    const interaction = {
      locale: "ja",
      client,
      reply: vi.fn().mockResolvedValue(undefined),
    };

    await handleBumpReminderSettingsDisable(interaction as never, "guild-1");

    expect(setEnabledMock).toHaveBeenCalledWith("guild-1", false);
    expect(cancelGuildBumpRemindersMock).toHaveBeenCalledWith(
      client,
      "guild-1",
    );
    // 取り消しの最中に検知した Bump で予約が入らないよう、無効化の保存が先
    expect(setEnabledMock.mock.invocationCallOrder[0]).toBeLessThan(
      cancelGuildBumpRemindersMock.mock.invocationCallOrder[0],
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [
        {
          description: "bumpReminder:user-response.disable_success",
        },
      ],
      flags: 64,
    });
  });

  it("無効化の保存に失敗した場合は予約を取り消さずに例外を返す", async () => {
    setEnabledMock.mockRejectedValue(new Error("db down"));
    const interaction = {
      locale: "ja",
      client: { channels: { fetch: vi.fn() } },
      reply: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      handleBumpReminderSettingsDisable(interaction as never, "guild-1"),
    ).rejects.toThrow("db down");
    expect(cancelGuildBumpRemindersMock).not.toHaveBeenCalled();
    expect(interaction.reply).not.toHaveBeenCalled();
  });
});
