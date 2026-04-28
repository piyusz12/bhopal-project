import React, { useState } from "react";
import { C } from "../constants";
import { Bubble } from "./Bubble";

export function ChatPanel({ messages, loading, domainData, onSend, chatRef, toggleVoiceInput, listening, speakLastResponse, lastAgentText }) {
  const [input, setInput] = useState("");
  const accent = domainData.accent;

  const handleSend = () => {
    if (input.trim()) {
      onSend(input);
      setInput("");
    }
  };

  return (
    <div className="chat-panel">
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8, background: C.panel }}>
        <span style={{ fontSize: 14, color: accent }}>{domainData.icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{domainData.label} Customer Portal</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: C.green, display: "flex", alignItems: "center", gap: 4 }}>
          <span className="pulse" style={{ width: 5, height: 5, background: C.green, borderRadius: "50%", display: "inline-block" }}></span>Agent Online
        </span>
      </div>

      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column" }}>
        {messages.map((m, i) => <Bubble key={i} msg={m} accent={accent} />)}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: "16px 16px 16px 4px", padding: "12px 16px", display: "flex", gap: 5, alignItems: "center" }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="bounce-dot" style={{ background: accent, animationDelay: `${i * 0.2}s` }}></div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="input-area">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          disabled={loading}
          placeholder={`Ask about ${domainData.label.toLowerCase()} support...`}
          className="chat-input"
          style={{ opacity: loading ? 0.5 : 1 }}
        />
        <button
          onClick={() => toggleVoiceInput((t) => setInput(t))}
          disabled={loading}
          className="icon-btn"
          style={{
            background: listening ? accent + "22" : C.dim,
            border: `1px solid ${listening ? accent + "66" : C.border}`,
            color: listening ? accent : C.muted
          }}
          title="Voice input"
        >
          {listening ? "⏺" : "🎙"}
        </button>
        <button
          onClick={speakLastResponse}
          disabled={!lastAgentText || loading}
          className="icon-btn"
          style={{
            background: !lastAgentText || loading ? C.dim : C.blue + "22",
            border: `1px solid ${!lastAgentText || loading ? C.border : C.blue + "66"}`,
            color: !lastAgentText || loading ? C.muted : C.blue
          }}
          title="Read latest response"
        >
          🔊
        </button>
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="primary-btn"
          style={{
            background: loading || !input.trim() ? C.dim : accent + "22",
            border: `1px solid ${loading || !input.trim() ? C.border : accent + "66"}`,
            color: loading || !input.trim() ? C.muted : accent
          }}
        >
          ↑ Send
        </button>
      </div>
    </div>
  );
}
