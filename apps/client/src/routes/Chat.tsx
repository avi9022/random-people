import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useChatStream,
  type DisplayMessage,
  type DisplayPart,
} from "@/hooks/useChatStream";
import { ProfileCard } from "@/components/chat/ProfileCard";
import { ProfileGrid } from "@/components/chat/ProfileGrid";
import { StatsBreakdown } from "@/components/chat/StatsBreakdown";

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
        "Show me a breakdown by country."
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
          <MessageBubble key={i} message={m} />
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

function MessageBubble({ message }: { message: DisplayMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    const text = message.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
    return (
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%] whitespace-pre-wrap">
          {text}
        </div>
      </div>
    );
  }

  const hasContent = message.parts.length > 0;
  return (
    <div className="space-y-2">
      {!hasContent && (
        <div className="bg-muted rounded-lg px-4 py-2 max-w-[80%]">
          <span className="text-muted-foreground italic">…</span>
        </div>
      )}
      {message.parts.map((part, i) => (
        <PartRenderer key={i} part={part} />
      ))}
    </div>
  );
}

function PartRenderer({ part }: { part: DisplayPart }) {
  if (part.type === "text") {
    if (!part.text) return null;
    return (
      <div className="flex justify-start">
        <div className="bg-muted rounded-lg px-4 py-2 max-w-[80%] whitespace-pre-wrap">
          {part.text}
        </div>
      </div>
    );
  }

  switch (part.component) {
    case "ProfileCard":
      return <ProfileCard {...part.props} />;
    case "ProfileGrid":
      return <ProfileGrid {...part.props} />;
    case "StatsBreakdown":
      return <StatsBreakdown {...part.props} />;
  }
}
