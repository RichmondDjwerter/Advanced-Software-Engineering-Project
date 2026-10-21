import { ULTRON_URL } from "@/app/lib/api";
import type { ChatMessage } from "@/app/types/chat";
import { ChatClient } from "@/app/components/ChatClient";

/**
 * Chat for a historical record. Runs on the server.
 * Loads the chat history and renders the interactive chat with it.
 */
export async function Chat({ recordId }: { recordId: string }) {
  const res = await fetch(
    `${ULTRON_URL}/api/historicalRecords/${recordId}/chat`,
    { cache: "no-store" },
  );
  const history: ChatMessage[] = res.ok ? await res.json() : [];

  return (
    <ChatClient key={recordId} recordId={recordId} initialMessages={history} />
  );
}
