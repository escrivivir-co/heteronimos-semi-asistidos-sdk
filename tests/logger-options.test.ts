import { describe, test, expect } from "bun:test";
import { Logger } from "../src/index";

describe("Logger with LoggerOptions", () => {
  test("accepts level override", () => {
    const log = new Logger("test", { level: "error" });
    // Should not throw
    expect(() => log.info("suppressed")).not.toThrow();
    expect(() => log.error("visible")).not.toThrow();
  });

  test("accepts custom transport", () => {
    const messages: string[] = [];
    const log = new Logger("transport", {
      transport: (msg) => messages.push(msg),
    });
    log.info("hello");
    expect(messages.length).toBe(1);
    expect(messages[0]).toContain("hello");
    expect(messages[0]).toContain("[transport]");
  });

  test("transport receives all levels", () => {
    const messages: string[] = [];
    const log = new Logger("all", {
      level: "debug",
      transport: (msg) => messages.push(msg),
    });
    log.debug("d");
    log.info("i");
    log.warn("w");
    log.error("e");
    expect(messages.length).toBe(4);
  });

  test("level option suppresses lower levels", () => {
    const messages: string[] = [];
    const log = new Logger("filtered", {
      level: "warn",
      transport: (msg) => messages.push(msg),
    });
    log.debug("no");
    log.info("no");
    log.warn("yes");
    log.error("yes");
    expect(messages.length).toBe(2);
  });

  test("colors false produces plain output", () => {
    const messages: string[] = [];
    const log = new Logger("plain", {
      colors: false,
      transport: (msg) => messages.push(msg),
    });
    log.info("test");
    // Should not contain ANSI escape codes
    expect(messages[0]).not.toContain("\x1b[");
  });

  test("child inherits options", () => {
    const messages: string[] = [];
    const parent = new Logger("parent", {
      level: "debug",
      transport: (msg) => messages.push(msg),
    });
    const child = parent.child("sub");
    child.debug("from child");
    expect(messages.length).toBe(1);
    expect(messages[0]).toContain("[parent:sub]");
  });
});
