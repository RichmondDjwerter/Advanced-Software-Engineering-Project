import { NextResponse } from "next/server";
import { API_URL } from "@/app/lib/api";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  const url = id
    ? `${API_URL}/historical_records/${encodeURIComponent(id)}`
    : `${API_URL}/historical_records`;

  try {
    const res = await fetch(url);
    const body = await res.text();

    if (!res.ok) {
      console.error("Backend error:", res.status, body);

      return NextResponse.json(
        {
          error: "Backend request failed",
          details: body,
        },
        { status: res.status },
      );
    }

    return new NextResponse(body, {
      headers: {
        "Content-Type":
          res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("Could not reach backend:", error);

    return NextResponse.json(
      {
        error:
          "Could not reach the backend. Check API_URL and confirm FastAPI is running.",
      },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const res = await fetch(`${API_URL}/historical_records`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);

    return NextResponse.json(
      { error: body?.detail ?? "Failed to add historical record" },
      { status: res.status },
    );
  }

  return NextResponse.json(await res.json());
}

export async function PUT(request: Request) {
  const id = new URL(request.url).searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing historical record ID" },
      { status: 400 },
    );
  }

  const body = await request.json();

  const res = await fetch(
    `${API_URL}/historical_records/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to update historical record" },
      { status: res.status },
    );
  }

  return NextResponse.json(await res.json());
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing historical record ID" },
      { status: 400 },
    );
  }

  const res = await fetch(
    `${API_URL}/historical_records/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to delete historical record" },
      { status: res.status },
    );
  }

  return NextResponse.json(await res.json());
}