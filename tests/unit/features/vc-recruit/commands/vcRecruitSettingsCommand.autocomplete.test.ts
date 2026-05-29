// tests/unit/bot/features/vc-recruit/commands/vcRecruitSettingsCommand.autocomplete.test.ts
import { autocompleteVcRecruitSettingsCommand } from "@/features/vc-recruit/commands/vcRecruitSettingsCommand.autocomplete";
import { VC_RECRUIT_SETTINGS_COMMAND } from "@/features/vc-recruit/commands/vcRecruitSettingsCommand.constants";

const mockRespondCategoryAutocomplete = vi.fn();
vi.mock("@/bot/utils/categoryAutocomplete", () => ({
  respondCategoryAutocomplete: (...args: unknown[]) =>
    mockRespondCategoryAutocomplete(...args),
}));

describe("bot/features/vc-recruit/commands/vcRecruitSettingsCommand.autocomplete", () => {
  it("正しいオプションで respondCategoryAutocomplete に処理を委譲する", async () => {
    const interaction = {
      commandName: VC_RECRUIT_SETTINGS_COMMAND.NAME,
    } as never;

    await autocompleteVcRecruitSettingsCommand(interaction);

    expect(mockRespondCategoryAutocomplete).toHaveBeenCalledWith(interaction, {
      commandName: VC_RECRUIT_SETTINGS_COMMAND.NAME,
      subcommands: [VC_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.SETUP],
      topLocaleKey: "vcRecruit:vc-recruit-settings.setup.category.top",
      topValue: VC_RECRUIT_SETTINGS_COMMAND.TARGET.TOP,
    });
  });
});
