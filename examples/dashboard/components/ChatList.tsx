import React from "react";
import { Box, Text } from "ink";
import { theme } from "../theme.js";
import type { DashboardState } from "../state.js";

interface Props {
  state: DashboardState;
}

function formatTime(iso: string): string {
  return iso.slice(11, 19);
}

export function ChatList({ state }: Props) {
  // Construir vista por chat: último mensaje por chatId
  const lastByChat = new Map<number, (typeof state.messages)[0]>();
  for (const msg of state.messages) {
    lastByChat.set(msg.chatId, msg);
  }

  const chatIds = state.chatIds;

  return (
    <Box flexDirection="column" paddingTop={1} gap={1}>
      {/* Resumen */}
      <Box>
        <Text bold color={theme.title}>Known Chats </Text>
        <Text color={theme.muted}>({chatIds.length})</Text>
      </Box>

      {chatIds.length === 0 && (
        <Text color={theme.muted} dimColor>No chats tracked yet. Send a message to the bot.</Text>
      )}

      {/* Lista de chats */}
      {chatIds.map((chatId) => {
        const last = lastByChat.get(chatId);
        return (
          <Box key={chatId} flexDirection="column">
            <Box gap={2}>
              <Text color={theme.primary} bold>#{chatId}</Text>
              {last && (
                <>
                  <Text color={theme.muted}>{formatTime(last.timestamp)}</Text>
                  <Text color={theme.muted}>{last.username ?? "unknown"}: </Text>
                  <Text>{last.text.slice(0, 60)}{last.text.length > 60 ? "…" : ""}</Text>
                </>
              )}
              {!last && <Text color={theme.muted} dimColor>no messages yet</Text>}
            </Box>
          </Box>
        );
      })}

      {/* Stream de mensajes recientes */}
      {state.messages.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color={theme.title}>Recent Messages</Text>
          {state.messages.slice(-10).reverse().map((msg, i) => (
            <Box key={`${msg.timestamp}-${i}`} gap={1}>
              <Text color={theme.muted}>{formatTime(msg.timestamp)}</Text>
              <Text color={theme.primary}>#{msg.chatId}</Text>
              <Text color={theme.muted}>{msg.username ?? "?"}: </Text>
              <Text>{msg.text.slice(0, 60)}</Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
