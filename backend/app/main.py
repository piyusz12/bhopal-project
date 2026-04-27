import json
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langchain_openai import ChatOpenAI
from pydantic import ValidationError
from sqlalchemy import Boolean, Column, Float, Integer, String, Text, create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from .kb import DOMAINS
from .rag import RagEngine
from .schemas import ChatRequest, ChatResponse, HealthResponse
from .services import detect_language, detect_sentiment, extract_intent, maybe_call_tool, scrub_pii

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
FAISS_DIR = BASE_DIR / "data" / "faiss"
DB_DIR = BASE_DIR / "data" / "db"
DB_DIR.mkdir(parents=True, exist_ok=True)

engine = create_engine(f"sqlite:///{DB_DIR / 'chat_logs.db'}", future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class ChatLog(Base):
    __tablename__ = "chat_logs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(120), index=True)
    domain = Column(String(50), index=True)
    user_message = Column(Text)
    response = Column(Text)
    intent = Column(String(50))
    sentiment = Column(String(50))
    sentiment_score = Column(Float)
    language = Column(String(50))
    requires_escalation = Column(Boolean)


Base.metadata.create_all(bind=engine)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
APP_ORIGIN = os.getenv("APP_ORIGIN", "http://127.0.0.1:5173")

app = FastAPI(title="Smart AI Support Agent API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag = RagEngine(FAISS_DIR, OPENAI_API_KEY)
rag.boot()


def build_prompt(domain: str, question: str, context: str, language: str, intent: str, sentiment: str, tool_events: list[str]) -> str:
    tools = "\n".join(tool_events) if tool_events else "none"
    return (
        "You are an expert customer support assistant. "
        f"Domain: {DOMAINS[domain]['label']}. "
        f"Detected language: {language}. Intent: {intent}. Sentiment: {sentiment}.\n\n"
        "Use retrieved context as the source of truth and be concise but empathetic. "
        "If context is not sufficient, clearly say what is missing and propose escalation.\n\n"
        f"Retrieved context:\n{context}\n\n"
        f"Tool events:\n{tools}\n\n"
        f"User question: {question}\n\n"
        "Return valid JSON only with schema: "
        "{sentiment, sentiment_score, language, intent, requires_escalation, confidence, rag_sources, response}."
    )


def fallback_response(domain: str, language: str, intent: str, sentiment: str, sentiment_score: float, context: str) -> dict:
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


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        llm_configured=bool(OPENAI_API_KEY),
        supported_domains=list(DOMAINS.keys()),
    )


@app.post("/api/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    domain = payload.domain if payload.domain in DOMAINS else "ecommerce"

    safe_message, pii_hits = scrub_pii(payload.message)
    language = detect_language(payload.message)
    sentiment, sentiment_score = detect_sentiment(payload.message)
    intent = extract_intent(payload.message)
    tool_events = maybe_call_tool(payload.message, enabled=payload.use_tools)

    if pii_hits:
        blocked = {
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
        parsed = blocked
    else:
        retrieved_docs = rag.retrieve(domain, safe_message, k=4) if rag.available() else []
        context = "\n\n".join(d.page_content for d in retrieved_docs) or DOMAINS[domain]["knowledge"]

        parsed = fallback_response(domain, language, intent, sentiment, sentiment_score, context)

        if OPENAI_API_KEY:
            llm = ChatOpenAI(model=OPENAI_MODEL, api_key=OPENAI_API_KEY, temperature=0.25)
            prompt = build_prompt(
                domain=domain,
                question=safe_message,
                context=context,
                language=language,
                intent=intent,
                sentiment=sentiment,
                tool_events=tool_events,
            )
            try:
                result = llm.invoke(prompt)
                parsed = json.loads(result.content)
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
    )

    db: Session = SessionLocal()
    db.add(
        ChatLog(
            session_id=payload.session_id,
            domain=domain,
            user_message=payload.message,
            response=response.response,
            intent=response.intent,
            sentiment=response.sentiment,
            sentiment_score=response.sentiment_score,
            language=response.language,
            requires_escalation=response.requires_escalation,
        )
    )
    db.commit()
    db.close()

    return response
