import pytest
from app.services import (
    scrub_pii, detect_sentiment, extract_intent, detect_language,
    compute_routing_score, expand_query, rerank_documents,
)


# ─── PII Detection ──────────────────────────────────────────
class TestScrubPII:
    def test_email_and_phone(self):
        text = "My email is test@example.com and phone is 123-456-7890"
        scrubbed, hits = scrub_pii(text)
        assert "[EMAIL REDACTED]" in scrubbed
        assert "[PHONE REDACTED]" in scrubbed
        assert "Email" in hits
        assert "Phone" in hits

    def test_ssn(self):
        text = "My SSN is 123-45-6789"
        scrubbed, hits = scrub_pii(text)
        assert "[SSN REDACTED]" in scrubbed
        assert "SSN" in hits

    def test_credit_card(self):
        text = "Card number 1234567890123456"
        scrubbed, hits = scrub_pii(text)
        assert "[CREDIT CARD REDACTED]" in scrubbed
        assert "Credit Card" in hits

    def test_no_pii(self):
        text = "I need help with my order"
        scrubbed, hits = scrub_pii(text)
        assert scrubbed == text
        assert hits == []

    def test_empty_input(self):
        scrubbed, hits = scrub_pii("")
        assert scrubbed == ""
        assert hits == []

    def test_special_characters(self):
        text = "What about $100 & <html>tags</html>?"
        scrubbed, hits = scrub_pii(text)
        assert hits == []

    def test_multiple_pii(self):
        text = "Email: a@b.com, Phone: 999-888-7777, SSN: 111-22-3333"
        scrubbed, hits = scrub_pii(text)
        assert len(hits) == 3


# ─── Sentiment Detection ────────────────────────────────────
class TestDetectSentiment:
    def test_positive(self):
        sentiment, score = detect_sentiment("I am very happy with the service!")
        assert sentiment == "positive"
        assert score > 0.5

    def test_frustrated(self):
        sentiment, score = detect_sentiment("I am extremely angry and frustrated!")
        assert sentiment in ["frustrated", "very_frustrated"]
        assert score < 0.5

    def test_neutral(self):
        sentiment, score = detect_sentiment("What are your business hours?")
        assert sentiment in ["neutral", "positive"]

    def test_negative(self):
        sentiment, score = detect_sentiment("This is bad and disappointing")
        assert sentiment in ["negative", "frustrated", "very_frustrated"]

    def test_empty_input(self):
        sentiment, score = detect_sentiment("")
        assert sentiment == "neutral"
        assert 0 <= score <= 1


# ─── Intent Extraction ──────────────────────────────────────
class TestExtractIntent:
    def test_order_status(self):
        assert extract_intent("Where is my order?") == "order_status"

    def test_policy_query(self):
        assert extract_intent("I want a refund") == "policy_query"

    def test_emergency(self):
        assert extract_intent("This is an emergency!") == "emergency"

    def test_general(self):
        assert extract_intent("Just saying hello") == "general"

    def test_billing(self):
        assert extract_intent("I was charged twice on my invoice") == "billing"

    def test_complaint(self):
        assert extract_intent("I am frustrated with your bad service") == "complaint"

    def test_scheduling(self):
        assert extract_intent("I need to book an appointment") == "scheduling"

    def test_account(self):
        assert extract_intent("I can't login to my account") == "account"

    def test_empty_input(self):
        assert extract_intent("") == "general"


# ─── Language Detection ──────────────────────────────────────
class TestDetectLanguage:
    def test_english(self):
        assert detect_language("Hello, how are you?") == "English"

    def test_spanish(self):
        result = detect_language("Hola, necesito ayuda con mi pedido por favor")
        assert result in ["Spanish", "es"]

    def test_empty_fallback(self):
        result = detect_language("")
        assert result == "English"

    def test_short_text(self):
        # Short text should still return something
        result = detect_language("hi")
        assert isinstance(result, str)


# ─── Multi-Model Routing ────────────────────────────────────
class TestComputeRoutingScore:
    def test_simple_query_routes_fast(self):
        model, score = compute_routing_score("Where is my order?", "order_status", "neutral")
        assert model == "fast"
        assert score < 0.4

    def test_complex_query_routes_deep(self):
        model, score = compute_routing_score(
            "I am extremely frustrated with the billing error on my account. " * 3,
            "complaint",
            "very_frustrated",
        )
        assert model == "deep"
        assert score > 0.4

    def test_emergency_routes_deep(self):
        model, score = compute_routing_score(
            "This is urgent, I need help immediately!",
            "emergency",
            "frustrated",
        )
        assert model == "deep"

    def test_score_bounded(self):
        _, score = compute_routing_score("x " * 100, "complaint", "very_frustrated")
        assert 0 <= score <= 1


# ─── Query Expansion ────────────────────────────────────────
class TestExpandQuery:
    def test_returns_expansions(self):
        expansions = expand_query("What is the return policy?")
        assert len(expansions) >= 2
        assert all(isinstance(e, str) for e in expansions)

    def test_order_specific(self):
        expansions = expand_query("Track my order")
        assert any("order" in e.lower() or "track" in e.lower() for e in expansions)

    def test_refund_specific(self):
        expansions = expand_query("I want a refund")
        assert any("return" in e.lower() or "refund" in e.lower() for e in expansions)

    def test_empty_input(self):
        expansions = expand_query("")
        assert isinstance(expansions, list)


# ─── Document Reranking ─────────────────────────────────────
class TestRerankDocuments:
    def test_empty_docs(self):
        result = rerank_documents("test query", [])
        assert result == []

    def test_reranks_correctly(self):
        class MockDoc:
            def __init__(self, content):
                self.page_content = content

        docs = [
            MockDoc("Shipping takes 5-7 business days for standard delivery"),
            MockDoc("Return policy allows returns within 30 days"),
            MockDoc("Contact support for general inquiries"),
        ]
        result = rerank_documents("return policy", docs, top_k=2)
        assert len(result) == 2
        # The return policy doc should rank highest
        assert "return" in result[0].page_content.lower() or "return" in result[1].page_content.lower()

    def test_respects_top_k(self):
        class MockDoc:
            def __init__(self, content):
                self.page_content = content

        docs = [MockDoc(f"Document {i}") for i in range(10)]
        result = rerank_documents("document", docs, top_k=3)
        assert len(result) == 3
