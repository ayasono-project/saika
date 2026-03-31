// tests/unit/bot/features/member-log/commands/memberLogConfigCommand.reset.test.ts
import { handleMemberLogConfigReset } from "@/bot/features/member-log/commands/memberLogConfigCommand.reset";

const setEnabledMock = vi.fn();
const disableAndClearChannelMock = vi.fn();
const clearJoinMessageMock = vi.fn();
const clearLeaveMessageMock = vi.fn();
const createSuccessEmbedMock = vi.fn(
  (description: string, opts?: { title?: string }) => ({
    description,
    title: opts?.title,
    kind: "success",
  }),
);
const createWarningEmbedMock = vi.fn(
  (description: string, opts?: { title?: string }) => ({
    description,
    title: opts?.title,
    kind: "warning",
  }),
);

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (
    prefixKey: string,
    messageKey: string,
    params?: Record<string, unknown>,
  ) =>
    params
      ? `[${prefixKey}] ${messageKey}:${JSON.stringify(params)}`
      : `[${prefixKey}] ${messageKey}`,
  tInteraction: (_locale: string, key: string) => key,
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { info: vi.fn() },
}));

vi.mock("@/shared/features/member-log/memberLogConfigDefaults", () => ({
  createDefaultMemberLogConfig: () => ({ enabled: false }),
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotMemberLogConfigService: () => ({
    setEnabled: (...args: unknown[]) => setEnabledMock(...args),
    disableAndClearChannel: (...args: unknown[]) =>
      disableAndClearChannelMock(...args),
    clearJoinMessage: (...args: unknown[]) => clearJoinMessageMock(...args),
    clearLeaveMessage: (...args: unknown[]) => clearLeaveMessageMock(...args),
  }),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: (description: string, opts?: { title?: string }) =>
    createSuccessEmbedMock(description, opts),
  createWarningEmbed: (description: string, opts?: { title?: string }) =>
    createWarningEmbedMock(description, opts),
}));

describe("memberLogConfigCommand.reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEnabledMock.mockResolvedValue(undefined);
    disableAndClearChannelMock.mockResolvedValue(undefined);
    clearJoinMessageMock.mockResolvedValue(undefined);
    clearLeaveMessageMock.mockResolvedValue(undefined);
  });

  it("確認ダイアログを ephemeral で表示する", async () => {
    const replyMock = vi.fn().mockResolvedValue({
      createMessageComponentCollector: () => ({ on: vi.fn() }),
    });

    const interaction = {
      locale: "ja",
      user: { id: "user-1" },
      reply: replyMock,
    };

    await handleMemberLogConfigReset(interaction as never, "guild-1");

    expect(replyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        components: expect.any(Array),
        flags: 64,
      }),
    );
    expect(createWarningEmbedMock).toHaveBeenCalled();
  });

  it("confirm ボタンで全設定をリセットする", async () => {
    let collectHandler: (i: unknown) => Promise<void> = async () => {};

    const replyMock = vi.fn().mockResolvedValue({
      createMessageComponentCollector: () => ({
        on: vi.fn((event: string, handler: (i: unknown) => Promise<void>) => {
          if (event === "collect") collectHandler = handler;
        }),
        stop: vi.fn(),
      }),
    });

    const interaction = {
      locale: "ja",
      user: { id: "user-1" },
      reply: replyMock,
    };

    await handleMemberLogConfigReset(interaction as never, "guild-1");

    const updateMock = vi.fn().mockResolvedValue(undefined);
    await collectHandler({
      customId: "member-log-config:reset-confirm",
      update: updateMock,
    });

    expect(setEnabledMock).toHaveBeenCalledWith("guild-1", false);
    expect(disableAndClearChannelMock).toHaveBeenCalledWith("guild-1");
    expect(clearJoinMessageMock).toHaveBeenCalledWith("guild-1");
    expect(clearLeaveMessageMock).toHaveBeenCalledWith("guild-1");
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ embeds: expect.any(Array), components: [] }),
    );
  });

  it("cancel ボタンでキャンセルメッセージを表示する", async () => {
    let collectHandler: (i: unknown) => Promise<void> = async () => {};

    const replyMock = vi.fn().mockResolvedValue({
      createMessageComponentCollector: () => ({
        on: vi.fn((event: string, handler: (i: unknown) => Promise<void>) => {
          if (event === "collect") collectHandler = handler;
        }),
        stop: vi.fn(),
      }),
    });

    const interaction = {
      locale: "ja",
      user: { id: "user-1" },
      reply: replyMock,
    };

    await handleMemberLogConfigReset(interaction as never, "guild-1");

    const updateMock = vi.fn().mockResolvedValue(undefined);
    await collectHandler({
      customId: "member-log-config:reset-cancel",
      update: updateMock,
    });

    expect(setEnabledMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ embeds: expect.any(Array), components: [] }),
    );
  });

  it("タイムアウト時にキャンセルメッセージを表示する", async () => {
    let endHandler: (collected: unknown, reason: string) => Promise<void> =
      async () => {};

    const editReplyMock = vi.fn().mockResolvedValue(undefined);
    const replyMock = vi.fn().mockResolvedValue({
      createMessageComponentCollector: () => ({
        on: vi.fn(
          (
            event: string,
            handler: (collected: unknown, reason: string) => Promise<void>,
          ) => {
            if (event === "end") endHandler = handler;
          },
        ),
        stop: vi.fn(),
      }),
    });

    const interaction = {
      locale: "ja",
      user: { id: "user-1" },
      reply: replyMock,
      editReply: editReplyMock,
    };

    await handleMemberLogConfigReset(interaction as never, "guild-1");

    await endHandler(undefined, "time");

    expect(editReplyMock).toHaveBeenCalledWith(
      expect.objectContaining({ embeds: expect.any(Array), components: [] }),
    );
  });
});
