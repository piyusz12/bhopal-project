import React from "react";
import { C } from "../constants";
import { LogLine } from "./LogLine";

const PIPELINE_STAGES = [
  "PII\nScan",
  "Intent\nRouter",
  "Query\nExpansion",
  "RAG\nPipeline",
  "Reranking",
  "LLM\nSynth",
  "Sentiment\nAnalysis",
  "Response",
];

const FEATURE_TAGS = [
  "Multi-Model Routing",
  "HyDE Query Expansion",
  "Cross-Encoder Reranking",
  "Sentiment Detection",
  "PII Masking",
  "HITL Escalation",
  "Multilingual",
  "SSE Streaming",
  "Conversation Memory",
  "Rate Limiting",
];

export function TelemetryPanel({ telemetry, telemRef, accent }) {
  return (
    <aside className="telemetry-panel" role="complementary" aria-label="Agent pipeline monitor">
      <div className="telemetry-header">
        <span style={{ fontSize: 12, color: C.amber }} aria-hidden="true">⬡</span>
        <span className="telemetry-title">Agent Pipeline Monitor</span>
        <span className="trace-badge">TRACE: ACTIVE</span>
      </div>

      <div className="pipeline-bar" role="img" aria-label="Processing pipeline stages">
        {PIPELINE_STAGES.map((label, i) => (
          <div key={i} className="pipeline-node">
            <div className="pipeline-box">
              <div className="pipeline-label" style={{ color: accent }}>
                {label}
              </div>
            </div>
            {i < PIPELINE_STAGES.length - 1 && (
              <div className="pipeline-connector" style={{ background: C.border }} />
            )}
          </div>
        ))}
      </div>

      <div ref={telemRef} className="telemetry-logs" role="list" aria-label="Pipeline trace log">
        {telemetry.length === 0 ? (
          <div className="telemetry-empty">
            <div className="telemetry-empty-icon">⬡</div>
            <div className="telemetry-empty-text">
              Awaiting user query<br />
              Pipeline traces will appear here
            </div>
          </div>
        ) : (
          <div className="telemetry-log-list">
            {telemetry.map((e) => (
              <LogLine key={e.id} e={e} />
            ))}
          </div>
        )}
      </div>

      <div className="feature-tags" role="list" aria-label="Active features">
        {FEATURE_TAGS.map((tag) => (
          <span key={tag} className="feature-tag" role="listitem">
            {tag}
          </span>
        ))}
      </div>
    </aside>
  );
}
