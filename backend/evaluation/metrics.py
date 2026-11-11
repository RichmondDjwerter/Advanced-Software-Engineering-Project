"""Character and word error rates, identical to the team's benchmark notebooks.

CER = character edits needed to turn the prediction into the truth,
divided by the number of characters in the truth. WER is the same on words.
Both texts are Unicode-normalised (NFC) and their spaces collapsed first.
"""

import unicodedata
from collections.abc import Iterable, Sequence


def normalise(text: str) -> str:
    return " ".join(unicodedata.normalize("NFC", text).split())


def edit_distance(a: Sequence[object], b: Sequence[object]) -> int:
    """Levenshtein distance: insertions, deletions and substitutions."""
    previous = list(range(len(b) + 1))
    for i, item_a in enumerate(a, start=1):
        current = [i]
        for j, item_b in enumerate(b, start=1):
            current.append(
                min(
                    previous[j] + 1,
                    current[j - 1] + 1,
                    previous[j - 1] + (item_a != item_b),
                )
            )
        previous = current
    return previous[-1]


def error_rates(
    truths: Iterable[str], predictions: Iterable[str]
) -> tuple[float, float]:
    """Overall (CER, WER): total edits divided by total characters or words."""
    char_edits = chars = word_edits = words = 0
    for truth, prediction in zip(truths, predictions, strict=True):
        t, p = normalise(truth), normalise(prediction)
        char_edits += edit_distance(t, p)
        chars += len(t)
        word_edits += edit_distance(t.split(), p.split())
        words += len(t.split())
    return char_edits / max(chars, 1), word_edits / max(words, 1)
