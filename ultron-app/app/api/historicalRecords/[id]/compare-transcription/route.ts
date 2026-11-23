import { NextResponse } from "next/server";
import { API_URL } from "@/app/lib/api";
import { backendError } from "@/app/api/backendError";

type Ctx = RouteContext<"/api/historicalRecords/[id]/compare-transcription">;

/**
 * Lets the selected LLM transcribe the source image
 */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const { provider } = await request.json();
  if (typeof provider !== "string" || !provider.trim()) {
    return NextResponse.json(
      { error: "No provider selected." },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(
      `${API_URL}/historical_records/${encodeURIComponent(id)}/compare-transcription`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
        signal: request.signal,
      },
    );
    if (!res.ok) {
      return backendError(res, "The transcription is currently unavailable.");
    }
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json(
      { error: "Could not reach the backend." },
      { status: 502 },
    );
  }
}
