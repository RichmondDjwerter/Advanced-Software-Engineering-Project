import uvicorn
from pathlib import Path

from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import HistoricalRecord

from fastapi.staticfiles import StaticFiles


# Create database tables
Base.metadata.create_all(bind=engine)


app = FastAPI()

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


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

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

class HistoricalRecordCreate(BaseModel):
    name: str
    description: str | None = None

# Classes for Chat
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

@app.get("/")
def root():
    return {"message": "Historical Manuscripts API"}

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
    record = db.query(HistoricalRecord).filter(HistoricalRecord.id == record_id).first()

    if not record:
        raise HTTPException(status_code=404, detail="Historical record not found")

    return {
        "id": record.id,
        "name": record.name,
        "description": record.description,
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
    }

@app.post("/historical_records")
async def create_historical_record(

    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if image.content_type not in IMAGE_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Invalid file type. Only image files are allowed.")

    filename = Path(image.filename or "Unnamed Record").name
    new_record = HistoricalRecord(
        name=filename,
        description="",
    )

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
        "created_at": new_record.created_at.isoformat(),
        "updated_at": new_record.updated_at.isoformat(),
    }

# Chat Routes

@app.post("/historical_records/{record_id}/chat", response_model=ChatResponse)
def post_message(record_id: str, chat_request: ChatRequest):
    """ Placeholder: returns message as an echo"""
    return ChatResponse(response=f"ECHO: {chat_request.message}")

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
    )