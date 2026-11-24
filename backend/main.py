import json
import logging
from datetime import datetime
from io import BytesIO
from pathlib import Path

import uvicorn
from fastapi import (
    Depends,
    FastAPI,
    File,
    HTTPException,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import Engine, inspect, text
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from chat import registry
from chat.base import ChatProvider, ChatProviderError, ProviderMessage
from database import Base, engine, get_db
from language_detection import detect_language
from models import ChatMessage, HistoricalRecord, TranscriptionSnapshot
from ocr import OCRResult, transcribe_image
from transcription_review import Row, build_rows
from translation import translate_text

Base.metadata.create_all(bind=engine)


def migrate_historical_record_columns(database_engine: Engine = engine) -> None:
    columns = {
        column["name"]
        for column in inspect(database_engine).get_columns("historical_records")
    }
    chat_columns = {
        column["name"]
        for column in inspect(database_engine).get_columns("chat_messages")
    }
    missing_columns = {
        "line_data": "TEXT",
        "image_width": "INTEGER",
        "image_height": "INTEGER",
        "detected_language": "VARCHAR(16)",
        "transcription_revision": "INTEGER NOT NULL DEFAULT 1",
    }

    with database_engine.begin() as connection:
        for name, column_type in missing_columns.items():
            if name not in columns:
                connection.execute(
                    text(
                        f"ALTER TABLE historical_records "
                        f"ADD COLUMN {name} {column_type}"
                    )
                )

        if "source_revision" not in chat_columns:
            connection.execute(
                text(
                    "ALTER TABLE chat_messages "
                    "ADD COLUMN source_revision INTEGER NOT NULL DEFAULT 1"
                )
            )


migrate_historical_record_columns()

app = FastAPI(
    title="Historical Manuscripts API",
    description="API for storing and processing historical manuscripts.",
    version="1.0.0",
)


logger = logging.getLogger(__name__)

app = FastAPI()

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

IMAGE_EXTENSIONS = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/bmp",
    "image/webp",
}

MAX_IMAGE_BYTES = 15 * 1024 * 1024  # 15 MB
MAX_IMAGE_PIXELS = 40_000_000


# CORS configuration
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.mount(
    "/uploads",
    StaticFiles(directory=UPLOAD_DIR),
    name="uploads",
)


class LineBox(BaseModel):
    text: str
    x: float
    y: float
    width: float
    height: float


class HistoricalRecordUpdate(BaseModel):
    # Only the fields that are sent are changed.
    name: str | None = None
    extracted_text: str | None = None
    translated_text: str | None = None
    # Replaces the boxes that are linked to the lines of extracted_text by index.
    lines: list[LineBox] | None = None
    # If sent, the update fails when the transcription was changed in the meantime.
    expected_text: str | None = None
    # Human-readable reason saved with a transcription snapshot.
    revision_source: str | None = None


# Classes for Chat
class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    historical_record_id: str
    role: str
    content: str
    created_at: datetime


def known_provider(name: str) -> str:
    if name not in registry.names():
        raise ValueError(f"Unknown provider. Use one of {registry.names()}.")
    return name


class ChatMessageCreate(BaseModel):
    content: str
    provider: str = Field(default_factory=registry.default_name)

    _check_provider = field_validator("provider")(known_provider)


# ROOT ENDPOINT


@app.get("/")
def root():
    return {
        "message": "Historical Manuscripts API",
    }


# Routes for Historical Records
IMAGE_EXTENSIONS = {"image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp"}


def record_response(record: HistoricalRecord):
    try:
        lines = json.loads(record.line_data) if record.line_data else []
    except json.JSONDecodeError:
        lines = []

    return {
        "id": record.id,
        "name": record.name,
        "description": record.description,
        "extracted_text": record.extracted_text,
        "translated_text": record.translated_text,
        "lines": lines,
        "image_width": record.image_width,
        "image_height": record.image_height,
        "detected_language": record.detected_language,
        "transcription_revision": record.transcription_revision,
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
    }


