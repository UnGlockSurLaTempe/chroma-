"""
llm.py — provider-neutral LLM interface with three adapters.

A PromptSpec (from prompts.py) is {system, messages, ...}. An adapter turns it
into a completion string. Pick the adapter per stage:

  * ClaudeLLM  — the reasoning-heavy conclusion (and anything you want highest
                 quality). Uses the Anthropic SDK; defaults to claude-opus-4-8
                 with adaptive thinking on stages that ask for it.
  * OllamaLLM  — cheap/bulk local work (recap, debate turns) on your own GPU,
                 e.g. qwen2.5 / qwen2.5:14b. Talks to the Ollama HTTP API.
  * EchoLLM    — no model at all: returns the rendered prompt. Lets you inspect
                 exactly what each agent receives, and run the whole pipeline
                 offline (used by the web UI's prompt-preview and by tests).

All three expose: generate(spec: dict) -> str
"""

from __future__ import annotations

import json
import urllib.request
from typing import Any, Dict, List


def _messages_to_text(spec: Dict[str, Any]) -> str:
    """Flatten a PromptSpec to plain text (for EchoLLM and Ollama fallbacks)."""
    out = [f"<<SYSTEM>>\n{spec.get('system','')}\n"]
    for msg in spec.get("messages", []):
        out.append(f"<<{msg['role'].upper()}>>\n{msg['content']}\n")
    return "\n".join(out)


class EchoLLM:
    """Returns the prompt instead of calling a model. Offline + inspectable."""

    name = "echo"

    def generate(self, spec: Dict[str, Any]) -> str:
        return (f"[echo:{spec.get('stage','?')}] no model configured — this is the "
                f"exact prompt the agent would receive:\n\n{_messages_to_text(spec)}")


class ClaudeLLM:
    """Anthropic SDK adapter. Defaults to claude-opus-4-8."""

    def __init__(self, model: str = "claude-opus-4-8", max_tokens: int = 4000):
        import anthropic  # imported lazily so the package has no hard dep
        self._client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env
        self.model = model
        self.max_tokens = max_tokens
        self.name = f"claude:{model}"

    def generate(self, spec: Dict[str, Any]) -> str:
        kwargs: Dict[str, Any] = {
            "model": self.model,
            "max_tokens": self.max_tokens,
            "system": spec.get("system", ""),
            "messages": spec.get("messages", []),
        }
        # Adaptive thinking for stages that flag heavy reasoning (e.g. conclusion).
        if spec.get("think"):
            kwargs["thinking"] = {"type": "adaptive"}
        resp = self._client.messages.create(**kwargs)
        return "".join(b.text for b in resp.content if b.type == "text").strip()


class OllamaLLM:
    """Local Ollama adapter (http://localhost:11434). For bulk/cheap stages."""

    def __init__(self, model: str = "qwen2.5:7b",
                 host: str = "http://localhost:11434", timeout: int = 300):
        self.model = model
        self.host = host.rstrip("/")
        self.timeout = timeout
        self.name = f"ollama:{model}"

    def generate(self, spec: Dict[str, Any]) -> str:
        messages = [{"role": "system", "content": spec.get("system", "")}]
        messages.extend(spec.get("messages", []))
        body = json.dumps({"model": self.model, "messages": messages,
                           "stream": False}).encode("utf-8")
        req = urllib.request.Request(
            f"{self.host}/api/chat", data=body,
            headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=self.timeout) as r:
            data = json.loads(r.read())
        return (data.get("message") or {}).get("content", "").strip()


def make_llm(spec_or_name: str = "echo", **kwargs):
    """Factory: 'echo' | 'claude' | 'ollama'."""
    if spec_or_name == "claude":
        return ClaudeLLM(**kwargs)
    if spec_or_name == "ollama":
        return OllamaLLM(**kwargs)
    return EchoLLM()
