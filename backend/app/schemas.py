from datetime import datetime
from pydantic import BaseModel, Field, model_validator

class ChatRequest(BaseModel):
    message: str = Field(default="")
    domain: str = Field(default="ecommerce")
    session_id: str = Field(default="default-session")
    use_tools: bool = Field(default=True)
    image_base64: str | None = None

    @model_validator(mode="after")
    def validate_content(self) -> "ChatRequest":
        if not self.message.strip() and not self.image_base64:
            raise ValueError("Either 'message' or 'image_base64' must be provided.")
        return self


class ChatResponse(BaseModel):
    sentiment: str
    sentiment_score: float
    language: str
    intent: str
    requires_escalation: bool
    confidence: float
    rag_sources: list[str]
    response: str
    tool_events: list[str]
    routing_model: str = "fast"
    query_expansions: list[str] = []
    ner_entities: list[dict] = []
    bhashini_services: list[str] = []


class HealthResponse(BaseModel):
    status: str
    llm_configured: bool
    supported_domains: list[str]
    version: str = "2.0.0"
    features: list[str] = []


class StreamEvent(BaseModel):
    """Schema for SSE token streaming events."""
    type: str  # "token", "metadata", "done", "error"
    data: str = ""
    metadata: dict | None = None


class ChatHistoryItem(BaseModel):
    id: int
    session_id: str
    domain: str
    user_message: str
    response: str
    intent: str
    sentiment: str
    sentiment_score: float
    language: str
    requires_escalation: bool
    confidence: float | None = None
    created_at: datetime | None = None


class ChatHistoryResponse(BaseModel):
    session_id: str
    total: int
    messages: list[ChatHistoryItem]


class MetricsResponse(BaseModel):
    total_queries: int
    avg_latency_ms: float
    total_escalations: int
    total_pii_blocks: int
    domain_distribution: dict[str, int]
    sentiment_distribution: dict[str, int]
    top_intents: dict[str, int]
