import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  MockTelegramBot,
  registerPlugins,
  ChatTracker,
  MemoryChatStore,
  RuntimeEmitter,
} from "../src/index";
import { RabbitBot } from "../examples/dashboard/rabbit-bot";

function setupBot(appDir: string) {
  const emitter = new RuntimeEmitter();
  const store = new MemoryChatStore();
  const tracker = new ChatTracker(store, emitter);
  const rabbit = new RabbitBot(undefined, appDir);
  const mockBot = new MockTelegramBot({ emitter });

  registerPlugins(mockBot as any, [rabbit], tracker, emitter);
  rabbit.setBroadcast((msg: string) => tracker.broadcast(mockBot as any, msg));

  return { mockBot, tracker };
}

describe("aleph summary — file reading", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aleph-summary-"));
    fs.mkdirSync(path.join(tmpDir, "userdata"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns warning when summary.md does not exist", async () => {
    const { mockBot } = setupBot(tmpDir);
    const msgs = await mockBot.simulateCommand("rb_alephs");
    expect(msgs).toHaveLength(1);
    expect(msgs[0].text).toContain("No summary file found");
  });

  test("reads summary.md and broadcasts content", async () => {
    fs.writeFileSync(path.join(tmpDir, "userdata", "summary.md"), "Resumen corto");
    const { mockBot } = setupBot(tmpDir);
    const msgs = await mockBot.simulateCommand("rb_alephs");
    const reply = msgs.find((m) => m.text.includes("Summary broadcast sent"));
    expect(reply).toBeDefined();
    expect(reply!.text).toContain("1 message(s)");
    expect(reply!.text).toContain("archived as summary-");
  });

  test("splits summary.md by --- into multiple messages", async () => {
    const content = "Bloque A\n---\nBloque B";
    fs.writeFileSync(path.join(tmpDir, "userdata", "summary.md"), content);
    const { mockBot } = setupBot(tmpDir);
    await mockBot.simulateCommand("rb_alephs");
    const all = mockBot.getSentMessages();
    expect(all.some((m) => m.text === "Bloque A")).toBe(true);
    expect(all.some((m) => m.text === "Bloque B")).toBe(true);
  });
});

describe("aleph summary — archive on send", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aleph-summary-"));
    fs.mkdirSync(path.join(tmpDir, "userdata"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("archives summary.md to summary-history after successful send", async () => {
    fs.writeFileSync(path.join(tmpDir, "userdata", "summary.md"), "Resumen enviado");
    const { mockBot } = setupBot(tmpDir);
    await mockBot.simulateCommand("rb_alephs");

    const historyDir = path.join(tmpDir, "userdata", "summary-history");
    expect(fs.existsSync(historyDir)).toBe(true);
    const files = fs.readdirSync(historyDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^summary-\d{4}-\d{2}-\d{2}T.*\.md$/);
  });

  test("summary.md is replaced with template after send", async () => {
    fs.writeFileSync(path.join(tmpDir, "userdata", "summary.md"), "Resumen real");
    const { mockBot } = setupBot(tmpDir);
    await mockBot.simulateCommand("rb_alephs");

    const after = fs.readFileSync(path.join(tmpDir, "userdata", "summary.md"), "utf-8");
    expect(after).toContain("<!-- SUMMARY TEMPLATE -->");
    expect(after).toContain("Resume userdata/history/");
  });
});