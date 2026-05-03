import type { ChatMessage } from "@finq/shared";

export interface ChatStreamHandlers {
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

export async function streamChat(
  messages: ChatMessage[],
  signal: AbortSignal,
  handlers: ChatStreamHandlers
): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!response.ok || !response.body) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      if (body && typeof body === "object" && "error" in body) {
        detail = String((body as { error: unknown }).error);
      }
    } catch {
      // body may not be JSON
    }
    handlers.onError(detail || `HTTP ${response.status}`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const chunk = buffer.slice(0, sep).trim();
        buffer = buffer.slice(sep + 2);
        if (!chunk.startsWith("data:")) continue;
        const payload = chunk.slice(5).trim();
        if (!payload) continue;

        let event: { type: string; text?: string; message?: string };
        try {
          event = JSON.parse(payload);
        } catch {
          continue;
        }

        if (event.type === "delta" && typeof event.text === "string") {
          handlers.onDelta(event.text);
        } else if (event.type === "done") {
          handlers.onDone();
          return;
        } else if (event.type === "error") {
          handlers.onError(event.message ?? "Unknown error");
          return;
        }
      }
    }
    handlers.onDone();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    handlers.onError(err instanceof Error ? err.message : String(err));
  }
}
