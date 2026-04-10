import * as fs from "fs";
import * as path from "path";
import { RabbitBot } from "../examples/console-app/rabbit-bot";
import { SpiderBot } from "../examples/dashboard/spider-bot";
import { HorseBot } from "../examples/dashboard/horse-bot";
import type { BotPlugin } from "../src/index";
import { collectPluginFatherSettings, toBotFatherFormat, Logger } from "../src/index";
import type { MenuDefinition, MenuPage } from "../src/index";

const log = new Logger("build-docs");

// --- Plugins (misma lista que main.ts, sin TOKEN) ---
const plugins: BotPlugin[] = [
  new RabbitBot(""),
  new SpiderBot(),
  new HorseBot(),
];

const { commands, menus } = collectPluginFatherSettings(plugins);

// --- a) Lista de comandos en formato BotFather ---
let md = "# bot-father-settings\n\n";
md += "## BotFather Commands\n\n";
md += "Paste into `/setcommands`:\n\n";
md += "```\n" + toBotFatherFormat(commands) + "\n```\n\n";

// --- b) Árbol de menús ---
md += "## Menu Tree\n\n";

function isNavButton(b: any): b is { label: string; goTo: string } {
  return "goTo" in b;
}

function printMenuTree(menu: MenuDefinition): string {
  const pageMap = new Map<string, MenuPage>(menu.pages.map(p => [p.id, p]));
  const lines: string[] = [];
  lines.push(`/${menu.command}`);

  function walk(pageId: string, depth: number, visited: Set<string>) {
    const page = pageMap.get(pageId);
    if (!page) return;
    const indent = "│   ".repeat(depth);
    const branch = depth === 0 ? "└── " : "├── ";
    lines.push(`${indent}${branch}[${pageId}] ${page.text.replace(/<[^>]+>/g, "").split("\n")[0]}`);
    visited.add(pageId);
    for (const btn of page.buttons) {
      const btnIndent = "│   ".repeat(depth + 1);
      if (isNavButton(btn)) {
        lines.push(`${btnIndent}├── (${btn.label}) → ${btn.goTo}`);
        if (!visited.has(btn.goTo)) {
          walk(btn.goTo, depth + 2, new Set(visited));
        }
      } else {
        lines.push(`${btnIndent}├── (${btn.label}) → 🔗 ${btn.url}`);
      }
    }
  }

  walk(menu.entryPage, 0, new Set());
  return lines.join("\n");
}

for (const menu of menus) {
  md += "```\n" + printMenuTree(menu) + "\n```\n\n";
}

// --- Escribir bot-father-settings.md ---
const outPath = path.join(__dirname, "..", "bot-father-settings.md");
fs.writeFileSync(outPath, md, "utf-8");
log.info("bot-father-settings.md generated at " + outPath);
