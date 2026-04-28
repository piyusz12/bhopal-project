import React, { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";
import { DOMAINS } from "./constants";
import { useChat } from "./hooks/useChat";
import { useVoice } from "./hooks/useVoice";
import { Header } from "./components/Header";
import { MetricsBar } from "./components/MetricsBar";
import { ChatPanel } from "./components/ChatPanel";
import { TelemetryPanel } from "./components/TelemetryPanel";

export default function App() {
  const [domain, setDomain] = useState("ecommerce");
  const [telemetry, setTelemetry] = useState([]);
  const chatRef = useRef(null);
  const telemRef = useRef(null);

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
    handleSend,
  } = useChat(domain, log);

  const { listening, speak, toggleVoiceInput } = useVoice(lang, log);

  useEffect(() => {
    setMessages([
      {
        role: "agent",
        content: DOMAINS[domain].greeting,
        timestamp: Date.now(),
      },
    ]);
    setTelemetry([]);
    setSentiment(null);
    setLang("English");
  }, [domain, setMessages, setSentiment, setLang]);

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [messages, loading]);

  useEffect(() => {
    telemRef.current?.scrollTo(0, telemRef.current.scrollHeight);
  }, [telemetry]);

  const domainData = DOMAINS[domain];
  const accent = domainData.accent;

  return (
    <div className="app-container">
      <Header domain={domain} setDomain={setDomain} />

      <MetricsBar
        metrics={metrics}
        sentiment={sentiment}
        lang={lang}
        accent={accent}
      />

      <div className="main-split">
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
        />

        <TelemetryPanel
          telemetry={telemetry}
          telemRef={telemRef}
          accent={accent}
        />
      </div>
    </div>
  );
}
