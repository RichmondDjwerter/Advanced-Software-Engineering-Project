import json
import logging
import os
import subprocess
import tempfile
from dataclasses import dataclass
from functools import lru_cache
from io import BytesIO
from itertools import pairwise
from pathlib import Path
from typing import Any

import numpy as np
import torch
from PIL import Image, ImageOps
from transformers import TrOCRProcessor, VisionEncoderDecoderModel

logger = logging.getLogger(__name__)

# Line crops are written here for debugging (folder is git-ignored).
debug_dir = Path("debug_ocr_lines")

# ---------------------------------------------------------------------------
# Configuration
#
# The production choices below come from the team's model contest
# (notebooks/ultron_ocr_contest.ipynb and the MLflow experiments): on the same
# 100 CATMuS lines, trocr-medieval-base reached 19.4 % CER at about 1 s per
# line on 1.4 GB of GPU. MEDUSA 0.2 reached 8.9 % but needs a 14 GB GPU and
# about 7 s per line, so it is the main candidate, not the default.
# Each value can be overridden with an environment variable, so switching
# between TrOCR-type models is a configuration change, not a code change.
# ---------------------------------------------------------------------------

DEFAULT_MODEL_ID = "medieval-data/trocr-medieval-base"
MODEL_ID = os.environ.get("OCR_MODEL_ID") or DEFAULT_MODEL_ID

# "kraken": Kraken baseline segmentation (needs the Kraken executable)
# "profile": built-in dark-pixel profile splitter (no extra dependency)
# "auto": Kraken when it is installed, otherwise the built-in splitter
SEGMENTERS = ("auto", "kraken", "profile")
SEGMENTER = os.environ.get("OCR_SEGMENTER") or "auto"

KRAKEN_BIN = Path(
    os.environ.get(
        "OCR_KRAKEN_BIN",
        str(Path(__file__).resolve().parent / ".venv-kraken" / "bin" / "kraken"),
    )
)

# Decoding settings validated on the benchmark: beam search avoids the
# "a a a a ..." repetition loops seen with greedy decoding.
GENERATION_KWARGS: dict[str, Any] = {
    "max_new_tokens": 128,
    "num_beams": 4,
    "no_repeat_ngram_size": 4,
}


def ocr_config() -> dict[str, Any]:
    """Settings currently used by the OCR, for logs and experiment tracking."""
    return {
        "model_id": MODEL_ID,
        "segmenter": SEGMENTER,
        "kraken_available": KRAKEN_BIN.is_file(),
        **GENERATION_KWARGS,
    }


Box = tuple[int, int, int, int]  # (left, top, right, bottom) in page pixels


@dataclass
class OCRResult:
    text: str
    lines: list[dict[str, float | str]]


@lru_cache(maxsize=1)
def load_model():
    processor = TrOCRProcessor.from_pretrained(MODEL_ID)
    model = VisionEncoderDecoderModel.from_pretrained(MODEL_ID)

    if torch.cuda.is_available():
        device = torch.device("cuda")
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        device = torch.device("mps")
    else:
        device = torch.device("cpu")

    model.to(device)
    model.eval()
    return processor, model, device


# ---------------------------------------------------------------------------
# Line segmentation
#
# Idea: count dark pixels on every row of the page. Text lines show up as
# peaks in that count, the space between two lines as a valley. We find the
# peaks, then cut the page at the lowest point between two neighbouring peaks.
# Cutting at valleys (instead of waiting for a fully empty row) still works
# when long letters or flourishes touch the next line.
# ---------------------------------------------------------------------------


def _otsu_threshold(gray: np.ndarray) -> int:
    """Grey level that best separates ink from background for this image."""
    hist = np.bincount(gray.ravel(), minlength=256).astype(float)
    prob = hist / hist.sum()
    omega = np.cumsum(prob)
    mu = np.cumsum(prob * np.arange(256))
    with np.errstate(divide="ignore", invalid="ignore"):
        between = (mu[-1] * omega - mu) ** 2 / (omega * (1 - omega))
    if np.all(np.isnan(between)):
        return 0  # single grey level (blank image): nothing counts as ink
    return int(np.nanargmax(between))


def _smooth(values: np.ndarray, window: float) -> np.ndarray:
    size = max(1, int(window)) | 1  # odd window size
    return np.convolve(values, np.ones(size) / size, mode="same")


