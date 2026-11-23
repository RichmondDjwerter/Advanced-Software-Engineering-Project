"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type SubmitEvent,
} from "react";
import {
  ArrowUpIcon,
  DatabaseIcon,
  ListIcon,
  MessagesSquareIcon,
  ScanTextIcon,
  SparklesIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  TranscriptionComparison,
  useTranscriptionComparison,
} from "@/app/components/TranscriptionComparison";
import { ProviderSetupDialog } from "@/app/components/ProviderSetupDialog";
import type {
  ChatMessage,
  ChatProviderInfo,
  ChatProviders,
  ChatRole,
} from "@/app/types/chat";
import Markdown from "react-markdown";

/** Load provider **/
async function loadProviders(): Promise<ChatProviders> {
  let res: Response;
  try {
    res = await fetch("/api/chat/providers", { cache: "no-store" });
  } catch {
    throw new Error(
      "Could not load the providers. Check that the backend is running.",
    );
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !Array.isArray(body?.providers)) {
    throw new Error(
      body?.error ?? "Could not load the providers. Restart the backend.",
    );
  }
  return body;
}

/** One message with its avatar, vertically centered. User messages are mirrored to the right. */
/**
 * Quick actions below the chat header. "prompt" puts the label into the input,
 * "compare" starts the comparison of the transcription with the selected model.
 */
const suggestions = [
  { icon: SparklesIcon, label: "Summarize this document", action: "prompt" },
  { icon: ListIcon, label: "What are the key points?", action: "prompt" },
  { icon: DatabaseIcon, label: "Extract relevant data", action: "prompt" },
  { icon: ScanTextIcon, label: "Compare transcription", action: "compare" },
] as const;

function ChatRow({ role, children }: { role: ChatRole; children: ReactNode }) {
  const isUser = role === "user";
  return (
    <div
      className={
        isUser
          ? "flex flex-row-reverse items-center gap-2"
          : "flex items-center gap-2"
      }
    >
      {isUser ? (
        <Avatar size="sm">
          <AvatarImage src="/ultron/user-avatar.png" alt="You" />
          <AvatarFallback>You</AvatarFallback>
        </Avatar>
      ) : (
        // logo-u.png is the "U" cropped out of logo.png, not clipped to a circle so it stays fully visible
        <Avatar size="sm" className="rounded-none after:hidden">
          <AvatarImage
            src="/ultron/logo-u.png"
            alt="Ultron"
            className="rounded-none object-contain"
          />
          <AvatarFallback className="rounded-none">U</AvatarFallback>
        </Avatar>
      )}
      <div
        className={
          isUser
            ? "w-fit max-w-[80%] rounded-xl bg-muted px-3 py-2 text-sm whitespace-pre-wrap"
            : "max-w-[80%] text-sm whitespace-pre-wrap"
        }
      >
        {children}
      </div>
    </div>
  );
}

