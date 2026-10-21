import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { API_URL } from "@/app/lib/api"
import type { ChatMessage } from "@/app/types/chat"
import { GET, POST } from "./route"

const ctx = { params: Promise.resolve({ id: "record-1" }) } as never
const chatUrl = `${API_URL}/historical_records/record-1/chat`

const messages: ChatMessage[] = [
    {
        id: "1",
        historical_record_id: "record-1",
        role: "user",
        content: "Who wrote this letter?",
        created_at: "2026-10-21T10:00:00Z",
    },
    {
        id: "2",
        historical_record_id: "record-1",
        role: "assistant",
        content: "Abraham Lincoln, the 16th President of the United States.",
        created_at: "2026-10-21T10:00:03Z",
    },
]

const postRequest = (body: unknown) =>
    new Request("http://localhost:3000/api/historicalRecords/record-1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    })

describe("chat route", () => {
    const fetchMock = vi.fn()

    beforeEach(() => {
        fetchMock.mockReset()
        vi.stubGlobal("fetch", fetchMock)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("POST forwards the trimmed message to the backend and returns its answer", async () => {
        fetchMock.mockResolvedValue(Response.json(messages))

        const response = await POST(postRequest({ message: "  Who wrote this letter?  " }), ctx)

        expect(fetchMock).toHaveBeenCalledWith(chatUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: "Who wrote this letter?" }),
        })
        expect(response.status).toBe(200)
        expect(await response.json()).toEqual(messages)
    })

    it("POST rejects an empty message without calling the backend", async () => {
        const response = await POST(postRequest({ message: "   " }), ctx)

        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({ error: "Message is empty." })
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it("POST returns an error when the backend fails", async () => {
        fetchMock.mockResolvedValue(new Response(null, { status: 500 }))

        const response = await POST(postRequest({ message: "Hello" }), ctx)

        expect(response.status).toBe(500)
        expect(await response.json()).toEqual({ error: "The chat is currently unavailable." })
    })

    it("GET returns the chat history of the record", async () => {
        fetchMock.mockResolvedValue(Response.json(messages))

        const response = await GET(new Request("http://localhost:3000"), ctx)

        expect(fetchMock).toHaveBeenCalledWith(chatUrl, { cache: "no-store" })
        expect(response.status).toBe(200)
        expect(await response.json()).toEqual(messages)
    })

    it("GET returns an error when the backend cannot find the record", async () => {
        fetchMock.mockResolvedValue(new Response(null, { status: 404 }))

        const response = await GET(new Request("http://localhost:3000"), ctx)

        expect(response.status).toBe(404)
        expect(await response.json()).toEqual({ error: "Failed to fetch chat history" })
    })
})
