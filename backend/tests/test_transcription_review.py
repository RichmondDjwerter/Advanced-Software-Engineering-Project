import json

import pytest
from fastapi.testclient import TestClient

import main
from chat.transcription import parse_transcription
from transcription_review import build_rows

# top and height of the OCR boxes of a real letter with 19 lines
OCR_BOXES = [
    (0.1122, 0.0588),
    (0.1584, 0.0543),
    (0.2000, 0.0579),
    (0.2452, 0.0597),
    (0.2923, 0.0534),
    (0.3330, 0.0588),
    (0.3792, 0.0606),
    (0.4271, 0.0561),
    (0.4706, 0.1005),
    (0.5584, 0.0561),
    (0.6018, 0.3312),
    (0.9204, 0.0516),
]
# centers of the 19 written lines
LINE_CENTERS = [
    *(0.142, 0.186, 0.229, 0.275, 0.319, 0.362, 0.410, 0.455, 0.499, 0.540),
    *(0.586, 0.632, 0.676, 0.720, 0.765, 0.810, 0.856, 0.902, 0.947),
]


def line(text: str, top: float, height: float) -> dict:
    return {"text": text, "x": 0.05, "y": top, "width": 0.9, "height": height}


def test_rows_follow_the_position_when_the_ocr_merged_lines() -> None:
    boxes = [line(f"ocr {i}", *box) for i, box in enumerate(OCR_BOXES, 1)]
    proposed = [line(str(i), c - 0.02, 0.04) for i, c in enumerate(LINE_CENTERS, 1)]

    rows = build_rows("\n".join(box["text"] for box in boxes), boxes, proposed)

    assert [[int(item["text"]) for item in row["proposed"]] for row in rows] == [
        *([number] for number in range(1, 9)),
        [9, 10],
        [11],
        [12, 13, 14, 15, 16, 17, 18],
        [19],
    ]


def test_rows_use_the_edited_text_not_the_ocr_text() -> None:
    rows = build_rows("corrected", [line("ocr", 0.1, 0.1)], [])

    assert rows[0]["current"][0]["text"] == "corrected"


def test_text_that_does_not_fit_the_boxes_becomes_one_row() -> None:
    proposed = [line("new", 0.1, 0.1)]

    assert build_rows("a\nb", [line("a b", 0.1, 0.1)], proposed) == [
        {"current": [{"text": "a"}, {"text": "b"}], "proposed": proposed}
    ]


def test_empty_transcription_gets_all_proposed_lines() -> None:
    proposed = [line("new", 0.1, 0.1)]

    assert build_rows("", [], proposed) == [{"current": [], "proposed": proposed}]


def test_parse_converts_boxes_and_removes_line_breaks() -> None:
    answer = json.dumps({"lines": [{"text": "a\nb", "box_2d": [100, 200, 300, 700]}]})

    [parsed] = parse_transcription(f"```json\n{answer}\n```")

    assert parsed["text"] == "a b"
    assert [parsed[key] for key in ("x", "y", "width", "height")] == pytest.approx(
        [0.2, 0.1, 0.5, 0.2]
    )


@pytest.mark.parametrize(
    "answer",
    [
        "I cannot read this",
        '{"lines": []}',
        '{"lines": [{"text": "a"}]}',
        '{"lines": [{"text": "a", "box_2d": [1, 2, 3]}]}',
        '{"lines": null}',
    ],
)
def test_parse_rejects_unusable_answers(answer: str) -> None:
    with pytest.raises(ValueError):
        parse_transcription(answer)


@pytest.fixture
def record_url(client: TestClient) -> str:
    db = next(main.app.dependency_overrides[main.get_db]())
    record = main.HistoricalRecord(name="page.png", extracted_text="old")
    db.add(record)
    db.commit()
    return f"/historical_records/{record.id}"


def test_overwrite_replaces_text_and_boxes(client: TestClient, record_url: str) -> None:
    lines = [line("new 1", 0.1, 0.1), line("new 2", 0.2, 0.1)]

    response = client.put(
        record_url,
        json={"extracted_text": "new 1\nnew 2", "lines": lines, "expected_text": "old"},
    )

    assert response.status_code == 200
    assert response.json()["extracted_text"] == "new 1\nnew 2"
    assert response.json()["lines"] == lines


def test_overwrite_refuses_when_text_changed_meanwhile(
    client: TestClient, record_url: str
) -> None:
    response = client.put(
        record_url, json={"extracted_text": "new", "expected_text": "older"}
    )

    assert response.status_code == 409
    assert client.get(record_url).json()["extracted_text"] == "old"


def test_overwrite_refuses_boxes_that_do_not_fit(
    client: TestClient, record_url: str
) -> None:
    response = client.put(
        record_url, json={"extracted_text": "a\nb", "lines": [line("a", 0.1, 0.1)]}
    )

    assert response.status_code == 422
    assert client.get(record_url).json()["extracted_text"] == "old"
