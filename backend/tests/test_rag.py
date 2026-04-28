import pytest
from pathlib import Path
from app.rag import RagEngine


class TestRagEngine:
    """Tests for the RAG engine (without OpenAI API key)."""

    def test_init(self):
        engine = RagEngine(Path("/tmp/test"), None)
        assert engine.vectorstores == {}

    def test_not_available_without_key(self):
        engine = RagEngine(Path("/tmp/test"), None)
        assert engine.available() is False

    def test_available_with_key(self):
        engine = RagEngine(Path("/tmp/test"), "fake-key")
        assert engine.available() is True

    def test_boot_skips_without_key(self):
        engine = RagEngine(Path("/tmp/test"), None)
        engine.boot()  # Should not raise
        assert engine.vectorstores == {}

    def test_retrieve_empty_without_boot(self):
        engine = RagEngine(Path("/tmp/test"), None)
        result = engine.retrieve("ecommerce", "test query")
        assert result == []

    def test_retrieve_advanced_empty_without_boot(self):
        engine = RagEngine(Path("/tmp/test"), None)
        docs, expansions = engine.retrieve_advanced("ecommerce", "test query")
        assert docs == []
        assert expansions == []

    def test_retrieve_nonexistent_domain(self):
        engine = RagEngine(Path("/tmp/test"), None)
        engine.boot()
        result = engine.retrieve("nonexistent", "test")
        assert result == []

    def test_retrieve_advanced_nonexistent_domain(self):
        engine = RagEngine(Path("/tmp/test"), None)
        docs, expansions = engine.retrieve_advanced("nonexistent", "test")
        assert docs == []
        assert expansions == []
