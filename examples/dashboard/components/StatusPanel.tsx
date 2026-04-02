import React from "react";
import { Box, Text } from "ink";
import { theme } from "../theme.js";
import type { DashboardState } from "../state.js";

interface Props {
  state: DashboardState;
}

function formatUptime(startedAt: Date | null): string {
  if (!startedAt) return "—";
  const secs = Math.floor((Date.now() - startedAt.getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
}

const STATUS_COLOR: Record<DashboardState["botStatus"], (typeof theme)[keyof typeof theme]> = {
  starting: theme.warning,
  running:  theme.success,
  stopped:  theme.muted,
  error:    theme.error,
};

export function StatusPanel({ state }: Props) {
  return (
    <Box flexDirection="column" gap={1} paddingTop={1}>
      {/* Warning de configuración */}
      {state.mockMode && !state.tokenConfigured && (
        <Box borderStyle="round" borderColor={theme.warning} paddingX={1} flexDirection="column">
          <Text bold color={theme.warning}>⚠  Running in MOCK mode</Text>
          {!state.envFileExists ? (
            <Text color={theme.muted}>
              No .env file found. Go to <Text bold color={theme.primary}>[4] Config</Text> to create one from template.
            </Text>
          ) : (
            <Text color={theme.muted}>
              Set <Text bold>BOT_TOKEN</Text> in .env and restart to connect to Telegram.
            </Text>
          )}
        </Box>
      )}

      {/* Estado del bot */}
      <Box flexDirection="column">
        <Text bold color={theme.title}>Bot Status</Text>
        <Box gap={2}>
          <Text color={STATUS_COLOR[state.botStatus]}>
            ● {state.botStatus.toUpperCase()}
          </Text>
          <Text color={theme.muted}>uptime: </Text>
          <Text color={theme.primary}>{formatUptime(state.startedAt)}</Text>
        </Box>
      </Box>

      {/* Estadísticas */}
      <Box flexDirection="column">
        <Text bold color={theme.title}>Stats</Text>
        <Box gap={3}>
          <Text color={theme.muted}>
            chats: <Text color={theme.primary}>{state.chatIds.length}</Text>
          </Text>
          <Text color={theme.muted}>
            commands: <Text color={theme.primary}>{state.commandCount}</Text>
          </Text>
          <Text color={theme.muted}>
            plugins: <Text color={theme.primary}>{state.plugins.length}</Text>
          </Text>
        </Box>
      </Box>

      {/* Lista de plugins */}
      {state.plugins.length > 0 && (
        <Box flexDirection="column">
          <Text bold color={theme.title}>Plugins</Text>
          {state.plugins.map((p) => (
            <Box key={p.pluginCode} gap={2}>
              <Text color={theme.primary}>[{p.pluginCode}]</Text>
              <Text>{p.name}</Text>
              <Text color={theme.muted}>({p.commandCount} cmds)</Text>
            </Box>
          ))}
        </Box>
      )}

      {state.plugins.length === 0 && (
        <Text color={theme.muted} dimColor>Waiting for plugins to register...</Text>
      )}
    </Box>
  );
}
