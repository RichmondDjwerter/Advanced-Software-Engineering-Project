import logging
import os
import shutil
import tempfile
from functools import cache
from pathlib import Path
from urllib.request import urlopen

import fasttext  # type: ignore[import-untyped]

logger = logging.getLogger(__name__)

MODEL_URL = "https://dl.fbaipublicfiles.com/fasttext/supervised-models/lid.176.ftz"
MODEL_PATH = Path(
    os.getenv(
        "FASTTEXT_LANGUAGE_MODEL_PATH",
        str(Path(__file__).resolve().parent / ".cache" / "lid.176.ftz"),
    )
)
MIN_CONFIDENCE = 0.5


def _download_model(model_path: Path) -> None:
    model_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        dir=model_path.parent,
        prefix=f"{model_path.name}.",
        suffix=".download",
        delete=False,
    ) as temporary_file:
        temporary_path = Path(temporary_file.name)

    try:
        with (
            urlopen(MODEL_URL, timeout=30) as response,
            temporary_path.open("wb") as model_file,
        ):
            shutil.copyfileobj(response, model_file)
        temporary_path.replace(model_path)
    finally:
        temporary_path.unlink(missing_ok=True)


@cache
def _load_model():
    if not MODEL_PATH.is_file():
        logger.info("Downloading FastText language-identification model.")
        _download_model(MODEL_PATH)

    return fasttext.load_model(str(MODEL_PATH))


def detect_language(text: str) -> str | None:
    normalized_text = " ".join(text.split())
    if not normalized_text:
        return None

    labels, probabilities = _load_model().predict(normalized_text, k=1)
    if len(labels) == 0 or len(probabilities) == 0:
        return None
    if float(probabilities[0]) < MIN_CONFIDENCE:
        return None

    label = labels[0].removeprefix("__label__")
    return label.split("_", maxsplit=1)[0] or None