def _snapshot_dict(snapshot: TranscriptionSnapshot) -> dict[str, object]:
    try:
        lines = json.loads(snapshot.line_data) if snapshot.line_data else []
    except json.JSONDecodeError:
        lines = []
    return {
        "revision": snapshot.revision,
        "extracted_text": snapshot.extracted_text,
        "translated_text": snapshot.translated_text,
        "lines": lines,
        "source": snapshot.source,
        "created_at": snapshot.created_at.isoformat(),
    }


def _save_current_snapshot(
    db: Session, record: HistoricalRecord, source: str
) -> TranscriptionSnapshot:
    snapshot = (
        db.query(TranscriptionSnapshot)
        .filter(
            TranscriptionSnapshot.historical_record_id == record.id,
            TranscriptionSnapshot.revision == record.transcription_revision,
        )
        .first()
    )
    if snapshot is None:
        snapshot = TranscriptionSnapshot(
            historical_record_id=record.id,
            revision=record.transcription_revision,
            extracted_text=record.extracted_text or "",
            translated_text=record.translated_text,
            line_data=record.line_data,
            source=source[:120],
        )
        db.add(snapshot)
    else:
        # The translation may arrive after the transcription snapshot is made.
        snapshot.translated_text = record.translated_text
        snapshot.line_data = record.line_data
    return snapshot


def detect_transcription_language(text: str, language: str | None = None) -> str | None:
    if language is None:
        try:
            language = detect_language(text)
        except Exception:
            logger.exception(
                "FastText language detection failed; using the default translator."
            )

    if language is not None:
        logger.info("Detected transcription language '%s'.", language)

    return language


@app.get("/historical_records")
def get_historical_records(
    db: Session = Depends(get_db),
):
    records = db.query(HistoricalRecord).all()

    return [record_response(record) for record in records]


@app.get("/historical_records/{record_id}")
def get_historical_record(
    record_id: str,
    db: Session = Depends(get_db),
):
    record = db.query(HistoricalRecord).filter(HistoricalRecord.id == record_id).first()

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Historical record not found",
        )

    return record_response(record)


@app.get("/historical_records/{record_id}/transcription-history")
def get_transcription_history(
    record_id: str,
    db: Session = Depends(get_db),
):
    record = db.query(HistoricalRecord).filter(HistoricalRecord.id == record_id).first()
    if record is None:
        raise HTTPException(status_code=404, detail="Historical record not found")

    snapshots = (
        db.query(TranscriptionSnapshot)
        .filter(TranscriptionSnapshot.historical_record_id == record_id)
        .order_by(TranscriptionSnapshot.revision.desc())
        .all()
    )
    if not snapshots:
        try:
            lines = json.loads(record.line_data) if record.line_data else []
        except json.JSONDecodeError:
            lines = []
        return [
            {
                "revision": record.transcription_revision,
                "extracted_text": record.extracted_text or "",
                "translated_text": record.translated_text,
                "lines": lines,
                "source": "Current version (history tracking started recently)",
                "created_at": record.updated_at.isoformat(),
                "is_current": True,
            }
        ]

    return [
        {
            **_snapshot_dict(snapshot),
            "is_current": snapshot.revision == record.transcription_revision,
        }
        for snapshot in snapshots
    ]


@app.post("/historical_records/{record_id}/detect-language")
async def detect_historical_record_language(
    record_id: str,
    db: Session = Depends(get_db),
):
    record = db.query(HistoricalRecord).filter(HistoricalRecord.id == record_id).first()

    if record is None:
        raise HTTPException(status_code=404, detail="Historical record not found")

    record.detected_language = await run_in_threadpool(
        detect_transcription_language,
        record.extracted_text or "",
    )
    db.commit()

    return {"id": record.id, "detected_language": record.detected_language}


# TRANSLATE THE EXTRACTED TEXT OF A RECORD INTO ENGLISH


class TranslateRequest(BaseModel):
    # Optional override, so translation can be tested without relying on OCR.
    text: str | None = None


