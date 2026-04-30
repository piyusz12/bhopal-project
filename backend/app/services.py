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
    # ─── Top 10 Indian Languages ───────────────────────────
    "hi": "Hindi",
    "mr": "Marathi",
    "bn": "Bengali",
    "ta": "Tamil",
    "te": "Telugu",
    "kn": "Kannada",
    "gu": "Gujarati",
    "ml": "Malayalam",
    "pa": "Punjabi",
    "or": "Odia",
    # ─── International Languages ───────────────────────────
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "ar": "Arabic",
    "pt": "Portuguese",
    "zh-cn": "Chinese",
    "zh-tw": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "ru": "Russian",
    "it": "Italian",
    "ur": "Urdu",
    "ne": "Nepali",
    "si": "Sinhala",
    "as": "Assamese",
}

# ─── Script-based detection using Unicode ranges ──────────
# These catch cases where langdetect may misidentify Indian languages
_SCRIPT_RANGES = [
    # (start, end, language)
    (0x0900, 0x097F, "Hindi"),       # Devanagari (Hindi, Marathi, Sanskrit, Nepali)
    (0x0980, 0x09FF, "Bengali"),     # Bengali / Assamese
    (0x0A00, 0x0A7F, "Punjabi"),     # Gurmukhi
    (0x0A80, 0x0AFF, "Gujarati"),    # Gujarati
    (0x0B00, 0x0B7F, "Odia"),        # Odia
    (0x0B80, 0x0BFF, "Tamil"),       # Tamil
    (0x0C00, 0x0C7F, "Telugu"),      # Telugu
    (0x0C80, 0x0CFF, "Kannada"),     # Kannada
    (0x0D00, 0x0D7F, "Malayalam"),   # Malayalam
]

# Common greetings & keywords in Indian languages for heuristic matching
_HINDI_KEYWORDS = {
    "नमस्ते", "मदद", "धन्यवाद", "कृपया", "हेल्प", "ऑर्डर", "रिफंड",
    "शिकायत", "भुगतान", "खाता", "बिल", "वापसी", "ट्रैक", "डिलीवरी",
    "शिपिंग", "सहायता", "जानकारी", "स्थिति", "समस्या", "हां", "नहीं",
}
_MARATHI_KEYWORDS = {
    "नमस्कार", "मदत", "धन्यवाद", "कृपया", "ऑर्डर", "तक्रार",
    "बिल", "परतावा", "खाते", "पैसे", "माहिती", "स्थिती", "समस्या",
    "डिलिव्हरी", "शिपिंग", "सहाय्य", "होय", "नाही", "पावती",
}

SENTIMENT = SentimentIntensityAnalyzer()


def _detect_script(text: str) -> str | None:
    """Detect language based on Unicode script of non-ASCII characters."""
    script_counts: dict[str, int] = {}
    for char in text:
        cp = ord(char)
        for start, end, lang in _SCRIPT_RANGES:
            if start <= cp <= end:
                script_counts[lang] = script_counts.get(lang, 0) + 1
                break

    if not script_counts:
        return None

    # Return the script with the most characters
    return max(script_counts, key=script_counts.get)


def _detect_hindi_vs_marathi(text: str) -> str:
    """Disambiguate Hindi vs Marathi since both use Devanagari script."""
    lower = text.lower()
    hi_score = sum(1 for kw in _HINDI_KEYWORDS if kw in lower)
    mr_score = sum(1 for kw in _MARATHI_KEYWORDS if kw in lower)

    # Marathi-specific characters: ळ (ḷa) is very common in Marathi but rare in Hindi
    if "ळ" in text:
        mr_score += 3

    # Common Marathi verb endings
    marathi_endings = ["ते", "ता", "णे", "ला", "ची", "चे", "चा"]
    for ending in marathi_endings:
        if text.endswith(ending) or f" {ending} " in text:
            mr_score += 1

    if mr_score > hi_score:
        return "Marathi"
    return "Hindi"


