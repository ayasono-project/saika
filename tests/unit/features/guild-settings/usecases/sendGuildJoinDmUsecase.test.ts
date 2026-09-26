// 導入・再導入 DM 送信ユースケースのテスト

const getFixedTMock = vi.fn();
const buildIntroMock = vi.fn();
const buildReturnMock = vi.fn();
const addInaccessibleFieldMock = vi.fn();
const loggerWarnMock = vi.fn();
const loggerDebugMock = vi.fn();

vi.mock("@/shared/locale/localeManager", () => ({
  localeManager: {
    getFixedT: (...args: unknown[]) => getFixedTMock(...args),
  },
  logPrefixed: (
    prefixKey: string,
    messageKey: string,
    params?: Record<string, unknown>,
  ) => {
    const m = params ? `${messageKey}:${JSON.stringify(params)}` : messageKey;
    return `[${prefixKey}] ${m}`;
  },
  tDefault: vi.fn((key: string) => key),
}));
vi.mock("@/shared/utils/logger", () => ({
  logger: {
    debug: (...args: unknown[]) => loggerDebugMock(...args),
    info: vi.fn(),
    warn: (...args: unknown[]) => loggerWarnMock(...args),
    error: vi.fn(),
  },
}));
vi.mock("@/features/guild-settings/services/guildJoinDmBuilder", () => ({
  buildGuildJoinIntroDm: (...args: unknown[]) => buildIntroMock(...args),
  buildGuildJoinReturnDm: (...args: unknown[]) => buildReturnMock(...args),
  addInaccessibleTicketChannelsField: (...args: unknown[]) =>
    addInaccessibleFieldMock(...args),
}));
vi.mock("@/shared/config/env", () => ({
  env: {
    USER_MANUAL_URL: "https://example.com/manual",
    DASHBOARD_URL: undefined,
    PRIVACY_POLICY_URL: "https://example.com/privacy",
    SUPPORT_SERVER_URL: undefined,
  },
}));

import { sendGuildJoinDmUsecase } from "@/features/guild-settings/usecases/sendGuildJoinDmUsecase";

const sendMock = vi.fn();

/**
 * テスト用の Guild モックを作る
 * @returns Guild として渡せるモック
 */
function createGuild() {
  return {
    id: "guild-1",
    fetchOwner: vi.fn(async () => ({ send: sendMock })),
  };
}

// DM の出し分け・日英の翻訳関数の組み立て・Bot が扱えないチケットの欄の出し分け・送信失敗の握りつぶしを検証する
describe("features/guild-settings/sendGuildJoinDmUsecase", () => {
  // 各ケースでモック呼び出し記録と既定の解決値をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
    getFixedTMock.mockImplementation((locale: string) => () => locale);
    buildIntroMock.mockReturnValue({ intro: true });
    buildReturnMock.mockReturnValue({ return: true });
    sendMock.mockResolvedValue(undefined);
  });

  it("削除予約が無かった場合は導入時 DM を送ること", async () => {
    const guild = createGuild();

    await sendGuildJoinDmUsecase(guild as never, null);

    expect(buildIntroMock).toHaveBeenCalled();
    expect(buildReturnMock).not.toHaveBeenCalled();
    expect(sendMock).toHaveBeenCalledWith({ embeds: [{ intro: true }] });
  });

  it("削除予約を取り消した場合は再導入 DM を送り、その日時を渡すこと", async () => {
    const deleteAt = new Date("2026-10-24T00:00:00.000Z");
    const guild = createGuild();

    await sendGuildJoinDmUsecase(guild as never, deleteAt);

    expect(buildReturnMock).toHaveBeenCalledWith(expect.anything(), deleteAt);
    expect(buildIntroMock).not.toHaveBeenCalled();
    expect(sendMock).toHaveBeenCalledWith({ embeds: [{ return: true }] });
  });

  it("ギルドのロケールに依らず日本語と英語の翻訳関数を両方渡すこと（相手の言語は分からないため併記する）", async () => {
    const guild = createGuild();

    await sendGuildJoinDmUsecase(guild as never, null);

    const translators = buildIntroMock.mock.calls[0][0] as {
      ja: () => string;
      en: () => string;
    };
    expect(translators.ja()).toBe("ja");
    expect(translators.en()).toBe("en");
  });

  it("導入時 DM には保持日数と設定済みの URL だけを渡すこと", async () => {
    const guild = createGuild();

    await sendGuildJoinDmUsecase(guild as never, null);

    expect(buildIntroMock).toHaveBeenCalledWith(expect.anything(), 30, {
      manualUrl: "https://example.com/manual",
      dashboardUrl: undefined,
      privacyPolicyUrl: "https://example.com/privacy",
      supportServerUrl: undefined,
    });
  });

  it("エラー通知チャンネルで知らせられなかった、Bot が扱えないチケットの件数を受け取ったら、その欄を足した DM を送ること", async () => {
    const deleteAt = new Date("2026-10-24T00:00:00.000Z");
    const guild = createGuild();

    await sendGuildJoinDmUsecase(guild as never, deleteAt, 3);

    const translators = buildReturnMock.mock.calls[0][0];
    expect(addInaccessibleFieldMock).toHaveBeenCalledWith(
      { return: true },
      translators,
      3,
    );
    expect(sendMock).toHaveBeenCalledWith({ embeds: [{ return: true }] });
  });

  it("件数が0（渡されない）なら、Bot が扱えないチケットの欄は足さないこと", async () => {
    const guild = createGuild();

    await sendGuildJoinDmUsecase(guild as never, new Date());
    await sendGuildJoinDmUsecase(guild as never, null, 0);

    expect(addInaccessibleFieldMock).not.toHaveBeenCalled();
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it("DM 送信が失敗しても例外を投げず警告ログに落とすこと（導入処理は成功扱い）", async () => {
    const error = new Error("Cannot send messages to this user");
    sendMock.mockRejectedValueOnce(error);
    const guild = createGuild();

    await expect(
      sendGuildJoinDmUsecase(guild as never, null),
    ).resolves.toBeUndefined();

    expect(loggerWarnMock).toHaveBeenCalledWith(
      '[system:log_prefix.guild_create] system:guild_create.dm_failed:{"guildId":"guild-1"}',
      error,
    );
  });

  it("オーナーの解決が失敗しても例外を投げないこと", async () => {
    const guild = createGuild();
    guild.fetchOwner = vi.fn(async () => {
      throw new Error("unknown member");
    });

    await expect(
      sendGuildJoinDmUsecase(guild as never, null),
    ).resolves.toBeUndefined();

    expect(loggerWarnMock).toHaveBeenCalled();
  });
});
