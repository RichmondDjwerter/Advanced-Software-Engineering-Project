import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { API_URL } from "@/app/lib/api";
import { GET } from "./route";

describe("providers route", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the providers of the backend", async () => {
    const providers = {
      default: "local",
      providers: [
        {
          name: "local",
          label: "Local LLM",
          available: false,
          external: false,
          setup: { title: "Start the local model", steps: ["Start it."] },
        },
      ],
    };
    fetchMock.mockResolvedValue(Response.json(providers));

    const response = await GET();

    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/chat/providers`, {
      cache: "no-store",
    });
    expect(await response.json()).toEqual(providers);
  });

  it("returns an error when the backend does not know the route", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));

    expect((await GET()).status).toBe(404);
  });

  it("returns 502 when the backend is down", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    expect((await GET()).status).toBe(502);
  });
});
