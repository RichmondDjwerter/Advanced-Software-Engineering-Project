import { NextResponse } from "next/server";

/** Passes the `detail` of a failed backend response on as `error` */
export async function backendError(res: Response, fallback: string) {
  const body = await res.json().catch(() => null);
  const error = typeof body?.detail === "string" ? body.detail : fallback;

  return NextResponse.json({ error }, { status: res.status });
}
