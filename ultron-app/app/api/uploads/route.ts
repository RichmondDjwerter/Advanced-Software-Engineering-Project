import { NextResponse } from "next/server";
import { API_URL } from "@/app/lib/api";

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name");

  if (!name) {
    return NextResponse.json(
      { error: "Missing 'name' query parameter" },
      { status: 400 },
    );
  }

  const url = `${API_URL}/uploads/${encodeURIComponent(name)}`;

  const res = await fetch(url);
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: res.status },
    );
  }

  return new NextResponse(await res.arrayBuffer(), {
    status: res.status,
    headers: {
      "Content-Type":
        res.headers.get("Content-Type") ?? "application/octet-stream",
      ...(res.headers.get("Content-Disposition")
        ? { "Content-Disposition": res.headers.get("Content-Disposition")! }
        : {}),
    },
  });
}
