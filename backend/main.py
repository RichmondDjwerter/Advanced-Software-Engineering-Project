import logging
from io import BytesIO
from datetime import datetime
from pathlib import Path
from uuid import uuid4

import uvicorn
from fastapi import (
    FastAPI,
    Depends,
    UploadFile,
    File,
    HTTPException,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from PIL import Image, UnidentifiedImageError
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from chat_mock import get_mock_reply
from database import Base, engine, get_db
from models import HistoricalRecord
from ocr import transcribe_image

Base.metadata.create_all(bind=engine)

from models import ChatMessage, HistoricalRecord

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



class HistoricalRecordCreate(BaseModel):
    name: str
    description: str | None = None


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str
# Classes for Chat
class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    historical_record_id: str
    role: str
    content: str
    created_at: datetime


class ChatMessageCreate(BaseModel):
    content: str



# ROOT ENDPOINT

@app.get("/")
def root():
    return {
        "message": "Historical Manuscripts API",
    }

# Routes for Historical Records
IMAGE_EXTENSIONS = {"image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp"}


@app.get("/historical_records")
def get_historical_records(
    db: Session = Depends(get_db),
):
    records = db.query(HistoricalRecord).all()

    return [
        {
            "id": record.id,
            "name": record.name,
            "description": record.description,
            "image_filename": record.image_filename,
            "extracted_text": record.extracted_text,
            "created_at": record.created_at.isoformat(),
            "updated_at": record.updated_at.isoformat(),
        }
        for record in records
    ]


@app.get("/historical_records/{record_id}")
def get_historical_record(
    record_id: str,
    db: Session = Depends(get_db),
):
    record = (
        db.query(HistoricalRecord)
        .filter(HistoricalRecord.id == record_id)
        .first()
    )

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Historical record not found",
        )

    return {
        "id": record.id,
        "name": record.name,
        "description": record.description,
        "image_filename": record.image_filename,
        "extracted_text": record.extracted_text,
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
    }


# UPLOAD A HISTORICAL DOCUMENT AND RUN OCR

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

            if (
                uploaded_image.width * uploaded_image.height
                > MAX_IMAGE_PIXELS
            ):
                raise HTTPException(
                    status_code=413,
                    detail="Image dimensions are too large to process.",
                )

            image_format = uploaded_image.format

            uploaded_image.verify()

    except HTTPException:
        raise

    except (UnidentifiedImageError, OSError):
        raise HTTPException(
            status_code=415,
            detail="The uploaded file is not a readable image.",
        )

    # Preserve the original filename for display.

    original_name = Path(
        image.filename or "historical-document"
    ).name

    # Generate a unique filename for storage.

    extension = {
        "JPEG": ".jpg",
        "PNG": ".png",
        "GIF": ".gif",
        "BMP": ".bmp",
        "WEBP": ".webp",
    }.get(image_format, ".img")

    storage_filename = f"{uuid4().hex}{extension}"

    file_path = UPLOAD_DIR / storage_filename

    # Run TrOCR on the uploaded image.

    try:
        extracted_text = await run_in_threadpool(
            transcribe_image,
            image_bytes,
        )

    except Exception as error:
        logger.exception(
            "TrOCR failed to process the uploaded image."
        )

        raise HTTPException(
            status_code=503,
            detail=(
                "OCR could not process the image. "
                "Check the backend model setup and try again."
            ),
        ) from error


    # Save the image to the uploads directory.

    try:
        file_path.write_bytes(image_bytes)

    except OSError as error:
        logger.exception("Failed to save the uploaded image.")

        raise HTTPException(
            status_code=500,
            detail="The uploaded image could not be saved.",
        ) from error
    
    # Create the database record.
            status_code=415, detail="Invalid file type. Only image files are allowed."
        )

    filename = Path(image.filename or "Unnamed Record").name
    new_record = HistoricalRecord(
        name=original_name,
        image_filename=storage_filename,
        extracted_text=extracted_text,
        description=None,
    )

    try:
        db.add(new_record)
        db.commit()
        db.refresh(new_record)

    except Exception as error:
        db.rollback()

        file_path.unlink(missing_ok=True)

        logger.exception(
            "Failed to save the historical record to PostgreSQL."
        )

        raise HTTPException(
            status_code=500,
            detail="The historical record could not be saved.",
        ) from error

    # Return the saved record as JSON.
    db.add(new_record)
    db.flush()

    file_path = UPLOAD_DIR / f"{new_record.id}{Path(filename).suffix}"
    file_path.write_bytes(await image.read())

    db.commit()
    db.refresh(new_record)

    return {
        "id": new_record.id,
        "name": new_record.name,
        "description": new_record.description,
        "image_filename": new_record.image_filename,
        "extracted_text": new_record.extracted_text,
        "created_at": new_record.created_at.isoformat(),
        "updated_at": new_record.updated_at.isoformat(),
    }


# CHAT ENDPOINT

@app.post(
    "/historical_records/{record_id}/chat",
    response_model=ChatResponse,
)
def post_message(
    record_id: str,
    chat_request: ChatRequest,
):
    """
    Placeholder chat endpoint.

    Currently echoes the user's message.
    This can later be replaced with an LLM that answers
    questions about the historical manuscript.
    """

    return ChatResponse(
        response=f"ECHO: {chat_request.message}",
    )


# RUN THE APPLICATION

@app.put("/historical_records/{record_id}")
def update_historical_record(
    record_id: str,
    record_update: HistoricalRecordCreate,
    db: Session = Depends(get_db),
):
    record = db.query(HistoricalRecord).filter(HistoricalRecord.id == record_id).first()

    if not record:
        raise HTTPException(status_code=404, detail="Historical record not found")

    record.name = record_update.name

    db.commit()
    db.refresh(record)

    return {
        "id": record.id,
        "name": record.name,
        "description": record.description,
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
    }


@app.delete("/historical_records/{record_id}")
def delete_historical_record(
    record_id: str,
    db: Session = Depends(get_db),
):
    record = db.query(HistoricalRecord).filter(HistoricalRecord.id == record_id).first()

    if not record:
        raise HTTPException(status_code=404, detail="Historical record not found")

    file_path = UPLOAD_DIR / f"{record.id}{Path(record.name).suffix}"
    if file_path.exists():
        file_path.unlink()

    db.delete(record)
    db.commit()

    return {"message": "Historical record deleted successfully"}


# Chat Routes
@app.get("/historical_records/{record_id}/chat", response_model=list[ChatMessageOut])
def get_chat_history(record_id: str, db: Session = Depends(get_db)):
    record = db.query(HistoricalRecord).filter(HistoricalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Historical record not found")
    return record.chat_messages


@app.post(
    "/historical_records/{record_id}/chat",
    response_model=list[ChatMessageOut],
    status_code=201,
)
def post_message(
    record_id: str, chat_message: ChatMessageCreate, db: Session = Depends(get_db)
):
    """Saves the user message and the assistant response, returns both"""
    record = db.query(HistoricalRecord).filter(HistoricalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Historical record not found")

    content = chat_message.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message is empty")

    user_message = ChatMessage(role="user", content=content)
    # Mocked answer until the LLM is connected
    assistant_message = ChatMessage(role="assistant", content=get_mock_reply(content))

    record.chat_messages.extend([user_message, assistant_message])
    db.commit()
    db.refresh(user_message)
    db.refresh(assistant_message)

    return [user_message, assistant_message]


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
    )
