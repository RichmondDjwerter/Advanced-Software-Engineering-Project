const API_URL = "http://localhost:8000"

export async function getHistoricalRecords() {
  const res = await fetch(`${API_URL}/historical_records`)
  return res.json()
}

export async function addHistoricalRecord(name: string) {
  const res = await fetch(`${API_URL}/historical_records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  return res.json()
} 