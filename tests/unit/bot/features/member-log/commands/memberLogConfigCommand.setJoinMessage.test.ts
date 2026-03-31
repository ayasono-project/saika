// tests/unit/bot/features/member-log/commands/memberLogConfigCommand.setJoinMessage.test.ts
import { MEMBER_LOG_CONFIG_COMMAND } from "@/bot/features/member-log/commands/memberLogConfigCommand.constants";
import { handleMemberLogConfigSetJoinMessage } from "@/bot/features/member-log/commands/memberLogConfigCommand.setJoinMessage";
import { ValidationError } from "@/shared/errors/customErrors";

// ---- モック定義 ----
const ensurePermissionMock = vi.fn();
// discord.js ModalBuilder は title が最大45文字のため短い文字列を返す
const tDefaultMock = vi.fn(
  (_key: string, _opts?: Record<string, unknown>) => "t",
);
const showModalMock = vi.fn().mockResolvedValue(undefined);

vi.mock(
  "@/bot/features/member-log/commands/memberLogConfigCommand.guard",
  () => ({
    ensureMemberLogManageGuildPermission: (...args: unknown[]) =>
      ensurePermissionMock(...args),
  }),
);

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
  tDefault: (key: string, opts?: Record<string, unknown>) =>
    tDefaultMock(key, opts),
  tInteraction: (
    _locale: string,
    key: string,
    opts?: Record<string, unknown>,
  ) => tDefaultMock(key, opts),
}));

// ---- ヘルパー ----

/** テスト用 interaction モックを生成する */
function makeInteraction() {
  return {
    showModal: showModalMock,
  };
}

// handleMemberLogConfigSetJoinMessage の権限チェック・モーダル表示フローを検証
describe("bot/features/member-log/commands/memberLogConfigCommand.setJoinMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ガードが ValidationError を投げた場合にそれが伝播することを確認", async () => {
    ensurePermissionMock.mockRejectedValue(new ValidationError("no-perm"));

    await expect(
      handleMemberLogConfigSetJoinMessage(makeInteraction() as never),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("権限チェック後に showModal が呼ばれることを確認", async () => {
    ensurePermissionMock.mockResolvedValue(undefined);

    await handleMemberLogConfigSetJoinMessage(makeInteraction() as never);

    expect(ensurePermissionMock).toHaveBeenCalledTimes(1);
    expect(showModalMock).toHaveBeenCalledTimes(1);
  });

  it("モーダルの customId が SET_JOIN_MESSAGE_MODAL_ID であることを確認", async () => {
    ensurePermissionMock.mockResolvedValue(undefined);

    await handleMemberLogConfigSetJoinMessage(makeInteraction() as never);

    const modal = (showModalMock.mock.calls[0] as unknown[])[0] as {
      data: { custom_id: string };
    };
    expect(modal.data.custom_id).toBe(
      MEMBER_LOG_CONFIG_COMMAND.SET_JOIN_MESSAGE_MODAL_ID,
    );
  });
});
