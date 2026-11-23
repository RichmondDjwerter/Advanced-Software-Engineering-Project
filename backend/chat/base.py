"""Common interface for chat providers.

Every LLM endpoint (Gemini, local LLM, mock, ...) implements ChatProvider, so the
endpoint can be swapped without changing the API layer.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any, ClassVar, Literal

from models import HistoricalRecord


@dataclass(frozen=True)
class ProviderMessage:
    """One message of the conversation, independent of any provider or of the ORM.

    Named ProviderMessage (not ChatMessage) to avoid a clash with the SQLAlchemy model
    ChatMessage in models.py. Map once at the boundary:
    record.chat_messages -> list[ProviderMessage].
    """

    role: Literal["user", "assistant"]
    content: str


@dataclass(frozen=True)
class ProviderInfo:
    """Describes a provider for the UI (GET /chat/providers)."""

    name: str
    label: str
    available: bool
    external: bool
    """True if the provider sends document content off this computer."""
    setup: dict[str, Any]
    """Setup steps from providers.toml, shown when the provider is not available."""


class ChatProviderError(Exception):
    """Single error type of the chat layer.

    Adapters translate SDK and HTTP errors into this exception, so the API
    layer only has to handle one error type regardless of the provider.
    """


class ChatProvider(ABC):
    """Common interface of all chat providers (Gemini, local LLM, mock, ...).

    The API layer only depends on this class. A new endpoint is added by
    subclassing it and registering the subclass in the provider registry.
    """

    name: ClassVar[str]
    """Unique registry key, e.g. "gemini". Label and setup steps are in providers.toml."""

    @classmethod
    @abstractmethod
    def is_configured(cls) -> bool:
        """Return True if the provider is usable (e.g. API key or server URL is set).

        Classmethod on purpose: the provider list can be built without creating clients.
        """

    @abstractmethod
    def reply(
        self,
        history: list[ProviderMessage],
        system_prompt: HistoricalRecord,
        image_path: Path | None = None,
    ) -> str:
        """Return the assistant's answer to the conversation.

        Args:
            history: Conversation so far; the last item is the new user message.
            system_prompt: Document context (name, transcription, translation).

        Raises:
            ChatProviderError: If the provider call fails for any reason.

        This call is synchronous and blocking, so callers run it in a thread pool.
        """

    def transcribe(self, image_path: Path) -> list[dict[str, Any]]:
        """Return the provider's own transcription: lines with text, x, y, width, height.

        Optional: only providers that can read images override it. The OCR text is
        deliberately not passed, so that the result is independent of it.

        Raises:
            ChatProviderError: If the call fails or is not supported.
        """
        from .config import provider_config

        label = provider_config(self.name).label
        raise ChatProviderError(f"{label} does not support transcription.")
