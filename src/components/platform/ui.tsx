import React, { useState } from "react";
import { ArrowRight, BrainCircuit, HelpCircle, X } from "lucide-react";
import type { ColumnProfile, InsightResult, TabType } from "./types";
import { formatNumber } from "./analytics";

// ─── tab help content ──────────────────────────────────────────────────────────

const TAB_HELP: Record<TabType, { title: string; body: string[] }> = {
  Overview: { title: "Data Workspace", body: ["Import, clean, split multi-value cells, and choose which columns are active for analysis.", "ID-like fields are excluded by default, while raw rows stay preserved in the local workspace.", "Use this tab before deeper analytics when the file has mixed, messy, or nested values."] },
  Charts: { title: "Visual Analytics", body: ["Build recommended BI charts from dimensions and measures, then drill into clicked values.", "Includes distribution, density, correlation, and hypothesis-test views for stronger exploration.", "Value-level recommendations estimate likely demand and revenue when rating, review count, and price fields exist."] },
  AI: { title: "AI Insights", body: ["Creates a comprehensive BI report from metadata, chart artifacts, quality checks, and sampled rows.", "The backend uses OpenAI when configured and falls back to local analysis if needed.", "Use this after selecting clean columns so the report is grounded in useful fields."] },
  Chat: { title: "Data Chat", body: ["Ask questions about the uploaded CSV using the active columns and backend dataset profile.", "Best for follow-up questions after exploring charts or report recommendations."] },
  Ideas: { title: "Opportunity Builder", body: ["Ranks segment opportunities using selected dimensions and measures.", "Combines chart evidence with LLM recommendations for growth, pricing, and cost actions."] },
  Profit: { title: "Profit Analytics", body: ["Select revenue/value and cost fields to calculate margin, gap, and profit indicators.", "Use the generated insight to explain leakage, pricing, and operational levers."] },
  Forecast: { title: "Forecasting", body: ["Uses forecast-ready numeric fields with enough observations and variation.", "Shows actuals, robust trend forecast, and uncertainty bands.", "Also surfaces demand and revenue estimates when product rating, review count, and price columns exist."] },
  Budget: { title: "Budget Planning", body: ["Maps income/value, expense/cost, and segment fields into budget traces and concentration views.", "Useful for finding spending hotspots, surplus gaps, and budget-control targets."] },
  Sustainability: { title: "ESG Lens", body: ["Uses impact, usage, supplier, cost, or segment fields to identify sustainability hotspots.", "Pairs impact concentration with cost-vs-impact analysis."] },
  Competitor: { title: "Competitive Landscape", body: ["Compares products, companies, segments, or categories against a selected performance metric.", "Shows benchmark gaps and sends the context to the strategy report generator."] },
  KPI: { title: "KPI Monitor", body: ["Tracks a selected numeric KPI with summary stats, trend, and forecast context.", "Best for metrics with repeated observations rather than IDs or descriptive text."] },
};

// ─── MetricCard ────────────────────────────────────────────────────────────────

export function MetricCard({ label, value, tone, small }: { label: string; value: string; tone?: "good" | "warn"; small?: boolean }) {
  return (
    <div className="ap-card border rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-[0.14em] ap-muted font-mono">{label}</div>
      <div
        className={`${small ? "text-sm" : "text-xl"} font-black mt-1 truncate tabular-nums`}
        style={{ color: tone === "good" ? "var(--ap-good)" : tone === "warn" ? "var(--ap-warn)" : "var(--ap-text)" }}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────

export function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.14em] ap-muted font-mono mb-1">{label}</span>
      <select className="ap-input border rounded px-2 py-1.5 text-xs w-full font-mono" value={value} onChange={(e) => onChange(e.target.value)}>
        {(options.length ? options : [""]).map((o) => (
          <option key={o} value={o}>{o || "—"}</option>
        ))}
      </select>
    </label>
  );
}

// ─── DataTable ────────────────────────────────────────────────────────────────

