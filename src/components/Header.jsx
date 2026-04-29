import React from "react";
import { C, DOMAINS } from "../constants";

export function Header({
  domain,
  setDomain,
  onHistoryToggle,
  onAnalyticsToggle,
  queryCount,
}) {
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

      <nav
        className="header-domains"
        role="navigation"
        aria-label="Domain selector"
      >
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

      <div className="header-actions">
        {/* Analytics button */}
        <button
          className="history-toggle-btn"
          onClick={onAnalyticsToggle}
          aria-label="View analytics dashboard"
          title="Analytics Dashboard"
          style={{ borderColor: C.purple + "40" }}
        >
          <span className="history-icon">📊</span>
          <span className="history-label">Analytics</span>
        </button>

        {/* Query History toggle button */}
        <button
          className="history-toggle-btn"
          onClick={onHistoryToggle}
          aria-label="View saved query history (Ctrl+H)"
          title="Saved Queries (Ctrl+H)"
          style={{ borderColor: accent + "40" }}
        >
          <span className="history-icon">🗄</span>
          <span className="history-label">History</span>
          {queryCount > 0 && (
            <span
              className="history-badge"
              style={{ background: accent, color: "#000" }}
            >
              {queryCount}
            </span>
          )}
        </button>

        <div className="header-status" aria-label="System status indicators">
          <span className="status-badge" style={{ color: C.green }}>
            <span
              className="status-dot"
              style={{ background: C.green, color: C.green }}
              aria-hidden="true"
            />
            SOC 2
          </span>
          <span className="status-badge" style={{ color: C.teal }}>
            <span
              className="status-dot"
              style={{ background: C.teal, color: C.teal }}
              aria-hidden="true"
            />
            HNSW
          </span>
          <span className="status-badge" style={{ color: C.blue }}>
            <span
              className="status-dot"
              style={{ background: C.blue, color: C.blue }}
              aria-hidden="true"
            />
            PII
          </span>
          <span className="status-badge" style={{ color: C.purple }}>
            <span
              className="status-dot"
              style={{ background: C.purple, color: C.purple }}
              aria-hidden="true"
            />
            v2.0
          </span>
        </div>
      </div>
    </header>
  );
}
