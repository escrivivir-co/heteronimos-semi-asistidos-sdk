import React from "react";
import { Box, Text, useInput } from "ink";
import { copyFileSync } from "node:fs";
import * as path from "node:path";
import { theme } from "../theme.js";
import type { DashboardState } from "../state.js";
import type { Store } from "heteronimos-semi-asistidos-sdk";

interface Props {
  state: DashboardState;
  store: Store<DashboardState>;
}

export function ConfigPanel({ state, store }: Props) {
  const [feedback, setFeedback] = React.useState<string | null>(null);

  useInput((input) => {
    if (input === "c" && !state.envFileExists && state.envExampleExists) {
      try {
        const src = path.join(state.appDir, ".env.example");
        const dst = path.join(state.appDir, ".env");
        copyFileSync(src, dst);
        store.setState((s) => ({ ...s, envFileExists: true }));
        setFeedback("✔ .env created from template. Edit BOT_TOKEN and restart.");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setFeedback(`✗ Failed: ${msg}`);
      }
    }
  });

  return (
    <Box flexDirection="column" gap={1} paddingTop={1}>
      <Text bold color={theme.title}>Connection</Text>
      <Box flexDirection="column">
        <Box gap={2}>
          <Text color={theme.muted}>Mode:</Text>
          {state.mockMode ? (
            <Text color={theme.warning}>● MOCK</Text>
          ) : (
            <Text color={theme.success}>● TELEGRAM</Text>
          )}
        </Box>
        <Box gap={2}>
          <Text color={theme.muted}>BOT_TOKEN:</Text>
          {state.tokenConfigured ? (
            <Text color={theme.success}>configured</Text>
          ) : (
            <Text color={theme.error}>not set</Text>
          )}
        </Box>
        <Box gap={2}>
          <Text color={theme.muted}>.env:</Text>
          {state.envFileExists ? (
            <Text color={theme.success}>exists</Text>
          ) : (
            <Text color={theme.error}>missing</Text>
          )}
        </Box>
      </Box>

      {/* Acción: crear .env desde template */}
      {!state.envFileExists && state.envExampleExists && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color={theme.warning}>⚠ No .env file found</Text>
          <Text color={theme.muted}>
            Press <Text bold color={theme.primary}>[c]</Text> to create .env from .env.example template
          </Text>
        </Box>
      )}

      {/* Feedback de la acción */}
      {feedback && (
        <Box marginTop={1}>
          <Text color={feedback.startsWith("✔") ? theme.success : theme.error}>{feedback}</Text>
        </Box>
      )}

      {/* Instrucciones para conectar */}
      {state.mockMode && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color={theme.title}>Connect to Telegram</Text>
          <Text color={theme.muted}>
            1. Get a token from @BotFather on Telegram
          </Text>
          <Text color={theme.muted}>
            2. Edit .env in this directory:
          </Text>
          <Text color={theme.primary}>   BOT_TOKEN=your_token_here</Text>
          <Text color={theme.muted}>
            3. Restart the dashboard
          </Text>
        </Box>
      )}

      <Box flexDirection="column" marginTop={1}>
        <Text bold color={theme.title}>Environment</Text>
        <Box gap={2}>
          <Text color={theme.muted}>MOCK_MODE:</Text>
          <Text color={theme.primary}>{process.env.MOCK_MODE || "unset"}</Text>
        </Box>
        <Box gap={2}>
          <Text color={theme.muted}>LOG_LEVEL:</Text>
          <Text color={theme.primary}>{process.env.LOG_LEVEL || "info"}</Text>
        </Box>
        <Box gap={2}>
          <Text color={theme.muted}>App dir:</Text>
          <Text color={theme.primary}>{state.appDir}</Text>
        </Box>
      </Box>
    </Box>
  );
}
