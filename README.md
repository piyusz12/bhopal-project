# Smart AI Theme - AI Customer Support Agent (Next-Gen Chatbot)

This project is upgraded to a full-stack **LLM + RAG customer support assistant** with the requested stack:

- Frontend: React + Vite
- Backend: FastAPI
- RAG: LangChain + FAISS vector index
- LLM: OpenAI-compatible model via `langchain-openai`
- Features: multilingual responses, sentiment detection, PII guard, tool/API usage, DB logging, voice input/output

## Architecture

1. React UI sends user query to FastAPI (`/api/chat`).
2. Backend applies PII checks and language/sentiment analysis.
3. LangChain retrieves domain context from FAISS vector DB.
4. Optional tool calls (external API order lookup demo).
5. LLM generates structured JSON response (with fallback if no API key).
6. Conversation is logged to SQLite for analytics and audit.

## Project Structure

- `src/App.jsx` - upgraded chat UI (backend integration + voice controls)
- `backend/app/main.py` - FastAPI app and orchestration pipeline
- `backend/app/rag.py` - FAISS vector retrieval layer
- `backend/app/services.py` - language, sentiment, PII, intent, tool calls
- `backend/app/kb.py` - domain-specific support knowledge
- `backend/requirements.txt` - Python backend dependencies

## Setup

### 1) Frontend

```bash
npm install
```

(Optional) create `.env` from `.env.example` and set:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### 2) Backend

```bash
python -m pip install -r backend/requirements.txt
```

Create `backend/.env` from `backend/.env.example` and set:

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
APP_ORIGIN=http://127.0.0.1:5173
```

## Run

Terminal 1 (backend):

```bash
npm run dev:backend
```

Terminal 2 (frontend):

```bash
npm run dev:frontend
```

Open:

- Frontend: http://127.0.0.1:5173
- Backend health: http://127.0.0.1:8000/api/health

## API

### POST `/api/chat`

Request body:

```json
{
  "message": "Track order 12",
  "domain": "ecommerce",
  "session_id": "web-session",
  "use_tools": true
}
```

Response body (example):

```json
{
  "sentiment": "neutral",
  "sentiment_score": 0.51,
  "language": "English",
  "intent": "order_status",
  "requires_escalation": false,
  "confidence": 0.84,
  "rag_sources": ["Order Tracking"],
  "response": "...",
  "tool_events": ["tool:order_lookup success id=12 items=4 total=222"]
}
```

## Notes

- If `OPENAI_API_KEY` is missing, backend uses deterministic fallback response while still running retrieval and analytics.
- Voice features in UI use browser Web Speech APIs (mic + text-to-speech).
- Domain packs included: Banking, Healthcare, Education, E-commerce, Government.
