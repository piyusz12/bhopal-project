import httpx
import asyncio
from types import SimpleNamespace
from typing import Any, Dict, List


class ServamClient:
    """Minimal Servam AI adapter.

    This implements a tiny subset of the interface expected by the app:
    - `invoke(messages)` -> returns object with `.content` (string)
    - `astream(messages)` -> async generator yielding objects with `.content`

    The implementation assumes an OpenAI-compatible JSON response
    (choices -> message -> content) but falls back gracefully.
    """

    def __init__(self, model: str, servam_api_key: str | None = None, servam_url: str | None = None, temperature: float = 0.25) -> None:
        self.model = model
        self.api_key = servam_api_key
        self.url = servam_url or "https://api.servam.ai/v1/chat/completions"
        self.temperature = temperature

    def _normalize_messages(self, messages: Any) -> List[Dict[str, str]]:
        if isinstance(messages, str):
            return [{"role": "user", "content": messages}]

        out: List[Dict[str, str]] = []
        for m in messages:
            # Plain dict-like message
            if isinstance(m, dict):
                role = m.get("role", "user")
                content = m.get("content", "")
                out.append({"role": role, "content": content})
                continue

            # Langchain message objects often have a `.content` attribute
            content = getattr(m, "content", None)
            if content is None:
                out.append({"role": "user", "content": str(m)})
                continue

            # Handle list content (e.g., mixed text + image parts)
            if isinstance(content, list):
                parts: List[str] = []
                for part in content:
                    if isinstance(part, dict):
                        if part.get("type") == "text":
                            parts.append(part.get("text", ""))
                        elif part.get("type") == "image_url":
                            url = part.get("image_url")
                            if isinstance(url, dict):
                                parts.append(url.get("url", ""))
                            else:
                                parts.append(str(url))
                        else:
                            parts.append(str(part))
                    else:
                        parts.append(str(part))
                content_str = "\n".join([p for p in parts if p])
            else:
                content_str = str(content)

            clsname = getattr(m, "__class__", type(m)).__name__.lower()
            role = "system" if "system" in clsname else "user" if "human" in clsname else "user"
            out.append({"role": role, "content": content_str})

        return out

    def invoke(self, messages: Any) -> SimpleNamespace:
        msgs = self._normalize_messages(messages)
        payload = {"model": self.model, "messages": msgs, "temperature": self.temperature}
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        try:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(self.url, json=payload, headers=headers)
                res.raise_for_status()
                data = res.json()
        except Exception:
            return SimpleNamespace(content="")

        content = ""
        if isinstance(data, dict):
            choices = data.get("choices")
            if choices and isinstance(choices, list) and len(choices) > 0:
                first = choices[0]
                if isinstance(first, dict):
                    if "message" in first and isinstance(first["message"], dict):
                        content = first["message"].get("content", "")
                    else:
                        content = first.get("text", "") or ""
            else:
                content = data.get("text", "") or ""
        else:
            content = str(data)

        return SimpleNamespace(content=content or "")

    async def astream(self, messages: Any):
        """Async generator that yields small pieces of the full response.

        This is a simple, non-streaming fallback that still integrates
        with the existing SSE path in the app by yielding word chunks.
        """
        result = self.invoke(messages)
        text = (result.content or "").strip()
        if not text:
            return

        for word in text.split(" "):
            await asyncio.sleep(0)
            yield SimpleNamespace(content=word + " ")
