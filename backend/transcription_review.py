"""Put the current transcription and the one of the LLM side by side.

The lines are matched by their position on the page, not by number or text: the OCR
may merge several lines into one, and its text can be too wrong to compare.
"""

from typing import Any

Line = dict[str, Any]  # text, and x, y, width, height as fractions of the page
Row = dict[str, list[Line]]  # {"current": [...], "proposed": [...]}

POSITION_KEYS = {"x", "y", "width", "height"}


def build_rows(
    current_text: str, current_boxes: list[Line], proposed: list[Line]
) -> list[Row]:
    texts = current_text.rstrip().splitlines()

    # After a manual edit the boxes may no longer belong to the lines. Guessing would
    # shift the lines silently, so the whole text is then reviewed as one row.
    if (
        not texts
        or len(texts) != len(current_boxes)
        or not all(POSITION_KEYS <= box.keys() for box in current_boxes)
    ):
        return [{"current": [{"text": t} for t in texts], "proposed": proposed}]

    rows: list[Row] = [
        {"current": [{**box, "text": t}], "proposed": []}
        for t, box in zip(texts, current_boxes, strict=True)
    ]

    index = 0
    for line in proposed:
        center = line["y"] + line["height"] / 2

        def distance(candidate: int, center: float = center) -> float:
            box = current_boxes[candidate]
            half = max(box["height"] / 2, 0.001)
            # relative to the box, because merged OCR lines have very tall boxes
            return abs(center - (box["y"] + half)) / half

        # never go back, so that the reading order is kept
        index = min(range(index, len(rows)), key=distance)
        rows[index]["proposed"].append(line)

    return rows
