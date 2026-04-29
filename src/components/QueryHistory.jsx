import React, { useState, useMemo } from "react";
import { C, INTENT_ICONS, SENTIMENT_CONFIG } from "../constants";

/**
 * QueryHistory — Premium drawer with search, filter, export, and replay.
 */
export function QueryHistory({
  history,
  historyLoading,
  historyError,
  isOpen,
  onClose,
  onReplay,
  accent,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDomain, setFilterDomain] = useState("all");
  const [filterSentiment, setFilterSentiment] = useState("all");

  // Get unique domains and sentiments for filters
  const uniqueDomains = [...new Set((history || []).map((h) => h.domain))];
  const uniqueSentiments = [...new Set((history || []).map((h) => h.sentiment))];

  // Filter + search (hook MUST be before the early return)
  const filteredHistory = useMemo(() => {
    let items = history || [];

    if (filterDomain !== "all") {
      items = items.filter((h) => h.domain === filterDomain);
    }

    if (filterSentiment !== "all") {
      items = items.filter((h) => h.sentiment === filterSentiment);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (h) =>
          h.user_message?.toLowerCase().includes(q) ||
          h.response?.toLowerCase().includes(q) ||
          h.intent?.toLowerCase().includes(q)
      );
    }

    return items;
  }, [history, filterDomain, filterSentiment, searchQuery]);

  // Group by domain
  const grouped = {};
  filteredHistory.forEach((item) => {
    const domain = item.domain || "unknown";
    if (!grouped[domain]) grouped[domain] = [];
    grouped[domain].push(item);
  });

  // Early return AFTER all hooks
  if (!isOpen) return null;

  const formatTime = (isoStr) => {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const sentimentIcon = (s) => {
    const map = {
      positive: "↑",
      neutral: "—",
      negative: "↓",
      frustrated: "⚠",
      very_frustrated: "⚡",
    };
    return map[s] || "—";
  };

  // Export as JSON report
  const handleExport = () => {
    const report = {
      exported_at: new Date().toISOString(),
      total_queries: history.length,
      filtered_queries: filteredHistory.length,
      queries: filteredHistory.map((h) => ({
        query: h.user_message,
        response: h.response,
        domain: h.domain,
        intent: h.intent,
        sentiment: h.sentiment,
        sentiment_score: h.sentiment_score,
        language: h.language,
        confidence: h.confidence,
        escalated: h.requires_escalation,
        timestamp: h.created_at,
      })),
      analytics: {
        domains: [...new Set(filteredHistory.map((h) => h.domain))],
        avg_confidence:
          filteredHistory.length > 0
            ? (
                filteredHistory
                  .map((h) => h.confidence || 0)
                  .reduce((a, b) => a + b, 0) / filteredHistory.length
              ).toFixed(3)
            : 0,
        escalation_rate:
          filteredHistory.length > 0
            ? (
                (filteredHistory.filter((h) => h.requires_escalation).length /
                  filteredHistory.length) *
                100
              ).toFixed(1) + "%"
            : "0%",
      },
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `neuralsupport_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="query-history-overlay" onClick={onClose}>
      <aside
        className="query-history-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Saved query history"
      >
        {/* Header */}
        <div className="qh-header">
          <div className="qh-header-left">
            <span className="qh-icon" style={{ color: accent }}>
              🗄
            </span>
            <div>
              <div className="qh-title">Query History</div>
              <div className="qh-subtitle">
                {filteredHistory.length} of {history.length} queries · SQLite DB
              </div>
            </div>
          </div>
          <div className="qh-header-actions">
            <button
              className="qh-export-btn"
              onClick={handleExport}
              title="Export as JSON report"
              aria-label="Export report"
              disabled={filteredHistory.length === 0}
            >
              ⬇ Export
            </button>
            <button
              className="qh-close-btn"
              onClick={onClose}
              aria-label="Close history panel"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="qh-search-bar">
          <div className="qh-search-wrapper">
            <span className="qh-search-icon">🔍</span>
            <input
              type="text"
              className="qh-search-input"
              placeholder="Search queries, responses, intents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search saved queries"
            />
            {searchQuery && (
              <button
                className="qh-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          <div className="qh-filters">
            <select
              className="qh-filter-select"
              value={filterDomain}
              onChange={(e) => setFilterDomain(e.target.value)}
              aria-label="Filter by domain"
            >
              <option value="all">All Domains</option>
              {uniqueDomains.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              className="qh-filter-select"
              value={filterSentiment}
              onChange={(e) => setFilterSentiment(e.target.value)}
              aria-label="Filter by sentiment"
            >
              <option value="all">All Sentiments</option>
              {uniqueSentiments.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="qh-content">
          {historyLoading && (
            <div className="qh-empty">
              <div className="qh-spinner" style={{ borderTopColor: accent }} />
              <span>Loading saved queries...</span>
            </div>
          )}

          {historyError && (
            <div className="qh-empty qh-error">
              <span>⚠ {historyError}</span>
              <span className="qh-error-hint">
                Make sure the backend server is running.
              </span>
            </div>
          )}

          {!historyLoading && !historyError && filteredHistory.length === 0 && (
            <div className="qh-empty">
              <div className="qh-empty-icon">
                {searchQuery ? "🔍" : "📭"}
              </div>
              <span>
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : "No saved queries yet"}
              </span>
              <span className="qh-empty-hint">
                {searchQuery
                  ? "Try a different search term or clear filters."
                  : "Send a message to start building your history."}
              </span>
            </div>
          )}

          {!historyLoading &&
            !historyError &&
            Object.keys(grouped).length > 0 &&
            Object.entries(grouped).map(([domain, items]) => (
              <div key={domain} className="qh-domain-group">
                <div className="qh-domain-label">
                  {domain.toUpperCase()}
                  <span className="qh-domain-count">{items.length}</span>
                </div>
                {items.map((item) => {
                  const sentConf =
                    SENTIMENT_CONFIG[item.sentiment] ||
                    SENTIMENT_CONFIG.neutral;
                  return (
                    <div
                      key={item.id}
                      className="qh-item"
                      onClick={() => onReplay && onReplay(item.user_message)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          onReplay && onReplay(item.user_message);
                      }}
                    >
                      <div className="qh-item-query">
                        <span
                          className="qh-item-icon"
                          style={{ color: accent }}
                        >
                          {INTENT_ICONS[item.intent] || "◈"}
                        </span>
                        <span className="qh-item-text">
                          {item.user_message}
                        </span>
                      </div>
                      <div className="qh-item-meta">
                        <span
                          className="qh-tag"
                          style={{
                            color: sentConf.color,
                            background: sentConf.color + "12",
                            borderColor: sentConf.color + "30",
                          }}
                        >
                          {sentimentIcon(item.sentiment)} {item.sentiment}
                        </span>
                        <span className="qh-tag">
                          {item.intent?.replace("_", " ")}
                        </span>
                        {item.requires_escalation && (
                          <span
                            className="qh-tag"
                            style={{
                              color: C.red,
                              background: C.red + "12",
                              borderColor: C.red + "30",
                            }}
                          >
                            HITL
                          </span>
                        )}
                        <span className="qh-tag qh-tag-dim">
                          {item.language}
                        </span>
                        <span className="qh-time">
                          {formatTime(item.created_at)}
                        </span>
                      </div>
                      <div className="qh-item-response">
                        {item.response?.slice(0, 120)}
                        {item.response?.length > 120 ? "…" : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
        </div>

        {/* Footer stats */}
        {history.length > 0 && (
          <div className="qh-footer">
            <span className="qh-stat">📊 {history.length} total</span>
            <span className="qh-stat">
              ⚡ {history.filter((h) => h.requires_escalation).length} escalated
            </span>
            <span className="qh-stat">
              🌐 {[...new Set(history.map((h) => h.language))].length} languages
            </span>
            <span className="qh-footer-shortcut">
              <kbd>Ctrl</kbd>+<kbd>H</kbd>
            </span>
          </div>
        )}
      </aside>
    </div>
  );
}
