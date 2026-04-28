import React from "react";
import { C, INTENT_ICONS } from "../constants";

export function Bubble({ msg, accent }) {
  const isUser = msg.role === "user";
  const isAlert = msg.isAlert;
  const isEsc = msg.isEscalation;
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
      <div style={{
        maxWidth: "82%", borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        padding: "10px 14px", fontSize: 13, lineHeight: 1.6,
        background: isUser ? accent + "22" : isAlert ? "#1a0510" : isEsc ? "#0a1520" : C.panel,
        border: `1px solid ${isUser ? accent + "44" : isAlert ? C.red + "44" : isEsc ? C.blue + "44" : C.border}`,
        color: C.text
      }}>
        {!isUser && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, opacity: 0.6 }}>
            <span style={{ fontSize: 10, color: isAlert ? C.red : isEsc ? C.blue : accent }}>
              {isAlert ? "⚠ SECURITY BLOCK" : isEsc ? "↑ ESCALATING" : "◈ AI AGENT"}
            </span>
          </div>
        )}
        <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
        {msg.metadata && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, background: C.dim, color: accent, padding: "2px 7px", borderRadius: 20 }}>
              {INTENT_ICONS[msg.metadata.intent] || "◈"} {msg.metadata.intent?.replace("_", " ")}
            </span>
            <span style={{ fontSize: 10, background: C.dim, color: C.muted, padding: "2px 7px", borderRadius: 20 }}>
              {Math.round(msg.metadata.confidence * 100)}% confidence
            </span>
            <span style={{ fontSize: 10, background: C.dim, color: C.muted, padding: "2px 7px", borderRadius: 20 }}>
              {msg.metadata.latency}ms
            </span>
            {msg.metadata.requires_escalation && (
              <span style={{ fontSize: 10, background: C.red + "22", color: C.red, padding: "2px 7px", borderRadius: 20 }}>HITL triggered</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
