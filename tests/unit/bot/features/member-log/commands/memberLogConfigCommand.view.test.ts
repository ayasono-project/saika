// tests/unit/bot/features/member-log/commands/memberLogConfigCommand.view.test.ts
import { handleMemberLogConfigView } from "@/bot/features/member-log/commands/memberLogConfigCommand.view";
import { ValidationError } from "@/shared/errors/customErrors";

// ---- モック定義 ----
const ensurePermissionMock = vi.fn();
const getMemberLogConfigMock = vi.fn();
const tInteractionMock = vi.fn(
  (_locale: string, key: string, _params?: Record<string, unknown>) => key,
);
const createInfoEmbedMock = vi.fn(
  (desc: string, opts?: { title?: string; fields?: unknown[] }) => ({
    description: desc,
    title: opts?.title,
    fields: opts?.fields,
  }),
);

vi.mock(
  "@/bot/features/member-log/commands/memberLogConfigCommand.guard",
  () => ({
    ensureMemberLogManageGuildPermission: (...args: unknown[]) =>
      ensurePermissionMock(...args),
  }),
);

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotMemberLogConfigService: () => ({
    getMemberLogConfig: (...args: unknown[]) => getMemberLogConfigMock(...args),
  }),
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
  tInteraction: (
    locale: string,
    key: string,
    params?: Record<string, unknown>,
  ) => tInteractionMock(locale, key, params),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createInfoEmbed: (
    desc: string,
    opts?: { title?: string; fields?: unknown[] },
  ) => createInfoEmbedMock(desc, opts),
}));

// ---- ヘルパー ----

/** テスト用 interaction モックを生成する */
function makeInteraction() {
  return { reply: vi.fn().mockResolvedValue(undefined), locale: "ja" };
}

// handleMemberLogConfigView の設定表示ロジックを検証
describe("bot/features/member-log/commands/memberLogConfigCommand.view", () => {
  // 各テストでモック呼び出し記録をリセットし、テスト間の副作用を排除する
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ガードが ValidationError を投げた場合にそれが伝播することを確認", async () => {
    ensurePermissionMock.mockRejectedValue(new ValidationError("no-perm"));

    await expect(
      handleMemberLogConfigView(makeInteraction() as never, "guild-1"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("config が null の場合に not_configured メッセージで reply が呼ばれることを確認", async () => {
    ensurePermissionMock.mockResolvedValue(undefined);
    getMemberLogConfigMock.mockResolvedValue(null);
    tInteractionMock.mockImplementation((_locale: string, key: string) => key);
    const interaction = makeInteraction();

    await handleMemberLogConfigView(interaction as never, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ embeds: expect.any(Array) }),
    );
    expect(createInfoEmbedMock).toHaveBeenCalledWith(
      "memberLog:embed.description.not_configured",
      expect.objectContaining({
        title: "memberLog:embed.title.config_view",
      }),
    );
  });

  it("config が存在する場合に fields を含む info embed が表示されることを確認", async () => {
    ensurePermissionMock.mockResolvedValue(undefined);
    getMemberLogConfigMock.mockResolvedValue({
      enabled: true,
      channelId: "ch-1",
      joinMessage: "こんにちは",
      leaveMessage: "さようなら",
    });
    tInteractionMock.mockImplementation((_locale: string, key: string) => key);
    const interaction = makeInteraction();

    await handleMemberLogConfigView(interaction as never, "guild-1");

    expect(createInfoEmbedMock).toHaveBeenCalledWith(
      "",
      expect.objectContaining({
        fields: expect.arrayContaining([
          expect.objectContaining({
            name: "common:embed.field.name.status",
          }),
          expect.objectContaining({
            name: "memberLog:embed.field.name.channel",
          }),
          expect.objectContaining({
            name: "memberLog:embed.field.name.join_message",
          }),
          expect.objectContaining({
            name: "memberLog:embed.field.name.leave_message",
          }),
        ]),
      }),
    );
  });

  it("config.enabled が true の場合に labelEnabled が使用されることを確認", async () => {
    ensurePermissionMock.mockResolvedValue(undefined);
    getMemberLogConfigMock.mockResolvedValue({
      enabled: true,
      channelId: "ch-1",
      joinMessage: null,
      leaveMessage: null,
    });
    tInteractionMock.mockImplementation((_locale: string, key: string) => key);
    const interaction = makeInteraction();

    await handleMemberLogConfigView(interaction as never, "guild-1");

    const callArg = createInfoEmbedMock.mock.calls[0][1];
    const statusField = (
      callArg!.fields as Array<{ name: string; value: string }>
    ).find((f) => f.name === "common:embed.field.name.status");
    expect(statusField?.value).toBe("common:enabled");
  });

  it("config.enabled が false の場合に labelDisabled が使用されることを確認", async () => {
    ensurePermissionMock.mockResolvedValue(undefined);
    getMemberLogConfigMock.mockResolvedValue({
      enabled: false,
      channelId: "ch-1",
      joinMessage: null,
      leaveMessage: null,
    });
    tInteractionMock.mockImplementation((_locale: string, key: string) => key);
    const interaction = makeInteraction();

    await handleMemberLogConfigView(interaction as never, "guild-1");

    const callArg = createInfoEmbedMock.mock.calls[0][1];
    const statusField = (
      callArg!.fields as Array<{ name: string; value: string }>
    ).find((f) => f.name === "common:embed.field.name.status");
    expect(statusField?.value).toBe("common:disabled");
  });

  it("channelId が設定されている場合にチャンネルメンションが表示されることを確認", async () => {
    ensurePermissionMock.mockResolvedValue(undefined);
    getMemberLogConfigMock.mockResolvedValue({
      enabled: true,
      channelId: "ch-99",
      joinMessage: null,
      leaveMessage: null,
    });
    tInteractionMock.mockImplementation((_locale: string, key: string) => key);
    const interaction = makeInteraction();

    await handleMemberLogConfigView(interaction as never, "guild-1");

    const callArg = createInfoEmbedMock.mock.calls[0][1];
    const channelField = (
      callArg!.fields as Array<{ name: string; value: string }>
    ).find((f) => f.name === "memberLog:embed.field.name.channel");
    expect(channelField?.value).toBe("<#ch-99>");
  });

  it("joinMessage が null の場合に labelNone が表示されることを確認", async () => {
    ensurePermissionMock.mockResolvedValue(undefined);
    getMemberLogConfigMock.mockResolvedValue({
      enabled: false,
      channelId: null,
      joinMessage: null,
      leaveMessage: null,
    });
    tInteractionMock.mockImplementation((_locale: string, key: string) => key);
    const interaction = makeInteraction();

    await handleMemberLogConfigView(interaction as never, "guild-1");

    const callArg = createInfoEmbedMock.mock.calls[0][1];
    const joinField = (
      callArg!.fields as Array<{ name: string; value: string }>
    ).find((f) => f.name === "memberLog:embed.field.name.join_message");
    expect(joinField?.value).toBe("common:none");
  });
});
