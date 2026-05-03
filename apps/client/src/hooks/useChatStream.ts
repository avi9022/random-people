import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@finq/shared";
import { streamChat, type UiBlock } from "@/lib/api/chat";

export type DisplayPart =
  | { type: "text"; text: string }
  | ({ type: "ui" } & UiBlock);

export interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  parts: DisplayPart[];
}

function partsToText(parts: DisplayPart[]): string {
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function useChatStream() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      const userMsg: DisplayMessage = {
        id: crypto.randomUUID(),
        role: "user",
        parts: [{ type: "text", text: trimmed }],
      };
      const nextMessages: DisplayMessage[] = [
        ...messages,
        userMsg,
        { id: crypto.randomUUID(), role: "assistant", parts: [] },
      ];
      setMessages(nextMessages);
      setIsStreaming(true);

      const wireHistory: ChatMessage[] = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: partsToText(m.parts),
      }));

      const controller = new AbortController();
      abortRef.current = controller;

      await streamChat(wireHistory, controller.signal, {
        onDelta: (delta) => {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (!last || last.role !== "assistant") return prev;
            const lastPart = last.parts[last.parts.length - 1];
            const updatedParts =
              lastPart && lastPart.type === "text"
                ? [
                    ...last.parts.slice(0, -1),
                    { type: "text" as const, text: lastPart.text + delta },
                  ]
                : [...last.parts, { type: "text" as const, text: delta }];
            return [
              ...prev.slice(0, -1),
              { ...last, parts: updatedParts },
            ];
          });
        },
        onUi: (block) => {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (!last || last.role !== "assistant") return prev;
            return [
              ...prev.slice(0, -1),
              { ...last, parts: [...last.parts, { type: "ui", ...block }] },
            ];
          });
        },
        onDone: () => {
          setIsStreaming(false);
        },
        onError: (message) => {
          setError(message);
          setIsStreaming(false);
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === "assistant" && last.parts.length === 0) {
              return prev.slice(0, -1);
            }
            return prev;
          });
        },
      });
    },
    [messages, isStreaming]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setIsStreaming(false);
  }, []);

  return { messages, isStreaming, error, send, reset };
}