@app.post("/historical_records/{record_id}/translate")
async def translate_historical_record(
    record_id: str,
    language: str | None = None,
    payload: TranslateRequest | None = None,
    db: Session = Depends(get_db),
):
    record = db.query(HistoricalRecord).filter(HistoricalRecord.id == record_id).first()

    if record is None:
        raise HTTPException(status_code=404, detail="Historical record not found")

    source_text = (
        payload.text
        if payload is not None and payload.text is not None
        else record.extracted_text or ""
    )
    if payload is not None and payload.text is not None and payload.text != (record.extracted_text or ""):
        raise HTTPException(
            status_code=409,
            detail="The transcription changed before translation finished. Try again with the current text.",
        )
    source_revision = record.transcription_revision

    try:
        detected_language = await run_in_threadpool(
            detect_transcription_language,
            source_text,
            language,
        )
        translated = await run_in_threadpool(
            translate_text,
            source_text,
            detected_language,
        )
    except Exception as error:
        logger.exception("Translation failed.")
        raise HTTPException(
            status_code=503,
            detail="Translation failed. Check the backend model setup and try again.",
        ) from error

    db.refresh(record)
    if (
        record.transcription_revision != source_revision
        or (record.extracted_text or "") != source_text
    ):
        raise HTTPException(
            status_code=409,
            detail="The transcription changed while translation was running. Try again with the current text.",
        )

    translation_changed = translated != (record.translated_text or "")
    if translation_changed:
        _save_current_snapshot(db, record, "Before translation update")
        record.transcription_revision += 1

    record.translated_text = translated
    record.detected_language = detected_language
    _save_current_snapshot(db, record, "Machine translation refreshed")
    db.commit()

    return {
        "id": record.id,
        "translated_text": record.translated_text,
        "detected_language": record.detected_language,
    }


# UPLOAD A HISTORICAL DOCUMENT, RUN OCR AND TRANSLATE IT


@app.post("/historical_records")
async def create_historical_record(
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # 1. Validate the uploaded file's declared content type.

    if image.content_type not in IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail="Upload a JPEG, PNG, GIF, BMP, or WebP image.",
        )

    # 2. Read the image and enforce the file-size limit.

    image_bytes = await image.read(MAX_IMAGE_BYTES + 1)

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded image is empty.",
        )

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Images must be 15 MB or smaller.",
        )

    # Validate the image and its dimensions.

    try:
        with Image.open(BytesIO(image_bytes)) as uploaded_image:
            if uploaded_image.width * uploaded_image.height > MAX_IMAGE_PIXELS:
                raise HTTPException(
                    status_code=413,
                    detail="Image dimensions are too large to process.",
                )

            image_format = uploaded_image.format
            image_width = uploaded_image.width
            image_height = uploaded_image.height

            uploaded_image.verify()

    except HTTPException:
        raise

    except UnidentifiedImageError, OSError:
        raise HTTPException(
            status_code=415,
            detail="The uploaded file is not a readable image.",
        )

    # Preserve the original filename for display.

    original_name = Path(image.filename or "historical-document").name

    # Run TrOCR on the uploaded image.

    try:
        ocr_result = await run_in_threadpool(
            transcribe_image,
            image_bytes,
        )

    except Exception as error:
        logger.exception("TrOCR failed to process the uploaded image.")

        raise HTTPException(
            status_code=503,
            detail=(
                "OCR could not process the image. "
                "Check the backend model setup and try again."
            ),
        ) from error

    if isinstance(ocr_result, OCRResult):
        extracted_text = ocr_result.text
        line_data = ocr_result.lines
    else:
        extracted_text = ocr_result
        line_data = []

    # Translate the extracted text. A failed translation does not fail the
    # upload: the record is saved without a translation.

    translated_text = None
    detected_language = None

    if extracted_text.strip():
        detected_language = await run_in_threadpool(
            detect_transcription_language,
            extracted_text,
        )
        try:
            translated_text = await run_in_threadpool(
                translate_text,
                extracted_text,
                detected_language,
            )
        except Exception:
            logger.exception("Translation failed. Saving without translation.")

    # Create the database record.

    new_record = HistoricalRecord(
        name=original_name,
        extracted_text=extracted_text,
        translated_text=translated_text,
        description=None,
        line_data=json.dumps(line_data),
        image_width=image_width,
        image_height=image_height,
        detected_language=detected_language,
    )

    try:
        db.add(new_record)
        db.flush()
        _save_current_snapshot(db, new_record, "Initial TrOCR transcription")
        db.commit()
        db.refresh(new_record)

    except Exception as error:
        db.rollback()

        logger.exception("Failed to save the historical record to PostgreSQL.")

        raise HTTPException(
            status_code=500,
            detail="The historical record could not be saved.",
        ) from error

    # Return the saved record as JSON.
    extension = {
        "JPEG": ".jpg",
        "PNG": ".png",
        "GIF": ".gif",
        "BMP": ".bmp",
        "WEBP": ".webp",
    }.get(image_format or "", ".img")
    file_path = UPLOAD_DIR / f"{new_record.id}{extension}"

    try:
        file_path.write_bytes(image_bytes)
    except OSError as error:
        logger.exception("Failed to save the uploaded image.")
        raise HTTPException(
            status_code=500,
            detail="The uploaded image could not be saved.",
        ) from error

    return record_response(new_record)


