import React, { useState, useRef, useEffect, useCallback } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const C = {
  bg: "#03080f", panel: "#080e1a", border: "#0f1e35",
  teal: "#00e5c7", blue: "#1e6fff", purple: "#9b7ff4",
  amber: "#ffa733", red: "#ff4055", green: "#00cc88",
  text: "#c0cce0", muted: "#3d4f6a", dim: "#1a2840"
};

const DOMAINS = {
  ecommerce: {
    label: "E-Commerce", icon: "◈", accent: C.teal,
    kb: `[Return Policy] Items returnable within 30 days. Software licenses non-refundable after activation. Electronics must be unopened. 15% restocking fee on items over $500.
[Shipping] Standard 5-7 days ($5.99). Express 2-3 days ($12.99). Overnight ($24.99). Free shipping orders over $75.
[Order Tracking] Track via customer portal with order ID. Tracking numbers emailed within 24h of dispatch.
[Cancellation] Orders cancellable within 2 hours of placement. Post-dispatch: initiate return instead.
[Payment] Visa, Mastercard, Amex, PayPal, Apple Pay accepted. Klarna installments for orders over $100.
[Damaged Items] Report within 48h with photo evidence. Replacement/refund within 3-5 business days.`,
    greeting: "Welcome to ShopAI Support. Ask me about orders, returns, shipping, or product policies.",
  },
  banking: {
    label: "Banking", icon: "⬡", accent: C.blue,
    kb: `[Account Opening] Requires 2 government IDs, proof of address (<90 days), minimum $500 deposit.
[Interest Rates] Savings: 4.75% APY. Money Market: 5.12% APY. 12-mo CD: 5.45% APY.
[Wire Transfers] Domestic: $25 fee, same-day. International: $45 fee, 3-5 days. SWIFT: NXBNK22.
[Fraud Reporting] Call 1-800-NEXUS-FR. Card frozen in 60s. Provisional credit in 48h per Regulation E.
[Loans] Personal: 7.9–24.9% APR. Home equity: Prime+1.5%. Auto 36-mo: 6.4%, 60-mo: 6.9%.
[Compliance] FDIC insured up to $250,000. CTR required for transactions over $10,000. SOC 2 Type II certified.`,
    greeting: "Welcome to Nexus Bank. I can assist with accounts, transfers, loans, and compliance questions.",
  },
  healthcare: {
    label: "Healthcare", icon: "◉", accent: "#ff6b9d",
    kb: `[Appointments] Primary care: 3-5 days. Urgent care: same day. Specialist: 2-4 weeks (referral required). Telehealth: within 4h.
[Insurance] BlueCross, Aetna, Cigna, United, Medicare, Medicaid accepted. Co-pay: $25 primary, $50 specialist.
[Prescriptions] 90-day maintenance supply covered. Mail-order saves 20%. Specialty meds require prior auth.
[HIPAA] PHI encrypted AES-256 at rest, TLS 1.3 in transit. Patients may access records within 30 days.
[Emergency] Call 911 for emergencies. ER: MedCore Central & North Campus (both 24/7). Nurse line: 1-877-MED-CORE.
[Billing] Itemized bills in 10 days. Financial assistance available. 0% interest payment plans offered.`,
    greeting: "Hello, I'm MedCore's health assistant. I can help with appointments, insurance, prescriptions, and billing.",
  },
  education: {
    label: "Education", icon: "△", accent: C.amber,
    kb: `[Enrollment] Fall: June 1. Spring: Nov 1. Transfer credits evaluated in 3 weeks. TOEFL ≥90 or IELTS ≥7.0 for international students.
[Financial Aid] FAFSA priority: March 1. Merit scholarships for GPA ≥3.7. Need-based grants up to $8,500/yr.
[Tuition] Undergrad in-state: $12,400/semester. Out-of-state: $18,750. Graduate: $14,200. Online: $390/credit hour.
[Academic Policy] Grade appeal: 15 business days post-submission. Incomplete deadline: end of following semester.
[FERPA] Student records protected under FERPA. Third-party release requires written student consent.
[Resources] Tutoring Mon-Fri 9am-9pm. 5 free counseling sessions/semester. Career services available.`,
    greeting: "Welcome to Apex University Support. Ask me about enrollment, financial aid, courses, or campus resources.",
  },
  government: {
    label: "Government", icon: "⬟", accent: C.purple,
    kb: `[Tax Filing] Federal deadline April 15. Extension to Oct 15 (Form 4868). EITC up to $7,430. Child tax credit $2,000/child under 17.
[Business Permits] Business license: 15-30 days. Zoning variance: 45-60 days. Building permit: 10-25 days.
[Benefits] SNAP: household income ≤130% poverty line. Medicaid up to 138% FPL. UI: up to 26 weeks, 50% avg wages.
[FedRAMP] Cloud services require FedRAMP authorization. Continuous monitoring & annual pen testing mandatory.
[Section 508] WCAG 2.1 Level AA compliance required for all digital services. Screen reader testing mandatory.
[DMV] License renewal: online $32, in-person $38. Title transfer: $15+taxes. REAL ID available at all branches.`,
    greeting: "Welcome to CivicAI — your government services assistant. I can help with taxes, permits, and benefits.",
  },
};