export function DataTable({ rows, columns }: { rows: Record<string, unknown>[]; columns: string[] }) {
  return (
    <div className="ap-table-wrap border rounded overflow-auto max-h-[480px]">
      <table className="ap-table w-full text-xs text-left">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="px-2 py-2 w-10 ap-muted font-mono">#</th>
            {columns.map((c) => (
              <th key={c} className="px-2 py-2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.1em]">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-t hover:bg-[var(--ap-row-hover)]">
              <td className="px-2 py-1.5 ap-muted font-mono">{ri + 1}</td>
              {columns.map((c) => (
                <td key={c} className="px-2 py-1.5 max-w-[200px] truncate font-mono" title={String(row[c] ?? "")}>
                  {String(row[c] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── InsightSourceBadge ───────────────────────────────────────────────────────

export function InsightSourceBadge({ source }: { source?: string }) {
  const isAi = source === "ai";
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] ap-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${isAi ? "bg-emerald-500" : "bg-amber-500"}`} />
      {isAi ? "AI backend" : "Local analysis"}
    </span>
  );
}

// ─── FormattedInsight ─────────────────────────────────────────────────────────

function InlineFormatted({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**")
          ? <strong key={i} className="font-bold" style={{ color: "var(--ap-text)" }}>{p.slice(2, -2)}</strong>
          : <React.Fragment key={i}>{p}</React.Fragment>
      )}
    </>
  );
}

export function FormattedInsight({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const nodes: React.ReactNode[] = [];
  let para: string[] = [];

  const flush = () => {
    const text = para.join(" ").trim();
    if (text) nodes.push(<p key={`p${nodes.length}`} className="text-sm leading-6 ap-text-secondary"><InlineFormatted text={text} /></p>);
    para = [];
  };

  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) { flush(); return; }
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      flush();
      nodes.push(<h4 key={`h${nodes.length}`} className="text-sm font-bold mt-4 first:mt-0 border-b pb-1 font-mono" style={{ borderColor: "var(--ap-border)", color: "var(--ap-text)" }}>{heading[1]}</h4>);
      return;
    }
    const numbered = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (numbered) {
      flush();
      nodes.push(
        <div key={`n${nodes.length}`} className="flex gap-2.5 text-sm">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-black font-mono" style={{ background: "var(--ap-accent-soft)", color: "var(--ap-accent)" }}>{numbered[1]}</span>
          <div className="leading-5 ap-text-secondary"><InlineFormatted text={numbered[2]} /></div>
        </div>
      );
      return;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flush();
      nodes.push(
        <div key={`b${nodes.length}`} className="flex gap-2 text-sm leading-5">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--ap-accent)" }} />
          <div className="ap-text-secondary"><InlineFormatted text={bullet[1]} /></div>
        </div>
      );
      return;
    }
    para.push(line);
  });
  flush();
  return <div className="space-y-2">{nodes}</div>;
}

// ─── InsightBox ───────────────────────────────────────────────────────────────

export function InsightBox({ insight, loading }: { insight?: InsightResult; loading: boolean }) {
  return (
    <div className="ap-panel border rounded p-4 min-h-32">
      {loading ? (
        <div className="flex items-center gap-2 text-xs ap-muted font-mono">
          <span className="animate-pulse">▮</span> Analyzing...
        </div>
      ) : insight ? (
        <div className="space-y-3">
          <InsightSourceBadge source={insight.source} />
          <FormattedInsight content={insight.answer} />
        </div>
      ) : (
        <div className="text-xs ap-muted font-mono">Run analysis to generate insight.</div>
      )}
    </div>
  );
}

// ─── RunButton ────────────────────────────────────────────────────────────────

export function RunButton({ onClick, loading, label = "Run analysis" }: { onClick: () => void; loading: boolean; label?: string }) {
  return (
    <button onClick={onClick} disabled={loading} className="ap-btn-primary px-3 py-2 rounded text-xs font-mono font-bold flex items-center gap-2 disabled:opacity-50 w-full justify-center">
      {loading ? <span className="animate-pulse">▮</span> : <ArrowRight className="w-3 h-3" />}
      {label}
    </button>
  );
}

// ─── TabInfoButton ────────────────────────────────────────────────────────────

export function TabInfoButton({ tab }: { tab: TabType }) {
  const [open, setOpen] = useState(false);
  const info = TAB_HELP[tab];
  return (
    <>
      <button className="ap-btn rounded p-1.5 shrink-0 opacity-50 hover:opacity-100 transition-opacity" onClick={() => setOpen(true)} aria-label={`${info.title} info`}>
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="ap-modal relative border rounded w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] ap-muted font-mono">Module guide</div>
                <h3 className="text-base font-black mt-0.5">{info.title}</h3>
              </div>
              <button className="ap-btn rounded p-1.5" onClick={() => setOpen(false)}><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="space-y-2">
              {info.body.map((item, i) => (
                <div key={i} className="flex gap-2.5 text-xs leading-5 ap-text-secondary">
                  <span className="mt-1.5 h-1 w-1 rounded-full shrink-0" style={{ background: "var(--ap-accent)" }} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── SchemaProfile sidebar card ───────────────────────────────────────────────

export function ProfileCard({ profile }: { profile: ColumnProfile }) {
  return (
    <div className="ap-panel border rounded p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-bold truncate" title={profile.name}>{profile.name}</span>
        <span className="text-[9px] uppercase font-black font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--ap-accent-soft)", color: "var(--ap-accent)" }}>{profile.type}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 mt-2 text-[10px] font-mono">
        <span className="ap-muted">unique</span><span className="text-right">{formatNumber(profile.unique, 0)}</span>
        <span className="ap-muted">missing</span><span className="text-right">{formatNumber(profile.missingPercent, 1)}%</span>
        {profile.numeric && <><span className="ap-muted">mean</span><span className="text-right">{formatNumber(profile.numeric.mean)}</span></>}
      </div>
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

export function SectionHeader({ title, sub, tab, children }: { title: string; sub?: string; tab?: TabType; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <h2 className="text-sm font-black uppercase tracking-[0.1em] font-mono">{title}</h2>
        {sub && <p className="ap-muted text-xs mt-0.5 font-mono">{sub}</p>}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {tab && <TabInfoButton tab={tab} />}
      </div>
    </div>
  );
}

// ─── CorrelationHeatmap ───────────────────────────────────────────────────────

export function CorrelationHeatmap({ data }: { data: { x: string; y: string; value: number }[] }) {
  const cols = Array.from(new Set(data.map((d) => d.x)));
  const val = (x: string, y: string) => data.find((d) => d.x === x && d.y === y)?.value ?? 0;
  return (
    <div className="ap-panel border rounded p-3">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs font-black font-mono uppercase tracking-[0.1em]">Correlation matrix</span>
        <span className="text-[10px] ap-muted font-mono">Pearson r</span>
      </div>
      <div className="overflow-auto">
        <div className="grid gap-0.5 min-w-[500px]" style={{ gridTemplateColumns: `120px repeat(${cols.length}, minmax(72px, 1fr))` }}>
          <div />
          {cols.map((c) => <div key={c} className="text-[9px] ap-muted font-mono font-bold truncate px-1 py-1" title={c}>{c}</div>)}
          {cols.map((row) => (
            <React.Fragment key={row}>
              <div className="text-[9px] ap-muted font-mono font-bold truncate px-1 py-1.5" title={row}>{row}</div>
              {cols.map((col) => {
                const v = val(row, col);
                const s = Math.min(1, Math.abs(v));
                const bg = v >= 0 ? `rgba(59,130,246,${0.08 + s * 0.6})` : `rgba(239,68,68,${0.08 + s * 0.55})`;
                return (
                  <div key={`${row}-${col}`} className="rounded-sm px-1 py-1.5 text-center text-[10px] font-black font-mono" style={{ background: bg, color: "var(--ap-text)" }} title={`${row} × ${col}: ${v}`}>
                    {formatNumber(v, 2)}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── HypothesisPanel ──────────────────────────────────────────────────────────

export function HypothesisPanel({ result }: { result: { groupA: string; groupB: string; meanA: number; meanB: number; difference: number; tScore: number; effectSize: number; verdict: string } }) {
  const sig = Math.abs(result.tScore) >= 2;
  return (
    <div className="ap-panel border rounded p-3">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="text-xs font-black font-mono uppercase tracking-[0.1em]">Hypothesis test</span>
          <p className="text-[10px] ap-muted font-mono mt-0.5">{result.groupA} vs {result.groupB}</p>
        </div>
        <span className={`text-[10px] font-mono font-black px-2 py-1 rounded ${sig ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10"}`}>{result.verdict}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <MetricCard label={`${result.groupA} mean`} value={formatNumber(result.meanA)} small />
        <MetricCard label={`${result.groupB} mean`} value={formatNumber(result.meanB)} small />
        <MetricCard label="difference" value={formatNumber(result.difference)} tone={result.difference >= 0 ? "good" : "warn"} small />
        <MetricCard label="t / effect" value={`${formatNumber(result.tScore, 2)} / ${formatNumber(result.effectSize, 2)}`} small />
      </div>
    </div>
  );
}