# RUN THE APPLICATION


@app.put("/historical_records/{record_id}")
def update_historical_record(
    record_id: str,
    record_update: HistoricalRecordUpdate,
    db: Session = Depends(get_db),
):
    record = db.query(HistoricalRecord).filter(HistoricalRecord.id == record_id).first()

    if not record:
        raise HTTPException(status_code=404, detail="Historical record not found")

    changes = record_update.model_dump(exclude_unset=True)

    if "name" in changes and not changes["name"]:
        raise HTTPException(status_code=422, detail="The name cannot be empty.")

    revision_source = changes.pop("revision_source", None) or "Manual edit"
    expected_text = changes.pop("expected_text", None)
    if expected_text is not None and expected_text != (record.extracted_text or ""):
        raise HTTPException(
            status_code=409,
            detail="The transcription was changed in the meantime. Discard and compare again.",
        )

    lines = changes.pop("lines", None)
    old_text = record.extracted_text or ""
    new_text = changes.get("extracted_text", record.extracted_text) or ""
    transcription_changed = new_text != old_text
    old_translation = record.translated_text or ""
    new_translation = changes.get("translated_text", record.translated_text) or ""
    translation_changed = new_translation != old_translation

    source_changed = transcription_changed or translation_changed
    if source_changed:
        # Preserve the previous evidence before advancing the chat source revision.
        _save_current_snapshot(db, record, "Before source update")
        record.transcription_revision += 1
        if transcription_changed and "translated_text" not in changes:
            record.translated_text = None

    if lines is not None:
        if lines and len(lines) != len(new_text.split("\n")):
            raise HTTPException(
                status_code=422, detail="There must be one box per line of text."
            )
        record.line_data = json.dumps(lines)
    elif transcription_changed and record.line_data:
        try:
            old_lines = json.loads(record.line_data)
        except json.JSONDecodeError:
            old_lines = []
        if old_lines and len(old_lines) != len(new_text.split("\n")):
            # Old coordinates no longer match line numbers in the edited text.
            record.line_data = None

    for field, value in changes.items():
        setattr(record, field, value)

    if source_changed:
        _save_current_snapshot(db, record, revision_source)

    db.commit()
    db.refresh(record)

    return record_response(record)


@app.delete("/historical_records/{record_id}")
def delete_historical_record(
    record_id: str,
    db: Session = Depends(get_db),
):
    record = db.query(HistoricalRecord).filter(HistoricalRecord.id == record_id).first()

    if not record:
        raise HTTPException(status_code=404, detail="Historical record not found")

    for file_path in UPLOAD_DIR.glob(f"{record.id}.*"):
        file_path.unlink()

    db.delete(record)
    db.commit()

    return {"message": "Historical record deleted successfully"}


