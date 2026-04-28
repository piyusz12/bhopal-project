import React from "react";
import { C } from "../constants";
import { MetCard } from "./MetCard";

export function MetricsBar({ metrics, sentiment, lang, accent }) {
  return (
    <div className="metrics-bar">
      <MetCard label="Queries" value={metrics.queries} color={accent} />
      <MetCard label="Avg Latency" value={metrics.queries > 0 ? `${metrics.avgMs}ms` : "—"} color={C.teal} />
      <MetCard label="PII Blocked" value={metrics.pii} color={C.red} />
      <MetCard label="Escalations" value={metrics.escalations} color={C.amber} />
      {sentiment && (
        <div style={{ background: sentiment.conf.bg, border: `1px solid ${sentiment.conf.color}44`, borderRadius: 8, padding: "10px 14px", flex: 1.5 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: sentiment.conf.color }}>{sentiment.conf.label}</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>lang: {lang}</div>
        </div>
      )}
    </div>
  );
}
