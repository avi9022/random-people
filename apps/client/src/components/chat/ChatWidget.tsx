import { useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
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
import { MarkdownText } from "@/components/chat/MarkdownText";

const SUGGESTIONS = [
  "How many profiles do I have?",
  "Show me all my saved profiles",
  "Break down profiles by country",
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const { messages, isStreaming, error, send, reset } = useChatStream();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft;
    setDraft("");
    void send(text);
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] sm:w-[440px] max-w-lg h-[720px] max-h-[calc(100vh-7rem)] flex flex-col rounded-lg border bg-background shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="font-semibold text-sm">Ask AI about your profiles</div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  disabled={isStreaming}
                  className="h-7 text-xs"
                >
                  New
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="h-7 w-7"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
          >
            {messages.length === 0 && (
              <div className="py-4 px-1 space-y-3">
                <p className="text-center text-muted-foreground text-xs">
                  Ask anything about your saved profiles.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTIONS.map((q) => (
                    <Button
                      key={q}
                      variant="outline"
                      size="sm"
                      className="text-xs font-normal"
                      onClick={() => void send(q)}
                      disabled={isStreaming}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))}
            {error && (
              <p className="text-destructive text-xs">Error: {error}</p>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex gap-2 p-3 border-t"
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask anything…"
              disabled={isStreaming}
              autoFocus
              className="text-sm"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isStreaming || !draft.trim()}
            >
              {isStreaming ? "…" : "Send"}
            </Button>
          </form>
        </div>
      )}

      <Button
        size="icon"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </Button>
    </>
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
        <div className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 max-w-[85%] text-sm whitespace-pre-wrap">
          {text}
        </div>
      </div>
    );
  }

  const hasContent = message.parts.length > 0;
  return (
    <div className="space-y-2">
      {!hasContent && (
        <div className="bg-muted rounded-lg px-3 py-1.5 max-w-[85%] text-sm">
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
        <div className="bg-muted rounded-lg px-3 py-1.5 max-w-[85%] text-sm">
          <MarkdownText>{part.text}</MarkdownText>
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
