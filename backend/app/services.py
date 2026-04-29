import re
import math
import httpx
from langdetect import detect, LangDetectException, DetectorFactory
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

DetectorFactory.seed = 0


PII_PATTERNS = [
    (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "SSN"),
    (re.compile(r"\b\d{16}\b"), "Credit Card"),
    (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"), "Email"),
    (re.compile(r"\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b"), "Phone"),
]

LANG_MAP = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "hi": "Hindi",
    "ar": "Arabic",
    "pt": "Portuguese",
    "zh-cn": "Chinese",
    "zh-tw": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "ru": "Russian",
    "it": "Italian",
}

SENTIMENT = SentimentIntensityAnalyzer()


def detect_language(text: str) -> str:
    """Detect language with heuristics for short strings and common keywords."""
    lower = text.lower().strip()
    
    # Heuristic 1: Very short strings or common English greetings
    common_en = {"hello", "hi", "hey", "help", "thanks", "thank you", "bye", "test"}
    if len(lower) < 5 or lower in common_en:
        return "English"

    # Heuristic 2: Only ASCII characters usually implies English in this context
    if all(ord(c) < 128 for c in text) and len(text.split()) < 4:
        return "English"

    try:
        code = detect(text)
    except LangDetectException:
        return "English"
    
    return LANG_MAP.get(code, code)


def detect_sentiment(text: str) -> tuple[str, float]:
    """Detect sentiment using VADER with fine-grained categories."""
    score = SENTIMENT.polarity_scores(text)["compound"]
    normalized = (score + 1) / 2
    if score <= -0.75:
        return "very_frustrated", max(0.0, normalized)
    if score <= -0.35:
        return "frustrated", max(0.0, normalized)
    if score < -0.1:
        return "negative", max(0.0, normalized)
    if score < 0.25:
        return "neutral", max(0.0, normalized)
    return "positive", min(1.0, normalized)


def scrub_pii(text: str) -> tuple[str, list[str]]:
    """Scan and redact PII using regex patterns (contextual masking)."""
    scrubbed = text
    hits: list[str] = []
    for pattern, label in PII_PATTERNS:
        if pattern.search(scrubbed):
            hits.append(label)
            scrubbed = pattern.sub(f"[{label.upper()} REDACTED]", scrubbed)
    return scrubbed, hits


def extract_intent(text: str) -> str:
    """Rule-based intent classification with expanded keyword coverage."""
    lower = text.lower()
    if any(w in lower for w in ["refund", "return", "policy", "eligibility", "warranty"]):
        return "policy_query"
    if any(w in lower for w in ["bill", "invoice", "payment", "charged", "fee", "cost", "price"]):
        return "billing"
    if any(w in lower for w in ["urgent", "emergency", "911", "critical", "immediately"]):
        return "emergency"
    if any(w in lower for w in ["angry", "complaint", "frustrated", "bad service", "terrible", "worst"]):
        return "complaint"
    if any(w in lower for w in ["order", "track", "shipment", "delivery", "shipping", "dispatch"]):
        return "order_status"
    if any(w in lower for w in ["appointment", "schedule", "book", "reserve", "slot"]):
        return "scheduling"
    if any(w in lower for w in ["account", "login", "password", "sign up", "register"]):
        return "account"
    return "general"


def compute_routing_score(text: str, intent: str, sentiment: str) -> tuple[str, float]:
    """
    Simulate multi-model routing using a complexity heuristic.
    Returns (model_tier, complexity_score).

    In a production system, this would route to different LLMs:
    - "fast" → Llama-3-8B / Mistral-7B (simple queries)
    - "deep" → GPT-4o (complex reasoning, escalations)
    """
    score = 0.0

    # Query length complexity
    word_count = len(text.split())
    score += min(word_count / 50.0, 0.3)

    # Intent complexity
    complex_intents = {"complaint", "emergency", "billing", "policy_query"}
    if intent in complex_intents:
        score += 0.25

    # Sentiment complexity (frustrated users need more careful responses)
    if sentiment in {"very_frustrated", "frustrated"}:
        score += 0.25
    elif sentiment == "negative":
        score += 0.1

    # Multi-sentence queries are more complex
    sentence_count = max(1, text.count(".") + text.count("?") + text.count("!"))
    if sentence_count > 2:
        score += 0.15

    score = min(score, 1.0)

    # Threshold: if complexity > 0.4, route to deep model
    model = "deep" if score > 0.4 else "fast"
    return model, round(score, 3)


