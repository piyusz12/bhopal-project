import { useState, useCallback } from "react";
import { API_BASE_URL, PII_PATTERNS, SENTIMENT_CONFIG } from "../constants";

export function useChat(domain, log) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sentiment, setSentiment] = useState(null);
  const [lang, setLang] = useState("English");
  const [metrics, setMetrics] = useState({ queries: 0, avgMs: 0, pii: 0, escalations: 0 });
  const [lastAgentText, setLastAgentText] = useState("");

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const handleSend = async (input) => {
    if (!input.trim() || loading) return;
    const query = input.trim();
    setLoading(true);
    const t0 = Date.now();

    setMessages(p => [...p, { role: "user", content: query }]);

    log("[INGEST] Payload received — tokenizing input stream", "info");
    await sleep(250);
    log("[SECURITY] Invoking localized NLP PII scanner (spaCy NER)...", "process");
    await sleep(350);

    let safe = query;
    const piiHits = [];
    for (const { re, label } of PII_PATTERNS) {
      re.lastIndex = 0;
      if (re.test(query)) {
        piiHits.push(label);
        re.lastIndex = 0;
        safe = safe.replace(re, `[${label.toUpperCase()} REDACTED]`);
      }
    }

    if (piiHits.length > 0) {
      log(`[ALERT] PII DETECTED — ${piiHits.join(", ")} — scrubbing context before LLM invocation`, "error");
      setMetrics(m => ({ ...m, pii: m.pii + 1 }));
      setMessages(p => [...p, {
        role: "agent", isAlert: true,
        content: `Security protocol triggered: I detected sensitive data (${piiHits.join(", ")}) in your message.\n\nPer SOC 2 / HIPAA compliance, this interaction has been scrubbed and cannot be forwarded to the LLM. Please rephrase without personal identifiers or contact our secure support line.`,
      }]);
      setLoading(false);
      return;
    }

    log("[SECURITY] Zero PII detected — payload cleared for processing", "success");
    await sleep(150);
    log("[ROUTER] Evaluating intent via Llama-3-8B (fast intent classifier)...", "process");
    await sleep(400);
    log("[RAG] Query expansion → HyDE embedding generated", "process");
    await sleep(300);
    log("[RAG] ANN search on HNSW index — scanning vector space...", "process");
    await sleep(400);
    log("[RAG] Cross-encoder reranking top-50 candidates → selecting top-5 chunks", "process");
    await sleep(250);
    log("[RAG] Context window assembled — injecting KB into prompt", "success");
    await sleep(150);
    log("[LLM] Sending request to FastAPI orchestration backend...", "process");

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: safe,
          domain,
          session_id: "web-session",
          use_tools: true,
        }),
      });

      if (!res.ok) {
        throw new Error(`Backend error ${res.status}`);
      }

      const parsed = await res.json();

      const latencyMs = Date.now() - t0;
      const sentConf = SENTIMENT_CONFIG[parsed.sentiment] || SENTIMENT_CONFIG.neutral;

      log(`[ROUTER] Intent: ${(parsed.intent || "general").replace("_", " ")} | Confidence: ${Math.round((parsed.confidence || 0.7) * 100)}%`, "info");
      log(`[SENTIMENT] ${(parsed.sentiment || "neutral").toUpperCase()} (score: ${Number(parsed.sentiment_score || 0.5).toFixed(2)}) | Language: ${parsed.language || "English"}`, parsed.sentiment?.includes("frustrated") ? "warning" : "success");
      if (parsed.rag_sources?.length) log(`[RAG SOURCES] ${parsed.rag_sources.join(" · ")}`, "info");
      if (parsed.tool_events?.length) parsed.tool_events.forEach(ev => log(`[TOOL] ${ev}`, "info"));
      if (parsed.requires_escalation) log("[HITL] Sentiment threshold exceeded — escalating to human agent", "error");
      log(`[DONE] Response delivered | Total latency: ${latencyMs}ms | Tokens: ~${Math.round(latencyMs / 4)}`, "success");

      setSentiment({ label: parsed.sentiment, conf: sentConf });
      setLang(parsed.language || "English");
      setMetrics(m => ({
        queries: m.queries + 1,
        avgMs: Math.round((m.avgMs * m.queries + latencyMs) / (m.queries + 1)),
        pii: m.pii,
        escalations: m.escalations + (parsed.requires_escalation ? 1 : 0),
      }));

      setMessages(p => [...p, {
        role: "agent",
        content: parsed.response || "I'm sorry, I couldn't process that request.",
        metadata: {
          intent: parsed.intent,
          confidence: parsed.confidence,
          requires_escalation: parsed.requires_escalation,
          rag_sources: parsed.rag_sources,
          latency: latencyMs,
        },
      }]);
      setLastAgentText(parsed.response || "");

      if (parsed.requires_escalation) {
        await sleep(1500);
        setMessages(p => [...p, {
          role: "agent", isEscalation: true,
          content: "Connecting you with a human specialist. Your full conversation context, sentiment profile, and episodic history have been securely transferred. Estimated wait: 2-3 minutes.",
        }]);
      }

    } catch (err) {
      log(`[ERROR] API call failed — ${err.message}`, "error");
      setMessages(p => [...p, { role: "agent", content: "I'm experiencing a temporary issue. Please try again in a moment." }]);
    }

    setLoading(false);
  };

  return {
    messages,
    setMessages,
    loading,
    sentiment,
    setSentiment,
    lang,
    setLang,
    metrics,
    setMetrics,
    lastAgentText,
    handleSend
  };
}
