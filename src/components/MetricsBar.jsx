import React from "react";
import { C, SUPPORTED_LANGUAGES } from "../constants";
import { MetCard } from "./MetCard";

export function MetricsBar({ metrics, sentiment, lang, accent, selectedLang, onLangChange }) {
  return (
    <div className="metrics-bar" role="status" aria-label="System metrics">
      <MetCard label="Queries" value={metrics.queries} color={accent} />
      <MetCard label="Avg Latency" value={metrics.queries > 0 ? `${metrics.avgMs}ms` : "—"} color={C.teal} />
      <MetCard label="PII Blocked" value={metrics.pii} color={C.red} />
      <MetCard label="Escalations" value={metrics.escalations} color={C.amber} />
      <MetCard
        label="Routing"
        value={metrics.lastRouting || "—"}
        color={metrics.lastRouting === "deep" ? C.purple : C.blue}
      />

      {/* Language Selector */}
      <div className="lang-selector-card met-card" style={{ minWidth: 140 }}>
        <div className="lang-selector-header">
          <span className="lang-selector-icon">🌐</span>
          <select
            className="lang-select"
            value={selectedLang}
            onChange={(e) => onLangChange(e.target.value)}
            aria-label="Select response language"
            title="Choose response language"
          >
            {SUPPORTED_LANGUAGES.map((l, i) => (
              <option key={l.code} value={l.code}>
                {l.flag ? `${l.flag} ` : ""}{l.label} {l.native !== l.label && l.native !== "Auto" ? `(${l.native})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="met-label">LANGUAGE</div>
      </div>

      {sentiment && (
        <div
          className="sentiment-card fade-in"
          style={{
            background: sentiment.conf.bg,
            border: `1px solid ${sentiment.conf.color}33`,
          }}
          role="status"
          aria-label={`Sentiment: ${sentiment.conf.label}`}
        >
          <div className="sentiment-label" style={{ color: sentiment.conf.color }}>
            {sentiment.conf.label}
          </div>
          <div className="sentiment-lang">
            lang: {lang}
          </div>
        </div>
      )}
    </div>
  );
}
