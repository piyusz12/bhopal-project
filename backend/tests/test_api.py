import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_chat_pii_block():
    payload = {
        "message": "My SSN is 123-45-6789",
        "domain": "ecommerce",
        "session_id": "test-session",
        "use_tools": False
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "Sensitive data detected" in data["response"]
    assert data["requires_escalation"] is True
