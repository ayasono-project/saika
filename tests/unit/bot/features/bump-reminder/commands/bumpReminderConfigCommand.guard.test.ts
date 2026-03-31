// tests/unit/bot/features/bump-reminder/commands/bumpReminderConfigCommand.guard.test.ts

import { PermissionFlagsBits } from "discord.js";
import { ensureManageGuildPermission } from "@/bot/features/bump-reminder/commands/bumpReminderConfigCommand.guard";
import { PermissionError } from "@/shared/errors/customErrors";

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
  tInteraction: (_locale: string, key: string) => key,
}));

describe("bot/features/bump-reminder/commands/bumpReminderConfigCommand.guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ManageGuild 権限がある場合は正常に通過する", () => {
    const interaction = {
      locale: "ja",
      memberPermissions: {
        has: vi.fn(() => true),
      },
    };

    expect(() =>
      ensureManageGuildPermission(interaction as never),
    ).not.toThrow();
    expect(interaction.memberPermissions.has).toHaveBeenCalledWith(
      PermissionFlagsBits.ManageGuild,
    );
  });

  it("権限がない場合は PermissionError をスローする", () => {
    const interaction = {
      locale: "ja",
      memberPermissions: {
        has: vi.fn(() => false),
      },
    };

    expect(() => ensureManageGuildPermission(interaction as never)).toThrow(
      PermissionError,
    );
  });
});
