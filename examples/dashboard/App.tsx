import React from "react";
import { Box, Text, useInput, useApp } from "ink";
import { theme } from "./theme.js";
import type { DashboardState } from "./state.js";
import type { Store } from "heteronimos-semi-asistidos-sdk";
import { StatusPanel } from "./components/StatusPanel.js";
import { LogViewer } from "./components/LogViewer.js";
import { ChatList } from "./components/ChatList.js";
import { ConfigPanel } from "./components/ConfigPanel.js";

const PANELS = ["Overview", "Logs", "Chats", "Config"] as const;
type Panel = (typeof PANELS)[number];

interface AppProps {
  store: Store<DashboardState>;
}

export function App({ store }: AppProps) {
  const { exit } = useApp();
  const [activePanel, setActivePanel] = React.useState<Panel>("Overview");
  const [, forceUpdate] = React.useReducer(n => n + 1, 0);

  // Suscribirse al store → re-render cuando cambie el estado
  React.useEffect(() => {
    return store.subscribe(forceUpdate);
  }, [store]);

  useInput((input, key) => {
    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
      return;
    }
    if (input === "1") setActivePanel("Overview");
    if (input === "2") setActivePanel("Logs");
    if (input === "3") setActivePanel("Chats");
    if (input === "4") setActivePanel("Config");
    if (key.tab) {
      const idx = PANELS.indexOf(activePanel);
      setActivePanel(PANELS[(idx + 1) % PANELS.length]);
    }
  });

  const state = store.getState();

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box borderStyle="single" borderColor={theme.border} paddingX={1}>
        <Text bold color={theme.primary}>heteronimos-semi-asistidos-sdk </Text>
        <Text color={theme.muted}>· dashboard · </Text>
        {PANELS.map((p) => (
          <React.Fragment key={p}>
            <Text
              color={activePanel === p ? theme.primary : theme.muted}
              bold={activePanel === p}
            >
              [{p}]
            </Text>
            <Text> </Text>
          </React.Fragment>
        ))}
      </Box>

      {/* Panel activo */}
      <Box flexGrow={1} paddingX={1}>
        {activePanel === "Overview" && <StatusPanel state={state} />}
        {activePanel === "Logs"     && <LogViewer state={state} />}
        {activePanel === "Chats"    && <ChatList state={state} />}
        {activePanel === "Config"   && <ConfigPanel state={state} store={store} />}
      </Box>

      {/* Footer */}
      <Box borderStyle="single" borderColor={theme.border} paddingX={1}>
        <Text color={theme.muted}>
          [1] Overview  [2] Logs  [3] Chats  [4] Config  [Tab] Cycle  [q] Quit
        </Text>
      </Box>
    </Box>
  );
}
