// tests/unit/bot/features/vc-recruit/handlers/ui/vcRecruitRoleButtonHandler.test.ts

import { VC_RECRUIT_ROLE_CUSTOM_ID } from "@/bot/features/vc-recruit/commands/vcRecruitConfigCommand.constants";
import { vcRecruitRoleButtonHandler } from "@/bot/features/vc-recruit/handlers/ui/vcRecruitRoleButtonHandler";
import {
  vcRecruitAddRoleSelections,
  vcRecruitRemoveRoleSelections,
} from "@/bot/features/vc-recruit/handlers/ui/vcRecruitRoleState";

// ---- モック定義 ----

const addMentionRoleIdMock = vi.fn();
const removeMentionRoleIdMock = vi.fn();
const tGuildMock = vi.fn(
  async (_guildId: string, key: string, _opts?: Record<string, unknown>) => key,
);

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVcRecruitConfigService: () => ({
    addMentionRoleId: (...args: unknown[]) => addMentionRoleIdMock(...args),
    removeMentionRoleId: (...args: unknown[]) =>
      removeMentionRoleIdMock(...args),
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
  tGuild: (...args: unknown[]) =>
    tGuildMock(...(args as Parameters<typeof tGuildMock>)),
  tInteraction: vi.fn((_locale: string, key: string) => key),
  tDefault: (key: string) => key,
}));

const GUILD_ID = "guild-1";
const SESSION_ID = "session-1";

function makeInteraction(customId: string) {
  return {
    customId,
    guildId: GUILD_ID,
    reply: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
  };
}

