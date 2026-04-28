import pytest
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


# ─── Health Endpoint ─────────────────────────────────────────
class TestHealthEndpoint:
    def test_health_returns_ok(self):
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["version"] == "2.0.0"
        assert isinstance(data["supported_domains"], list)
        assert len(data["supported_domains"]) == 5

    def test_health_includes_features(self):
        res = client.get("/api/health")
        data = res.json()
        assert "features" in data
        assert "RAG Pipeline" in data["features"]
        assert "PII Masking" in data["features"]
        assert "SSE Streaming" in data["features"]


# ─── Chat Endpoint ───────────────────────────────────────────
class TestChatEndpoint:
    def test_basic_chat(self):
        res = client.post("/api/chat", json={
            "message": "What is your return policy?",
            "domain": "ecommerce",
            "session_id": "test-session",
            "use_tools": False,
        })
        assert res.status_code == 200
        data = res.json()
        assert "response" in data
        assert "sentiment" in data
        assert "intent" in data
        assert "language" in data
        assert "routing_model" in data
        assert data["routing_model"] in ["fast", "deep"]

    def test_chat_with_pii_blocks(self):
        res = client.post("/api/chat", json={
            "message": "My email is secret@test.com",
            "domain": "banking",
        })
        assert res.status_code == 200
        data = res.json()
        assert data["requires_escalation"] is True
        assert "PII Guard" in data["rag_sources"]

    def test_chat_invalid_domain_defaults(self):
        res = client.post("/api/chat", json={
            "message": "Hello",
            "domain": "nonexistent_domain",
        })
        assert res.status_code == 200

    def test_chat_empty_message_rejected(self):
        res = client.post("/api/chat", json={
            "message": "",
            "domain": "ecommerce",
        })
        assert res.status_code == 422

    def test_chat_all_domains(self):
        for domain in ["ecommerce", "banking", "healthcare", "education", "government"]:
            res = client.post("/api/chat", json={
                "message": "Hello, I need help",
                "domain": domain,
                "session_id": f"test-{domain}",
                "use_tools": False,
            })
            assert res.status_code == 200
            data = res.json()
            assert data["response"]

    def test_chat_returns_query_expansions(self):
        res = client.post("/api/chat", json={
            "message": "What is the refund policy for electronics?",
            "domain": "ecommerce",
            "use_tools": False,
        })
        assert res.status_code == 200
        data = res.json()
        assert "query_expansions" in data

    def test_chat_sentiment_detection(self):
        res = client.post("/api/chat", json={
            "message": "I am absolutely furious about this terrible service!",
            "domain": "ecommerce",
            "use_tools": False,
        })
        assert res.status_code == 200
        data = res.json()
        assert data["sentiment"] in ["frustrated", "very_frustrated", "negative"]

    def test_chat_malformed_json(self):
        res = client.post(
            "/api/chat",
            content=b"not json",
            headers={"Content-Type": "application/json"},
        )
        assert res.status_code == 422


# ─── Chat History Endpoint ───────────────────────────────────
class TestChatHistoryEndpoint:
    def test_history_returns_data(self):
        client.post("/api/chat", json={
            "message": "Test message for history",
            "domain": "ecommerce",
            "session_id": "history-test",
            "use_tools": False,
        })

        res = client.get("/api/chat/history", params={"session_id": "history-test"})
        assert res.status_code == 200
        data = res.json()
        assert data["session_id"] == "history-test"
        assert data["total"] >= 1
        assert isinstance(data["messages"], list)

    def test_history_empty_session(self):
        res = client.get("/api/chat/history", params={"session_id": "nonexistent-session-xyz"})
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 0
        assert data["messages"] == []


# ─── Metrics Endpoint ────────────────────────────────────────
class TestMetricsEndpoint:
    def test_metrics_returns_data(self):
        res = client.get("/api/metrics")
        assert res.status_code == 200
        data = res.json()
        assert "total_queries" in data
        assert "domain_distribution" in data
        assert "sentiment_distribution" in data
        assert "top_intents" in data
        assert isinstance(data["total_queries"], int)


# ─── SSE Streaming Endpoint ─────────────────────────────────
class TestStreamingEndpoint:
    def test_stream_returns_event_stream(self):
        res = client.post("/api/chat/stream", json={
            "message": "What is the shipping cost?",
            "domain": "ecommerce",
            "session_id": "stream-test",
            "use_tools": False,
        })
        assert res.status_code == 200
        assert "text/event-stream" in res.headers.get("content-type", "")

    def test_stream_contains_events(self):
        res = client.post("/api/chat/stream", json={
            "message": "Tell me about interest rates",
            "domain": "banking",
            "session_id": "stream-test-2",
            "use_tools": False,
        })
        assert res.status_code == 200
        content = res.text
        assert "data:" in content

    def test_stream_pii_blocking(self):
        res = client.post("/api/chat/stream", json={
            "message": "My SSN is 123-45-6789",
            "domain": "banking",
        })
        assert res.status_code == 200
        content = res.text
        assert "Sensitive data detected" in content or "PII" in content
