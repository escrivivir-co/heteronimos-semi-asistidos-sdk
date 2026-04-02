import { describe, test, expect } from "bun:test";
import { Logger } from "../src/core/logger";

describe("Logger", () => {
  test("creates instance with scope", () => {
    const log = new Logger("test-scope");
    expect(log).toBeInstanceOf(Logger);
  });

  test("child returns new Logger with combined scope", () => {
    const parent = new Logger("parent");
    const child = parent.child("child");
    expect(child).toBeInstanceOf(Logger);
    expect(child).not.toBe(parent);
  });

  test("log methods do not throw", () => {
    const log = new Logger("safe");
    expect(() => log.info("msg")).not.toThrow();
    expect(() => log.warn("msg")).not.toThrow();
    expect(() => log.error("msg")).not.toThrow();
    expect(() => log.debug("msg")).not.toThrow();
  });

  test("log methods accept extra args", () => {
    const log = new Logger("args");
    expect(() => log.info("msg", { key: "val" }, 42)).not.toThrow();
  });
});
