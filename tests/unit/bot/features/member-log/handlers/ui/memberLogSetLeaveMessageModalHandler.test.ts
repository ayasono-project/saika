// tests/unit/bot/features/member-log/handlers/ui/memberLogSetLeaveMessageModalHandler.test.ts

import { MessageFlags } from "discord.js";
import { MEMBER_LOG_CONFIG_COMMAND } from "@/bot/features/member-log/commands/memberLogConfigCommand.constants";
import { memberLogSetLeaveMessageModalHandler } from "@/bot/features/member-log/handlers/ui/memberLogSetLeaveMessageModalHandler";

// ---- モック定義（vi.hoisted でファクトリ参照可能にする） ----
const mocks = vi.hoisted(() => ({
  setLeaveMessage: vi.fn(),
  tGuild: vi.fn(async (_guildId: string, key: string) => `[${key}]`),
  tDefault: vi.fn((key: string) => key),
  loggerInfo: vi.fn(),
  createSuccessEmbed: vi.fn((desc: string, opts?: unknown) => ({
    type: "success",
    desc,
    ...(opts as object),
  })),
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotMemberLogConfigService: vi.fn(() => ({
    setLeaveMessage: mocks.setLeaveMessage,
  })),
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
  tGuild: mocks.tGuild,
  tDefault: mocks.tDefault,
  tInteraction: (...args: unknown[]) => args[1],
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { info: mocks.loggerInfo },
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: mocks.createSuccessEmbed,
}));

// ---- ヘルパー ----

function makeInteraction({
  guild = true,
  guildId = "guild-1",
  message = "さようなら {userName}",
}: {
  guild?: boolean;
  guildId?: string;
  message?: string;
} = {}) {
  return {
    guild: guild ? { id: guildId } : null,
    fields: {
      getTextInputValue: vi.fn(() => message),
    },
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

// memberLogSetLeaveMessageModalHandler の matches・execute フローを検証
describe("bot/features/member-log/handlers/ui/memberLogSetLeaveMessageModalHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setLeaveMessage.mockResolvedValue(undefined);
  });

  describe("matches", () => {
    it("SET_LEAVE_MESSAGE_MODAL_ID に対して true を返すことを確認", () => {
      expect(
        memberLogSetLeaveMessageModalHandler.matches(
          MEMBER_LOG_CONFIG_COMMAND.SET_LEAVE_MESSAGE_MODAL_ID,
        ),
      ).toBe(true);
    });

    it("別の customId に対して false を返すことを確認", () => {
      expect(memberLogSetLeaveMessageModalHandler.matches("other:modal")).toBe(
        false,
      );
    });
  });

  describe("execute", () => {
    it("guild が null の場合は何もせず返ることを確認", async () => {
      const interaction = makeInteraction({ guild: false });
      await memberLogSetLeaveMessageModalHandler.execute(interaction as never);
      expect(mocks.setLeaveMessage).not.toHaveBeenCalled();
    });

    it("service.setLeaveMessage が guildId とメッセージを引数に呼ばれることを確認", async () => {
      const interaction = makeInteraction({ message: "バイバイ {userName}" });
      await memberLogSetLeaveMessageModalHandler.execute(interaction as never);
      expect(mocks.setLeaveMessage).toHaveBeenCalledWith(
        "guild-1",
        "バイバイ {userName}",
      );
    });

    it("MODAL_INPUT_MESSAGE の customId でテキスト入力が取得されることを確認", async () => {
      const interaction = makeInteraction();
      await memberLogSetLeaveMessageModalHandler.execute(interaction as never);
      expect(interaction.fields.getTextInputValue).toHaveBeenCalledWith(
        MEMBER_LOG_CONFIG_COMMAND.MODAL_INPUT_MESSAGE,
      );
    });

    it("成功時に Ephemeral な success embed で reply が呼ばれることを確認", async () => {
      const interaction = makeInteraction();
      await memberLogSetLeaveMessageModalHandler.execute(interaction as never);
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          flags: MessageFlags.Ephemeral,
        }),
      );
      expect(mocks.createSuccessEmbed).toHaveBeenCalled();
    });

    it("成功時に logger.info が呼ばれることを確認", async () => {
      await memberLogSetLeaveMessageModalHandler.execute(
        makeInteraction() as never,
      );
      expect(mocks.loggerInfo).toHaveBeenCalled();
    });
  });
});