/** Animated "..." shown while the assistant is answering */
function TypingDots() {
  return (
    <span
      role="status"
      aria-label="Ultron is typing"
      className="flex gap-1 py-1"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

/**
 * Chat for a historical record. Runs in the browser.
 * Flow: Chat → /api/historicalRecords/[id]/chat → backend
 */
export function ChatClient({
  recordId,
  initialMessages = [],
}: {
  recordId: string;
  initialMessages?: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // the providers and their setup steps come from the backend (providers.toml)
  const [providers, setProviders] = useState<ChatProviderInfo[]>([]);
  const [provider, setProvider] = useState<string | null>(null);
  const [setupFor, setSetupFor] = useState<ChatProviderInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [setupStatus, setSetupStatus] = useState<string | null>(null);
  // increased on cancel, so that a late check cannot select the provider anymore
  const checkId = useRef(0);
  const selected = providers.find((info) => info.name === provider);
  const comparison = useTranscriptionComparison(recordId);
  const message = input.trim();
  const hasMessages = messages.length > 0;
  const canSend = message !== "" && !pending && provider !== null;

  useEffect(() => {
    let active = true;
    loadProviders()
      .then(({ default: name, providers }) => {
        if (!active) return;
        setProviders(providers);
        setProvider(name);
      })
      .catch((err: Error) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, []);

  /** A provider only becomes active once the backend confirms that it is set up */
  async function selectProvider(name: string) {
    const id = ++checkId.current;
    setChecking(true);
    setSetupStatus(null);
    setError(null);

    let latest: ChatProviderInfo[];
    try {
      latest = (await loadProviders()).providers;
    } catch (err) {
      if (id !== checkId.current) return;
      setChecking(false);
      // shown in the dialog if it is open, otherwise below the chat
      if (setupFor) setSetupStatus((err as Error).message);
      else setError((err as Error).message);
      return;
    }
    if (id !== checkId.current) return;

    setChecking(false);
    setProviders(latest);
    const info = latest.find((candidate) => candidate.name === name);
    if (!info) {
      setError("This provider is no longer available.");
    } else if (info.available) {
      setProvider(name);
      setSetupFor(null);
    } else {
      setSetupStatus("Not set up yet.");
      setSetupFor(info);
    }
  }

  function cancelSetup() {
    checkId.current++;
    setChecking(false);
    setSetupFor(null);
  }

  /** Shows the user message right away, then replaces it with the saved messages from the backend */
  async function send(content: string, endpoint: string, body: object) {
    const tempMessage: ChatMessage = {
      id: crypto.randomUUID(),
      historical_record_id: recordId,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);
    setError(null);
    setPending(true);

    try {
      const res = await fetch(
        `/api/historicalRecords/${recordId}/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const { error } = await res.json();
        setError(error ?? "The chat is currently unavailable.");
        return;
      }

      const saved: ChatMessage[] = await res.json();
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempMessage.id),
        ...saved,
      ]);
    } catch {
      setError("The chat is currently unavailable.");
    } finally {
      setPending(false);
    }
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend) return;

    setInput("");
    void send(message, "chat", { message, provider });
  }

  const compareHint =
    selected &&
    `Sends the document image to ${selected.label}` +
      (selected.external
        ? ", outside this computer"
        : ", it stays on this computer");

  /** Independent of the chat, so a slow answer does not block it */
  function compareTranscription() {
    if (comparison.result) {
      comparison.setOpen(true);
      return;
    }
    if (!selected) return;
    setError(null);
    void comparison.start(selected);
  }

  /** Enter sends, Shift+Enter inserts a line break */
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing) return;

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <MessageScrollerProvider autoScroll>
      <Card className="gap-0">
        <CardHeader className="relative flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessagesSquareIcon className="size-5 text-coral" />
              Chat
            </CardTitle>
            <CardDescription>
              Ask a question about this document.
            </CardDescription>
          </div>
          <div className="absolute right-(--card-spacing) top-(--card-spacing)">
            <label htmlFor="llm-provider" className="sr-only">
              LLM provider
            </label>
            <select
              id="llm-provider"
              name="llm-provider"
              value={provider ?? ""}
              disabled={checking || pending || providers.length === 0}
              onChange={(event) => void selectProvider(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              aria-label="Select LLM provider"
            >
              {providers.length === 0 && <option value="">Loading…</option>}
              {providers.map((info) => (
                <option key={info.name} value={info.name}>
                  {info.label}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <div className="flex flex-wrap gap-2 px-(--card-spacing) pt-(--card-spacing)">
          {suggestions.map(({ icon: Icon, label, action }) => {
            const compare = action === "compare";
            return (
              <Button
                key={label}
                type="button"
                variant="outline"
                className="rounded-full"
                title={compare ? compareHint : undefined}
                disabled={
                  compare && (comparison.running || checking || !selected)
                }
                onClick={compare ? compareTranscription : () => setInput(label)}
              >
                <Icon data-icon="inline-start" />
                {label}
              </Button>
            );
          })}
        </div>
        {hasMessages && (
          <CardContent className="flex max-h-[30vh] flex-col overflow-hidden p-0">
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent className="p-(--card-spacing)">
                  {messages.map((message) => (
                    <MessageScrollerItem key={message.id}>
                      <ChatRow role={message.role}>
                        <Markdown>{message.content}</Markdown>
                      </ChatRow>
                    </MessageScrollerItem>
                  ))}
                  {pending && (
                    <MessageScrollerItem>
                      <ChatRow role="assistant">
                        <TypingDots />
                      </ChatRow>
                    </MessageScrollerItem>
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </CardContent>
        )}
        <CardFooter className="border-t-0 bg-transparent">
          <form onSubmit={onSubmit} className="flex w-full flex-col gap-2">
            <TranscriptionComparison comparison={comparison} />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <InputGroup className="bg-muted/50 has-disabled:bg-muted/50 has-disabled:opacity-100 dark:has-disabled:bg-input/30">
              <InputGroupTextarea
                name="message"
                id="chat-message"
                aria-label="Message"
                placeholder="Ask your question..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onKeyDown}
              />
              <InputGroupAddon align="block-end">
                <InputGroupButton
                  type="submit"
                  variant="default"
                  size="icon-sm"
                  disabled={!canSend}
                  className="ml-auto bg-coral text-white hover:bg-coral/85"
                >
                  <ArrowUpIcon />
                  <span className="sr-only">Send</span>
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </form>
        </CardFooter>
      </Card>
      {/*Dialog for the user, if chat provider requires need extra steps*/}
      <ProviderSetupDialog
        provider={setupFor}
        checking={checking}
        status={setupStatus}
        onCheck={() => setupFor && void selectProvider(setupFor.name)}
        onCancel={cancelSetup}
      />
    </MessageScrollerProvider>
  );
}
