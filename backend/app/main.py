import json
import os
import time
from collections import Counter
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from pydantic import ValidationError
from sqlalchemy.orm import Session
from sqlalchemy import func

from .kb import DOMAINS
from .rag import RagEngine
from .schemas import (
    ChatRequest, ChatResponse, HealthResponse,
    ChatHistoryResponse, ChatHistoryItem, MetricsResponse,
)
from .services import (
    detect_language, detect_sentiment, extract_intent,
    maybe_call_tool, scrub_pii, compute_routing_score, expand_query,
)
from .bhashini import extract_entities, get_bhashini_status, is_configured as bhashini_configured
from .database import engine, Base, get_db
from .models import ChatLog

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
FAISS_DIR = BASE_DIR / "data" / "faiss"

# Create database tables
Base.metadata.create_all(bind=engine)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_MODEL = os.getenv("GOOGLE_MODEL", "gemini-2.5-flash")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

app = FastAPI(
    title="NeuralSupport AI — Enterprise Customer Support Agent",
    description="Next-gen LLM-powered conversational AI with RAG, PII masking, sentiment detection, and multi-model routing.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag = RagEngine(FAISS_DIR, GOOGLE_API_KEY)
rag.boot()

# Initialize LLM clients
deep_client = None
if GOOGLE_API_KEY:
    deep_client = ChatGoogleGenerativeAI(model=GOOGLE_MODEL, google_api_key=GOOGLE_API_KEY, temperature=0.25)

fast_client = None
if GROQ_API_KEY:
    fast_client = ChatGroq(model=GROQ_MODEL, groq_api_key=GROQ_API_KEY, temperature=0.25)

# In-memory rate limiting (sliding window)
_rate_limit_store: dict[str, list[float]] = {}
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 30  # requests per window


def _check_rate_limit(client_ip: str) -> bool:
    """Returns True if the request is allowed."""
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW

    if client_ip not in _rate_limit_store:
        _rate_limit_store[client_ip] = []

    # Prune old entries
    _rate_limit_store[client_ip] = [t for t in _rate_limit_store[client_ip] if t > window_start]

    if len(_rate_limit_store[client_ip]) >= RATE_LIMIT_MAX:
        return False

    _rate_limit_store[client_ip].append(now)
    return True


def _fetch_conversation_history(db: Session, session_id: str, limit: int = 6) -> list[dict]:
    """Fetch recent conversation turns for working memory context."""
    logs = (
        db.query(ChatLog)
        .filter(ChatLog.session_id == session_id)
        .order_by(ChatLog.id.desc())
        .limit(limit)
        .all()
    )
    history = []
    for log in reversed(logs):
        history.append({"role": "user", "content": log.user_message or ""})
        history.append({"role": "assistant", "content": log.response or ""})
    return history


def build_prompt(
    domain: str,
    question: str,
    context: str,
    language: str,
    intent: str,
    sentiment: str,
    tool_events: list[str],
    routing_model: str,
    query_expansions: list[str],
    conversation_history: list[dict],
) -> str:
    """Build the system prompt for the LLM with full context injection."""
    tools = "\n".join(tool_events) if tool_events else "none"
    expansions = ", ".join(query_expansions) if query_expansions else "none"

    # Format conversation history for working memory
    history_text = ""
    if conversation_history:
        turns = []
        for turn in conversation_history[-6:]:  # Last 3 exchanges
            role = "User" if turn["role"] == "user" else "Agent"
            turns.append(f"  {role}: {turn['content'][:200]}")
        history_text = "\n".join(turns)

    return (
        "You are NeuralSupport AI, an expert enterprise customer support assistant. "
        f"Domain: {DOMAINS[domain]['label']}. "
        f"Detected language: {language}. Intent: {intent}. Sentiment: {sentiment}. "
        f"Routing tier: {routing_model}.\n\n"
        "INSTRUCTIONS:\n"
        "- Use retrieved context as the PRIMARY source of truth.\n"
        "- Be concise, empathetic, and professional.\n"
        "- If context is insufficient, clearly state what is missing and propose escalation.\n"
        f"- CRITICAL: You MUST respond ENTIRELY in {language}. "
        f"The user's message is in {language} — your response must also be in {language}.\n"
        "- If the detected language is Hindi, respond in Hindi (Devanagari script).\n"
        "- If the detected language is Marathi, respond in Marathi (Devanagari script).\n"
        "- If the detected language is Bengali, respond in Bengali (Bangla script).\n"
        "- If the detected language is Tamil, respond in Tamil script.\n"
        "- If the detected language is Telugu, respond in Telugu script.\n"
        "- For all other Indian languages, respond in the appropriate native script.\n"
        "- If sentiment is frustrated/very_frustrated, be extra empathetic and acknowledge their concern.\n\n"
        f"Retrieved context (from RAG pipeline):\n{context}\n\n"
        f"Query expansions used: {expansions}\n\n"
        f"Tool events:\n{tools}\n\n"
        + (f"Conversation history (working memory):\n{history_text}\n\n" if history_text else "")
        + f"User question: {question}\n\n"
        "Return valid JSON only with schema: "
        "{sentiment, sentiment_score, language, intent, requires_escalation, confidence, rag_sources, response}."
    )


def fallback_response(
    domain: str, language: str, intent: str,
    sentiment: str, sentiment_score: float, context: str,
    routing_model: str,
) -> dict:
    """Generate a deterministic fallback when LLM is unavailable."""
    return {
        "sentiment": sentiment,
        "sentiment_score": round(sentiment_score, 3),
        "language": language,
        "intent": intent,
        "requires_escalation": sentiment in {"frustrated", "very_frustrated", "negative"},
        "confidence": 0.72,
        "rag_sources": [f"{DOMAINS[domain]['label']} KB"],
        "response": (
            "I analyzed your request using our support knowledge base. "
            f"Here is the most relevant information: {context[:450]}"
        ),
    }


# ─── Health Check ────────────────────────────────────────────
@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    features = [
        "RAG Pipeline",
        "PII Masking",
        "Sentiment Detection",
        "Multi-Model Routing",
        "Query Expansion",
        "Cross-Encoder Reranking",
        "Conversation Memory",
        "Voice I/O",
        "SSE Streaming",
        # Bhashini API Services
        "Bhashini NER",
        "Bhashini TLD",
        "Bhashini NMT",
        "Bhashini ASR + Denoiser",
        "Bhashini TTS",
        "Bhashini Transliteration",
    ]
    return HealthResponse(
        status="ok",
        llm_configured=bool(GOOGLE_API_KEY or GROQ_API_KEY),
        supported_domains=list(DOMAINS.keys()),
        version="2.0.0",
        features=features,
    )


# ─── Bhashini Services Status ────────────────────────────────
@app.get("/api/bhashini/status")
def bhashini_status():
    """Return status of all integrated Bhashini API services."""
    return get_bhashini_status()


# ─── Chat (standard request/response) ───────────────────────
@app.post("/api/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, request: Request, db: Session = Depends(get_db)) -> ChatResponse:
    # Rate limiting
    client_ip = request.client.host if request.client else "unknown"
    if not _check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please wait before sending more requests.")

    domain = payload.domain if payload.domain in DOMAINS else "ecommerce"
    t0 = time.time()

    safe_message, pii_hits = scrub_pii(payload.message)
    language = detect_language(payload.message)
    sentiment, sentiment_score = detect_sentiment(payload.message)
    intent = extract_intent(payload.message)
    routing_model, complexity_score = compute_routing_score(payload.message, intent, sentiment)
    tool_events = await maybe_call_tool(payload.message, enabled=payload.use_tools)

    # Bhashini NER — extract entities (pincode, aadhaar, phone, amounts, etc.)
    ner_entities = extract_entities(payload.message)
    bhashini_services = ["NER", "TLD"]
    if bhashini_configured():
        bhashini_services.extend(["NMT", "ASR", "TTS", "Denoiser", "Transliteration"])

    query_expansions = []

    if pii_hits:
        parsed = {
            "sentiment": sentiment,
            "sentiment_score": round(sentiment_score, 3),
            "language": language,
            "intent": intent,
            "requires_escalation": True,
            "confidence": 0.99,
            "rag_sources": ["PII Guard"],
            "response": (
                "Sensitive data detected (" + ", ".join(pii_hits) + "). "
                "Please remove personal identifiers and try again."
            ),
        }
    else:
        # Advanced RAG retrieval with query expansion + reranking
        if rag.available():
            retrieved_docs, query_expansions = rag.retrieve_advanced(domain, safe_message, k=4)
        else:
            retrieved_docs = []
            query_expansions = expand_query(safe_message)

        context = "\n\n".join(d.page_content for d in retrieved_docs) or DOMAINS[domain]["knowledge"]

        # Fetch conversation history for working memory
        conversation_history = _fetch_conversation_history(db, payload.session_id, limit=6)

        parsed = fallback_response(domain, language, intent, sentiment, sentiment_score, context, routing_model)

        active_client = fast_client if routing_model == "fast" else deep_client

        if active_client:
            prompt = build_prompt(
                domain=domain,
                question=safe_message,
                context=context,
                language=language,
                intent=intent,
                sentiment=sentiment,
                tool_events=tool_events,
                routing_model=routing_model,
                query_expansions=query_expansions,
                conversation_history=conversation_history,
            )
            try:
                result = active_client.invoke(prompt)
                content = result.content.strip()
                if content.startswith("```json"):
                    content = content[7:]
                if content.startswith("```"):
                    content = content[3:]
                if content.endswith("```"):
                    content = content[:-3]
                parsed = json.loads(content.strip())
            except (json.JSONDecodeError, ValidationError, TypeError):
                # Keep deterministic fallback if model output is malformed.
                pass

    response = ChatResponse(
        sentiment=parsed.get("sentiment", sentiment),
        sentiment_score=float(parsed.get("sentiment_score", sentiment_score)),
        language=parsed.get("language", language),
        intent=parsed.get("intent", intent),
        requires_escalation=bool(parsed.get("requires_escalation", False)),
        confidence=float(parsed.get("confidence", 0.7)),
        rag_sources=list(parsed.get("rag_sources", [])),
        response=parsed.get("response", "I could not generate a response."),
        tool_events=tool_events,
        routing_model=routing_model,
        query_expansions=query_expansions,
        ner_entities=ner_entities,
        bhashini_services=bhashini_services,
    )

    # Log to DB with enriched fields
    new_log = ChatLog(
        session_id=payload.session_id,
        domain=domain,
        user_message=payload.message,
        response=response.response,
        intent=response.intent,
        sentiment=response.sentiment,
        sentiment_score=response.sentiment_score,
        language=response.language,
        requires_escalation=response.requires_escalation,
        confidence=response.confidence,
        rag_sources=json.dumps(response.rag_sources),
        routing_model=routing_model,
    )
    db.add(new_log)
    db.commit()

    return response


# ─── SSE Streaming Chat ─────────────────────────────────────
@app.post("/api/chat/stream")
async def chat_stream(payload: ChatRequest, request: Request, db: Session = Depends(get_db)):
    """
    Server-Sent Events streaming endpoint.
    Streams tokens as they are generated for real-time UI rendering.
    Falls back to chunked deterministic response if no LLM is configured.
    """
    client_ip = request.client.host if request.client else "unknown"
    if not _check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded.")

    domain = payload.domain if payload.domain in DOMAINS else "ecommerce"

    safe_message, pii_hits = scrub_pii(payload.message)
    language = detect_language(payload.message)
    sentiment, sentiment_score = detect_sentiment(payload.message)
    intent = extract_intent(payload.message)
    routing_model, complexity_score = compute_routing_score(payload.message, intent, sentiment)
    tool_events = await maybe_call_tool(payload.message, enabled=payload.use_tools)
    query_expansions = []

    # Bhashini NER — extract entities
    ner_entities = extract_entities(payload.message)
    bhashini_services = ["NER", "TLD"]
    if bhashini_configured():
        bhashini_services.extend(["NMT", "ASR", "TTS", "Denoiser", "Transliteration"])

    async def event_generator():
        import asyncio

        # Send metadata first
        meta = {
            "type": "metadata",
            "sentiment": sentiment,
            "sentiment_score": round(sentiment_score, 3),
            "language": language,
            "intent": intent,
            "routing_model": routing_model,
            "tool_events": tool_events,
            "ner_entities": ner_entities,
            "bhashini_services": bhashini_services,
        }
        yield f"data: {json.dumps(meta)}\n\n"

        if pii_hits:
            pii_msg = (
                f"Sensitive data detected ({', '.join(pii_hits)}). "
                "Please remove personal identifiers and try again."
            )
            # Stream PII warning word by word
            for word in pii_msg.split(" "):
                yield f"data: {json.dumps({'type': 'token', 'data': word + ' '})}\n\n"
                await asyncio.sleep(0.03)

            yield f"data: {json.dumps({'type': 'done', 'requires_escalation': True, 'confidence': 0.99, 'rag_sources': ['PII Guard']})}\n\n"
            return

        # RAG retrieval
        nonlocal query_expansions
        if rag.available():
            retrieved_docs, query_expansions = rag.retrieve_advanced(domain, safe_message, k=4)
        else:
            retrieved_docs = []
            query_expansions = expand_query(safe_message)

        context = "\n\n".join(d.page_content for d in retrieved_docs) or DOMAINS[domain]["knowledge"]
        conversation_history = _fetch_conversation_history(db, payload.session_id, limit=6)

        active_client = fast_client if routing_model == "fast" else deep_client

        if active_client:
            prompt = build_prompt(
                domain=domain,
                question=safe_message,
                context=context,
                language=language,
                intent=intent,
                sentiment=sentiment,
                tool_events=tool_events,
                routing_model=routing_model,
                query_expansions=query_expansions,
                conversation_history=conversation_history,
            )
            try:
                # Stream tokens from LLM
                full_response = ""
                async for chunk in active_client.astream(prompt):
                    token = chunk.content
                    if token:
                        full_response += token
                        yield f"data: {json.dumps({'type': 'token', 'data': token})}\n\n"

                # Try to parse JSON from the full response
                try:
                    clean = full_response.strip()
                    if clean.startswith("```json"):
                        clean = clean[7:]
                    if clean.startswith("```"):
                        clean = clean[3:]
                    if clean.endswith("```"):
                        clean = clean[:-3]
                    parsed = json.loads(clean.strip())

                    # Re-stream the actual response text (since we streamed raw JSON)
                    actual_response = parsed.get("response", full_response)
                    yield f"data: {json.dumps({'type': 'clear'})}\n\n"
                    for word in actual_response.split(" "):
                        yield f"data: {json.dumps({'type': 'token', 'data': word + ' '})}\n\n"
                        await asyncio.sleep(0.02)

                    yield f"data: {json.dumps({'type': 'done', 'requires_escalation': parsed.get('requires_escalation', False), 'confidence': parsed.get('confidence', 0.7), 'rag_sources': parsed.get('rag_sources', []), 'query_expansions': query_expansions})}\n\n"
                except (json.JSONDecodeError, ValueError):
                    yield f"data: {json.dumps({'type': 'done', 'requires_escalation': False, 'confidence': 0.7, 'rag_sources': [], 'query_expansions': query_expansions})}\n\n"

                # Log to DB
                new_log = ChatLog(
                    session_id=payload.session_id, domain=domain,
                    user_message=payload.message,
                    response=parsed.get("response", full_response) if 'parsed' in dir() else full_response,
                    intent=intent, sentiment=sentiment, sentiment_score=sentiment_score,
                    language=language, requires_escalation=False,
                    confidence=0.7, routing_model=routing_model,
                )
                db.add(new_log)
                db.commit()
                return

            except Exception:
                pass

        # Fallback: stream deterministic response word by word
        fb = fallback_response(domain, language, intent, sentiment, sentiment_score, context, routing_model)
        response_text = fb["response"]
        for word in response_text.split(" "):
            yield f"data: {json.dumps({'type': 'token', 'data': word + ' '})}\n\n"
            await asyncio.sleep(0.04)

        yield f"data: {json.dumps({'type': 'done', 'requires_escalation': fb['requires_escalation'], 'confidence': fb['confidence'], 'rag_sources': fb['rag_sources'], 'query_expansions': query_expansions})}\n\n"

        # Log to DB
        new_log = ChatLog(
            session_id=payload.session_id, domain=domain,
            user_message=payload.message, response=response_text,
            intent=intent, sentiment=sentiment, sentiment_score=sentiment_score,
            language=language, requires_escalation=fb["requires_escalation"],
            confidence=fb["confidence"], routing_model=routing_model,
        )
        db.add(new_log)
        db.commit()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ─── Chat History (Episodic Memory) ─────────────────────────
@app.get("/api/chat/history", response_model=ChatHistoryResponse)
def chat_history(
    session_id: str = Query(default="default-session"),
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
) -> ChatHistoryResponse:
    """Retrieve conversation history for a session (episodic memory)."""
    logs = (
        db.query(ChatLog)
        .filter(ChatLog.session_id == session_id)
        .order_by(ChatLog.id.desc())
        .limit(limit)
        .all()
    )
    items = [
        ChatHistoryItem(
            id=log.id,
            session_id=log.session_id,
            domain=log.domain,
            user_message=log.user_message or "",
            response=log.response or "",
            intent=log.intent or "general",
            sentiment=log.sentiment or "neutral",
            sentiment_score=log.sentiment_score or 0.5,
            language=log.language or "English",
            requires_escalation=log.requires_escalation or False,
            confidence=log.confidence,
            created_at=log.created_at,
        )
        for log in reversed(logs)
    ]
    return ChatHistoryResponse(session_id=session_id, total=len(items), messages=items)


# ─── System Metrics (Observability) ─────────────────────────
@app.get("/api/metrics", response_model=MetricsResponse)
def system_metrics(db: Session = Depends(get_db)) -> MetricsResponse:
    """Aggregate system metrics for the observability dashboard."""
    total = db.query(func.count(ChatLog.id)).scalar() or 0
    escalations = db.query(func.count(ChatLog.id)).filter(ChatLog.requires_escalation == True).scalar() or 0

    # Domain distribution
    domain_rows = db.query(ChatLog.domain, func.count(ChatLog.id)).group_by(ChatLog.domain).all()
    domain_dist = {row[0]: row[1] for row in domain_rows}

    # Sentiment distribution
    sent_rows = db.query(ChatLog.sentiment, func.count(ChatLog.id)).group_by(ChatLog.sentiment).all()
    sent_dist = {row[0]: row[1] for row in sent_rows}

    # Top intents
    intent_rows = db.query(ChatLog.intent, func.count(ChatLog.id)).group_by(ChatLog.intent).order_by(func.count(ChatLog.id).desc()).limit(10).all()
    intent_dist = {row[0]: row[1] for row in intent_rows}

    return MetricsResponse(
        total_queries=total,
        avg_latency_ms=0,  # Would require timing storage
        total_escalations=escalations,
        total_pii_blocks=0,  # Would require PII event logging
        domain_distribution=domain_dist,
        sentiment_distribution=sent_dist,
        top_intents=intent_dist,
    )
