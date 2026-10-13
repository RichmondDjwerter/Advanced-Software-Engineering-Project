import { NextResponse } from "next/server"

const API_URL = "http://localhost:8000"

export async function GET() {
  const res = await fetch(`${API_URL}/historical_records`)
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch historical records" },
      { status: res.status },
    )
  }

  return NextResponse.json(await res.json())
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const res = await fetch(`${API_URL}/historical_records`, {
    method: "POST",
    body: formData,
  })
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to add historical record" },
      { status: res.status },
    )
  }

  return NextResponse.json(await res.json())
} 

export async function PUT(request: Request) {
  const formData = await request.formData()
  const res = await fetch(`${API_URL}/historical_records`, {
    method: "PUT",
    body: formData,
  })
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to update historical record" },
      { status: res.status },
    )
  }

  return NextResponse.json(await res.json())
}

export async function DELETE(request: Request) {
  const formData = await request.formData()
  const res = await fetch(`${API_URL}/historical_records`, {
    method: "DELETE",
    body: formData,
  })
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to delete historical record" },
      { status: res.status },
    )
  }

  return NextResponse.json(await res.json())
}