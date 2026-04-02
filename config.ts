function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
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