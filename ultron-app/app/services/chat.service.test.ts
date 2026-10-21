import { beforeEach, describe, expect, it, vi } from "vitest";
import { postChatMessage } from "@/app/api/services/chat-api.service";
import { sendMessage } from "@/app/services/chat.service";

vi.mock("@/app/api/services/chat-api.service", () => ({
  postChatMessage: vi.fn(),
}));

const mockedPostChatMessage = vi.mocked(postChatMessage);

describe("sendMessage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("trims the message and returns the backend response", async () => {
    mockedPostChatMessage.mockResolvedValue({ response: "ECHO: hello" });

    await expect(sendMessage("record-id", "  hello  ")).resolves.toEqual({
      ok: true,
      response: "ECHO: hello",
    });
    expect(mockedPostChatMessage).toHaveBeenCalledWith("record-id", "hello");
  });

  it("rejects an empty message without calling the backend", async () => {
    await expect(sendMessage("record-id", "   ")).resolves.toEqual({
      ok: false,
      error: "Message is empty.",
    });
    expect(mockedPostChatMessage).not.toHaveBeenCalled();
  });

  it("returns a user-facing error when the backend request fails", async () => {
    mockedPostChatMessage.mockRejectedValue(new Error("Network unavailable"));

    await expect(sendMessage("record-id", "hello")).resolves.toEqual({
      ok: false,
      error: "The chat is currently unavailable.",
    });
  });
});
