import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  BrainCircuit,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Shield,
  Sparkles,
  Target,
  Timer,
} from "lucide-react";
import { motion } from "motion/react";

import type { ChatMessage } from "./types";
import { FormattedInsight, InsightSourceBadge } from "./ui";

export interface ChatContextPayload {
  dataset_id?: number | null;
  time_range?: string;
  focus_area?: string;
  business_context?: string;
  selected_columns?: string[];
  row_count?: number;
  file_name?: string;
}

interface ChatTabProps {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  loading: boolean;
  onSubmit: (event: React.FormEvent, context: ChatContextPayload) => void;
  onAskQuestion: (question: string, context: ChatContextPayload) => void;
  onStartNewChat: () => void;
  fileName: string;
  rowCount: number;
  columnCount: number;
  columns: string[];
  numericColumns: string[];
  categoryColumns: string[];
  backendDatasetId: number | null;
  backendChatId: number | null;
  onRefresh?: () => void;
}

const QUICK_QUESTIONS = [
  { label: "Show top 10 records by revenue", icon: <BarChart2 className="h-4 w-4" /> },
  { label: "Which products have low rating but high discount?", icon: <Target className="h-4 w-4" /> },
  { label: "What are the biggest risks in this data?", icon: <AlertTriangle className="h-4 w-4" /> },
  { label: "Summarize this dataset in 3 key points", icon: <FileSpreadsheet className="h-4 w-4" /> },
  { label: "Show revenue trend over time", icon: <BarChart2 className="h-4 w-4" /> },
];

const EMPTY_EXAMPLES = [
  "Show top 10 products by revenue",
  "What are the biggest risks in this data?",
  "Which rows have low rating but high discount?",
];

function buildFocusOptions(columns: string[], numericColumns: string[], categoryColumns: string[]) {
  const suggested = ["Auto detect", "Pricing", "Products", "Revenue", "Risks", "Data quality"];
  const columnHints = [...numericColumns.slice(0, 4), ...categoryColumns.slice(0, 4), ...columns.slice(0, 3)];
  return Array.from(new Set([...suggested, ...columnHints])).filter(Boolean);
}

function contextSummary(context: ChatContextPayload) {
  const parts = [
    context.file_name ? `Dataset: ${context.file_name}` : "",
    context.row_count ? `${context.row_count.toLocaleString()} rows` : "",
    context.focus_area && context.focus_area !== "Auto detect" ? `Focus: ${context.focus_area}` : "",
    context.time_range && context.time_range !== "All time" ? `Range: ${context.time_range}` : "",
  ].filter(Boolean);
  return parts.join(" | ") || "Context will use your active dataset.";
}

