import { fetch } from "expo/fetch";

export function getApiBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) {
    return `https://${domain}`;
  }
  return "";
}

export type SSEChunk =
  | { type: "content"; text: string }
  | { type: "thinking"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

export type SendMessageOptions = {
  conversationId: number;
  content: string;
  thinkingMode?: boolean;
  searchMode?: boolean;
  onChunk: (chunk: SSEChunk) => void;
  signal?: AbortSignal;
};

export async function sendMessageStream({
  conversationId,
  content,
  thinkingMode = false,
  searchMode = false,
  onChunk,
  signal,
}: SendMessageOptions): Promise<void> {
  const base = getApiBaseUrl();
  const url = `${base}/api/openai/conversations/${conversationId}/messages`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ content, thinkingMode, searchMode }),
      signal,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") return;
    onChunk({ type: "error", message: "Network error. Please try again." });
    return;
  }

  if (!response.ok) {
    onChunk({
      type: "error",
      message: `Server error: ${response.status}`,
    });
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onChunk({ type: "error", message: "No response stream." });
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          onChunk({ type: "done" });
          return;
        }
        try {
          const parsed = JSON.parse(data);
          if (typeof parsed.content === "string") {
            onChunk({ type: "content", text: parsed.content });
          } else if (typeof parsed.thinking === "string") {
            onChunk({ type: "thinking", text: parsed.thinking });
          }
        } catch {
          // ignore parse errors
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") return;
    onChunk({ type: "error", message: "Stream interrupted." });
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
    onChunk({ type: "done" });
  }
}
