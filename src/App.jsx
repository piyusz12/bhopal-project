import React, { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";
import { DOMAINS, SUPPORTED_LANGUAGES } from "./constants";
import { useChat } from "./hooks/useChat";
import { useVoice } from "./hooks/useVoice";
import { useQueryHistory } from "./hooks/useQueryHistory";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { Header } from "./components/Header";
import { MetricsBar } from "./components/MetricsBar";
import { ChatPanel } from "./components/ChatPanel";
import { TelemetryPanel } from "./components/TelemetryPanel";
import { QueryHistory } from "./components/QueryHistory";
import { AnalyticsPanel } from "./components/AnalyticsPanel";

export default function App() {
  const [domain, setDomain] = useState("ecommerce");
  const [telemetry, setTelemetry] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [telemetryOpen, setTelemetryOpen] = useState(true);
  const [selectedLang, setSelectedLang] = useState("auto");
  const chatRef = useRef(null);
  const telemRef = useRef(null);
  const inputRef = useRef(null);
  const isFirstRender = useRef(true);

  const log = useCallback((msg, type = "info") => {
    setTelemetry((p) => [
      ...p,
      { id: Date.now() + Math.random(), msg, type, ts: Date.now() },
    ]);
  }, []);

  const {
    messages,
    setMessages,
    loading,
    sentiment,
    setSentiment,
    lang,
    setLang,
    metrics,
    lastAgentText,
    activeStage,
    handleSend,
  } = useChat(domain, log);

  // Resolve effective language: if user explicitly chose one, use it; otherwise auto-detected
  const effectiveLang = selectedLang === "auto"
    ? lang
    : (SUPPORTED_LANGUAGES.find(l => l.code === selectedLang)?.label || lang);

  const { listening, speak, toggleVoiceInput } = useVoice(effectiveLang, log);

  const {
    history,
    historyLoading,
    historyError,
    refreshHistory,
  } = useQueryHistory("web-session");

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onToggleHistory: () => setHistoryOpen((p) => !p),
    onFocusInput: () => {
      inputRef.current?.focus();
    },
    onClosePanel: () => {
      setHistoryOpen(false);
      setAnalyticsOpen(false);
    },
    historyOpen: historyOpen || analyticsOpen,
  });

  // Refresh history whenever a new response is received
  useEffect(() => {
    if (!loading && messages.length > 1) {
      refreshHistory();
    }
  }, [loading, messages.length]);

  useEffect(() => {
    if (isFirstRender.current) {
      // First render: show initial greeting
      isFirstRender.current = false;
      setMessages([
        {
          role: "agent",
          content: DOMAINS[domain].greeting,
          timestamp: Date.now(),
        },
      ]);
    } else {
      // Domain switch: preserve conversation, add a notice + new greeting
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: `Switched to ${DOMAINS[domain].label} domain`,
          timestamp: Date.now(),
        },
        {
          role: "agent",
          content: DOMAINS[domain].greeting,
          timestamp: Date.now(),
        },
      ]);
      log(`[ROUTER] Domain switched to ${DOMAINS[domain].label}`, "info");
    }
  }, [domain]);

  useEffect(() => {
    // Use rAF + small delay to ensure DOM has rendered the new content
    const frame = requestAnimationFrame(() => {
      if (chatRef.current) {
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, loading]);

  useEffect(() => {
    telemRef.current?.scrollTo(0, telemRef.current.scrollHeight);
  }, [telemetry]);

  const domainData = DOMAINS[domain];
  const accent = domainData.accent;

  // Replay a saved query from history
  const handleReplay = (queryText) => {
    setHistoryOpen(false);
    if (queryText && !loading) {
      handleSend(queryText);
    }
  };

  return (
    <div className={`app-container sentiment-${sentiment?.label || "neutral"}`}>
      <Header
        domain={domain}
        setDomain={setDomain}
        onHistoryToggle={() => setHistoryOpen(true)}
        onAnalyticsToggle={() => setAnalyticsOpen(true)}
        queryCount={history.length}
      />

      <MetricsBar
        metrics={{
          ...metrics,
          queries: Math.max(metrics.queries, history.length),
          escalations: Math.max(
            metrics.escalations,
            history.filter((h) => h.requires_escalation).length
          ),
        }}
        sentiment={sentiment}
        lang={effectiveLang}
        accent={accent}
        selectedLang={selectedLang}
        onLangChange={setSelectedLang}
      />

      <div className={`main-split${telemetryOpen ? '' : ' telemetry-collapsed'}`}>
        <ChatPanel
          messages={messages}
          loading={loading}
          domainData={domainData}
          onSend={handleSend}
          chatRef={chatRef}
          toggleVoiceInput={toggleVoiceInput}
          listening={listening}
          speakLastResponse={() => speak(lastAgentText)}
          lastAgentText={lastAgentText}
          domain={domain}
          inputRef={inputRef}
        />

        <TelemetryPanel
          telemetry={telemetry}
          telemRef={telemRef}
          accent={accent}
          activeStage={activeStage}
          isOpen={telemetryOpen}
          onToggle={() => setTelemetryOpen(p => !p)}
        />
      </div>

      <QueryHistory
        history={history}
        historyLoading={historyLoading}
        historyError={historyError}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onReplay={handleReplay}
        accent={accent}
      />

      <AnalyticsPanel
        history={history}
        accent={accent}
        isOpen={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
      />
    </div>
  );
}
