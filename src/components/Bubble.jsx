import React, { useState } from "react";
import { C, INTENT_ICONS } from "../constants";

export function Bubble({ msg, accent }) {
  const [feedback, setFeedback] = useState(null);
  const isUser = msg.role === "user";
  const isAlert = msg.isAlert;
  const isEsc = msg.isEscalation;
  const isStreaming = msg.isStreaming;

  const bubbleClass = isUser
    ? "bubble user-bubble"
    : isAlert
    ? "bubble agent-bubble alert-bubble"
    : isEsc
    ? "bubble agent-bubble escalation-bubble"
    : "bubble agent-bubble";

  const timestamp = msg.timestamp
    ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <div className={`bubble-container ${isUser ? "user" : "agent"}`}>
      <div
        className={bubbleClass}
        style={
          isUser
            ? {
                background: accent + "15",
                borderColor: accent + "35",
              }
            : undefined
        }
        role="article"
        aria-label={`${isUser ? "Your" : "Agent"} message`}
      >
        {!isUser && (
          <div className="bubble-tag" style={{ color: isAlert ? C.red : isEsc ? C.blue : accent }}>
            <span>
              {isAlert ? "⚠ SECURITY BLOCK" : isEsc ? "↑ ESCALATING" : "◈ AI AGENT"}
            </span>
            {msg.metadata?.routing_model && (
              <span style={{ opacity: 0.5, fontSize: 9 }}>
                · {msg.metadata.routing_model === "deep" ? "GPT-4o" : "Llama-3-8B"}
              </span>
            )}
          </div>
        )}

        <span className="bubble-content">
          {msg.content}
          {isStreaming && <span className="streaming-cursor" aria-hidden="true" />}
        </span>

        {msg.metadata && (
          <div className="bubble-meta">
            <span className="meta-chip" style={{ color: accent }}>
              {INTENT_ICONS[msg.metadata.intent] || "◈"} {msg.metadata.intent?.replace("_", " ")}
            </span>
            <span className="meta-chip" style={{ color: C.muted }}>
              {Math.round((msg.metadata.confidence || 0) * 100)}% confidence
            </span>
            <span className="meta-chip" style={{ color: C.muted }}>
              {msg.metadata.latency}ms
            </span>
            {msg.metadata.routing_model && (
              <span
                className="meta-chip"
                style={{
                  color: msg.metadata.routing_model === "deep" ? C.purple : C.cyan,
                }}
              >
                {msg.metadata.routing_model === "deep" ? "🧠 Deep" : "⚡ Fast"} model
              </span>
            )}
            {msg.metadata.requires_escalation && (
              <span className="meta-chip" style={{ background: C.red + "15", color: C.red, borderColor: C.red + "30" }}>
                HITL triggered
              </span>
            )}
          </div>
        )}

        {!isUser && !isStreaming && msg.content && (
          <div className="bubble-actions">
            <button
              className={`feedback-btn${feedback === "up" ? " active" : ""}`}
              onClick={() => setFeedback(feedback === "up" ? null : "up")}
              aria-label="Helpful response"
              title="Helpful"
            >
              👍
            </button>
            <button
              className={`feedback-btn${feedback === "down" ? " active" : ""}`}
              onClick={() => setFeedback(feedback === "down" ? null : "down")}
              aria-label="Unhelpful response"
              title="Not helpful"
            >
              👎
            </button>
            <button
              className="feedback-btn"
              onClick={() => {
                if (navigator.clipboard) navigator.clipboard.writeText(msg.content);
              }}
              aria-label="Copy response"
              title="Copy"
            >
              📋
            </button>
          </div>
        )}

        {timestamp && <div className="bubble-timestamp">{timestamp}</div>}
      </div>
    </div>
  );
}
