import React, { useState, useMemo, useRef } from "react";
import { C, DOMAINS } from "../constants";
import { Bubble } from "./Bubble";

const SUGGESTION_MAP = {
  ecommerce: [
    "Track my order",
    "Return policy?",
    "Shipping options",
    "Cancel order",
    "Payment methods",
  ],
  banking: [
    "Check interest rates",
    "Wire transfer fees",
    "Report fraud",
    "Loan options",
    "Open account",
  ],
  healthcare: [
    "Book appointment",
    "Insurance coverage",
    "Prescription refill",
    "Emergency info",
    "Billing question",
  ],
  education: [
    "Enrollment deadline",
    "Financial aid",
    "Tuition costs",
    "Transfer credits",
    "Campus resources",
  ],
  government: [
    "Tax filing deadline",
    "Business permit",
    "Benefits eligibility",
    "License renewal",
    "DMV services",
  ],
};

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
  domain,
  inputRef,
}) {
  const [input, setInput] = useState("");
  const [imageBase64, setImageBase64] = useState(null);
  const fileInputRef = useRef(null);

  const accent = domainData.accent;
  const suggestions = SUGGESTION_MAP[domain] || SUGGESTION_MAP.ecommerce;

  const showSuggestions = useMemo(() => {
    return messages.length <= 1 && !loading;
  }, [messages.length, loading]);

  const handleSend = () => {
    if (input.trim() || imageBase64) {
      onSend(input, imageBase64);
      setInput("");
      setImageBase64(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result.split(",")[1]); // Store only the base64 part
      };
      reader.readAsDataURL(file);
    }
    // Reset file input so same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSuggestion = (text) => {
    onSend(text);
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

        {showSuggestions && (
          <div className="suggestion-chips" role="group" aria-label="Suggested questions">
            {suggestions.map((s) => (
              <button
                key={s}
                className="suggestion-chip"
                onClick={() => handleSuggestion(s)}
                aria-label={`Ask: ${s}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

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
              <span className="typing-label">AI is thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="input-area">
        {imageBase64 && (
          <div className="image-preview-container">
            <img src={`data:image/jpeg;base64,${imageBase64}`} alt="Upload preview" className="image-preview-thumb" />
            <button className="image-preview-remove" onClick={() => setImageBase64(null)} aria-label="Remove image">
              ✕
            </button>
          </div>
        )}
        <div className="input-wrapper">
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="icon-btn"
            style={{
              background: "transparent",
              border: "none",
              color: C.muted,
              minWidth: 36,
              padding: "8px",
            }}
            title="Upload image"
            aria-label="Upload image"
          >
            📷
          </button>
          <label htmlFor="chat-input" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
            Type your message
          </label>
          <input
            id="chat-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={loading}
            placeholder={`Ask about ${domainData.label.toLowerCase()} support... (Ctrl+K)`}
            className="chat-input"
            autoComplete="off"
            aria-label="Type your message"
          />
          <button
            onClick={() =>
              toggleVoiceInput((t) => {
                setInput(t);
                // Auto-send after a short delay so the user sees the transcript
                setTimeout(() => {
                  if (t.trim()) {
                    onSend(t);
                    setInput("");
                  }
                }, 400);
              })
            }
            disabled={loading}
            className={`icon-btn${listening ? " voice-active" : ""}`}
            style={{
              background: listening ? accent + "18" : "transparent",
              borderColor: listening ? accent + "50" : "transparent",
              color: listening ? accent : undefined,
              border: "none",
              minWidth: 36,
              padding: "8px",
            }}
            title="Voice input — speak to send"
            aria-label={listening ? "Listening… click to stop" : "Start voice input"}
          >
            {listening ? (
              <span className="voice-wave">
                <span className="wave-bar" style={{ background: accent }} />
                <span className="wave-bar" style={{ background: accent, animationDelay: "0.15s" }} />
                <span className="wave-bar" style={{ background: accent, animationDelay: "0.3s" }} />
                <span className="wave-bar" style={{ background: accent, animationDelay: "0.45s" }} />
              </span>
            ) : (
              "🎙"
            )}
          </button>
        </div>
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
          disabled={loading || (!input.trim() && !imageBase64)}
          className="primary-btn"
          style={{
            background: !loading && (input.trim() || imageBase64) ? accent + "18" : undefined,
            borderColor: !loading && (input.trim() || imageBase64) ? accent + "50" : undefined,
            color: !loading && (input.trim() || imageBase64) ? accent : undefined,
          }}
          aria-label="Send message"
        >
          ↑ Send
        </button>
      </div>
    </div>
  );
}
