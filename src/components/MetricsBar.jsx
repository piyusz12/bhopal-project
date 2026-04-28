import React from "react";
import { C } from "../constants";
import { MetCard } from "./MetCard";

export function MetricsBar({ metrics, sentiment, lang, accent }) {
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
