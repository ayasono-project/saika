// tests/unit/bot/features/vac/commands/vacSettingsCommand.autocomplete.test.ts
import { autocompleteVacSettingsCommand } from "@/bot/features/vac/commands/vacSettingsCommand.autocomplete";
import { VAC_SETTINGS_COMMAND } from "@/bot/features/vac/commands/vacSettingsCommand.constants";

const mockRespondCategoryAutocomplete = vi.fn();
vi.mock("@/bot/utils/categoryAutocomplete", () => ({
  respondCategoryAutocomplete: (...args: unknown[]) =>
    mockRespondCategoryAutocomplete(...args),
}));

describe("bot/features/vac/commands/vacSettingsCommand.autocomplete", () => {
  it("正しいオプションでrespondCategoryAutocompleteへ委譲する", async () => {
    const interaction = { commandName: VAC_SETTINGS_COMMAND.NAME } as never;

    await autocompleteVacSettingsCommand(interaction);

    expect(mockRespondCategoryAutocomplete).toHaveBeenCalledWith(interaction, {
      commandName: VAC_SETTINGS_COMMAND.NAME,
      subcommands: [
        VAC_SETTINGS_COMMAND.SUBCOMMAND.CREATE_TRIGGER,
        VAC_SETTINGS_COMMAND.SUBCOMMAND.REMOVE_TRIGGER,
      ],
      topLocaleKey: "vac:vac-settings.remove-trigger-vc.category.top",
      topValue: VAC_SETTINGS_COMMAND.TARGET.TOP,
    });
  });
});