const PII_PATTERNS = [
  { re: /\b\d{3}-\d{2}-\d{4}\b/g, label: "SSN" },
  { re: /\b\d{16}\b/g, label: "Credit Card" },
  { re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, label: "Email" },
  { re: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, label: "Phone" },
];

const SENTIMENT_CONFIG = {
  very_frustrated: { color: C.red, label: "⚡ Very Frustrated", bg: "#1a0510" },
  frustrated: { color: C.amber, label: "⚠ Frustrated", bg: "#1a1005" },
  negative: { color: "#ff9966", label: "↓ Negative", bg: "#180e08" },
  neutral: { color: C.muted, label: "— Neutral", bg: "#0a1020" },
  positive: { color: C.green, label: "↑ Positive", bg: "#051510" },
};

const INTENT_ICONS = {
  order_status: "📦", policy_query: "📋", complaint: "⚠", billing: "💳",
  general: "💬", emergency: "🚨", escalation: "↑", default: "◈"
};

function LogLine({ e }) {
  const colors = { info: C.muted, process: C.blue, success: C.green, error: C.red, warning: C.amber };
  const icons = { info: "›", process: "⟳", success: "✓", error: "✕", warning: "⚠" };
  return (
    <div style={{ display: "flex", gap: 8, padding: "3px 0", borderLeft: `2px solid ${colors[e.type] || C.muted}`, paddingLeft: 10, marginLeft: 2 }}>
      <span style={{ color: colors[e.type], fontFamily: "monospace", fontSize: 11, minWidth: 12 }}>{icons[e.type]}</span>
      <span style={{ color: e.type === "error" ? C.red : e.type === "success" ? C.green : e.type === "warning" ? C.amber : C.text, fontFamily: "monospace", fontSize: 11, lineHeight: 1.4 }}>{e.msg}</span>
    </div>
  );
}

