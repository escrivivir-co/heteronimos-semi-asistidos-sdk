import React from "react";
import { ChatList } from "./ChatList.js";
import { ChatDetail } from "./ChatDetail.js";
import type { DashboardState } from "../state.js";

interface Props {
  state: DashboardState;
}

export function ChatPanel({ state }: Props) {
  const [selectedChat, setSelectedChat] = React.useState<number | null>(null);
  const [cursorIndex, setCursorIndex] = React.useState(0);
  const [scrollOffset, setScrollOffset] = React.useState(0);

  const handleMove = (delta: number) => {
    const max = state.chatIds.length - 1;
    setCursorIndex((prev) => Math.max(0, Math.min(max, prev + delta)));
  };

  const handleSelect = (chatId: number) => {
    setSelectedChat(chatId);
    setScrollOffset(0);
  };

  const handleBack = () => {
    setSelectedChat(null);
  };

  const handleScroll = (delta: number) => {
    setScrollOffset((prev) => Math.max(0, prev + delta));
  };

  if (selectedChat !== null) {
    return (
      <ChatDetail
        chatId={selectedChat}
        state={state}
        scrollOffset={scrollOffset}
        onScroll={handleScroll}
        onBack={handleBack}
      />
    );
  }

  return (
    <ChatList
      state={state}
      cursorIndex={cursorIndex}
      onMove={handleMove}
      onSelect={handleSelect}
    />
  );
}
