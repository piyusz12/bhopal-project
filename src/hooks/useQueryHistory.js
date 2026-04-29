import { useState, useCallback, useEffect } from "react";
import { API_BASE_URL } from "../constants";

/**
 * Hook to fetch and manage saved query history from the backend database.
 * Provides persistent, cross-session conversation memory.
 */
export function useQueryHistory(sessionId = "web-session") {
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/chat/history?session_id=${encodeURIComponent(sessionId)}&limit=100`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHistory(data.messages || []);
    } catch (err) {
      setHistoryError(err.message);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [sessionId]);

  // Fetch on mount
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    historyLoading,
    historyError,
    refreshHistory: fetchHistory,
  };
}
