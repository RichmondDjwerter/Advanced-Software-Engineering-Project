"""
Implementation of ChatProvider for Gemini API.
"""

import os
from typing import ClassVar

from .base import ChatProvider, ChatProviderError
from dotenv import load_dotenv
from google import genai

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-4-hydrogen"

client = genai.Client(api_key=GEMINI_API_KEY) if bool(GEMINI_API_KEY) else None

class GeminiProvider(ChatProvider):
    """
    ChatProvider implementation for the Gemini API. Requires the GEMINI_API_KEY environment variable to be set.
    """
    name: ClassVar[str] = "gemini"
    label: ClassVar[str] = "Gemini"

    @classmethod
    def is_configured(cls) -> bool:
        return client is not None

    def reply(self, history, system_prompt):
        if not self.is_configured():
            raise ChatProviderError("Gemini is not configured. Please set the GEMINI_API_KEY environment variable.")

        try:
            # Convert the history of ProviderMessage objects into the format expected by the Gemini API
            gemini_history = [{
                "type": "user_input" if message.role == "user" else "model_output",
                "content": [
                    {
                        "type": "text", 
                        "text": message.content
                    }
                ]
            } for message in history]

            interaction = client.interactions.create(
                model=GEMINI_MODEL,
                store=False,
                input=gemini_history,
                system_instruction=system_prompt,
            )
            return interaction.output_text
        
        except Exception as e:
            raise ChatProviderError(f"Gemini API error: {e!s}") from e