import { Bot, InlineKeyboard } from "grammy";

/** Botón que navega a otra página del menú */
export interface NavButton {
  label: string;
  goTo: string; // id de la página destino
}

/** Botón que abre una URL */
export interface UrlButton {
  label: string;
  url: string;
}

export type MenuButton = NavButton | UrlButton;

function isNavButton(b: MenuButton): b is NavButton {
  return "goTo" in b;
}

/** Una página del menú inline */
export interface MenuPage {
  id: string;
  text: string;
  buttons: MenuButton[];
}

/** Definición declarativa de un menú paginado */
export interface MenuDefinition {
  command: string;
  description: string;
  entryPage: string;
  pages: MenuPage[];
}

function buildKeyboard(page: MenuPage, prefix: string): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const btn of page.buttons) {
    if (isNavButton(btn)) {
      kb.text(btn.label, `${prefix}:${btn.goTo}`);
    } else {
      kb.text(btn.label, btn.url);
    }
  }
  return kb;
}

/**
 * Registra un menú paginado completo en el bot:
 *  - Comando que abre la página de entrada
 *  - CallbackQuery para cada botón de navegación entre páginas
 */
export function registerMenu(bot: Bot, menu: MenuDefinition) {
  const prefix = `menu_${menu.command}`;
  const pageMap = new Map(menu.pages.map(p => [p.id, p]));

  // Comando que abre el menú
  bot.command(menu.command, async (ctx) => {
    const entry = pageMap.get(menu.entryPage);
    if (!entry) return;
    await ctx.reply(entry.text, {
      parse_mode: "HTML",
      reply_markup: buildKeyboard(entry, prefix),
    });
  });

  // Registra callbacks de navegación para cada página
  for (const page of menu.pages) {
    for (const btn of page.buttons) {
      if (!isNavButton(btn)) continue;
      const target = pageMap.get(btn.goTo);
      if (!target) continue;
      bot.callbackQuery(`${prefix}:${btn.goTo}`, async (ctx) => {
        await ctx.editMessageText(target.text, {
          parse_mode: "HTML",
          reply_markup: buildKeyboard(target, prefix),
        });
      });
    }
  }
}