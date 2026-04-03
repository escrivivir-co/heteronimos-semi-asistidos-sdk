import type { CommandDefinition } from "./command-handler.js";
import type { MenuDefinition } from "./menu-handler.js";

export interface PluginHelpEntry {
  command: string;
  description: string;
}

export interface BuildPluginHelpTextOptions {
  title?: string;
  intro?: string;
  formatCommand?: (command: string) => string;
}

export function collectPluginHelpEntries(
  commands: ReadonlyArray<Pick<CommandDefinition, "command" | "description">>,
  menus: ReadonlyArray<Pick<MenuDefinition, "command" | "description">> = [],
): PluginHelpEntry[] {
  return [...commands, ...menus].map(({ command, description }) => ({ command, description }));
}

export function buildPluginHelpText(
  pluginCode: string,
  commands: ReadonlyArray<Pick<CommandDefinition, "command" | "description">>,
  menus: ReadonlyArray<Pick<MenuDefinition, "command" | "description">> = [],
  options: BuildPluginHelpTextOptions = {},
): string {
  const entries = collectPluginHelpEntries(commands, menus);
  const formatCommand = options.formatCommand ?? ((command: string) => `/${pluginCode}_${command}`);

  return [
    options.title ?? "<b>Help</b>",
    "",
    options.intro ?? "Available commands:",
    ...entries.map(({ command, description }) => `${formatCommand(command)} - ${description}`),
  ].join("\n");
}