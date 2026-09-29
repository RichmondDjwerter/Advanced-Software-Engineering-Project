import uvicorn

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import HistoricalRecord


# Create database tables
Base.metadata.create_all(bind=engine)


app = FastAPI()


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



class HistoricalRecordCreate(BaseModel):
    name: str
    description: str | None = None


@app.get("/")
def root():
    return {"message": "Historical Manuscripts API"}


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


@app.post("/historical_records")
def create_historical_record(
    record: HistoricalRecordCreate,
    db: Session = Depends(get_db),
):
    new_record = HistoricalRecord(
        name=record.name,
        description=record.description,
    )

    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    return {
        "id": new_record.id,
        "name": new_record.name,
        "description": new_record.description,
        "created_at": new_record.created_at.isoformat(),
        "updated_at": new_record.updated_at.isoformat(),
    }


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
    )