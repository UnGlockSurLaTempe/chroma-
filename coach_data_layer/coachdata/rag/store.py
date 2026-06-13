"""
store.py — the coaching-knowledge vector store, with a no-dependency fallback.

Backends, auto-selected:
  * "chroma" : persistent Chroma vector DB + sentence-transformers embeddings.
               Best quality. Needs `pip install chromadb sentence-transformers`.
               Runs locally on a small PC (the embedding model is ~80MB).
  * "keyword": pure-stdlib TF-IDF-ish cosine over bag-of-words. Zero deps, so
               tests and your first prototype run immediately. Swap up later by
               just installing the optional deps — the interface is identical.

Documents are dicts:
  {"id": "...", "text": "...", "metadata": {"role": "BOTTOM", "topic": "vision",
                                            "champion": "Jinx", "source": "..."}}
"""

from __future__ import annotations

import math
import re
from collections import Counter
from typing import Any, Dict, List, Optional

_WORD = re.compile(r"[a-z0-9']+")


def _tokenize(text: str) -> List[str]:
    return _WORD.findall((text or "").lower())


class _KeywordBackend:
    """Minimal TF-IDF cosine retrieval. Good enough to prototype the pipeline."""

    def __init__(self) -> None:
        self._docs: List[Dict[str, Any]] = []
        self._tf: List[Counter] = []
        self._df: Counter = Counter()

    def add(self, docs: List[Dict[str, Any]]) -> None:
        for d in docs:
            toks = _tokenize(d["text"])
            tf = Counter(toks)
            self._docs.append(d)
            self._tf.append(tf)
            for term in set(toks):
                self._df[term] += 1

    def _idf(self, term: str) -> float:
        n = len(self._docs)
        return math.log((1 + n) / (1 + self._df.get(term, 0))) + 1.0

    def _vec(self, tf: Counter) -> Dict[str, float]:
        return {t: c * self._idf(t) for t, c in tf.items()}

    def query(self, text: str, k: int, where: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        q = self._vec(Counter(_tokenize(text)))
        qnorm = math.sqrt(sum(v * v for v in q.values())) or 1e-9
        scored = []
        for doc, tf in zip(self._docs, self._tf):
            if where and any(doc.get("metadata", {}).get(key) != val
                             for key, val in where.items()):
                continue
            dv = self._vec(tf)
            dot = sum(q.get(t, 0.0) * w for t, w in dv.items())
            dnorm = math.sqrt(sum(v * v for v in dv.values())) or 1e-9
            scored.append((dot / (qnorm * dnorm), doc))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [{**d, "score": round(s, 4)} for s, d in scored[:k] if s > 0]


class _ChromaBackend:
    def __init__(self, persist_dir: str, collection: str, embed_model: str):
        import chromadb
        from chromadb.utils import embedding_functions
        self._ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=embed_model)
        self._client = chromadb.PersistentClient(path=persist_dir)
        self._col = self._client.get_or_create_collection(
            name=collection, embedding_function=self._ef)

    def add(self, docs: List[Dict[str, Any]]) -> None:
        self._col.upsert(
            ids=[d["id"] for d in docs],
            documents=[d["text"] for d in docs],
            metadatas=[d.get("metadata", {}) for d in docs],
        )

    def query(self, text: str, k: int, where: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        res = self._col.query(query_texts=[text], n_results=k,
                              where=where or None)
        out = []
        for i, doc in enumerate(res["documents"][0]):
            out.append({
                "id": res["ids"][0][i],
                "text": doc,
                "metadata": res["metadatas"][0][i],
                "score": round(1.0 - res["distances"][0][i], 4) if res.get("distances") else None,
            })
        return out


class KnowledgeBase:
    """Unified interface over whichever backend is available."""

    def __init__(self, backend: str = "auto", *, persist_dir: str = "./chroma_kb",
                 collection: str = "lol_coaching",
                 embed_model: str = "all-MiniLM-L6-v2"):
        self.backend_name = backend
        if backend in ("auto", "chroma"):
            try:
                self._b = _ChromaBackend(persist_dir, collection, embed_model)
                self.backend_name = "chroma"
                return
            except Exception:
                if backend == "chroma":
                    raise
        self._b = _KeywordBackend()
        self.backend_name = "keyword"

    def add_documents(self, docs: List[Dict[str, Any]]) -> None:
        self._b.add(docs)

    def query(self, text: str, k: int = 4,
              where: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        return self._b.query(text, k, where)
