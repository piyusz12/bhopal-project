import pytest
from app.services import scrub_pii, detect_sentiment, extract_intent

def test_scrub_pii():
    text = "My email is test@example.com and phone is 123-456-7890"
    scrubbed, hits = scrub_pii(text)
    assert "[EMAIL REDACTED]" in scrubbed
    assert "[PHONE REDACTED]" in scrubbed
    assert "Email" in hits
    assert "Phone" in hits

def test_detect_sentiment():
    text = "I am very happy with the service!"
    sentiment, score = detect_sentiment(text)
    assert sentiment == "positive"
    assert score > 0.5

    text = "I am extremely angry and frustrated!"
    sentiment, score = detect_sentiment(text)
    assert sentiment in ["frustrated", "very_frustrated"]
    assert score < 0.5

def test_extract_intent():
    assert extract_intent("Where is my order?") == "order_status"
    assert extract_intent("I want a refund") == "policy_query"
    assert extract_intent("This is an emergency!") == "emergency"
    assert extract_intent("Just saying hello") == "general"