# Chat Routes
class TranscriptionCompareRequest(BaseModel):
    # No default: the image must only leave the machine if a provider was chosen.
    provider: str

    _check_provider = field_validator("provider")(known_provider)


class ComparisonImage(BaseModel):
    """The source image, so that the review can show the part of each row."""

    name: str
    width: int
    height: int


class TranscriptionComparisonOut(BaseModel):
    current_text: str
    rows: list[Row]
    image: ComparisonImage


@app.get("/chat/providers")
def get_chat_providers():
    """Lists the providers with their setup steps, never their credentials"""
    return registry.infos()


def create_chat_provider(name: str) -> ChatProvider:
    return registry.create(name)


@app.get("/historical_records/{record_id}/chat", response_model=list[ChatMessageOut])
def get_chat_history(record_id: str, db: Session = Depends(get_db)):
    record = db.query(HistoricalRecord).filter(HistoricalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Historical record not found")
    return [
        message
        for message in record.chat_messages
        if message.source_revision == record.transcription_revision
    ]


@app.post(
    "/historical_records/{record_id}/chat",
    response_model=list[ChatMessageOut],
    status_code=201,
)
def post_message(
    record_id: str,
    chat_message: ChatMessageCreate,
    db: Session = Depends(get_db),
):
    """Saves the user message and the assistant response, returns both"""
    record = db.query(HistoricalRecord).filter(HistoricalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Historical record not found")

    content = chat_message.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message is empty")

    source_revision = record.transcription_revision
    image_path = next(UPLOAD_DIR.glob(f"{record.id}.*"), None)

    user_message = ChatMessage(
        role="user", content=content, source_revision=source_revision
    )
    record.chat_messages.append(user_message)

    chat_provider = create_chat_provider(chat_message.provider)

    history = [
        ProviderMessage(
            role="user" if message.role == "user" else "assistant",
            content=message.content,
        )
        for message in record.chat_messages
        if message.source_revision == source_revision
    ]

    try:
        assistant_reply = chat_provider.reply(history, record, image_path=image_path)
    except (ChatProviderError, RuntimeError) as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    latest_revision = (
        db.query(HistoricalRecord.transcription_revision)
        .filter(HistoricalRecord.id == record_id)
        .scalar()
    )
    if latest_revision != source_revision:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="The transcription changed while the answer was being prepared. Please ask again.",
        )

    assistant_message = ChatMessage(
        role="assistant",
        content=assistant_reply,
        source_revision=source_revision,
    )

    record.chat_messages.append(assistant_message)

    db.commit()
    db.refresh(user_message)
    db.refresh(assistant_message)

    return [user_message, assistant_message]


@app.post(
    "/historical_records/{record_id}/compare-transcription",
    response_model=TranscriptionComparisonOut,
)
def compare_transcription(
    record_id: str,
    payload: TranscriptionCompareRequest,
    db: Session = Depends(get_db),
):
    """Compares an LLM transcription of the image with the current one, saves nothing"""
    record = db.query(HistoricalRecord).filter(HistoricalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Historical record not found")

    image_path = next(UPLOAD_DIR.glob(f"{record.id}.*"), None)
    if image_path is None:
        raise HTTPException(status_code=404, detail="The document image was not found.")

    try:
        proposed = create_chat_provider(payload.provider).transcribe(image_path)
    except ChatProviderError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    # Gemini takes a while, the transcription may have been edited meanwhile.
    db.refresh(record)
    current_text = record.extracted_text or ""

    with Image.open(image_path) as source:
        width, height = source.size

    return {
        "current_text": current_text,
        "rows": build_rows(current_text, record_response(record)["lines"], proposed),
        # served by /uploads, the name is the stored file, not the uploaded one
        "image": {"name": image_path.name, "width": width, "height": height},
    }


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
    )
