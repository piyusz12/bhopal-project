import re
import httpx
from langdetect import detect, LangDetectException
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer


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
}

SENTIMENT = SentimentIntensityAnalyzer()


def detect_language(text: str) -> str:
    try:
        code = detect(text)
    except LangDetectException:
        return "English"
    return LANG_MAP.get(code, code)


def detect_sentiment(text: str) -> tuple[str, float]:
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
    scrubbed = text
    hits: list[str] = []
    for pattern, label in PII_PATTERNS:
        if pattern.search(scrubbed):
            hits.append(label)
            scrubbed = pattern.sub(f"[{label.upper()} REDACTED]", scrubbed)
    return scrubbed, hits


def extract_intent(text: str) -> str:
    lower = text.lower()
    if any(w in lower for w in ["refund", "return", "policy", "eligibility"]):
        return "policy_query"
    if any(w in lower for w in ["bill", "invoice", "payment", "charged"]):
        return "billing"
    if any(w in lower for w in ["urgent", "emergency", "911"]):
        return "emergency"
    if any(w in lower for w in ["angry", "complaint", "frustrated", "bad service"]):
        return "complaint"
    if any(w in lower for w in ["order", "track", "shipment", "delivery"]):
        return "order_status"
    return "general"


async def maybe_call_tool(text: str, enabled: bool = True) -> list[str]:
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

