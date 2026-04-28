import React, { useState } from "react";
import { C } from "../constants";
import { Bubble } from "./Bubble";

export function ChatPanel({
  messages,
  loading,
  domainData,
  onSend,
  chatRef,
  toggleVoiceInput,
  listening,
  speakLastResponse,
  lastAgentText,
}) {
  const [input, setInput] = useState("");
  const accent = domainData.accent;

  const handleSend = () => {
    if (input.trim()) {
      onSend(input);
      setInput("");
    }
  };

  return (
    <div className="chat-panel" role="main">
      <div className="chat-header">
        <span className="chat-header-icon" style={{ color: accent }} aria-hidden="true">
          {domainData.icon}
        </span>
        <span className="chat-header-title">{domainData.label} Customer Portal</span>
        <span className="chat-header-status" style={{ color: C.green }}>
          <span className="status-dot" style={{ background: C.green, color: C.green }} aria-hidden="true" />
          Agent Online
        </span>
      </div>

      <div
        ref={chatRef}
        className="chat-messages"
        role="log"
        aria-label="Chat conversation"
        aria-live="polite"
      >
        {messages.map((m, i) => (
          <Bubble key={i} msg={m} accent={accent} />
        ))}
        {loading && (
          <div className="typing-indicator">
            <div className="typing-bubble">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bounce-dot"
                  style={{ background: accent, animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="input-area">
        <label htmlFor="chat-input" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
          Type your message
        </label>
        <input
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          disabled={loading}
          placeholder={`Ask about ${domainData.label.toLowerCase()} support...`}
          className="chat-input"
          autoComplete="off"
          aria-label="Type your message"
        />
        <button
          onClick={() => toggleVoiceInput((t) => setInput(t))}
          disabled={loading}
          className="icon-btn"
          style={{
            background: listening ? accent + "18" : undefined,
            borderColor: listening ? accent + "50" : undefined,
            color: listening ? accent : undefined,
          }}
          title="Voice input"
          aria-label={listening ? "Stop voice input" : "Start voice input"}
        >
          {listening ? "⏺" : "🎙"}
        </button>
        <button
          onClick={speakLastResponse}
          disabled={!lastAgentText || loading}
          className="icon-btn"
          style={{
            background: lastAgentText && !loading ? C.blue + "15" : undefined,
            borderColor: lastAgentText && !loading ? C.blue + "50" : undefined,
            color: lastAgentText && !loading ? C.blue : undefined,
          }}
          title="Read latest response"
          aria-label="Read latest response aloud"
        >
          🔊
        </button>
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="primary-btn"
          style={{
            background: !loading && input.trim() ? accent + "15" : undefined,
            borderColor: !loading && input.trim() ? accent + "50" : undefined,
            color: !loading && input.trim() ? accent : undefined,
          }}
          aria-label="Send message"
        >
          ↑ Send
        </button>
      </div>
    </div>
  );
}
