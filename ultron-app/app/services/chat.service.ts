"use server"

import { postChatMessage } from "@/app/api/services/chat-api.service"

/**
 * Chat service. Runs on the server and is called from the Chat component.
 */

/** Response or error message for the UI */
export type ChatResult =
    | { ok: true; response: string }
    | { ok: false; error: string }

/** Checks the message and sends it to the backend */
export async function sendMessage(
    recordId: string,
    message: string
): Promise<ChatResult> {
    const trimmed = message.trim()
    if (!trimmed) {
        return { ok: false, error: "Message is empty." }
    }

    try {
        const { response } = await postChatMessage(recordId, trimmed)
        return { ok: true, response }
    } catch {
        return { ok: false, error: "The chat is currently unavailable." }
    }
}
