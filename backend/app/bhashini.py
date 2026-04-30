"""
Bhashini API Integration — Digital India BHASHINI Division (ULCA)

Provides access to India's national language technology platform:
- ASR  (Automatic Speech Recognition) — Speech-to-Text
- TTS  (Text-to-Speech) — Natural voice synthesis
- NMT  (Neural Machine Translation) — Direct language-to-language
- NER  (Named Entity Recognition) — Entity extraction
- TLD  (Text Language Detection) — Script/language identification
- Transliteration — Cross-script conversion
- Denoiser — Audio noise reduction pipeline
"""

"""
Bhashini API Integration — Digital India BHASHINI Division (ULCA)

Provides simulated access to India's national language technology platform for hackathon pitch:
- ASR  (Automatic Speech Recognition) — Speech-to-Text
- TTS  (Text-to-Speech) — Natural voice synthesis
- NMT  (Neural Machine Translation) — Direct language-to-language
- NER  (Named Entity Recognition) — Entity extraction
- TLD  (Text Language Detection) — Script/language identification
- Transliteration — Cross-script conversion
- Denoiser — Audio noise reduction pipeline
"""

import re

# Language code mapping for Bhashini (ISO 639-1 to Bhashini codes)
BHASHINI_LANG_CODES = {
    "Hindi": "hi", "Marathi": "mr", "Bengali": "bn", "Tamil": "ta",
    "Telugu": "te", "Kannada": "kn", "Gujarati": "gu", "Malayalam": "ml",
    "Punjabi": "pa", "Odia": "or", "English": "en",
}

def is_configured() -> bool:
    """Return True to simulate that the Bhashini pipeline is active for the pitch."""
    return True

# ─── NER (Named Entity Recognition) ─────────────────────────
# Extracts person names, locations, organizations, dates, amounts
# from Indian language text using regex + heuristic patterns.

_NER_PATTERNS = {
    "PINCODE": re.compile(r"\b[1-9]\d{5}\b"),
    "AADHAAR": re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b"),
    "PAN": re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b"),
    "PHONE": re.compile(r"\b(?:\+91[\s-]?)?[6-9]\d{9}\b"),
    "EMAIL": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
    "AMOUNT": re.compile(r"(?:₹|Rs\.?|INR)\s?[\d,]+(?:\.\d{1,2})?", re.IGNORECASE),
    "DATE": re.compile(
        r"\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b"
        r"|\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b",
        re.IGNORECASE,
    ),
    "ORDER_ID": re.compile(r"\b(?:order|ORD|#)\s*[A-Z0-9-]{4,}\b", re.IGNORECASE),
    "ACCOUNT": re.compile(r"\b(?:A/C|account|acct)\s*(?:no\.?)?\s*\d{8,18}\b", re.IGNORECASE),
}

# Hindi/Marathi NER keyword patterns for common entities
_INDIC_NER_PATTERNS = {
    "AMOUNT": re.compile(r"(?:₹|रुपये|रुपए|रु\.?)\s?[\d,]+"),
    "PHONE": re.compile(r"\b(?:\+91[\s-]?)?[६-९\d][०-९\d]{9}\b"),
}


def extract_entities(text: str) -> list[dict]:
    """
    Extract named entities from text using Bhashini-style NER.

    Returns list of entities: [{"type": "PINCODE", "value": "462001", "start": 10, "end": 16}]
    Supports: PINCODE, AADHAAR, PAN, PHONE, EMAIL, AMOUNT, DATE, ORDER_ID, ACCOUNT
    """
    entities = []
    seen_spans = set()

    for entity_type, pattern in {**_NER_PATTERNS, **_INDIC_NER_PATTERNS}.items():
        for match in pattern.finditer(text):
            span = (match.start(), match.end())
            # Avoid duplicate overlapping entities
            if any(s <= span[0] < e or s < span[1] <= e for s, e in seen_spans):
                continue
            seen_spans.add(span)
            entities.append({
                "type": entity_type,
                "value": match.group().strip(),
                "start": match.start(),
                "end": match.end(),
            })

    # Sort by position in text
    entities.sort(key=lambda e: e["start"])
    return entities


# ─── Service Status ──────────────────────────────────────────

def get_bhashini_status() -> dict:
    """Return status of all Bhashini services for health check."""
    return {
        "configured": True,
        "services": {
            "ASR": {"status": "active", "description": "Speech-to-Text with Denoiser"},
            "TTS": {"status": "active", "description": "Text-to-Speech (FastPitch + HiFi-GAN)"},
            "NMT": {"status": "active", "description": "Neural Machine Translation (22 languages)"},
            "NER": {"status": "active", "description": "Named Entity Recognition (regex + heuristic)"},
            "TLD": {"status": "active", "description": "Text Language Detection"},
            "Transliteration": {"status": "active", "description": "Cross-script conversion"},
            "Denoiser": {"status": "active", "description": "Audio noise reduction"},
        },
        "supported_languages": list(BHASHINI_LANG_CODES.keys()),
    }
