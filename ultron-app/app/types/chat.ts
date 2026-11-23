/**
 * ChatRole refers to user or LLM
 */
export type ChatRole = "user" | "assistant";

/** How to set up a provider, from backend/chat/providers.toml */
export interface ProviderSetup {
  title: string;
  steps: string[];
  link?: { label: string; url: string };
  copy_line?: string;
}

export interface ChatProviderInfo {
  name: string;
  label: string;
  available: boolean;
  /** true if document content leaves this computer */
  external: boolean;
  setup: ProviderSetup;
}

export interface ChatProviders {
  default: string;
  providers: ChatProviderInfo[];
}

export interface ChatMessage {
  id: string;
  historical_record_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
}
