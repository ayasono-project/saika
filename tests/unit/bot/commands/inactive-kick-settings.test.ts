// tests/unit/bot/commands/inactive-kick-settings.test.ts

import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import { inactiveKickSettingsCommand } from "@/bot/commands/inactive-kick-settings";

describe("bot/commands/inactive-kick-settings (definition)", () => {
  const json = inactiveKickSettingsCommand.data.toJSON();

  it("コマンド名と ManageGuild 既定権限が設定されている", () => {
    expect(json.name).toBe("inactive-kick-settings");
    expect(json.default_member_permissions).toBe(
      PermissionFlagsBits.ManageGuild.toString(),
    );
  });

  it("13 個のサブコマンドと whitelist サブコマンドグループを持つ", () => {
    const subcommands = (json.options ?? []).filter(
      (o) => o.type === ApplicationCommandOptionType.Subcommand,
    );
    const groups = (json.options ?? []).filter(
      (o) => o.type === ApplicationCommandOptionType.SubcommandGroup,
    );
    expect(subcommands).toHaveLength(13);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.name).toBe("whitelist");
  });

  it("whitelist グループは add / remove / list を持つ", () => {
    const group = (json.options ?? []).find(
      (o) =>
        o.type === ApplicationCommandOptionType.SubcommandGroup &&
        o.name === "whitelist",
    );
    const subNames = (
      (group as { options?: Array<{ name: string }> }).options ?? []
    ).map((s) => s.name);
    expect(subNames).toEqual(["add", "remove", "list"]);
  });

  it("set-threshold は 14〜365 の整数オプションを持つ", () => {
    const sub = (json.options ?? []).find((o) => o.name === "set-threshold") as
      | { options?: Array<Record<string, unknown>> }
      | undefined;
    const daysOption = sub?.options?.find((o) => o.name === "days");
    expect(daysOption?.min_value).toBe(14);
    expect(daysOption?.max_value).toBe(365);
    expect(daysOption?.required).toBe(true);
  });
});