export function ChatTab({
  messages,
  input,
  setInput,
  loading,
  onSubmit,
  onAskQuestion,
  onStartNewChat,
  fileName,
  rowCount,
  columnCount,
  columns,
  numericColumns,
  categoryColumns,
  backendDatasetId,
  backendChatId,
  onRefresh,
}: ChatTabProps) {
  const [timeRange, setTimeRange] = useState("All time");
  const [focusArea, setFocusArea] = useState("Auto detect");
  const [businessContext, setBusinessContext] = useState("");
  const focusOptions = useMemo(() => buildFocusOptions(columns, numericColumns, categoryColumns), [categoryColumns, columns, numericColumns]);
  const context = useMemo<ChatContextPayload>(
    () => ({
      dataset_id: backendDatasetId,
      time_range: timeRange,
      focus_area: focusArea,
      business_context: businessContext.trim(),
      selected_columns: columns.slice(0, 40),
      row_count: rowCount,
      file_name: fileName,
    }),
    [backendDatasetId, businessContext, columns, fileName, focusArea, rowCount, timeRange],
  );
  const canSend = Boolean(input.trim()) && !loading;

  const submit = (event: React.FormEvent) => {
    onSubmit(event, context);
  };

  const askDirectly = (question: string) => {
    setInput("");
    onAskQuestion(question, context);
  };

  return (
    <motion.div key="ai-chat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#145DFF]" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface)" }}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Connected Tool
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--ap-text)]">AI Chat</h1>
          <p className="mt-1 text-sm ap-muted">Ask questions against your data, get insights, run analysis, and move decisions forward.</p>
          <p className="mt-2 text-xs font-semibold ap-muted">
            Active dataset: {fileName || "No dataset selected"} | {rowCount.toLocaleString()} rows | {columnCount.toLocaleString()} active columns
          </p>
        </div>
        <button onClick={onRefresh} className="ap-btn rounded-xl px-4 py-2.5 text-xs font-black inline-flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh intelligence
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="ap-card flex h-[calc(100vh-16rem)] min-h-[540px] max-h-[780px] flex-col overflow-hidden rounded-2xl border">
          <div className="shrink-0 border-b p-5" style={{ borderColor: "var(--ap-border)" }}>
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-black text-[var(--ap-text)]">Data chat</h2>
              <p className="text-xs ap-muted">
                Ask natural-language questions. The backend answers from uploaded rows, stored metadata, and OpenAI when configured.
              </p>
            </div>
            <form onSubmit={submit} className="mt-5 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ap-muted" />
                <input
                  className="w-full rounded-xl border bg-[var(--ap-surface-2)] py-4 pl-11 pr-4 text-sm outline-none transition focus:border-[#145DFF]"
                  style={{ borderColor: "var(--ap-border)", color: "var(--ap-text)" }}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder='Try: "Which columns have missing values?", "Summarize rating", or "What actions should I take from this data?"'
                />
              </div>
              <button className="ap-btn-primary rounded-xl px-4 py-3 disabled:opacity-45" disabled={!canSend} aria-label="Send chat message">
                {loading ? <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" /> : <Send className="h-5 w-5" />}
              </button>
            </form>
          </div>

          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-5">
            {messages.length === 0 ? (
              <div className="flex h-full min-h-0 items-center justify-center text-center">
                <div className="max-w-md">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--ap-accent-soft)] text-[#145DFF]">
                    <MessageSquare className="h-8 w-8" />
                  </div>
                  <h3 className="mt-6 text-xl font-black text-[var(--ap-text)]">Start asking questions about your dataset</h3>
                  <p className="mt-2 text-sm ap-muted">Examples:</p>
                  <div className="mt-4 space-y-3 text-left">
                    {EMPTY_EXAMPLES.map((example) => (
                      <button
                        key={example}
                        onClick={() => askDirectly(example)}
                        className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold ap-muted transition hover:bg-[var(--ap-surface-2)] hover:text-[#145DFF]"
                      >
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[86%] rounded-2xl border p-4 text-sm shadow-sm ${
                        message.role === "user" ? "border-transparent bg-[#145DFF] text-white" : "ap-panel"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <div className="space-y-3">
                          {message.source && <InsightSourceBadge source={message.source} />}
                          <FormattedInsight content={message.content} />
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap leading-6">{message.content}</span>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="ap-panel rounded-2xl border p-4 text-sm">
                      <span className="inline-flex items-center gap-2 ap-muted">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/20 border-t-current" />
                        Analyzing dataset context...
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t px-5 py-3 text-center text-xs ap-muted" style={{ borderColor: "var(--ap-border)" }}>
            AI can make mistakes. Verify important results.
          </div>
        </section>

        <aside className="scroll-thin hidden min-h-0 space-y-5 overflow-y-auto pr-1 2xl:block">
          <section className="ap-card border rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--ap-accent-soft)] text-[#145DFF]">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-[var(--ap-text)]">AI Assistant <span className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] text-violet-600">Beta</span></h2>
                <p className="mt-1 text-xs leading-5 ap-muted">I can analyze your data, find insights, and help you make better decisions.</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
              <div className="flex items-center gap-2 text-xs font-black text-[#145DFF]">
                <Sparkles className="h-4 w-4" />
                Ask with context recommended
              </div>
              <p className="mt-1 text-xs ap-muted">{contextSummary(context)}</p>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-[11px] font-black ap-muted">Dataset</span>
                <div className="mt-2 flex items-center gap-2 rounded-xl border bg-[var(--ap-surface-2)] px-3 py-3 text-xs font-bold" style={{ borderColor: "var(--ap-border)", color: "var(--ap-text)" }}>
                  <Database className="h-4 w-4 text-emerald-600" />
                  <span className="truncate">{fileName || "Upload a dataset first"}</span>
                </div>
              </label>

              <label className="block">
                <span className="text-[11px] font-black ap-muted">Time range optional</span>
                <div className="relative mt-2">
                  <select
                    value={timeRange}
                    onChange={(event) => setTimeRange(event.target.value)}
                    className="w-full rounded-xl border bg-[var(--ap-surface-2)] px-3 py-3 pr-10 text-xs font-bold outline-none focus:border-[#145DFF]"
                    style={{ borderColor: "var(--ap-border)", color: "var(--ap-text)" }}
                  >
                    {["All time", "Current upload", "Last 7 days", "Last 30 days", "Custom range"].map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                  <Timer className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ap-muted" />
                </div>
              </label>

              <label className="block">
                <span className="text-[11px] font-black ap-muted">Focus area optional</span>
                <select
                  value={focusArea}
                  onChange={(event) => setFocusArea(event.target.value)}
                  className="mt-2 w-full rounded-xl border bg-[var(--ap-surface-2)] px-3 py-3 text-xs font-bold outline-none focus:border-[#145DFF]"
                  style={{ borderColor: "var(--ap-border)", color: "var(--ap-text)" }}
                >
                  {focusOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[11px] font-black ap-muted">Business context optional</span>
                <textarea
                  value={businessContext}
                  onChange={(event) => setBusinessContext(event.target.value.slice(0, 500))}
                  className="mt-2 min-h-[92px] w-full resize-none rounded-xl border bg-[var(--ap-surface-2)] px-3 py-3 text-xs leading-5 outline-none focus:border-[#145DFF]"
                  style={{ borderColor: "var(--ap-border)", color: "var(--ap-text)" }}
                  placeholder="Add any relevant context about your business..."
                />
                <span className="mt-1 block text-right text-[10px] font-bold ap-muted">{businessContext.length}/500</span>
              </label>
            </div>

            <button onClick={onStartNewChat} className="mt-5 w-full ap-btn-primary rounded-xl px-4 py-3 text-sm font-black inline-flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4" />
              Start new AI chat
            </button>
            <p className="mt-2 text-center text-[11px] ap-muted">This opens a fresh chat using the selected context.</p>
          </section>

          <section className="ap-card border rounded-2xl p-5">
            <h2 className="text-base font-black text-[var(--ap-text)]">Or ask directly</h2>
            <p className="mt-1 text-xs ap-muted">Quick questions without changing your page.</p>
            <div className="mt-4 space-y-2">
              {QUICK_QUESTIONS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => askDirectly(item.label)}
                  className="w-full rounded-xl border p-3 text-left text-xs font-black transition hover:border-[#145DFF]/40 hover:text-[#145DFF]"
                  style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)", color: "var(--ap-text)" }}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ap-accent-soft)] text-[#145DFF]">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 ap-muted" />
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-[#145DFF]">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[var(--ap-text)]">Chats are independent</h3>
                <p className="mt-1 text-xs leading-5 ap-muted">
                  Each chat starts fresh. Context is only used when you choose to add it. {backendChatId ? `Active chat #${backendChatId}.` : "A chat is created after your first message."}
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </motion.div>
  );
}
