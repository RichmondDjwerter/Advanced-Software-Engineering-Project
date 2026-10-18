import { NextResponse } from "next/server"
import { API_URL } from "@/app/lib/api"

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")
  const url = id
    ? `${API_URL}/historical_records/${encodeURIComponent(id)}`
    : `${API_URL}/historical_records`
  const res = await fetch(url)
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
  const id = new URL(request.url).searchParams.get("id")
  if (!id) {
    return NextResponse.json(
      { error: "Missing historical record ID" },
      { status: 400 },
    )
  }

  const formData = await request.formData()
  const res = await fetch(`${API_URL}/historical_records/${encodeURIComponent(id)}`, {
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
  const id = new URL(request.url).searchParams.get("id")
  if (!id) {
    return NextResponse.json(
      { error: "Missing historical record ID" },
      { status: 400 },
    )
  }

  const res = await fetch(`${API_URL}/historical_records/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to delete historical record" },
      { status: res.status },
    )
  }

  return NextResponse.json(await res.json())
}