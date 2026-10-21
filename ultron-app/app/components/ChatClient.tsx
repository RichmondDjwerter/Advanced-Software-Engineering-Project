"use client";

import {
  useState,
  type KeyboardEvent,
  type ReactNode,
  type SubmitEvent,
} from "react";
import { ArrowUpIcon } from "lucide-react";
import {
  Card,
  CardContent,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ChatMessage, ChatRole } from "@/app/types/chat";

/** One message with its avatar, vertically centered. User messages are mirrored to the right. */
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
  const message = input.trim();
  const hasMessages = messages.length > 0;
  const canSend = message !== "" && !pending;

  /** Shows the user message right away, then replaces it with the saved messages from the backend */
  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend) return;

    const tempMessage: ChatMessage = {
      id: crypto.randomUUID(),
      historical_record_id: recordId,
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);
    setInput("");
    setError(null);
    setPending(true);

    try {
      const res = await fetch(`/api/historicalRecords/${recordId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
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
        <CardHeader>
          <CardTitle>Chat</CardTitle>
        </CardHeader>
        {hasMessages && (
          <CardContent className="flex max-h-[30vh] flex-col overflow-hidden p-0">
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent className="p-(--card-spacing)">
                  {messages.map((message) => (
                    <MessageScrollerItem key={message.id}>
                      <ChatRow role={message.role}>{message.content}</ChatRow>
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
                placeholder="Ask a question about this document."
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
                  className="ml-auto"
                >
                  <ArrowUpIcon />
                  <span className="sr-only">Send</span>
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </form>
        </CardFooter>
      </Card>
    </MessageScrollerProvider>
  );
}
