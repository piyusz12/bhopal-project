import React from "react";
import { C } from "../constants";
import { LogLine } from "./LogLine";

export function TelemetryPanel({ telemetry, telemRef, accent }) {
  return (
    <div className="telemetry-panel">
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8, background: C.panel }}>
        <span style={{ fontSize: 11, color: C.amber, fontFamily: "monospace" }}>⬡</span>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: C.muted }}>Agent Pipeline Monitor</span>
        <span style={{ marginLeft: "auto", fontSize: 10, fontFamily: "monospace", background: C.dim, color: C.muted, padding: "2px 8px", borderRadius: 4 }}>TRACE: ACTIVE</span>
      </div>

      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 0, overflowX: "auto" }}>
        {["PII\nScan", "Intent\nRouter", "RAG\nPipeline", "LLM\nSynth", "Sentiment\nAnalysis", "Response\nDelivery"].map((label, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ textAlign: "center", padding: "4px 8px", borderRadius: 6, background: C.dim, border: `1px solid ${C.border}`, minWidth: 60 }}>
              <div style={{ fontSize: 9, color: accent, fontFamily: "monospace", whiteSpace: "pre-line", lineHeight: 1.3 }}>{label}</div>
            </div>
            {i < 5 && <div style={{ width: 16, height: 1, background: C.border, flexShrink: 0 }}></div>}
          </div>
        ))}
      </div>

      <div ref={telemRef} style={{ flex: 1, overflowY: "auto", padding: "14px 16px", fontFamily: "monospace" }}>
        {telemetry.length === 0 ? (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, opacity: 0.3 }}>
            <div style={{ fontSize: 24 }}>⬡</div>
            <div style={{ fontSize: 11, color: C.muted, textAlign: "center", lineHeight: 1.6 }}>
              Awaiting user query<br />Pipeline traces will appear here
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {telemetry.map(e => <LogLine key={e.id} e={e} />)}
          </div>
        )}
      </div>

      <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.border}`, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {["Multi-Model Routing", "HyDE Query Expansion", "Cross-Encoder Reranking", "Sentiment Detection", "PII Masking", "HITL Escalation", "Multilingual"].map(tag => (
          <span key={tag} style={{ fontSize: 9, fontFamily: "monospace", color: C.muted, background: C.dim, padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.border}` }}>{tag}</span>
        ))}
      </div>
    </div>
  );
}
