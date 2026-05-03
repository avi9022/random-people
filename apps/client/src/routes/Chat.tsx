import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatStream } from "@/hooks/useChatStream";

export default function Chat() {
  const { messages, isStreaming, error, send, reset } = useChatStream();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft;
    setDraft("");
    void send(text);
  };

  return (
    <div className="min-h-screen flex flex-col max-w-3xl mx-auto p-8">
      <div className="flex items-center justify-between mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/">← Back</Link>
        </Button>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            disabled={isStreaming}
          >
            New chat
          </Button>
        )}
      </div>

      <h1 className="text-3xl font-bold mb-2">Ask about your saved profiles</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Try: "How many profiles do I have?", "Who's from the United States?",
        "Tell me about the youngest one."
      </p>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-0"
      >
        {messages.length === 0 && (
          <p className="text-muted-foreground text-sm italic">
            No messages yet. Ask a question below.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "flex justify-end"
                : "flex justify-start"
            }
          >
            <div
              className={
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%]"
                  : "bg-muted rounded-lg px-4 py-2 max-w-[80%]"
              }
            >
              {m.content || (
                <span className="text-muted-foreground italic">…</span>
              )}
            </div>
          </div>
        ))}
        {error && (
          <p className="text-destructive text-sm">Error: {error}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask anything about your saved profiles…"
          disabled={isStreaming}
          autoFocus
        />
        <Button type="submit" disabled={isStreaming || !draft.trim()}>
          {isStreaming ? "…" : "Send"}
        </Button>
      </form>
    </div>
  );
}
