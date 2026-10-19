/**
 * ChatRole refers to user or LLM
 */
export type ChatRole = "user" | "assistant";

export interface ChatMessage {
    id: string;
    historical_record_id: string;
    role: ChatRole;
    content: string;
    created_at: string
}