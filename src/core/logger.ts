import * as process from "node:process";
import * as readline from "node:readline";
import type { RuntimeEmitter } from "./runtime-emitter.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info:  1,
  warn:  2,
  error: 3,
};

const COLORS: Record<LogLevel, string> = {
  debug: "\x1b[90m",  // gray
  info:  "\x1b[36m",  // cyan
  warn:  "\x1b[33m",  // yellow
  error: "\x1b[31m",  // red
};
const RESET = "\x1b[0m";

function getGlobalLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL || "info").toLowerCase();
  if (env in LEVEL_PRIORITY) return env as LogLevel;
  return "info";
}

function timestamp(): string {
  return new Date().toISOString();
}

function format(level: LogLevel, scope: string, msg: string, ...args: unknown[]): string {
  const color = COLORS[level];
  const extra = args.length ? " " + args.map(a => JSON.stringify(a)).join(" ") : "";
  return `${color}[${timestamp()}] [${level.toUpperCase()}] [${scope}]${RESET} ${msg}${extra}`;
}

export interface LoggerOptions {
  level?: LogLevel;
  transport?: (formatted: string) => void;
  colors?: boolean;
  emitter?: RuntimeEmitter;
}

export class Logger {
  private options: LoggerOptions;

  constructor(private scope: string, options?: LoggerOptions) {
    this.options = options ?? {};
  }

  private getLevel(): LogLevel {
    return this.options.level ?? getGlobalLevel();
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.getLevel()];
  }

  private output(level: LogLevel, consoleMethod: (...a: unknown[]) => void, msg: string, ...args: unknown[]) {
    if (!this.shouldLog(level)) return;
    const ts = timestamp();
    const useColors = this.options.colors ?? true;
    const formatted = useColors
      ? format(level, this.scope, msg, ...args)
      : `[${ts}] [${level.toUpperCase()}] [${this.scope}] ${msg}${args.length ? " " + args.map(a => JSON.stringify(a)).join(" ") : ""}`;
    if (this.options.transport) {
      this.options.transport(formatted);
    } else {
      consoleMethod(formatted);
    }
    this.options.emitter?.emit({
      type: "log",
      level,
      scope: this.scope,
      message: args.length ? `${msg} ${args.map(a => JSON.stringify(a)).join(" ")}` : msg,
      timestamp: ts,
    });
  }

  info(msg: string, ...args: unknown[]) {
    this.output("info", console.log, msg, ...args);
  }

  warn(msg: string, ...args: unknown[]) {
    this.output("warn", console.warn, msg, ...args);
  }

  error(msg: string, ...args: unknown[]) {
    this.output("error", console.error, msg, ...args);
  }

  debug(msg: string, ...args: unknown[]) {
    this.output("debug", console.debug, msg, ...args);
  }

  child(subscope: string): Logger {
    return new Logger(`${this.scope}:${subscope}`, this.options);
  }
}

/**
 * Prompt interactivo y/n en terminal.
 *
 * readline.close() pausa process.stdin y lo desreferencia del event loop.
 * Restauramos ambos aquí para que consumidores TUI (Ink) puedan tomar
 * stdin en raw mode después de que bootBot() termine.
 */
export function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} (y/n): `, (answer: string) => {
      rl.close();
      // Restaurar stdin — rl.close() lo pausa y puede desreferienciarlo
      if (process.stdin.isPaused()) process.stdin.resume();
      if (typeof (process.stdin as any).ref === "function") (process.stdin as any).ref();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}
