from pathlib import Path

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .kb import DOMAINS


class RagEngine:
    def __init__(self, faiss_root: Path, openai_api_key: str | None) -> None:
        self.faiss_root = faiss_root
        self.openai_api_key = openai_api_key
        self.vectorstores: dict[str, FAISS] = {}

    def available(self) -> bool:
        return bool(self.openai_api_key)

    def boot(self) -> None:
        if not self.available():
            return

        embeddings = OpenAIEmbeddings(api_key=self.openai_api_key)
        splitter = RecursiveCharacterTextSplitter(chunk_size=450, chunk_overlap=80)

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
        if domain not in self.vectorstores:
            return []
        return self.vectorstores[domain].similarity_search(query, k=k)