def detect_language(text: str) -> str:
    """
    Detect language with multilingual support for 10+ Indian languages.

    Detection strategy (priority order):
    1. Common English greetings (fast path)
    2. Unicode script-based detection (reliable for Indian scripts)
    3. Hindi vs Marathi disambiguation (both use Devanagari)
    4. langdetect library (statistical n-gram approach)
    5. Default to English
    """
    lower = text.lower().strip()

    # Heuristic 1: Very short ASCII strings or common English greetings
    common_en = {"hello", "hi", "hey", "help", "thanks", "thank you", "bye", "test",
                 "yes", "no", "ok", "okay", "sure", "done"}
    if len(lower) < 5 or lower in common_en:
        return "English"

    # Heuristic 2: Only ASCII characters usually implies English
    if all(ord(c) < 128 for c in text) and len(text.split()) < 4:
        return "English"

    # Heuristic 3: Script-based detection (very reliable for Indian languages)
    script_lang = _detect_script(text)
    if script_lang:
        # Devanagari is shared by Hindi, Marathi, Sanskrit, Nepali
        if script_lang == "Hindi":
            return _detect_hindi_vs_marathi(text)
        return script_lang

    # Heuristic 4: langdetect statistical detection
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
    """
    Rule-based intent classification with multilingual keyword coverage.
    Supports English, Hindi (हिन्दी), Marathi (मराठी), Bengali (বাংলা),
    Tamil (தமிழ்), and Telugu (తెలుగు) keywords.
    """
    lower = text.lower()

    # Policy / Refund / Return
    if any(w in lower for w in [
        "refund", "return", "policy", "eligibility", "warranty",
        "वापसी", "रिफंड", "नीति", "पॉलिसी", "वारंटी",             # Hindi
        "परतावा", "धोरण", "हमी",                                    # Marathi
        "ফেরত", "নীতি",                                             # Bengali
        "திரும்ப", "கொள்கை",                                         # Tamil
        "రిటర్న్", "విధానం",                                          # Telugu
    ]):
        return "policy_query"

    # Billing / Payment
    if any(w in lower for w in [
        "bill", "invoice", "payment", "charged", "fee", "cost", "price",
        "बिल", "भुगतान", "शुल्क", "कीमत", "चार्ज",                # Hindi
        "बिल", "पैसे", "शुल्क", "किंमत",                           # Marathi
        "বিল", "পেমেন্ট", "মূল্য",                                   # Bengali
        "கட்டணம்", "பில்",                                           # Tamil
        "బిల్లు", "చెల్లింపు",                                         # Telugu
    ]):
        return "billing"

    # Emergency
    if any(w in lower for w in [
        "urgent", "emergency", "911", "critical", "immediately",
        "आपातकालीन", "तुरंत", "जरूरी", "एमरजेंसी",                # Hindi
        "आणीबाणी", "तातडीचे",                                       # Marathi
        "জরুরি", "আপাতকালীন",                                       # Bengali
        "அவசரம்",                                                    # Tamil
        "అత్యవసరం",                                                  # Telugu
    ]):
        return "emergency"

    # Complaint
    if any(w in lower for w in [
        "angry", "complaint", "frustrated", "bad service", "terrible", "worst",
        "शिकायत", "गुस्सा", "खराब", "बेकार",                       # Hindi
        "तक्रार", "वाईट", "भयंकर",                                   # Marathi
        "অভিযোগ", "রাগ",                                             # Bengali
        "புகார்",                                                     # Tamil
        "ఫిర్యాదు",                                                   # Telugu
    ]):
        return "complaint"

    # Order Status / Tracking
    if any(w in lower for w in [
        "order", "track", "shipment", "delivery", "shipping", "dispatch",
        "ऑर्डर", "ट्रैक", "डिलीवरी", "शिपमेंट",                    # Hindi
        "ऑर्डर", "ट्रॅक", "डिलिव्हरी",                              # Marathi
        "অর্ডার", "ডেলিভারি", "ট্র্যাক",                             # Bengali
        "ஆர்டர்", "டெலிவரி",                                        # Tamil
        "ఆర్డర్", "డెలివరీ",                                          # Telugu
    ]):
        return "order_status"

    # Scheduling / Appointment
    if any(w in lower for w in [
        "appointment", "schedule", "book", "reserve", "slot",
        "अपॉइंटमेंट", "बुक", "समय", "स्लॉट",                       # Hindi
        "अपॉइंटमेंट", "बुक", "वेळ",                                  # Marathi
        "অ্যাপয়েন্টমেন্ট", "বুক",                                    # Bengali
        "முன்பதிவு", "நேரம்",                                        # Tamil
        "అపాయింట్మెంట్", "బుక్",                                      # Telugu
    ]):
        return "scheduling"

    # Account
    if any(w in lower for w in [
        "account", "login", "password", "sign up", "register",
        "खाता", "लॉगिन", "पासवर्ड", "रजिस्टर",                    # Hindi
        "खाते", "लॉगिन", "पासवर्ड", "नोंदणी",                      # Marathi
        "অ্যাকাউন্ট", "লগইন",                                       # Bengali
        "கணக்கு", "பதிவு",                                           # Tamil
        "ఖాతా", "లాగిన్",                                            # Telugu
    ]):
        return "account"

    return "general"


def compute_routing_score(text: str, intent: str, sentiment: str) -> tuple[str, float]:
    """
    Simulate multi-model routing using a complexity heuristic.
    Returns (model_tier, complexity_score).

    In a production system, this would route to different LLMs:
    - "fast" → Gemini 2.5 Flash (simple queries)
    - "deep" → Gemini 2.0 Pro (complex reasoning, escalations)
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
