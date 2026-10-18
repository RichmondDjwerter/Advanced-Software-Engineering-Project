import { API_URL } from "@/app/lib/api";

/**
 * HTTP layer for the chat. Sends requests to the FastAPI backend.
 */

/** Same shape as ChatRequest and ChatResponse in backend/main.py */
export type ChatRequest = { message: string };
export type ChatResponse = { response: string };

/** Posts chat message for a historical record and returns the response */
export async function postChatMessage(
  recordId: string,
  message: string,
): Promise<ChatResponse> {
  const body: ChatRequest = { message };

  const res = await fetch(`${API_URL}/historical_records/${recordId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Chat request failed: ${res.status}`);
  }

  return res.json();
}
