"""Mocked LLM for the chat: fixed questions with fixed answers, until the real LLM is connected."""

import time

MOCK_RESPONSES: dict[str, str] = {
    "what is this document about?": (
        "Abraham Lincoln asks General Meade about William J. Evers, "
        "a soldier facing possible execution for desertion."
    ),
    "who wrote this letter?": (
        "Abraham Lincoln, the 16th President of the United States."
    ),
    "who was this letter addressed to?": (
        "Major General George G. Meade, commander of the Union Army of the Potomac."
    ),
    "when was this letter written?": (
        "October 5, 1863, during the American Civil War."
    ),
}

DEFAULT_RESPONSE = "Sorry, I can't answer that question yet."

REPLY_DELAY_SECONDS = 3


def normalize(content: str) -> str:
    return " ".join(content.lower().split())


def get_mock_reply(content: str) -> str:
    time.sleep(REPLY_DELAY_SECONDS)  # simulates the LLM's latency
    return MOCK_RESPONSES.get(normalize(content), DEFAULT_RESPONSE)
