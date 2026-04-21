import { describe, test, expect } from "bun:test";
import { RabbitBot } from "../examples/dashboard/rabbit-bot";

describe("Dashboard RabbitBot auto-ack", () => {
  test("is disabled by default", () => {
    const bot = new RabbitBot("SOL_TEST_ADDRESS", "/tmp");
    const reply = bot.onMessage({ from: { first_name: "Didac" }, message: { text: "hola" } });
    expect(reply).toBe("");
  });

  test("uses env-style template when enabled", () => {
    const bot = new RabbitBot("SOL_TEST_ADDRESS", "/tmp", {
      enabled: true,
      template: "Mensaje recibido de {sender}. Contenido: {size} caracteres. -- RabbitBot · BotHubSDK Scriptorium",
    });
    const reply = bot.onMessage({ from: { first_name: "Didac" }, message: { text: "abcdef" } });
    expect(reply).toContain("Didac");
    expect(reply).toContain("6 caracteres");
    expect(reply).toContain("RabbitBot · BotHubSDK Scriptorium");
  });
});