// tests/unit/bot/features/member-log/commands/memberLogConfigCommand.clearLeaveMessage.test.ts
import { handleMemberLogConfigClearLeaveMessage } from "@/bot/features/member-log/commands/memberLogConfigCommand.clearLeaveMessage";
import { ValidationError } from "@/shared/errors/customErrors";

// ---- モック定義 ----
const ensurePermissionMock = vi.fn();
const clearLeaveMessageMock = vi.fn();
const tGuildMock = vi.fn(async (_guildId: string, key: string) => key);
const tDefaultMock = vi.fn(
  (key: string, _opts?: Record<string, unknown>) => key,
);
const loggerInfoMock = vi.fn();
const createSuccessEmbedMock = vi.fn(
  (desc: string, opts?: { title?: string }) => ({
    description: desc,
    title: opts?.title,
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
    clearLeaveMessage: (...args: unknown[]) => clearLeaveMessageMock(...args),
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
  tGuild: (guildId: string, key: string) => tGuildMock(guildId, key),
  tInteraction: vi.fn((_locale: string, key: string) => key),
  tDefault: (key: string, opts?: Record<string, unknown>) =>
    tDefaultMock(key, opts),
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { info: (...args: unknown[]) => loggerInfoMock(...args) },
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: (desc: string, opts?: { title?: string }) =>
    createSuccessEmbedMock(desc, opts),
}));

// ---- ヘルパー ----

/** テスト用 interaction モックを生成する */
function makeInteraction() {
  return {
    options: {},
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

// handleMemberLogConfigClearLeaveMessage の権限チェック・削除・応答フローを検証
describe("bot/features/member-log/commands/memberLogConfigCommand.clearLeaveMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearLeaveMessageMock.mockResolvedValue(undefined);
  });

  it("ガードが ValidationError を投げた場合にそれが伝播することを確認", async () => {
    ensurePermissionMock.mockRejectedValue(new ValidationError("no-perm"));

    await expect(
      handleMemberLogConfigClearLeaveMessage(
        makeInteraction() as never,
        "guild-1",
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("service.clearLeaveMessage が正しい guildId を引数に呼ばれることを確認", async () => {
    ensurePermissionMock.mockResolvedValue(undefined);

    await handleMemberLogConfigClearLeaveMessage(
      makeInteraction() as never,
      "guild-1",
    );

    expect(clearLeaveMessageMock).toHaveBeenCalledWith("guild-1");
  });

  it("成功時に success embed で reply が呼ばれることを確認", async () => {
    ensurePermissionMock.mockResolvedValue(undefined);
    const interaction = makeInteraction();

    await handleMemberLogConfigClearLeaveMessage(
      interaction as never,
      "guild-1",
    );

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ embeds: expect.any(Array) }),
    );
    expect(createSuccessEmbedMock).toHaveBeenCalled();
  });

  it("成功時に logger.info が呼ばれることを確認", async () => {
    ensurePermissionMock.mockResolvedValue(undefined);

    await handleMemberLogConfigClearLeaveMessage(
      makeInteraction() as never,
      "guild-1",
    );

    expect(loggerInfoMock).toHaveBeenCalledWith(
      expect.stringContaining("memberLog:log.config_leave_message_cleared"),
    );
  });
});