def expand_query(text: str) -> list[str]:
    """
    Generate query variants for multi-query retrieval.
    In production, an LLM would rewrite these. Here we use heuristic expansion.
    """
    expansions = []
    lower = text.lower().strip()

    # Remove question marks and normalize
    clean = lower.rstrip("?").strip()

    # Expansion 1: Add contextual framing
    if any(w in lower for w in ["how", "what", "where", "when", "why"]):
        expansions.append(f"Detailed explanation: {clean}")
    else:
        expansions.append(f"Information about: {clean}")

    # Expansion 2: Rephrase as an instruction
    expansions.append(f"Please provide the policy and procedure for {clean}")

    # Expansion 3: Add domain context
    if "order" in lower or "track" in lower:
        expansions.append(f"Order tracking and shipment status for customer query: {clean}")
    elif "refund" in lower or "return" in lower:
        expansions.append(f"Return and refund policy details regarding: {clean}")
    elif "bill" in lower or "payment" in lower:
        expansions.append(f"Billing and payment processing information for: {clean}")
    elif "appointment" in lower or "schedule" in lower:
        expansions.append(f"Scheduling and appointment booking process for: {clean}")
    else:
        expansions.append(f"Customer support knowledge base entry for: {clean}")

    return expansions


def rerank_documents(query: str, documents: list, top_k: int = 3) -> list:
    """
    Lightweight cross-encoder simulation using keyword overlap + TF scoring.
    In production, a cross-encoder model (e.g., ms-marco-MiniLM) would be used.

    Reranks top-N retrieved docs down to top_k most relevant.
    """
    if not documents:
        return []

    query_tokens = set(query.lower().split())

    scored = []
    for doc in documents:
        content_tokens = set(doc.page_content.lower().split())

        # Jaccard-like keyword overlap
        overlap = len(query_tokens & content_tokens)
        union = len(query_tokens | content_tokens) or 1
        keyword_score = overlap / union

        # Term frequency boost: how many query terms appear in the doc
        tf_score = sum(1 for t in query_tokens if t in doc.page_content.lower()) / (len(query_tokens) or 1)

        # Combined score
        relevance = 0.4 * keyword_score + 0.6 * tf_score
        scored.append((relevance, doc))

    # Sort by relevance descending
    scored.sort(key=lambda x: x[0], reverse=True)
    return [doc for _, doc in scored[:top_k]]


async def maybe_call_tool(text: str, enabled: bool = True) -> list[str]:
    """Execute external tool calls based on query content."""
    if not enabled:
        return []

    tool_events: list[str] = []
    match = re.search(r"\b(?:order|track)\s*#?(\d+)\b", text.lower())
    if not match:
        return tool_events

    order_id = match.group(1)
    async with httpx.AsyncClient() as client:
        try:
            # Demo external API integration. This simulates order lookup.
            res = await client.get(f"https://dummyjson.com/carts/{order_id}", timeout=4.0)
            if res.status_code == 200:
                payload = res.json()
                total = payload.get("total", "N/A")
                products = len(payload.get("products", []))
                tool_events.append(f"tool:order_lookup success id={order_id} items={products} total={total}")
            else:
                tool_events.append(f"tool:order_lookup failed id={order_id} status={res.status_code}")
        except httpx.HTTPError as err:
            tool_events.append(f"tool:order_lookup error id={order_id} reason={err}")
    return tool_events
