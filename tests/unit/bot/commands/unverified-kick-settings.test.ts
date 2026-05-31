// tests/unit/bot/commands/unverified-kick-settings.test.ts

import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import { unverifiedKickSettingsCommand } from "@/bot/commands/unverified-kick-settings";

describe("bot/commands/unverified-kick-settings (definition)", () => {
  const json = unverifiedKickSettingsCommand.data.toJSON();

  it("コマンド名と ManageGuild 既定権限が設定されている", () => {
    expect(json.name).toBe("unverified-kick-settings");
    expect(json.default_member_permissions).toBe(
      PermissionFlagsBits.ManageGuild.toString(),
    );
  });

  it("19 個のサブコマンドと exempt サブコマンドグループを持つ", () => {
    const subcommands = (json.options ?? []).filter(
      (o) => o.type === ApplicationCommandOptionType.Subcommand,
    );
    const groups = (json.options ?? []).filter(
      (o) => o.type === ApplicationCommandOptionType.SubcommandGroup,
    );
    expect(subcommands).toHaveLength(19);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.name).toBe("exempt");
  });

  it("DM / キック予告メッセージの設定・削除サブコマンドを持つ", () => {
    const names = (json.options ?? []).map((o) => o.name);
    expect(names).toContain("set-dm-message");
    expect(names).toContain("clear-dm-message");
    expect(names).toContain("set-notify-message");
    expect(names).toContain("clear-notify-message");
  });

  it("通知 / ログチャンネルの設定・解除サブコマンドを持つ", () => {
    const names = (json.options ?? []).map((o) => o.name);
    expect(names).toContain("set-notify-channel");
    expect(names).toContain("clear-notify-channel");
    expect(names).toContain("set-log-channel");
    expect(names).toContain("clear-log-channel");
  });

  it("対象ロール・警告日数のサブコマンドを持つ", () => {
    const names = (json.options ?? []).map((o) => o.name);
    expect(names).toContain("set-marker-role");
    expect(names).toContain("clear-marker-role");
    expect(names).toContain("set-warn-days");
    expect(names).toContain("clear-warn-days");
  });

  it("exempt グループは add / remove / list を持つ", () => {
    const group = (json.options ?? []).find(
      (o) =>
        o.type === ApplicationCommandOptionType.SubcommandGroup &&
        o.name === "exempt",
    );
    const subNames = (
      (group as { options?: Array<{ name: string }> }).options ?? []
    ).map((s) => s.name);
    expect(subNames).toEqual(["add", "remove", "list"]);
  });

  it("set-grace-days は 1〜30 の整数オプションを持つ", () => {
    const sub = (json.options ?? []).find((o) => o.name === "set-grace-days") as
      | { options?: Array<Record<string, unknown>> }
      | undefined;
    const daysOption = sub?.options?.find((o) => o.name === "days");
    expect(daysOption?.min_value).toBe(1);
    expect(daysOption?.max_value).toBe(30);
    expect(daysOption?.required).toBe(true);
  });

  it("set-warn-days は 1〜29 の整数オプションを持つ", () => {
    const sub = (json.options ?? []).find((o) => o.name === "set-warn-days") as
      | { options?: Array<Record<string, unknown>> }
      | undefined;
    const daysOption = sub?.options?.find((o) => o.name === "days");
    expect(daysOption?.min_value).toBe(1);
    expect(daysOption?.max_value).toBe(29);
  });
});
