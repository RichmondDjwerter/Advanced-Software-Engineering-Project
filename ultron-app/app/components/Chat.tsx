"use client";

import { useState, type KeyboardEvent, type SubmitEvent } from "react";
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
import { sendMessage } from "@/app/services/chat.service";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

/**
 * Chat for a historical record. Runs in the browser.
 * Flow: Chat → chat.service → chat-api.service → backend
 */
export function Chat({ recordId }: { recordId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const message = input.trim();
  const hasMessages = messages.length > 0;
  const canSend = message !== "" && !pending;

  function addMessage(role: ChatMessage["role"], content: string) {
    setMessages((prev) => [...prev, { id: prev.length, role, content }]);
  }

  /** Shows the user message, then requests the response from the backend */
  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend) return;

    addMessage("user", message);
    setInput("");
    setError(null);
    setPending(true);

    try {
      const result = await sendMessage(recordId, message);
      if (result.ok) {
        addMessage("assistant", result.response);
      } else {
        setError(result.error);
      }
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
                      <p
                        className={
                          message.role === "user"
                            ? "ml-auto w-fit max-w-[80%] rounded-xl bg-muted px-3 py-2 text-sm whitespace-pre-wrap"
                            : "text-sm whitespace-pre-wrap"
                        }
                      >
                        {message.content}
                      </p>
                    </MessageScrollerItem>
                  ))}
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
