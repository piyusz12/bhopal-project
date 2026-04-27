from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    domain: str = Field(default="ecommerce")
    session_id: str = Field(default="default-session")
    use_tools: bool = Field(default=True)


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


class HealthResponse(BaseModel):
    status: str
    llm_configured: bool
    supported_domains: list[str]
