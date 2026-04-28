import React from "react";
import { C, DOMAINS } from "../constants";

export function Header({ domain, setDomain }) {
  const accent = DOMAINS[domain].accent;

  return (
    <header className="header" role="banner">
      <div className="header-brand">
        <div
          className="header-logo"
          style={{ background: accent + "12", color: accent }}
          aria-hidden="true"
        >
          ◈
        </div>
        <div>
          <div className="header-title">NeuralSupport AI</div>
          <div className="header-subtitle">
            LangGraph Orchestrator · RAG Pipeline v2.0
          </div>
        </div>
      </div>

      <nav className="header-domains" role="navigation" aria-label="Domain selector">
        {Object.entries(DOMAINS).map(([k, d]) => (
          <button
            key={k}
            onClick={() => setDomain(k)}
            className={`domain-btn${domain === k ? " active" : ""}`}
            style={{
              background: domain === k ? d.accent + "15" : "transparent",
              borderColor: domain === k ? d.accent + "50" : undefined,
              color: domain === k ? d.accent : undefined,
            }}
            aria-pressed={domain === k}
            aria-label={`Switch to ${d.label} domain`}
          >
            {d.icon} {d.label}
          </button>
        ))}
      </nav>

      <div className="header-status" aria-label="System status indicators">
        <span className="status-badge" style={{ color: C.green }}>
          <span className="status-dot" style={{ background: C.green, color: C.green }} aria-hidden="true" />
          SOC 2
        </span>
        <span className="status-badge" style={{ color: C.teal }}>
          <span className="status-dot" style={{ background: C.teal, color: C.teal }} aria-hidden="true" />
          HNSW Active
        </span>
        <span className="status-badge" style={{ color: C.blue }}>
          <span className="status-dot" style={{ background: C.blue, color: C.blue }} aria-hidden="true" />
          PII Guard
        </span>
        <span className="status-badge" style={{ color: C.purple }}>
          <span className="status-dot" style={{ background: C.purple, color: C.purple }} aria-hidden="true" />
          v2.0
        </span>
      </div>
    </header>
  );
}
