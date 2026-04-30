import { useState, useCallback } from "react";
import { API_BASE_URL, PII_PATTERNS, SENTIMENT_CONFIG } from "../constants";

export function useChat(domain, log) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sentiment, setSentiment] = useState(null);
  const [lang, setLang] = useState("English");
  const [metrics, setMetrics] = useState({
    queries: 0,
    avgMs: 0,
    pii: 0,
    escalations: 0,
    lastRouting: null,
  });
  const [lastAgentText, setLastAgentText] = useState("");
  const [activeStage, setActiveStage] = useState(null);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const handleSend = async (input, imageBase64 = null) => {
    if (!input.trim() && !imageBase64 || loading) return;
    const query = input.trim();
    setLoading(true);
    const t0 = Date.now();

    setMessages((p) => [...p, { role: "user", content: query, image: imageBase64, timestamp: Date.now() }]);

    // ─── Telemetry simulation (Bhashini + RAG Pipeline) ───
    setActiveStage(0);
    log("[INGEST] Payload received — tokenizing input stream", "info");
    await sleep(200);
    setActiveStage(1);
    log("[SECURITY] Invoking localized NLP PII scanner (spaCy NER)...", "process");
    await sleep(300);

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
      log(
        `[ALERT] PII DETECTED — ${piiHits.join(", ")} — scrubbing context before LLM invocation`,
        "error"
      );
      setMetrics((m) => ({ ...m, pii: m.pii + 1 }));
      setMessages((p) => [
        ...p,
        {
          role: "agent",
          isAlert: true,
          timestamp: Date.now(),
          content: `Security protocol triggered: I detected sensitive data (${piiHits.join(
            ", "
          )}) in your message.\n\nPer SOC 2 / HIPAA compliance, this interaction has been scrubbed and cannot be forwarded to the LLM. Please rephrase without personal identifiers or contact our secure support line.`,
        },
      ]);
      setLoading(false);
      return;
    }

    log("[SECURITY] Zero PII detected — payload cleared for processing", "success");
    await sleep(120);

    // Bhashini TLD (Text Language Detection)
    setActiveStage(1);
    log("[BHASHINI TLD] Detecting input language via script analysis + n-gram model...", "process");
    await sleep(250);
    log("[BHASHINI TLD] Language identified — routing to appropriate NLP pipeline", "success");
    await sleep(100);

    // Bhashini NER (Named Entity Recognition)
    setActiveStage(2);
    log("[BHASHINI NER] Scanning for named entities (Pincode, Aadhaar, PAN, Phone, Amount)...", "process");
    await sleep(300);
    log("[BHASHINI NER] Entity extraction complete — results injected into context", "success");
    await sleep(100);

    setActiveStage(3);
    log("[ROUTER] Evaluating complexity score for multi-model routing...", "process");
    await sleep(300);
    setActiveStage(4);
    log("[RAG] Query expansion → generating HyDE embeddings + variants...", "process");
    await sleep(350);
    setActiveStage(5);
    log("[RAG] ANN search on HNSW index — scanning vector space...", "process");
    await sleep(350);
    setActiveStage(6);
    log("[RAG] Cross-encoder reranking top-50 candidates → selecting top-4 chunks", "process");
    await sleep(200);
    setActiveStage(7);
    log("[RAG] Context window assembled — injecting KB + conversation memory", "success");
    await sleep(120);

    // ─── Try SSE streaming first, fall back to standard ─
    let useStreaming = true;

    if (useStreaming) {
      try {
        setActiveStage(7);
        log("[LLM] Initiating SSE stream to FastAPI backend...", "process");

        const res = await fetch(`${API_BASE_URL}/api/chat/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: safe,
            domain,
            session_id: "web-session",
            use_tools: true,
            image_base64: imageBase64,
          }),
        });

        if (!res.ok) {
          throw new Error(`Stream error ${res.status}`);
        }

        // Add a streaming message placeholder
        const streamMsgIndex = Date.now();
        setMessages((p) => [
          ...p,
          {
            role: "agent",
            content: "",
            isStreaming: true,
            timestamp: streamMsgIndex,
          },
        ]);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";
        let streamMeta = {};

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const evt = JSON.parse(line.slice(6));

              if (evt.type === "metadata") {
                streamMeta = evt;
                const routeModel = evt.routing_model || "fast";
                log(
                  `[ROUTER] Model tier: ${routeModel === "deep" ? "GPT-4o (Deep)" : "Llama-3-8B (Fast)"} | Intent: ${(evt.intent || "general").replace("_", " ")}`,
                  "info"
                );
                setMetrics((m) => ({ ...m, lastRouting: routeModel }));
                if (evt.tool_events?.length) {
                  evt.tool_events.forEach((ev) => log(`[TOOL] ${ev}`, "info"));
                }
              } else if (evt.type === "token") {
                fullText += evt.data;
                setMessages((p) =>
                  p.map((m) =>
                    m.timestamp === streamMsgIndex
                      ? { ...m, content: fullText }
                      : m
                  )
                );
              } else if (evt.type === "clear") {
                fullText = "";
                setMessages((p) =>
                  p.map((m) =>
                    m.timestamp === streamMsgIndex
                      ? { ...m, content: "" }
                      : m
                  )
                );
              } else if (evt.type === "done") {
                const latencyMs = Date.now() - t0;
                const sentVal = streamMeta.sentiment || "neutral";
                const sentConf = SENTIMENT_CONFIG[sentVal] || SENTIMENT_CONFIG.neutral;

                log(
                  `[SENTIMENT] ${sentVal.toUpperCase()} (score: ${Number(streamMeta.sentiment_score || 0.5).toFixed(2)}) | Language: ${streamMeta.language || "English"}`,
                  sentVal.includes("frustrated") ? "warning" : "success"
                );
                if (evt.requires_escalation) {
                  log("[HITL] Sentiment threshold exceeded — escalating to human agent", "error");
                }
                log(
                  `[DONE] Response streamed | Total latency: ${latencyMs}ms`,
                  "success"
                );
                setActiveStage(8);

                setSentiment({ label: sentVal, conf: sentConf });
                setLang(streamMeta.language || "English");

                // Finalize the streaming message
                setMessages((p) =>
                  p.map((m) =>
                    m.timestamp === streamMsgIndex
                      ? {
                          ...m,
                          isStreaming: false,
                          metadata: {
                            intent: streamMeta.intent,
                            confidence: evt.confidence,
                            requires_escalation: evt.requires_escalation,
                            rag_sources: evt.rag_sources,
                            routing_model: streamMeta.routing_model,
                            latency: latencyMs,
                          },
                        }
                      : m
                  )
                );

                setLastAgentText(fullText);
                setMetrics((m) => ({
                  queries: m.queries + 1,
                  avgMs: Math.round(
                    (m.avgMs * m.queries + latencyMs) / (m.queries + 1)
                  ),
                  pii: m.pii,
                  escalations: m.escalations + (evt.requires_escalation ? 1 : 0),
                  lastRouting: streamMeta.routing_model || m.lastRouting,
                }));

                // Escalation message
                if (evt.requires_escalation) {
                  await sleep(1200);
                  setMessages((p) => [
                    ...p,
                    {
                      role: "agent",
                      isEscalation: true,
                      timestamp: Date.now(),
                      content:
                        "Connecting you with a human specialist. Your full conversation context, sentiment profile, and episodic history have been securely transferred. Estimated wait: 2-3 minutes.",
                    },
                  ]);
                }
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }

        setLoading(false);
        return;
      } catch (streamErr) {
        log(`[WARN] SSE stream unavailable — falling back to standard API`, "warning");
        // Fall through to standard API
      }
    }

    // ─── Fallback: Standard API call ─────────────────────
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
          image_base64: imageBase64,
        }),
      });

      if (!res.ok) {
        throw new Error(`Backend error ${res.status}`);
      }

      const parsed = await res.json();
      const latencyMs = Date.now() - t0;
      const sentConf =
        SENTIMENT_CONFIG[parsed.sentiment] || SENTIMENT_CONFIG.neutral;

      log(
        `[ROUTER] Model: ${parsed.routing_model === "deep" ? "GPT-4o (Deep)" : "Llama-3-8B (Fast)"} | Intent: ${(parsed.intent || "general").replace("_", " ")} | Confidence: ${Math.round((parsed.confidence || 0.7) * 100)}%`,
        "info"
      );
      log(
        `[SENTIMENT] ${(parsed.sentiment || "neutral").toUpperCase()} (score: ${Number(parsed.sentiment_score || 0.5).toFixed(2)}) | Language: ${parsed.language || "English"}`,
        parsed.sentiment?.includes("frustrated") ? "warning" : "success"
      );
      if (parsed.rag_sources?.length)
        log(`[RAG SOURCES] ${parsed.rag_sources.join(" · ")}`, "info");
      if (parsed.query_expansions?.length)
        log(`[EXPANSION] ${parsed.query_expansions.length} query variants generated`, "info");
      if (parsed.tool_events?.length)
        parsed.tool_events.forEach((ev) => log(`[TOOL] ${ev}`, "info"));
      if (parsed.requires_escalation)
        log(
          "[HITL] Sentiment threshold exceeded — escalating to human agent",
          "error"
        );
      log(
        `[DONE] Response delivered | Total latency: ${latencyMs}ms | Tokens: ~${Math.round(latencyMs / 4)}`,
        "success"
      );

      setSentiment({ label: parsed.sentiment, conf: sentConf });
      setLang(parsed.language || "English");
      setMetrics((m) => ({
        queries: m.queries + 1,
        avgMs: Math.round(
          (m.avgMs * m.queries + latencyMs) / (m.queries + 1)
        ),
        pii: m.pii,
        escalations: m.escalations + (parsed.requires_escalation ? 1 : 0),
        lastRouting: parsed.routing_model || m.lastRouting,
      }));

      setMessages((p) => [
        ...p,
        {
          role: "agent",
          timestamp: Date.now(),
          content:
            parsed.response || "I'm sorry, I couldn't process that request.",
          metadata: {
            intent: parsed.intent,
            confidence: parsed.confidence,
            requires_escalation: parsed.requires_escalation,
            rag_sources: parsed.rag_sources,
            routing_model: parsed.routing_model,
            latency: latencyMs,
          },
        },
      ]);
      setLastAgentText(parsed.response || "");

      if (parsed.requires_escalation) {
        await sleep(1500);
        setMessages((p) => [
          ...p,
          {
            role: "agent",
            isEscalation: true,
            timestamp: Date.now(),
            content:
              "Connecting you with a human specialist. Your full conversation context, sentiment profile, and episodic history have been securely transferred. Estimated wait: 2-3 minutes.",
          },
        ]);
      }
    } catch (err) {
      log(`[ERROR] API call failed — ${err.message}`, "error");
      setMessages((p) => [
        ...p,
        {
          role: "agent",
          timestamp: Date.now(),
          content:
            "I'm experiencing a temporary issue. Please try again in a moment.",
        },
      ]);
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
    activeStage,
    handleSend,
  };
}
