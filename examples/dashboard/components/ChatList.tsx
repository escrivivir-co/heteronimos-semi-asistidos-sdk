import React from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../theme.js";
import type { DashboardState } from "../state.js";
import type { MessageEntry } from "../state.js";

interface Props {
  state: DashboardState;
  cursorIndex: number;
  onMove: (delta: number) => void;
  onSelect: (chatId: number) => void;
}

function formatTime(iso: string): string {
  return iso.slice(11, 19);
}

/** Último mensaje de cada chat, ordenado por timestamp desc. */
function buildThreads(state: DashboardState): { chatId: number; last: MessageEntry | null }[] {
  const lastByChat = new Map<number, MessageEntry>();
  for (const msg of state.messages) {
    const prev = lastByChat.get(msg.chatId);
    if (!prev || msg.timestamp > prev.timestamp) lastByChat.set(msg.chatId, msg);
  }
  // Ordenar chatIds por timestamp del último mensaje (más reciente primero)
  return [...state.chatIds]
    .sort((a, b) => {
      const ta = lastByChat.get(a)?.timestamp ?? "";
      const tb = lastByChat.get(b)?.timestamp ?? "";
      return tb.localeCompare(ta);
    })
    .map((chatId) => ({ chatId, last: lastByChat.get(chatId) ?? null }));
}

export function ChatList({ state, cursorIndex, onMove, onSelect }: Props) {
  const threads = buildThreads(state);
  const clamped = threads.length > 0 ? Math.min(cursorIndex, threads.length - 1) : 0;

  useInput((input, key) => {
    if (threads.length === 0) return;
    if (key.upArrow || input === "k") onMove(-1);
    if (key.downArrow || input === "j") onMove(1);
    if (key.return) {
      const t = threads[clamped];
      if (t) onSelect(t.chatId);
    }
  });

  return (
    <Box flexDirection="column" paddingTop={1} gap={1}>
      <Box gap={1}>
        <Text bold color={theme.title}>Known Chats</Text>
        <Text color={theme.muted}>({threads.length})</Text>
        <Text color={theme.muted} dimColor>  [↑↓/jk] Navigate  [Enter] Open</Text>
      </Box>

      {threads.length === 0 && (
        <Text color={theme.muted} dimColor>No chats tracked yet. Send a message to the bot.</Text>
      )}

      {threads.map(({ chatId, last }, idx) => {
        const selected = idx === clamped;
        const name = state.chatNames?.[chatId];
        return (
          <Box key={chatId} gap={2}>
            <Text color={selected ? theme.primary : theme.muted}>{selected ? "▶" : " "}</Text>
            <Box flexDirection="column">
              <Text color={theme.primary} bold={selected}>{name ?? `#${chatId}`}</Text>
              {name && <Text color={theme.muted} dimColor>{chatId}</Text>}
            </Box>
            {last ? (
              <>
                <Text color={theme.muted}>{formatTime(last.timestamp)}</Text>
                <Text color={theme.muted}>{last.username ?? "?"}: </Text>
                <Text color={selected ? "white" : theme.muted}>
                  {last.text.slice(0, 50)}{last.text.length > 50 ? "…" : ""}
                </Text>
              </>
            ) : (
              <Text color={theme.muted} dimColor>no messages yet</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
