from pathlib import Path

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .kb import DOMAINS
from .services import expand_query, rerank_documents


class RagEngine:
    """
    Advanced RAG engine with:
    - FAISS vector store per domain
    - Multi-query retrieval (query expansion)
    - Cross-encoder reranking simulation
    - Semantic chunking with optimized parameters
    """

    def __init__(self, faiss_root: Path, openai_api_key: str | None) -> None:
        self.faiss_root = faiss_root
        self.openai_api_key = openai_api_key
        self.vectorstores: dict[str, FAISS] = {}

    def available(self) -> bool:
        return bool(self.openai_api_key)

    def boot(self) -> None:
        """Initialize FAISS vector stores for all domains."""
        if not self.available():
            return

        embeddings = OpenAIEmbeddings(api_key=self.openai_api_key)
        # Optimized chunking: smaller chunks with higher overlap for better precision
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=350,
            chunk_overlap=100,
            separators=["\n[", "\n\n", "\n", ". ", " "],
            keep_separator=True,
        )

        for domain, meta in DOMAINS.items():
            target = self.faiss_root / domain
            if (target / "index.faiss").exists():
                self.vectorstores[domain] = FAISS.load_local(
                    str(target), embeddings, allow_dangerous_deserialization=True
                )
                continue

            docs = [Document(page_content=meta["knowledge"], metadata={"domain": domain})]
            chunks = splitter.split_documents(docs)
            store = FAISS.from_documents(chunks, embeddings)
            target.mkdir(parents=True, exist_ok=True)
            store.save_local(str(target))
            self.vectorstores[domain] = store

    def retrieve(self, domain: str, query: str, k: int = 4) -> list[Document]:
        """Basic single-query retrieval."""
        if domain not in self.vectorstores:
            return []
        return self.vectorstores[domain].similarity_search(query, k=k)

    def retrieve_advanced(self, domain: str, query: str, k: int = 4) -> tuple[list[Document], list[str]]:
        """
        Advanced retrieval pipeline:
        1. Expand query into multiple variants (multi-query)
        2. Retrieve top candidates from each variant
        3. Deduplicate results
        4. Rerank using cross-encoder simulation
        5. Return top-k most relevant chunks

        Returns (documents, query_expansions).
        """
        if domain not in self.vectorstores:
            return [], []

        store = self.vectorstores[domain]

        # Step 1: Query expansion
        expansions = expand_query(query)

        # Step 2: Retrieve from original + expanded queries
        all_docs: list[Document] = []
        seen_contents: set[str] = set()

        # Original query retrieval (highest priority)
        for doc in store.similarity_search(query, k=k * 2):
            content_key = doc.page_content.strip()[:100]
            if content_key not in seen_contents:
                seen_contents.add(content_key)
                all_docs.append(doc)

        # Expanded query retrieval
        for expansion in expansions:
            try:
                for doc in store.similarity_search(expansion, k=k):
                    content_key = doc.page_content.strip()[:100]
                    if content_key not in seen_contents:
                        seen_contents.add(content_key)
                        all_docs.append(doc)
            except Exception:
                continue

        # Step 3: Rerank all candidates to top-k
        reranked = rerank_documents(query, all_docs, top_k=k)

        return reranked, expansions
