import * as readline from "readline";

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

export class Logger {
  constructor(private scope: string) {}

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[getGlobalLevel()];
  }

  info(msg: string, ...args: unknown[]) {
    if (this.shouldLog("info")) console.log(format("info", this.scope, msg, ...args));
  }

  warn(msg: string, ...args: unknown[]) {
    if (this.shouldLog("warn")) console.warn(format("warn", this.scope, msg, ...args));
  }

  error(msg: string, ...args: unknown[]) {
    if (this.shouldLog("error")) console.error(format("error", this.scope, msg, ...args));
  }

  debug(msg: string, ...args: unknown[]) {
    if (this.shouldLog("debug")) console.debug(format("debug", this.scope, msg, ...args));
  }

  child(subscope: string): Logger {
    return new Logger(`${this.scope}:${subscope}`);
  }
}

/**
 * Prompt interactivo y/n en terminal.
 */
export function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}
