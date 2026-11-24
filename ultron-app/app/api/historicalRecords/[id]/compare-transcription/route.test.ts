import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { API_URL } from "@/app/lib/api";
import { POST } from "./route";

const ctx = { params: Promise.resolve({ id: "record-1" }) } as never;

const postRequest = (body: unknown) =>
  new Request("http://localhost:3000", {
    method: "POST",
    body: JSON.stringify(body),
  });

describe("compare transcription route", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("forwards the provider and returns the comparison", async () => {
    fetchMock.mockResolvedValue(Response.json([{ content: "text" }]));

    const response = await POST(postRequest({ provider: "gemini" }), ctx);

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/historical_records/record-1/compare-transcription`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "gemini" }),
        signal: expect.any(AbortSignal),
      },
    );
    expect(await response.json()).toEqual([{ content: "text" }]);
  });

  it("rejects a request without provider", async () => {
    expect((await POST(postRequest({}), ctx)).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes the reason of the backend on", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ detail: "Quota exceeded" }, { status: 503 }),
    );

    const response = await POST(postRequest({ provider: "gemini" }), ctx);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Quota exceeded" });
  });

  it("returns 502 when the backend is down", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const response = await POST(postRequest({ provider: "gemini" }), ctx);

    expect(response.status).toBe(502);
  });
});
