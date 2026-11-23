import { NextResponse } from "next/server";
import { API_URL } from "@/app/lib/api";
import type { ChatProviders } from "@/app/types/chat";

/**
 * Returns which chat providers are set up. Never contains credentials.
 */
export async function GET() {
  try {
    const res = await fetch(`${API_URL}/chat/providers`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Could not check the providers. Restart the backend." },
        { status: res.status },
      );
    }
    const providers: ChatProviders = await res.json();
    return NextResponse.json(providers);
  } catch {
    return NextResponse.json(
      { error: "Could not reach the backend." },
      { status: 502 },
    );
  }
}
