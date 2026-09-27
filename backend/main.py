import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware 
from pydantic import BaseModel
from typing import List

# Mock up 
class HistoricalRecord(BaseModel): 
    name: str

class HistoricalRecords(BaseModel): 
    historicalRecords: List[HistoricalRecord]

app = FastAPI()

origins = [
    "http://localhost:3000"
] 

# enable CORE 

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# mock database, TODO: replace with DB 

memory_db = {"historical_records": []}


@app.get("/historical_records", response_model=HistoricalRecords)

def get_historical_records():
    return HistoricalRecords(historicalRecords=memory_db["historical_records"])


@app.post("/historical_records", response_model=HistoricalRecord)

def add_historical_record(hist_record: HistoricalRecord): 
    memory_db["historical_records"].append(hist_record)
    return hist_record

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)