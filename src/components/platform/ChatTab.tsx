import React from "react";
import { Send } from "lucide-react";
import type { ChatMessage, InsightResult } from "./types";
import { FormattedInsight, InsightSourceBadge, SectionHeader } from "./ui";

export function ChatTab({ messages, input, setInput, loading, onSubmit }: {
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const STARTERS = [
    "Which columns have missing values?",
    "Summarize the top segments by value.",
    "What actions should I take from this data?",
    "Find any outliers in numeric fields.",
  ];

  return (
    <div className="ap-card border rounded h-[calc(100vh-12rem)] min-h-[520px] flex flex-col overflow-hidden">
      <div className="border-b p-3" style={{ borderColor: "var(--ap-border)" }}>
        <SectionHeader title="Data chat" sub="Natural language queries against the active dataset." tab="Chat" />
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-[10px] ap-muted font-mono">Suggestions:</p>
            {STARTERS.map((s) => (
              <button key={s} className="ap-panel border rounded px-3 py-2 text-xs font-mono w-full text-left hover:opacity-80 transition-opacity" onClick={() => setInput(s)}>{s}</button>
            ))}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded border p-3 text-xs font-mono ${msg.role === "user" ? "ap-btn-primary border-transparent" : "ap-panel"}`}>
              {msg.role === "assistant" ? (
                <div className="space-y-2">
                  {msg.source && <InsightSourceBadge source={msg.source} />}
                  <FormattedInsight content={msg.content} />
                </div>
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs ap-muted font-mono flex items-center gap-2"><span className="animate-pulse">▮</span> Analyzing...</div>}
      </div>
      <form onSubmit={onSubmit} className="border-t p-3 flex gap-2" style={{ borderColor: "var(--ap-border)" }}>
        <input
          className="ap-input border rounded px-3 py-2 flex-1 text-xs font-mono"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about the dataset..."
        />
        <button className="ap-btn-primary rounded px-3 py-2 disabled:opacity-40" disabled={loading || !input.trim()} aria-label="Send">
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