// vcRecruitRoleButtonHandler の matches 判定・add/remove の confirm/cancel 各分岐を検証
describe("vcRecruitRoleButtonHandler", () => {
  // 各テストケースでモック状態と共有状態をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
    vcRecruitAddRoleSelections.clear();
    vcRecruitRemoveRoleSelections.clear();
  });

  // 各 customId プレフィックスに対する matches の一致・不一致を検証
  describe("matches", () => {
    it("add-role confirm に一致する", () => {
      expect(
        vcRecruitRoleButtonHandler.matches(
          `${VC_RECRUIT_ROLE_CUSTOM_ID.ADD_ROLE_CONFIRM_PREFIX}${SESSION_ID}`,
        ),
      ).toBe(true);
    });

    it("add-role cancel に一致する", () => {
      expect(
        vcRecruitRoleButtonHandler.matches(
          `${VC_RECRUIT_ROLE_CUSTOM_ID.ADD_ROLE_CANCEL_PREFIX}${SESSION_ID}`,
        ),
      ).toBe(true);
    });

    it("remove-role confirm に一致する", () => {
      expect(
        vcRecruitRoleButtonHandler.matches(
          `${VC_RECRUIT_ROLE_CUSTOM_ID.REMOVE_ROLE_CONFIRM_PREFIX}${SESSION_ID}`,
        ),
      ).toBe(true);
    });

    it("remove-role cancel に一致する", () => {
      expect(
        vcRecruitRoleButtonHandler.matches(
          `${VC_RECRUIT_ROLE_CUSTOM_ID.REMOVE_ROLE_CANCEL_PREFIX}${SESSION_ID}`,
        ),
      ).toBe(true);
    });

    it("関係ない customId には一致しない", () => {
      expect(vcRecruitRoleButtonHandler.matches("other:123")).toBe(false);
    });
  });

  // add-role キャンセル時の状態クリアとメッセージ更新を検証
  describe("add-role cancel", () => {
    it("状態をクリアしてキャンセルメッセージを表示する", async () => {
      vcRecruitAddRoleSelections.set(SESSION_ID, ["role-1"]);
      const interaction = makeInteraction(
        `${VC_RECRUIT_ROLE_CUSTOM_ID.ADD_ROLE_CANCEL_PREFIX}${SESSION_ID}`,
      );

      await vcRecruitRoleButtonHandler.execute(interaction as never);

      expect(vcRecruitAddRoleSelections.has(SESSION_ID)).toBe(false);
      expect(interaction.update).toHaveBeenCalledWith(
        expect.objectContaining({ components: [] }),
      );
    });
  });

  // add-role 確定時の選択なしエラーと正常追加を検証
  describe("add-role confirm", () => {
    it("選択なしの場合はエフェメラルで案内する", async () => {
      // 状態に何も入れない
      const interaction = makeInteraction(
        `${VC_RECRUIT_ROLE_CUSTOM_ID.ADD_ROLE_CONFIRM_PREFIX}${SESSION_ID}`,
      );

      await vcRecruitRoleButtonHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ ephemeral: true }),
      );
    });

    it("ロール追加成功時は success embed を表示する", async () => {
      vcRecruitAddRoleSelections.set(SESSION_ID, ["role-1", "role-2"]);
      addMentionRoleIdMock.mockResolvedValue("added");
      const interaction = makeInteraction(
        `${VC_RECRUIT_ROLE_CUSTOM_ID.ADD_ROLE_CONFIRM_PREFIX}${SESSION_ID}`,
      );

      await vcRecruitRoleButtonHandler.execute(interaction as never);

      expect(addMentionRoleIdMock).toHaveBeenCalledTimes(2);
      expect(addMentionRoleIdMock).toHaveBeenCalledWith(GUILD_ID, "role-1");
      expect(addMentionRoleIdMock).toHaveBeenCalledWith(GUILD_ID, "role-2");
      expect(interaction.update).toHaveBeenCalledWith(
        expect.objectContaining({ components: [] }),
      );
      expect(vcRecruitAddRoleSelections.has(SESSION_ID)).toBe(false);
    });
  });

  // remove-role キャンセル時の状態クリアとメッセージ更新を検証
  describe("remove-role cancel", () => {
    it("状態をクリアしてキャンセルメッセージを表示する", async () => {
      vcRecruitRemoveRoleSelections.set(SESSION_ID, ["role-1"]);
      const interaction = makeInteraction(
        `${VC_RECRUIT_ROLE_CUSTOM_ID.REMOVE_ROLE_CANCEL_PREFIX}${SESSION_ID}`,
      );

      await vcRecruitRoleButtonHandler.execute(interaction as never);

      expect(vcRecruitRemoveRoleSelections.has(SESSION_ID)).toBe(false);
      expect(interaction.update).toHaveBeenCalledWith(
        expect.objectContaining({ components: [] }),
      );
    });
  });

  // remove-role 確定時の選択なしエラーと正常削除を検証
  describe("remove-role confirm", () => {
    it("選択なしの場合はエフェメラルで案内する", async () => {
      const interaction = makeInteraction(
        `${VC_RECRUIT_ROLE_CUSTOM_ID.REMOVE_ROLE_CONFIRM_PREFIX}${SESSION_ID}`,
      );

      await vcRecruitRoleButtonHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ ephemeral: true }),
      );
    });

    it("ロール削除成功時は success embed を表示する", async () => {
      vcRecruitRemoveRoleSelections.set(SESSION_ID, ["role-1"]);
      removeMentionRoleIdMock.mockResolvedValue("removed");
      const interaction = makeInteraction(
        `${VC_RECRUIT_ROLE_CUSTOM_ID.REMOVE_ROLE_CONFIRM_PREFIX}${SESSION_ID}`,
      );

      await vcRecruitRoleButtonHandler.execute(interaction as never);

      expect(removeMentionRoleIdMock).toHaveBeenCalledWith(GUILD_ID, "role-1");
      expect(interaction.update).toHaveBeenCalledWith(
        expect.objectContaining({ components: [] }),
      );
      expect(vcRecruitRemoveRoleSelections.has(SESSION_ID)).toBe(false);
    });
  });

  it("guildId が null の場合は何もしない", async () => {
    const interaction = {
      customId: `${VC_RECRUIT_ROLE_CUSTOM_ID.ADD_ROLE_CONFIRM_PREFIX}${SESSION_ID}`,
      guildId: null,
      reply: vi.fn(),
      update: vi.fn(),
    };

    await vcRecruitRoleButtonHandler.execute(interaction as never);

    expect(interaction.reply).not.toHaveBeenCalled();
    expect(interaction.update).not.toHaveBeenCalled();
  });
});
