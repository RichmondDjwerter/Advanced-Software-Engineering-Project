"""Fast checks of the OCR pipeline (no model download, no network)."""

import json
from io import BytesIO
from pathlib import Path

import pytest
from PIL import Image, ImageDraw, ImageFont

import ocr
from evaluation import ocr_quality
from evaluation.metrics import edit_distance, error_rates


def make_page(n_lines: int) -> Image.Image:
    font = ImageFont.load_default(size=30)
    page = Image.new("RGB", (900, 80 + n_lines * 60), (230, 220, 195))
    draw = ImageDraw.Draw(page)
    for i in range(n_lines):
        draw.text(
            (60, 40 + i * 60),
            f"Quoniam multi conati sunt ordinare {i}",
            fill=(60, 40, 20),
            font=font,
        )
    return page


# ---------- metrics ----------


def test_edit_distance_worked_example() -> None:
    assert edit_distance("ffecha", "fecha") == 1
    assert edit_distance("kitten", "sitting") == 3


def test_error_rates_match_benchmark_definition() -> None:
    cer, wer = error_rates(["ffecha dela"], ["fecha dela"])
    assert cer == pytest.approx(1 / 11)
    assert wer == pytest.approx(1 / 2)


def test_error_rates_ignore_unicode_form_and_extra_spaces() -> None:
    assert error_rates(["mercé"], ["mercé  "]) == (0.0, 0.0)


# ---------- segmentation ----------


def test_profile_splitter_finds_one_crop_per_line() -> None:
    assert len(ocr.split_with_profile(make_page(6))) == 6


def test_profile_splitter_returns_line_boxes_top_to_bottom() -> None:
    lines = ocr.split_with_profile(make_page(3))
    tops = [box[1] for _, box in lines]
    assert tops == sorted(tops)
    for crop, (left, top, right, bottom) in lines:
        assert crop.size == (right - left, bottom - top)


def test_profile_splitter_returns_whole_image_when_blank() -> None:
    blank = Image.new("RGB", (400, 300), "white")
    assert ocr.split_with_profile(blank) == [(blank, (0, 0, 400, 300))]


def test_transcribe_image_returns_text_and_line_positions(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr(ocr, "SEGMENTER", "profile")
    monkeypatch.setattr(ocr, "debug_dir", tmp_path)
    monkeypatch.setattr(ocr, "read_line", lambda line: "lorem")
    buffer = BytesIO()
    make_page(3).save(buffer, format="PNG")

    result = ocr.transcribe_image(buffer.getvalue())

    assert result.text == "lorem\nlorem\nlorem"
    assert len(result.lines) == 3
    for line in result.lines:
        assert line["text"] == "lorem"
        assert 0 <= float(line["y"]) < 1 and 0 < float(line["height"]) <= 1


def test_auto_segmenter_falls_back_without_kraken(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(ocr, "SEGMENTER", "auto")
    monkeypatch.setattr(ocr, "KRAKEN_BIN", Path("/nonexistent/kraken"))
    assert len(ocr.split_page_into_lines(make_page(4))) == 4


def test_explicit_kraken_without_executable_raises(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(ocr, "SEGMENTER", "kraken")
    monkeypatch.setattr(ocr, "KRAKEN_BIN", Path("/nonexistent/kraken"))
    with pytest.raises(RuntimeError, match="Kraken executable not found"):
        ocr.split_page_into_lines(make_page(2))


def test_unknown_segmenter_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(ocr, "SEGMENTER", "magic")
    with pytest.raises(ValueError, match="OCR_SEGMENTER"):
        ocr.split_page_into_lines(make_page(2))


def test_config_reports_production_settings() -> None:
    config = ocr.ocr_config()
    assert config["model_id"] == ocr.MODEL_ID
    assert config["num_beams"] == 4
    assert config["no_repeat_ngram_size"] == 4


# ---------- quality gate ----------


def fake_report(cer: float) -> dict[str, object]:
    return {
        "config": {"model_id": "fake-model"},
        "lines": 20,
        "languages": ["French", "Latin"],
        "cer": cer,
        "wer": 0.5,
        "seconds_per_line": 0.1,
        "examples": [],
    }


@pytest.mark.parametrize(("cer", "expected_exit"), [(0.19, 0), (0.45, 1)])
def test_quality_gate_passes_or_fails_on_threshold(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, cer: float, expected_exit: int
) -> None:
    monkeypatch.setattr(ocr_quality, "evaluate", lambda n_lines: fake_report(cer))
    report_path = tmp_path / "report.json"
    summary_path = tmp_path / "summary.md"

    exit_code = ocr_quality.main(
        [
            "--max-cer",
            "0.30",
            "--report",
            str(report_path),
            "--summary",
            str(summary_path),
        ]
    )

    assert exit_code == expected_exit
    report = json.loads(report_path.read_text())
    assert report["passed"] is (expected_exit == 0)
    assert "OCR quality gate" in summary_path.read_text()
