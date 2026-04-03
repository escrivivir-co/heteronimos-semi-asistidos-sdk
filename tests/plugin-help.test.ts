import { describe, expect, test } from "bun:test";
import { buildPluginHelpText, collectPluginHelpEntries } from "../src/index";

describe("collectPluginHelpEntries", () => {
  test("combines command and menu definitions into help entries", () => {
    const entries = collectPluginHelpEntries(
      [{ command: "aleph", description: "Describe the wave" }],
      [{ command: "menu", description: "Open options" }],
    );

    expect(entries).toEqual([
      { command: "aleph", description: "Describe the wave" },
      { command: "menu", description: "Open options" },
    ]);
  });
});

describe("buildPluginHelpText", () => {
  test("renders plugin-prefixed commands and menu entries", () => {
    const text = buildPluginHelpText(
      "rb",
      [{ command: "aleph", description: "Describe the wave" }],
      [{ command: "menu", description: "Open options" }],
    );

    expect(text).toContain("<b>Help</b>");
    expect(text).toContain("Available commands:");
    expect(text).toContain("/rb_aleph - Describe the wave");
    expect(text).toContain("/rb_menu - Open options");
  });

  test("allows custom command formatting", () => {
    const text = buildPluginHelpText(
      "rb",
      [{ command: "aleph", description: "Describe the wave" }],
      [],
      { formatCommand: (command) => `<code>/${command}</code>` },
    );

    expect(text).toContain("<code>/aleph</code> - Describe the wave");
  });
});