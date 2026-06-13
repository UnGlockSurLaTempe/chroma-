"""
ingest.py — chunk coaching documents and load them into the KnowledgeBase.

Your coaching corpus is plain markdown/text files. Put metadata in YAML-ish
front-matter so retrieval can filter by role/champion/topic:

    ---
    role: BOTTOM
    topic: laning
    champion: ANY
    source: "ADC laning fundamentals"
    ---
    # body text...

Chunks are split on blank-line paragraphs and capped by length so retrieval
returns focused snippets, not whole guides.
"""

from __future__ import annotations

import glob
import os
import re
from typing import Any, Dict, List

_FRONT = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def _parse_front_matter(text: str):
    m = _FRONT.match(text)
    meta: Dict[str, Any] = {}
    if not m:
        return meta, text
    for line in m.group(1).splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip().strip('"')
    return meta, text[m.end():]


def _chunk(body: str, max_chars: int = 700) -> List[str]:
    chunks, cur = [], ""
    for para in re.split(r"\n\s*\n", body.strip()):
        para = para.strip()
        if not para:
            continue
        if len(cur) + len(para) + 2 > max_chars and cur:
            chunks.append(cur.strip())
            cur = para
        else:
            cur = f"{cur}\n\n{para}" if cur else para
    if cur.strip():
        chunks.append(cur.strip())
    return chunks


def documents_from_dir(path: str, pattern: str = "**/*.md") -> List[Dict[str, Any]]:
    """Read + chunk every matching file into ingestable document dicts."""
    docs: List[Dict[str, Any]] = []
    for fpath in sorted(glob.glob(os.path.join(path, pattern), recursive=True)):
        with open(fpath, encoding="utf-8") as f:
            raw = f.read()
        meta, body = _parse_front_matter(raw)
        base = os.path.splitext(os.path.basename(fpath))[0]
        for i, chunk in enumerate(_chunk(body)):
            docs.append({
                "id": f"{base}:{i}",
                "text": chunk,
                "metadata": {**meta, "file": os.path.basename(fpath)},
            })
    return docs


def ingest_dir(kb, path: str, pattern: str = "**/*.md") -> int:
    """Load a directory of coaching docs into the knowledge base. Returns count."""
    docs = documents_from_dir(path, pattern)
    kb.add_documents(docs)
    return len(docs)
