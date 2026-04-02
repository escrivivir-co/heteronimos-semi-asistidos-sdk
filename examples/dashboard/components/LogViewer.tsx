import React from "react";
import { Box, Text, useInput } from "ink";
import { theme, LOG_LEVEL_COLOR } from "../theme.js";
import type { DashboardState, LogEntry } from "../state.js";

type LevelFilter = "all" | "debug" | "info" | "warn" | "error";

interface Props {
  state: DashboardState;
}

function formatTime(iso: string): string {
  return iso.slice(11, 19); // HH:MM:SS
}

export function LogViewer({ state }: Props) {
  const [filter, setFilter] = React.useState<LevelFilter>("all");
  const [offset, setOffset] = React.useState(0);
  const VISIBLE_LINES = 20;

  useInput((input, key) => {
    if (input === "d") setFilter("debug");
    if (input === "i") setFilter("info");
    if (input === "w") setFilter("warn");
    if (input === "e") setFilter("error");
    if (input === "a") setFilter("all");
    if (key.upArrow) setOffset(o => o + 1);
    if (key.downArrow) setOffset(o => Math.max(0, o - 1));
  });

  const filtered: LogEntry[] = filter === "all"
    ? state.logs
    : state.logs.filter(l => l.level === filter);

  // offset=0 → tail (más recientes). offset>0 → scroll hacia atrás.
  const total = filtered.length;
  const endIdx = Math.max(0, total - offset);
  const startIdx = Math.max(0, endIdx - VISIBLE_LINES);
  const visible = filtered.slice(startIdx, endIdx);

  const filterLabels: Array<[LevelFilter, string]> = [
    ["all", "a=all"],
    ["debug", "d=debug"],
    ["info", "i=info"],
    ["warn", "w=warn"],
    ["error", "e=error"],
  ];

  return (
    <Box flexDirection="column" paddingTop={1}>
      {/* Toolbar de filtros */}
      <Box gap={2} marginBottom={1}>
        <Text bold color={theme.title}>Log Filter: </Text>
        {filterLabels.map(([level, label]) => (
          <Text
            key={level}
            color={filter === level ? theme.primary : theme.muted}
            bold={filter === level}
          >
            [{label}]
          </Text>
        ))}
        <Text color={theme.muted}>  ↑↓ scroll</Text>
      </Box>

      {/* Líneas de log */}
      {visible.length === 0 && (
        <Text color={theme.muted} dimColor>No log entries.</Text>
      )}
      {visible.map((entry, i) => (
        <Box key={`${entry.timestamp}-${i}`} gap={1}>
          <Text color={theme.muted}>{formatTime(entry.timestamp)}</Text>
          <Text color={LOG_LEVEL_COLOR[entry.level]} bold>
            {entry.level.toUpperCase().padEnd(5)}
          </Text>
          <Text color={theme.muted}>[{entry.scope}]</Text>
          <Text>{entry.message}</Text>
        </Box>
      ))}

      {/* Indicador de posición */}
      {total > VISIBLE_LINES && (
        <Text color={theme.muted} dimColor>
          {startIdx + 1}–{endIdx} of {total}
          {offset === 0 ? " (tail)" : ""}
        </Text>
      )}
    </Box>
  );
}
