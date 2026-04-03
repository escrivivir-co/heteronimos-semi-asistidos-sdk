/**
 * aiml-bot-plugin.ts — Clase base abstracta con pipeline de intención.
 *
 * Nivel 2 de la jerarquía:
 *   BotPlugin (interface) → AimlBotPlugin (abstract) → MyBot (app)
 *
 * El author define:
 *   categories()  → cómo clasificar inputs en IntentResult
 *   handlers()    → cómo procesar cada IntentResult en texto
 *   defaultVars() → estado inicial de sesión
 *
 * Pipeline:
 *   onMessage → IntentEngine.classify() → IntentResult
 *             → handlers[] (primero non-undefined gana)
 *             → fallbackResponse() si nadie responde
 *             → engine.recordResponse()
 *             → return texto
 */

import type { BotPlugin } from "./bot-handler.js";
import type { CommandDefinition } from "./command-handler.js";
import type { MenuDefinition } from "./menu-handler.js";
import type {
  AimlCategory,
  IntentEngineOptions,
  IntentHandler,
  IntentResult,
  MessageContext,
  SessionVars,
} from "./aiml-types.js";
import { IntentEngine } from "./intent-engine.js";

export abstract class AimlBotPlugin<TVars extends SessionVars = SessionVars>
  implements BotPlugin
{
  abstract name: string;
  abstract pluginCode: string;

  constructor(options?: IntentEngineOptions) {
    this._engineOptions = options;
  }

  private _engineOptions?: IntentEngineOptions;
  private _engine?: IntentEngine<TVars>;

  protected get engine_(): IntentEngine<TVars> {
    if (!this._engine) {
      this._engine = new IntentEngine(
        this.categories(),
        this.defaultVars(),
        this._engineOptions,
      );
    }
    return this._engine;
  }

  /** Categorías (pattern → intent). Override en la subclase. */
  abstract categories(): AimlCategory<TVars>[];

  /** Variables iniciales por chat. Override en la subclase. */
  abstract defaultVars(): TVars;

  /**
   * Handlers de intención (stage 2).
   * Evalúan en orden — el primero que devuelve string gana.
   * Default: vacío (solo fallbackResponse).
   * Las subclases pueden hacer super.handlers() y concatenar los propios.
   */
  handlers(): IntentHandler<TVars>[] {
    return [];
  }

  /**
   * Respuesta cuando ningún handler responde.
   * Override para customizar.
   */
  fallbackResponse(_intent: IntentResult, _ctx: MessageContext): string {
    return "";
  }

  /**
   * Comandos base provistos por AimlBotPlugin.
   * Incluye /reset. Las subclases concatenan: [...super.commands(), ...own]
   */
  commands(): CommandDefinition[] {
    return [
      {
        command: "reset",
        description: "Reset conversation state",
        buildText: (ctx: any) => {
          const chatId = ctx.chat?.id ?? 0;
          this.engine_.resetChat(chatId);
          return "Conversation state reset.";
        },
      },
    ];
  }

  menus(): MenuDefinition[] {
    return [];
  }

  /**
   * Pipeline completo: classify → dispatch handlers → record response.
   *
   * SDS-18 §9.1: Filtra self-messages (bot no procesa sus propios envíos).
   */
  async onMessage(ctx: any): Promise<string> {
    // Filtro self-message: si el from.id del mensaje es el propio bot, ignorar.
    // Esto evita bucles cuando el bot ve sus propios mensajes en el grupo.
    if (ctx?.from?.is_bot && ctx?.me && ctx.from.id === ctx.me.id) {
      return "";
    }

    const msgCtx: MessageContext = {
      chatId: ctx?.chat?.id ?? 0,
      userId: ctx?.from?.id,
      username: ctx?.from?.username,
      text: ctx?.message?.text ?? ctx?.text ?? "",
      timestamp: new Date(),
      raw: ctx,
    };

    // Stage 1: input → IntentResult
    const intent = await this.engine_.classify(msgCtx);

    // Stage 2: handlers[]
    const state = this.engine_.getState(msgCtx.chatId);
    const vars: TVars = state?.vars ?? this.defaultVars();
    let response: string | undefined;

    for (const handler of this.handlers()) {
      response = await handler(intent, vars, msgCtx);
      if (response !== undefined) break;
    }

    const finalResponse = response ?? this.fallbackResponse(intent, msgCtx);

    // Registrar respuesta para continuidad (history + lastBotResponse)
    this.engine_.recordResponse(msgCtx.chatId, intent, finalResponse);

    return finalResponse;
  }
}
