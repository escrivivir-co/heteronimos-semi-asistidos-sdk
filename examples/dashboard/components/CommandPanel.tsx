import React from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../theme.js";
import type { DashboardState } from "../state.js";

interface Props {
  state: DashboardState;
}

function formatTime(iso: string): string {
  return iso.slice(11, 19);
}

export function CommandPanel({ state }: Props) {
  const { plugins, commandResponses, executeCommand, mockMode } = state;

  // Flatten all plugin commands into a selectable list.
  // commands[].command already has the pluginCode prefix (e.g. "rb_aleph").
  const allCommands: { display: string; full: string }[] = [];
  for (const plugin of plugins) {
    for (const cmd of plugin.commands ?? []) {
      allCommands.push({ display: `/${cmd.command}`, full: cmd.command });
    }
  }

  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const [running, setRunning] = React.useState(false);
  const [lastError, setLastError] = React.useState<string | null>(null);

  // Keep selection in bounds when commands change
  const clampedIdx = allCommands.length > 0
    ? Math.min(selectedIdx, allCommands.length - 1)
    : 0;

  useInput((input, key) => {
    if (!executeCommand) return;

    if ((key.upArrow || input === "k") && clampedIdx > 0) {
      setSelectedIdx(clampedIdx - 1);
    }
    if ((key.downArrow || input === "j") && clampedIdx < allCommands.length - 1) {
      setSelectedIdx(clampedIdx + 1);
    }
    if (key.return && allCommands.length > 0 && !running) {
      const cmd = allCommands[clampedIdx];
      if (!cmd) return;
      setRunning(true);
      setLastError(null);
      executeCommand(cmd.full)
        .then(() => { setRunning(false); })
        .catch((err: unknown) => {
          setRunning(false);
          setLastError(err instanceof Error ? err.message : String(err));
        });
    }
  });

  if (!executeCommand) {
    return (
      <Box flexDirection="column" paddingTop={1} gap={1}>
        <Text bold color={theme.title}>Command Execution</Text>
        <Text color={theme.muted} dimColor>
          Bot not started. Command execution will be available once the bot is running.
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingTop={1} gap={1}>
      <Box gap={2}>
        <Text bold color={theme.title}>Commands</Text>
        <Text color={theme.muted}>({allCommands.length} registered)</Text>
        {running && <Text color={theme.warning}>running…</Text>}
      </Box>

      {!mockMode && (
        <Text color={theme.muted} dimColor>Local execution — no messages sent to Telegram.</Text>
      )}

      {allCommands.length === 0 && (
        <Text color={theme.muted} dimColor>No commands registered yet.</Text>
      )}

      {/* Command list */}
      {allCommands.length > 0 && (
        <Box flexDirection="column">
          <Text color={theme.muted}>↑↓ / j·k to select · Enter to execute</Text>
          {allCommands.map((cmd, i) => (
            <Box key={cmd.full} gap={1}>
              <Text color={i === clampedIdx ? theme.primary : theme.muted} bold={i === clampedIdx}>
                {i === clampedIdx ? "▶" : " "} {cmd.display}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {lastError && (
        <Box marginTop={1}>
          <Text color={theme.error}>Error: {lastError}</Text>
        </Box>
      )}

      {/* Response log */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold color={theme.title}>
          Responses <Text color={theme.muted}>({commandResponses.length})</Text>
        </Text>
        {commandResponses.length === 0 && (
          <Text color={theme.muted} dimColor>No responses yet. Execute a command above.</Text>
        )}
        {commandResponses.slice(-20).reverse().map((r, i) => (
          <Box key={`${r.timestamp}-${i}`} gap={1}>
            <Text color={theme.muted}>{formatTime(r.timestamp)}</Text>
            <Text color={theme.primary}>/{r.command}</Text>
            <Text>→</Text>
            <Text>{r.text.slice(0, 80)}{r.text.length > 80 ? "…" : ""}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