def find_line_boxes(image: Image.Image) -> list[tuple[int, int, int, int]]:
    """Return one (left, top, right, bottom) box per text line, top to bottom."""
    gray = np.asarray(ImageOps.grayscale(image))
    height, width = gray.shape

    # 1. Ink = pixels darker than an image-specific threshold, so a yellow
    #    parchment or uneven lighting is not mistaken for ink.
    ink = gray < _otsu_threshold(gray)

    # 2. Ignore a thin frame: page edges, shadows and rounded corners would
    #    otherwise count as ink on every row and hide the gaps between lines.
    frame_x, frame_y = int(width * 0.02), int(height * 0.01)
    ink[:, :frame_x] = False
    ink[:, width - frame_x :] = False
    ink[:frame_y, :] = False
    ink[height - frame_y :, :] = False

    # 3. Dark pixels per row, smoothed. Lines = peaks, gaps = valleys.
    profile = _smooth(ink.sum(axis=1).astype(float), height / 100)
    if profile.max() == 0:
        return []
    min_peak = 0.15 * profile.max()

    # 4. Typical distance between two lines, from the profile's periodicity.
    #    The autocorrelation also peaks at 2x, 3x... the line spacing, so we
    #    take the FIRST strong peak, not the highest one (otherwise every
    #    other line can be skipped and lines get merged in pairs).
    centred = profile - profile.mean()
    autocorr = np.correlate(centred, centred, mode="full")[height - 1 :]
    low, high = max(5, height // 60), max(10, height // 4)
    window = autocorr[low:high]
    spacing = low + int(np.argmax(window))
    if window.size > 2 and window.max() > 0:
        for lag in range(1, window.size - 1):
            is_local_max = (
                window[lag] >= window[lag - 1] and window[lag] >= window[lag + 1]
            )
            if is_local_max and window[lag] >= 0.5 * window.max():
                spacing = low + lag
                break

    # 5. Peaks: local maxima, strongest first, at least 0.6 x spacing apart.
    candidates = [
        row
        for row in range(1, height - 1)
        if profile[row] >= min_peak
        and profile[row] >= profile[row - 1]
        and profile[row] >= profile[row + 1]
    ]
    peaks: list[int] = []
    for row in sorted(candidates, key=lambda r: -profile[r]):
        if all(abs(row - other) >= 0.6 * spacing for other in peaks):
            peaks.append(row)
    peaks.sort()
    if not peaks:
        return []

    # Two peaks with no real valley between them belong to the same line
    # (for example the top and bottom of tall letters): keep only the stronger one.
    merged = [peaks[0]]
    for row in peaks[1:]:
        previous = merged[-1]
        valley = profile[previous:row].min()
        if valley > 0.5 * min(profile[previous], profile[row]):
            if profile[row] > profile[previous]:
                merged[-1] = row
        else:
            merged.append(row)
    peaks = merged

    # 6. Cut between neighbouring peaks at the lowest point of the profile.
    cuts = [max(0, peaks[0] - spacing // 2)]
    for upper, lower in pairwise(peaks):
        cuts.append(upper + int(np.argmin(profile[upper:lower])))
    cuts.append(min(height, peaks[-1] + spacing // 2))

    # 7. Each band becomes a box: keep the horizontal extent of its ink and
    #    add a small vertical overlap so ascenders and descenders are kept.
    overlap = int(0.15 * spacing)
    pad_x = max(4, width // 100)
    boxes = []
    for top, bottom in pairwise(cuts):
        columns = _smooth(ink[top:bottom].sum(axis=0).astype(float), width / 100)
        used = np.nonzero(columns > 0.5)[0]
        if used.size == 0:
            continue
        boxes.append(
            (
                max(0, int(used[0]) - pad_x),
                max(0, top - overlap),
                min(width, int(used[-1]) + 1 + pad_x),
                min(height, bottom + overlap),
            )
        )
    return boxes


def whole_page(image: Image.Image) -> list[tuple[Image.Image, Box]]:
    return [(image, (0, 0, image.width, image.height))]


def split_with_profile(image: Image.Image) -> list[tuple[Image.Image, Box]]:
    """Built-in splitter: one (crop, box) per line found by find_line_boxes."""
    boxes = find_line_boxes(image)
    return [(image.crop(box), box) for box in boxes] or whole_page(image)


def split_with_kraken(image: Image.Image) -> list[tuple[Image.Image, Box]]:
    """Use Kraken to split a page into line crops, preserving its reading order."""
    if not KRAKEN_BIN.is_file():
        raise RuntimeError(f"Kraken executable not found: {KRAKEN_BIN}")

    with tempfile.TemporaryDirectory(prefix="ultron-kraken-") as temp_dir:
        temp_path = Path(temp_dir)
        image_path = temp_path / "page.png"
        layout_path = temp_path / "layout.json"

        image.save(image_path, format="PNG")

        result = subprocess.run(
            [
                str(KRAKEN_BIN),
                "-i",
                str(image_path),
                str(layout_path),
                "-n",
                "segment",
                "-bl",
            ],
            capture_output=True,
            text=True,
            check=False,
        )

        if result.returncode != 0:
            details = (result.stderr or result.stdout)[-3000:]
            raise RuntimeError(f"Kraken segmentation failed:\n{details}")

        if not layout_path.is_file():
            raise RuntimeError("Kraken did not create its layout JSON file.")

        layout = json.loads(layout_path.read_text())
        crops: list[tuple[Image.Image, Box]] = []

        # Keep Kraken's order: sorting by y would interleave columns.
        for line in layout.get("lines", []):
            boundary = line.get("boundary") or []
            if not boundary:
                continue

            xs = [point[0] for point in boundary]
            ys = [point[1] for point in boundary]

            # A little padding keeps marks near the line edges.
            pad_x = 8
            pad_y = 4
            left = max(0, int(min(xs)) - pad_x)
            top = max(0, int(min(ys)) - pad_y)
            right = min(image.width, int(max(xs)) + 1 + pad_x)
            bottom = min(image.height, int(max(ys)) + 1 + pad_y)

            if right > left and bottom > top:
                box = (left, top, right, bottom)
                crops.append((image.crop(box), box))

        return crops or whole_page(image)


def split_page_into_lines(image: Image.Image) -> list[tuple[Image.Image, Box]]:
    """Split a page into (line image, box) pairs with the configured segmenter."""
    if SEGMENTER not in SEGMENTERS:
        raise ValueError(
            f"OCR_SEGMENTER must be one of {SEGMENTERS}, got {SEGMENTER!r}"
        )
    if SEGMENTER == "profile":
        return split_with_profile(image)
    if SEGMENTER == "kraken":
        return split_with_kraken(image)

    # auto: prefer Kraken, but keep the app working where it is not installed
    if KRAKEN_BIN.is_file():
        try:
            return split_with_kraken(image)
        except RuntimeError as error:
            logger.warning("Kraken failed, using the built-in splitter: %s", error)
    return split_with_profile(image)


# ---------------------------------------------------------------------------
# Transcription
# ---------------------------------------------------------------------------


def read_line(line: Image.Image) -> str:
    """Transcribe one line image with the configured model."""
    processor, model, device = load_model()
    pixel_values = processor(
        images=line.convert("RGB"), return_tensors="pt"
    ).pixel_values.to(device)
    with torch.inference_mode():
        generated_ids = model.generate(pixel_values, **GENERATION_KWARGS)
    return str(
        processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
    ).strip()


def transcribe_image(image_bytes: bytes) -> OCRResult:
    with Image.open(BytesIO(image_bytes)) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")

    lines = split_page_into_lines(image)
    print(f"OCR found {len(lines)} line crops")

    # Start each run with an empty debug folder so old crops do not mislead.
    debug_dir.mkdir(exist_ok=True)
    for old_crop in debug_dir.glob("line_*.png"):
        old_crop.unlink()

    recognized_lines: list[str] = []
    line_data: list[dict[str, float | str]] = []

    for index, (line, box) in enumerate(lines):
        line.save(debug_dir / f"line_{index:02d}.png")
        text = read_line(line)
        if text:
            recognized_lines.append(text)
            left, top, right, bottom = box
            # Position of the line as a fraction of the page, for line highlighting.
            line_data.append(
                {
                    "text": text,
                    "x": left / image.width,
                    "y": top / image.height,
                    "width": (right - left) / image.width,
                    "height": (bottom - top) / image.height,
                }
            )

    return OCRResult("\n".join(recognized_lines), line_data)
