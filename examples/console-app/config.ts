function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    if (name === "BOT_TOKEN") {
      throw new Error(
        [
          "Alert: BOT_TOKEN is missing.",
          "No .env was found, or BOT_TOKEN is empty.",
          "Read README.md -> 'Bot Token'.",
          "Get the token from @BotFather, then create .env from .env.example.",
        ].join(" ")
      );
    }

    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export const TOKEN = requireEnv("BOT_TOKEN");
export const SOLANA_ADDRESS = optionalEnv("SOLANA_ADDRESS");
