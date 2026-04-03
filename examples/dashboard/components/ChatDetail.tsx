import React from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../theme.js";
import type { DashboardState } from "../state.js";
import type { MessageEntry, CommandResponseEntry } from "../state.js";

interface ChatMessage {
  direction: "user" | "bot";
  chatId: number;
  username?: string;
  text: string;
  command?: string;
  timestamp: string;
}

interface Props {
  chatId: number;
  state: DashboardState;
  scrollOffset: number;
  onScroll: (delta: number) => void;
  onBack: () => void;
}

function formatTime(iso: string): string {
  return iso.slice(11, 19);
}

/** Combina mensajes de usuario y respuestas de bot en un timeline ordenado. */
function buildTimeline(state: DashboardState, chatId: number): ChatMessage[] {
  const msgs: ChatMessage[] = state.messages
    .filter((m: MessageEntry) => m.chatId === chatId)
    .map((m: MessageEntry) => ({
      direction: "user",
      chatId: m.chatId,
      username: m.username,
      text: m.text,
      timestamp: m.timestamp,
    }));

  const bots: ChatMessage[] = state.commandResponses
    .filter((r: CommandResponseEntry) => r.chatId === chatId)
    .map((r: CommandResponseEntry) => ({
      direction: "bot",
      chatId: r.chatId,
      text: r.text,
      command: r.command,
      timestamp: r.timestamp,
    }));

  return [...msgs, ...bots].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

const VISIBLE_LINES = 20;

export function ChatDetail({ chatId, state, scrollOffset, onScroll, onBack }: Props) {
  const timeline = buildTimeline(state, chatId);
  const total = timeline.length;
  const maxOffset = Math.max(0, total - VISIBLE_LINES);
  const clampedOffset = Math.min(scrollOffset, maxOffset);
  const visible = timeline.slice(clampedOffset, clampedOffset + VISIBLE_LINES);

  useInput((input, key) => {
    if (key.escape || input === "q") { onBack(); return; }
    if (key.upArrow || input === "k") onScroll(-1);
    if (key.downArrow || input === "j") onScroll(1);
  });

  return (
    <Box flexDirection="column" paddingTop={1} gap={1}>
      {/* Header */}
      <Box gap={2}>
        <Text bold color={theme.title}>{state.chatNames?.[chatId] ?? `Chat #${chatId}`}</Text>
        {state.chatNames?.[chatId] && <Text color={theme.muted} dimColor>#{chatId}</Text>}
        <Text color={theme.muted}>({total} messages)</Text>
        <Text color={theme.muted} dimColor>  [↑↓/jk] Scroll  [Esc] Back</Text>
      </Box>

      <Box flexDirection="column">
        {total === 0 && (
          <Text color={theme.muted} dimColor>No messages in this chat yet.</Text>
        )}
        {visible.map((msg, i) => (
          <Box key={`${msg.timestamp}-${i}`} gap={1}>
            <Text color={theme.muted}>{formatTime(msg.timestamp)}</Text>
            {msg.direction === "user" ? (
              <>
                <Text color={theme.primary}>{msg.username ?? `#${msg.chatId}`}:</Text>
                <Text>{msg.text}</Text>
              </>
            ) : (
              <>
                <Text color={theme.success}>🤖{msg.command ? ` [${msg.command}]` : ""}:</Text>
                <Text color={theme.muted}>{msg.text.slice(0, 80)}{msg.text.length > 80 ? "…" : ""}</Text>
              </>
            )}
          </Box>
        ))}
      </Box>

      {/* Scroll indicator */}
      {total > VISIBLE_LINES && (
        <Text color={theme.muted} dimColor>
          {clampedOffset + 1}–{Math.min(clampedOffset + VISIBLE_LINES, total)} of {total}
        </Text>
      )}
    </Box>
  );
}
