import pytest

import language_detection


class FakeFastTextModel:
    def __init__(self, labels: tuple[str, ...], probabilities: tuple[float, ...]):
        self.labels = labels
        self.probabilities = probabilities
        self.predicted_text: str | None = None

    def predict(self, text: str, k: int) -> tuple[tuple[str, ...], tuple[float, ...]]:
        self.predicted_text = text
        assert k == 1
        return self.labels, self.probabilities


def test_detect_language_returns_fasttext_language_code(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    model = FakeFastTextModel(("__label__la",), (0.95,))
    monkeypatch.setattr(language_detection, "_load_model", lambda: model)

    language = language_detection.detect_language("  Ave\n Caesar  ")

    assert language == "la"
    assert model.predicted_text == "Ave Caesar"


def test_detect_language_uses_language_code_from_script_label(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    model = FakeFastTextModel(("__label__eng_Latn",), (0.95,))
    monkeypatch.setattr(language_detection, "_load_model", lambda: model)

    assert language_detection.detect_language("Hello there") == "eng"


def test_detect_language_falls_back_when_confidence_is_low(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    model = FakeFastTextModel(("__label__la",), (0.4,))
    monkeypatch.setattr(language_detection, "_load_model", lambda: model)

    assert language_detection.detect_language("uncertain text") is None


def test_detect_language_accepts_likely_language_below_old_cutoff(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    model = FakeFastTextModel(("__label__la",), (0.58,))
    monkeypatch.setattr(language_detection, "_load_model", lambda: model)

    assert language_detection.detect_language("Latin transcription") == "la"


def test_detect_language_skips_empty_text(monkeypatch: pytest.MonkeyPatch) -> None:
    def unexpected_model_load():
        raise AssertionError("The model should not load for empty text")

    monkeypatch.setattr(language_detection, "_load_model", unexpected_model_load)

    assert language_detection.detect_language(" \n ") is None
