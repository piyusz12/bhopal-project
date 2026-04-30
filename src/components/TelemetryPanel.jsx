import React from "react";
import { C } from "../constants";
import { LogLine } from "./LogLine";

const PIPELINE_STAGES = [
  "PII\nScan",
  "Bhashini\nTLD",
  "Bhashini\nNER",
  "Intent\nRouter",
  "Query\nExpansion",
  "RAG\nPipeline",
  "Reranking",
  "LLM\nSynth",
  "Sentiment\nAnalysis",
  "Response",
];

const FEATURE_TAGS = [
  "Bhashini NER",
  "Bhashini TLD",
  "Bhashini NMT",
  "Bhashini ASR",
  "Bhashini Denoiser",
  "Bhashini TTS",
  "Transliteration",
  "Multi-Model Routing",
  "HyDE Query Expansion",
  "Cross-Encoder Reranking",
  "Sentiment Detection",
  "PII Masking",
  "HITL Escalation",
  "10+ Indian Languages",
  "SSE Streaming",
  "Conversation Memory",
  "Rate Limiting",
];

export function TelemetryPanel({ telemetry, telemRef, accent, activeStage, isOpen, onToggle }) {
  return (
    <aside className={`telemetry-panel${isOpen ? '' : ' telemetry-panel--collapsed'}`} role="complementary" aria-label="Agent pipeline monitor">
      {/* Sidebar toggle tab */}
      <button
        className="telemetry-toggle-tab"
        onClick={onToggle}
        aria-label={isOpen ? "Collapse pipeline monitor" : "Expand pipeline monitor"}
        title={isOpen ? "Collapse pipeline monitor" : "Expand pipeline monitor"}
      >
        <span className="telemetry-toggle-icon">{isOpen ? '›' : '‹'}</span>
        {!isOpen && <span className="telemetry-toggle-label">Pipeline Monitor</span>}
      </button>

      {isOpen && (
        <>
          <div className="telemetry-header">
            <span style={{ fontSize: 12, color: C.amber }} aria-hidden="true">⬡</span>
            <span className="telemetry-title">Agent Pipeline Monitor</span>
            <span className="trace-badge">TRACE: ACTIVE</span>
          </div>

          <div className="pipeline-bar" role="img" aria-label="Processing pipeline stages">
            {PIPELINE_STAGES.map((label, i) => (
              <div key={i} className={`pipeline-node${activeStage === i ? " active" : ""}${activeStage > i ? " complete" : ""}`}>
                <div className="pipeline-box" style={{ 
                  borderColor: activeStage === i ? accent : activeStage > i ? accent + "80" : undefined,
                  boxShadow: activeStage === i ? `0 0 15px ${accent}40` : undefined,
                  background: activeStage === i ? accent + "10" : undefined
                }}>
                  <div className="pipeline-label" style={{ color: activeStage === i ? accent : activeStage > i ? accent + "cc" : undefined }}>
                    {label}
                  </div>
                </div>
                {i < PIPELINE_STAGES.length - 1 && (
                  <div className="pipeline-connector" style={{ 
                    background: activeStage > i ? accent : C.border,
                    opacity: activeStage > i ? 0.6 : 0.2
                  }} />
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
        </>
      )}
    </aside>
  );
}
