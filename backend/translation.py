import os
import unicodedata
from dataclasses import dataclass
from functools import cache

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer


@dataclass(frozen=True)
class TranslatorConfig:
    model_id: str
    max_input_tokens: int = 512
    max_new_tokens: int = 256
    num_beams: int = 4


# To swap a model, change its entry. To add a language specific model, add an
# entry keyed by language code (e.g. "la" for Latin) and it is used
# automatically; unknown languages fall back to DEFAULT_LANGUAGE.
DEFAULT_LANGUAGE = "default"
TRANSLATORS: dict[str, TranslatorConfig] = {
    DEFAULT_LANGUAGE: TranslatorConfig(
        os.getenv("TRANSLATION_MODEL_ID", "Helsinki-NLP/opus-mt-mul-en")
    ),
    # example for latin:
    # "la": TranslatorConfig("model")
    # Default translator "Helsinki-NLP/opus-mt-mul-en"
}

# OCR output is cut into chunks of about this many words so long pages are
# not truncated by the model's input limit.
WORDS_PER_CHUNK = 120


class Translator:
    def __init__(self, config: TranslatorConfig):
        self.config = config
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.tokenizer = AutoTokenizer.from_pretrained(config.model_id)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(config.model_id).to(
            self.device
        )
        self.model.eval()

    def translate(self, text: str) -> str:
        # Medieval OCR output contains combining abbreviation marks (m̃, dñ)
        # that the tokenizer does not know; normalize the text before translating.
        text = "".join(
            char
            for char in unicodedata.normalize("NFD", text)
            if not unicodedata.combining(char)
        )
        words = text.split()
        chunks = [
            " ".join(words[start : start + WORDS_PER_CHUNK])
            for start in range(0, len(words), WORDS_PER_CHUNK)
        ]
        return " ".join(self._translate_chunk(chunk) for chunk in chunks)

    def _translate_chunk(self, chunk: str) -> str:
        inputs = self.tokenizer(
            chunk,
            return_tensors="pt",
            truncation=True,
            max_length=self.config.max_input_tokens,
        ).to(self.device)

        with torch.inference_mode():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=self.config.max_new_tokens,
                num_beams=self.config.num_beams,
                no_repeat_ngram_size=3,
            )

        return self.tokenizer.decode(outputs[0], skip_special_tokens=True)


@cache
def _load_translator(language: str) -> Translator:
    return Translator(TRANSLATORS[language])


def get_translator(language: str | None = None) -> Translator:
    key = language if language in TRANSLATORS else DEFAULT_LANGUAGE
    return _load_translator(key)


def translate_text(text: str, language: str | None = None) -> str:
    if not text.strip():
        return ""
    return get_translator(language).translate(text)
