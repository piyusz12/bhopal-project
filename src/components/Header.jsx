import React from "react";
import { C, DOMAINS } from "../constants";

export function Header({ domain, setDomain }) {
  const accent = DOMAINS[domain].accent;

  return (
    <div className="header">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: accent + "22", border: `1px solid ${accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: accent }}>◈</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0.5 }}>NeuralSupport AI</div>
          <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace" }}>LangGraph Orchestrator · RAG Pipeline Active</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        {Object.entries(DOMAINS).map(([k, d]) => (
          <button key={k} onClick={() => setDomain(k)} style={{
            padding: "5px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontWeight: domain === k ? 600 : 400,
            background: domain === k ? d.accent + "22" : "transparent",
            border: `1px solid ${domain === k ? d.accent + "66" : C.border}`,
            color: domain === k ? d.accent : C.muted,
            transition: "all 0.15s"
          }}>
            {d.icon} {d.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, fontSize: 11, fontFamily: "monospace" }}>
        <span style={{ color: C.green, display: "flex", alignItems: "center", gap: 4 }}>
          <span className="pulse" style={{ width: 6, height: 6, background: C.green, borderRadius: "50%", display: "inline-block" }}></span>SOC 2
        </span>
        <span style={{ color: C.teal, display: "flex", alignItems: "center", gap: 4 }}>
          <span className="pulse" style={{ width: 6, height: 6, background: C.teal, borderRadius: "50%", display: "inline-block" }}></span>HNSW Active
        </span>
        <span style={{ color: C.blue, display: "flex", alignItems: "center", gap: 4 }}>
          <span className="pulse" style={{ width: 6, height: 6, background: C.blue, borderRadius: "50%", display: "inline-block" }}></span>PII Guard
        </span>
      </div>
    </div>
  );
}