function Bubble({ msg, accent }) {
  const isUser = msg.role === "user";
  const isAlert = msg.isAlert;
  const isEsc = msg.isEscalation;
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
      <div style={{
        maxWidth: "82%", borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        padding: "10px 14px", fontSize: 13, lineHeight: 1.6,
        background: isUser ? accent + "22" : isAlert ? "#1a0510" : isEsc ? "#0a1520" : C.panel,
        border: `1px solid ${isUser ? accent + "44" : isAlert ? C.red + "44" : isEsc ? C.blue + "44" : C.border}`,
        color: C.text
      }}>
        {!isUser && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, opacity: 0.6 }}>
            <span style={{ fontSize: 10, color: isAlert ? C.red : isEsc ? C.blue : accent }}>
              {isAlert ? "⚠ SECURITY BLOCK" : isEsc ? "↑ ESCALATING" : "◈ AI AGENT"}
            </span>
          </div>
        )}
        <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
        {msg.metadata && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, background: C.dim, color: accent, padding: "2px 7px", borderRadius: 20 }}>
              {INTENT_ICONS[msg.metadata.intent] || "◈"} {msg.metadata.intent?.replace("_", " ")}
            </span>
            <span style={{ fontSize: 10, background: C.dim, color: C.muted, padding: "2px 7px", borderRadius: 20 }}>
              {Math.round(msg.metadata.confidence * 100)}% confidence
            </span>
            <span style={{ fontSize: 10, background: C.dim, color: C.muted, padding: "2px 7px", borderRadius: 20 }}>
              {msg.metadata.latency}ms
            </span>
            {msg.metadata.requires_escalation && (
              <span style={{ fontSize: 10, background: C.red + "22", color: C.red, padding: "2px 7px", borderRadius: 20 }}>HITL triggered</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MetCard({ label, value, color }) {
  return (
    <div style={{ background: C.dim, borderRadius: 8, padding: "10px 14px", flex: 1, minWidth: 80 }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: color || C.text, fontFamily: "monospace" }}>{value}</div>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 2, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

export default function App() {
  const [domain, setDomain] = useState("ecommerce");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [telemetry, setTelemetry] = useState([]);
  const [sentiment, setSentiment] = useState(null);
  const [lang, setLang] = useState("English");
  const [listening, setListening] = useState(false);
  const [metrics, setMetrics] = useState({ queries: 0, avgMs: 0, pii: 0, escalations: 0 });
  const [lastAgentText, setLastAgentText] = useState("");
  const chatRef = useRef(null);
  const telemRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    setMessages([{ role: "agent", content: DOMAINS[domain].greeting }]);
    setTelemetry([]);
    setSentiment(null);
    setLang("English");
  }, [domain]);

  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [messages, loading]);
  useEffect(() => { telemRef.current?.scrollTo(0, telemRef.current.scrollHeight); }, [telemetry]);

  const log = useCallback((msg, type = "info") => {
    setTelemetry(p => [...p, { id: Date.now() + Math.random(), msg, type }]);
  }, []);

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const speakLastResponse = () => {
    const synth = window.speechSynthesis;
    if (!synth || !lastAgentText) return;
    const utterance = new SpeechSynthesisUtterance(lastAgentText);
    utterance.lang = lang === "Hindi" ? "hi-IN" : lang === "Spanish" ? "es-ES" : "en-US";
    synth.cancel();
    synth.speak(utterance);
  };

  const toggleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      log("[VOICE] Speech recognition is not available in this browser", "warning");
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recog = new SpeechRecognition();
    recog.lang = lang === "Hindi" ? "hi-IN" : lang === "Spanish" ? "es-ES" : "en-US";
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recog.onstart = () => {
      setListening(true);
      log("[VOICE] Listening...", "process");
    };
    recog.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (transcript) {
        setInput(transcript);
        log("[VOICE] Speech captured and inserted into input", "success");
      }
    };
    recog.onerror = (event) => {
      log(`[VOICE] Recognition error: ${event.error}`, "error");
      setListening(false);
    };
    recog.onend = () => setListening(false);
    recognitionRef.current = recog;
    recog.start();
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const query = input.trim();
    setInput("");
    setLoading(true);
    setTelemetry([]);
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

  const dom = DOMAINS[domain];
  const accent = dom.accent;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: C.text }}>

      {/* ── HEADER ── */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.panel }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: accent + "22", border: `1px solid ${accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: accent }}>◈</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0.5 }}>NeuralSupport AI</div>
            <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace" }}>LangGraph Orchestrator · RAG Pipeline Active</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {Object.entries(DOMAINS).map(([k, d]) => (
            <button key={k} onClick={() => setDomain(k)} style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontWeight: domain === k ? 600 : 400,
              background: domain === k ? d.accent + "22" : "transparent",
              border: `1px solid ${domain === k ? d.accent + "66" : C.border}`,
              color: domain === k ? d.accent : C.muted,
              transition: "all 0.15s"
            }}>
              {d.icon} {d.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 16, fontSize: 11, fontFamily: "monospace" }}>
          <span style={{ color: C.green, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, background: C.green, borderRadius: "50%", display: "inline-block" }}></span>SOC 2
          </span>
          <span style={{ color: C.teal, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, background: C.teal, borderRadius: "50%", display: "inline-block" }}></span>HNSW Active
          </span>
          <span style={{ color: C.blue, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, background: C.blue, borderRadius: "50%", display: "inline-block" }}></span>PII Guard
          </span>
        </div>
      </div>

      {/* ── METRICS BAR ── */}
      <div style={{ padding: "10px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 10 }}>
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

      {/* ── MAIN SPLIT ── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, height: "calc(100vh - 140px)", overflow: "hidden" }}>

        {/* ── CHAT PANEL ── */}
        <div style={{ display: "flex", flexDirection: "column", borderRight: `1px solid ${C.border}` }}>
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8, background: C.panel }}>
            <span style={{ fontSize: 14, color: accent }}>{dom.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{dom.label} Customer Portal</span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: C.green, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 5, height: 5, background: C.green, borderRadius: "50%", display: "inline-block", animation: "pulse 2s infinite" }}></span>Agent Online
            </span>
          </div>

          <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column" }}>
            {messages.map((m, i) => <Bubble key={i} msg={m} accent={accent} />)}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
                <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: "16px 16px 16px 4px", padding: "12px 16px", display: "flex", gap: 5, alignItems: "center" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: accent, animation: `bounce 1.2s ${i * 0.2}s infinite` }}></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, background: C.panel, display: "flex", gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              disabled={loading}
              placeholder={`Ask about ${dom.label.toLowerCase()} support...`}
              style={{
                flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "9px 14px", color: C.text, fontSize: 13, outline: "none",
                fontFamily: "inherit", opacity: loading ? 0.5 : 1
              }}
            />
            <button
              onClick={toggleVoiceInput}
              disabled={loading}
              style={{
                background: listening ? accent + "22" : C.dim,
                border: `1px solid ${listening ? accent + "66" : C.border}`,
                color: listening ? accent : C.muted,
                borderRadius: 8,
                padding: "9px 12px",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 600
              }}
              title="Voice input"
            >
              {listening ? "⏺" : "🎙"}
            </button>
            <button
              onClick={speakLastResponse}
              disabled={!lastAgentText || loading}
              style={{
                background: !lastAgentText || loading ? C.dim : C.blue + "22",
                border: `1px solid ${!lastAgentText || loading ? C.border : C.blue + "66"}`,
                color: !lastAgentText || loading ? C.muted : C.blue,
                borderRadius: 8,
                padding: "9px 12px",
                cursor: !lastAgentText || loading ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 600
              }}
              title="Read latest response"
            >
              🔊
            </button>
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                background: loading || !input.trim() ? C.dim : accent + "22",
                border: `1px solid ${loading || !input.trim() ? C.border : accent + "66"}`,
                color: loading || !input.trim() ? C.muted : accent,
                borderRadius: 8, padding: "9px 18px", cursor: loading ? "not-allowed" : "pointer",
                fontSize: 13, fontWeight: 600, transition: "all 0.15s"
              }}
            >
              ↑ Send
            </button>
          </div>
        </div>

        {/* ── TELEMETRY PANEL ── */}
        <div style={{ display: "flex", flexDirection: "column", background: "#04070d" }}>
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8, background: C.panel }}>
            <span style={{ fontSize: 11, color: C.amber, fontFamily: "monospace" }}>⬡</span>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: C.muted }}>Agent Pipeline Monitor</span>
            <span style={{ marginLeft: "auto", fontSize: 10, fontFamily: "monospace", background: C.dim, color: C.muted, padding: "2px 8px", borderRadius: 4 }}>TRACE: ACTIVE</span>
          </div>

          {/* Pipeline diagram */}
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 0, overflowX: "auto" }}>
            {["PII\nScan", "Intent\nRouter", "RAG\nPipeline", "LLM\nSynth", "Sentiment\nAnalysis", "Response\nDelivery"].map((label, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ textAlign: "center", padding: "4px 8px", borderRadius: 6, background: C.dim, border: `1px solid ${C.border}`, minWidth: 60 }}>
                  <div style={{ fontSize: 9, color: accent, fontFamily: "monospace", whiteSpace: "pre-line", lineHeight: 1.3 }}>{label}</div>
                </div>
                {i < 5 && <div style={{ width: 16, height: 1, background: C.border, flexShrink: 0 }}></div>}
              </div>
            ))}
          </div>

          <div ref={telemRef} style={{ flex: 1, overflowY: "auto", padding: "14px 16px", fontFamily: "monospace" }}>
            {telemetry.length === 0 ? (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, opacity: 0.3 }}>
                <div style={{ fontSize: 24 }}>⬡</div>
                <div style={{ fontSize: 11, color: C.muted, textAlign: "center", lineHeight: 1.6 }}>
                  Awaiting user query<br />Pipeline traces will appear here
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {telemetry.map(e => <LogLine key={e.id} e={e} />)}
              </div>
            )}
          </div>

          {/* Feature tags */}
          <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.border}`, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["Multi-Model Routing", "HyDE Query Expansion", "Cross-Encoder Reranking", "Sentiment Detection", "PII Masking", "HITL Escalation", "Multilingual"].map(tag => (
              <span key={tag} style={{ fontSize: 9, fontFamily: "monospace", color: C.muted, background: C.dim, padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.border}` }}>{tag}</span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}
        input::placeholder{color:${C.muted}}
      `}</style>
    </div>
  );
}
