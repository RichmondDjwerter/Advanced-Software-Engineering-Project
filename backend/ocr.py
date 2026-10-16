from functools import lru_cache
from io import BytesIO

import torch
from PIL import Image, ImageOps
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
from pathlib import Path


debug_dir = Path("debug_ocr_lines")
debug_dir.mkdir(exist_ok=True)

# I chose this model because to train on medieval cursive handwriting, 
# which is similar to the handwriting in the historical records.
MODEL_ID = "medieval-data/trocr-medieval-cursiva"


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


def split_page_into_lines(image: Image.Image) -> list[Image.Image]:
    """Approximate text-line crops using horizontal ink density."""
    grayscale = ImageOps.grayscale(image)
    width, height = grayscale.size

    pixels = torch.frombuffer(
        bytearray(grayscale.tobytes()),
        dtype=torch.uint8,
    )
    ink = pixels.reshape(height, width) < 185
    row_ink = ink.sum(dim=1).tolist()

    min_ink = max(2, int(width * 0.002))
    active_rows = [
        row for row, count in enumerate(row_ink)
        if count >= min_ink
    ]

    if not active_rows:
        return [image]

    gap_tolerance = max(2, height // 250)
    bands = []
    start = previous = active_rows[0]

    for row in active_rows[1:]:
        if row - previous > gap_tolerance + 1:
            bands.append((start, previous + 1))
            start = row
        previous = row

    bands.append((start, previous + 1))

    x_margin = max(4, width // 100)
    y_margin = max(2, height // 300)
    min_band_height = max(3, height // 250)
    crops = []

    for top, bottom in bands:
        if bottom - top < min_band_height:
            continue

        band_ink = ink[top:bottom]
        columns = band_ink.any(dim=0).nonzero().flatten()

        if columns.numel() == 0:
            continue

        left = max(0, int(columns[0]) - x_margin)
        right = min(width, int(columns[-1]) + 1 + x_margin)
        crop_top = max(0, top - y_margin)
        crop_bottom = min(height, bottom + y_margin)

        crops.append(image.crop((left, crop_top, right, crop_bottom)))

    return crops or [image]


def transcribe_image(image_bytes: bytes) -> str:
    processor, model, device = load_model()

    with Image.open(BytesIO(image_bytes)) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")

    lines = split_page_into_lines(image)
    print(f"OCR found {len(lines)} line crops")
    recognized_lines = []

    for line in lines:
        pixel_values = processor(
            images=line,
            return_tensors="pt",
        ).pixel_values.to(device)

        with torch.inference_mode():
            generated_ids = model.generate(
                pixel_values,
                max_new_tokens=128,
                num_beams=4,
                no_repeat_ngram_size=4
            )

        text = processor.batch_decode(
            generated_ids,
            skip_special_tokens=True,
        )[0].strip()

        if text:
            recognized_lines.append(text)

        line.save(debug_dir / f"line_{lines.index(line)}.png")

    return "\n".join(recognized_lines)