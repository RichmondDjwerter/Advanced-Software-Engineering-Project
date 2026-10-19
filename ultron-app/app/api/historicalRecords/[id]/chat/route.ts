import { NextResponse } from "next/server"
import { API_URL } from "@/app/lib/api"
import type { ChatMessage } from "@/app/types/chat"

// context of the chat
type Ctx = RouteContext<"/api/historicalRecords/[id]/chat">

const chatUrl = (id: string) => `${API_URL}/historical_records/${encodeURIComponent(id)}/chat`


/**
 * Returns chat history of current record
 */
export async function GET(_request: Request, ctx: Ctx) {
    const {id} = await ctx.params // id from corresponding historical record
    const res = await fetch(chatUrl(id), {cache: "no-store"})
    if (!res.ok) {
        return NextResponse.json(
            {error: "Failed to fetch chat history"},
            {status: res.status},
        )
    }
    const messages: ChatMessage[] = await res.json()
    return NextResponse.json(messages)
}

/**
 * Post new message
 */
export async function POST(request: Request, ctx: Ctx) {
    const {id} = await ctx.params
    // body of the post
    const {message} = await request.json()
    if (typeof message !== "string" || !message.trim()) {
        return NextResponse.json({error: "Message is empty."}, {status: 400})
    }

    const res = await fetch(chatUrl(id), {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({content: message.trim()}),
    })

    if (!res.ok) {
        return NextResponse.json(
            {error: "The chat is currently unavailable."},
            {status: res.status},
        )
    }

    return NextResponse.json(await res.json())
}
