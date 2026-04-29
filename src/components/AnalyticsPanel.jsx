import React, { useMemo } from "react";
import { C, SENTIMENT_CONFIG } from "../constants";

/**
 * AnalyticsPanel — Real-time analytics dashboard showing intent distribution,
 * sentiment breakdown, domain coverage, and response time trends.
 */
export function AnalyticsPanel({ history, accent, isOpen, onClose }) {
  if (!isOpen) return null;

  const analytics = useMemo(() => {
    if (!history || history.length === 0) return null;

    // Intent distribution
    const intents = {};
    history.forEach((h) => {
      const intent = h.intent || "general";
      intents[intent] = (intents[intent] || 0) + 1;
    });

    // Sentiment distribution
    const sentiments = {};
    history.forEach((h) => {
      const s = h.sentiment || "neutral";
      sentiments[s] = (sentiments[s] || 0) + 1;
    });

    // Domain distribution
    const domains = {};
    history.forEach((h) => {
      const d = h.domain || "unknown";
      domains[d] = (domains[d] || 0) + 1;
    });

    // Language distribution
    const languages = {};
    history.forEach((h) => {
      const l = h.language || "English";
      languages[l] = (languages[l] || 0) + 1;
    });

    // Escalation rate
    const escalations = history.filter((h) => h.requires_escalation).length;
    const escalationRate = ((escalations / history.length) * 100).toFixed(1);

    // Avg confidence
    const confidences = history
      .map((h) => h.confidence)
      .filter((c) => c != null);
    const avgConfidence =
      confidences.length > 0
        ? (
            (confidences.reduce((a, b) => a + b, 0) / confidences.length) *
            100
          ).toFixed(1)
        : "—";

    // Avg sentiment score
    const sentScores = history
      .map((h) => h.sentiment_score)
      .filter((s) => s != null);
    const avgSentScore =
      sentScores.length > 0
        ? (sentScores.reduce((a, b) => a + b, 0) / sentScores.length).toFixed(3)
        : "—";

    return {
      intents,
      sentiments,
      domains,
      languages,
      escalations,
      escalationRate,
      avgConfidence,
      avgSentScore,
      total: history.length,
    };
  }, [history]);

  const renderBar = (label, count, total, color) => {
    const pct = total > 0 ? (count / total) * 100 : 0;
    return (
      <div className="analytics-bar-row" key={label}>
        <div className="analytics-bar-label">{label.replace("_", " ")}</div>
        <div className="analytics-bar-track">
          <div
            className="analytics-bar-fill"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        <div className="analytics-bar-count" style={{ color }}>
          {count}
        </div>
      </div>
    );
  };

  const sentimentColors = {
    positive: C.green,
    neutral: C.muted,
    negative: "#ff9966",
    frustrated: C.amber,
    very_frustrated: C.red,
  };

  const domainColors = {
    ecommerce: C.teal,
    banking: C.blue,
    healthcare: "#ff6b9d",
    education: C.amber,
    government: C.purple,
  };

  return (
    <div className="query-history-overlay" onClick={onClose}>
      <aside
        className="query-history-drawer analytics-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Analytics dashboard"
      >
        <div className="qh-header">
          <div className="qh-header-left">
            <span className="qh-icon" style={{ color: accent }}>
              📊
            </span>
            <div>
              <div className="qh-title">Analytics Dashboard</div>
              <div className="qh-subtitle">
                {analytics?.total || 0} queries analyzed
              </div>
            </div>
          </div>
          <button
            className="qh-close-btn"
            onClick={onClose}
            aria-label="Close analytics"
          >
            ✕
          </button>
        </div>

        <div className="qh-content analytics-content">
          {!analytics ? (
            <div className="qh-empty">
              <div className="qh-empty-icon">📊</div>
              <span>No data yet</span>
              <span className="qh-empty-hint">
                Send queries to generate analytics.
              </span>
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="analytics-kpis">
                <div className="analytics-kpi">
                  <div className="analytics-kpi-value" style={{ color: accent }}>
                    {analytics.total}
                  </div>
                  <div className="analytics-kpi-label">Total Queries</div>
                </div>
                <div className="analytics-kpi">
                  <div
                    className="analytics-kpi-value"
                    style={{ color: C.green }}
                  >
                    {analytics.avgConfidence}%
                  </div>
                  <div className="analytics-kpi-label">Avg Confidence</div>
                </div>
                <div className="analytics-kpi">
                  <div
                    className="analytics-kpi-value"
                    style={{
                      color:
                        parseFloat(analytics.escalationRate) > 20
                          ? C.red
                          : C.amber,
                    }}
                  >
                    {analytics.escalationRate}%
                  </div>
                  <div className="analytics-kpi-label">Escalation Rate</div>
                </div>
                <div className="analytics-kpi">
                  <div
                    className="analytics-kpi-value"
                    style={{ color: C.cyan }}
                  >
                    {analytics.avgSentScore}
                  </div>
                  <div className="analytics-kpi-label">Avg Sentiment</div>
                </div>
              </div>

              {/* Intent Distribution */}
              <div className="analytics-section">
                <div className="analytics-section-title">
                  Intent Distribution
                </div>
                {Object.entries(analytics.intents)
                  .sort((a, b) => b[1] - a[1])
                  .map(([intent, count]) =>
                    renderBar(intent, count, analytics.total, accent)
                  )}
              </div>

              {/* Sentiment Breakdown */}
              <div className="analytics-section">
                <div className="analytics-section-title">
                  Sentiment Breakdown
                </div>
                {Object.entries(analytics.sentiments)
                  .sort((a, b) => b[1] - a[1])
                  .map(([sent, count]) =>
                    renderBar(
                      sent,
                      count,
                      analytics.total,
                      sentimentColors[sent] || C.muted
                    )
                  )}
              </div>

              {/* Domain Coverage */}
              <div className="analytics-section">
                <div className="analytics-section-title">Domain Coverage</div>
                {Object.entries(analytics.domains)
                  .sort((a, b) => b[1] - a[1])
                  .map(([dom, count]) =>
                    renderBar(
                      dom,
                      count,
                      analytics.total,
                      domainColors[dom] || C.muted
                    )
                  )}
              </div>

              {/* Languages */}
              <div className="analytics-section">
                <div className="analytics-section-title">Languages Detected</div>
                <div className="analytics-lang-tags">
                  {Object.entries(analytics.languages).map(([lang, count]) => (
                    <span key={lang} className="analytics-lang-tag">
                      🌐 {lang}{" "}
                      <span className="analytics-lang-count">×{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
