import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  BrainCircuit,
  ChartDonut,
  CheckCircle2,
  Compass,
  Database,
  Download,
  FileSpreadsheet,
  MessageSquare,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  Table,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ExplorerView = "table" | "cards" | "charts" | "ai";

interface ColumnProfile {
  name: string;
  type: "number" | "category";
  missing: number;
  missingPercent: number;
  unique: number;
  numeric?: {
    count: number;
    min: number;
    max: number;
    sum: number;
    mean: number;
    median: number;
  };
  topValues: { value: string; count: number }[];
}

interface InsightResult {
  answer: string;
  source: "ai" | "local";
}

interface DataExplorerPageProps {
  fileName: string;
  data: Record<string, unknown>[];
  columns: string[];
  allColumns: string[];
  profiles: ColumnProfile[];
  numericColumns: string[];
  categoryColumns: string[];
  insight?: InsightResult;
  loading: boolean;
  onAskQuestion: (question: string) => void;
  onOpenTab: (tab: "Charts" | "AI" | "Chat") => void;
  onExport: () => void;
}

const EXPLORER_COLORS = ["#145DFF", "#20D7FF", "#8B5CF6", "#F97316", "#10B981", "#94A3B8"];

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[%,$₹Rs\s]/gi, "").replace(/,/g, "");
  if (!normalized || normalized === "-" || normalized.toLowerCase() === "nan") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}

function valueText(value: unknown) {
  if (value === null || value === undefined || value === "") return "empty";
  return String(value);
}

function findColumn(columns: string[], patterns: RegExp[], fallback = "") {
  return columns.find((column) => patterns.some((pattern) => pattern.test(column))) || fallback;
}

function aggregateByColumn(rows: Record<string, unknown>[], categoryColumn: string, valueColumn: string) {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const key = valueText(row[categoryColumn] || "Unclassified").slice(0, 60);
    const value = parseNumber(row[valueColumn]) ?? 1;
    map.set(key, (map.get(key) || 0) + value);
  });
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function histogram(rows: Record<string, unknown>[], column: string, buckets = 10) {
  const values = rows.map((row) => parseNumber(row[column])).filter((value): value is number => value !== null);
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const counts = Array.from({ length: buckets }, (_, index) => ({
    bucket: index === buckets - 1 ? `${formatNumber(max, 0)}+` : `${formatNumber(min + (span / buckets) * index, 0)}`,
    count: 0,
  }));
  values.forEach((value) => {
    const index = Math.min(buckets - 1, Math.floor(((value - min) / span) * buckets));
    counts[index].count += 1;
  });
  return counts;
}

function typeDistribution(profiles: ColumnProfile[]) {
  const numerical = profiles.filter((profile) => profile.type === "number").length;
  const dateTime = profiles.filter((profile) => /date|time|created|updated/i.test(profile.name)).length;
  const identifiers = profiles.filter((profile) => /(^id$|_id$|uuid|transaction|session|review_id)/i.test(profile.name)).length;
  const text = profiles.filter((profile) => profile.type === "category" && profile.unique > 20).length;
  const categorical = Math.max(0, profiles.length - numerical - dateTime - identifiers - text);
  return [
    { name: "Numeric", value: numerical },
    { name: "Categorical", value: categorical },
    { name: "Date / Time", value: dateTime },
    { name: "Text", value: text },
    { name: "Identifier", value: identifiers },
  ].filter((item) => item.value > 0);
}

function qualityScore(profiles: ColumnProfile[], rowCount: number) {
  if (!profiles.length || !rowCount) return 0;
  const totalCells = profiles.length * rowCount;
  const missingCells = profiles.reduce((sum, profile) => sum + profile.missing, 0);
  const weakColumns = profiles.filter((profile) => profile.missingPercent > 25 || profile.unique <= 1).length;
  return Math.max(0, Math.min(100, Math.round(100 - (missingCells / totalCells) * 100 - weakColumns * 2)));
}

function chipTone(index: number) {
  return [
    "bg-emerald-500/10 text-emerald-600",
    "bg-violet-500/10 text-violet-600",
    "bg-orange-500/10 text-orange-600",
    "bg-rose-500/10 text-rose-600",
    "bg-blue-500/10 text-[#145DFF]",
  ][index % 5];
}

export default function DataExplorerPage({
  fileName,
  data,
  columns,
  allColumns,
  profiles,
  numericColumns,
  categoryColumns,
  insight,
  loading,
  onAskQuestion,
  onOpenTab,
  onExport,
}: DataExplorerPageProps) {
  const metricColumn = findColumn(numericColumns, [/revenue/i, /sales/i, /amount/i, /price/i, /total/i, /value/i], numericColumns[0] || "");
  const priceColumn = findColumn(numericColumns, [/price/i, /amount/i, /cost/i], metricColumn);
  const ratingColumn = findColumn(numericColumns, [/rating/i, /score/i], "");
  const discountColumn = findColumn(numericColumns, [/discount/i, /pct/i, /percent/i], "");
  const defaultCategory = findColumn(categoryColumns, [/category/i, /segment/i, /type/i, /product/i], categoryColumns[0] || columns[0] || "");

  const [query, setQuery] = useState("");
  const [question, setQuestion] = useState("");
  const [view, setView] = useState<ExplorerView>("table");
  const [aiMode, setAiMode] = useState(true);
  const [categoryColumn, setCategoryColumn] = useState(defaultCategory);
  const [categoryValue, setCategoryValue] = useState("All");
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const [ratingMin, setRatingMin] = useState("All");
  const [discountMin, setDiscountMin] = useState("All");
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [page, setPage] = useState(1);
  const [savedNotice, setSavedNotice] = useState("");

  const selectedMetric = metricColumn || numericColumns[0] || columns[0] || "";
  const priceValues = useMemo(
    () => data.map((row) => parseNumber(row[priceColumn])).filter((value): value is number => value !== null),
    [data, priceColumn],
  );
  const computedPriceMax = priceValues.length ? Math.max(...priceValues) : 0;
  const activePriceMax = priceMax ?? computedPriceMax;

  useEffect(() => {
    setPage(1);
  }, [activePriceMax, categoryColumn, categoryValue, discountMin, query, ratingMin, rowsPerPage]);

  const categoryValues = useMemo(() => {
    const values = new Set<string>();
    data.slice(0, 5000).forEach((row) => {
      const value = valueText(row[categoryColumn]);
      if (value !== "empty") values.add(value.slice(0, 80));
    });
    return Array.from(values).sort().slice(0, 80);
  }, [categoryColumn, data]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return data.filter((row) => {
      if (normalizedQuery) {
        const match = columns.some((column) => valueText(row[column]).toLowerCase().includes(normalizedQuery));
        if (!match) return false;
      }
      if (categoryValue !== "All" && valueText(row[categoryColumn]).slice(0, 80) !== categoryValue) return false;
      if (priceColumn && activePriceMax && (parseNumber(row[priceColumn]) ?? 0) > activePriceMax) return false;
      if (ratingColumn && ratingMin !== "All" && (parseNumber(row[ratingColumn]) ?? 0) < Number(ratingMin)) return false;
      if (discountColumn && discountMin !== "All" && (parseNumber(row[discountColumn]) ?? 0) < Number(discountMin)) return false;
      return true;
    });
  }, [activePriceMax, categoryColumn, categoryValue, columns, data, discountColumn, discountMin, priceColumn, query, ratingColumn, ratingMin]);

  const categoryRows = useMemo(
    () => aggregateByColumn(filteredRows, categoryColumn, selectedMetric).slice(0, 8),
    [categoryColumn, filteredRows, selectedMetric],
  );
  const distributionRows = useMemo(() => histogram(filteredRows, selectedMetric, 12), [filteredRows, selectedMetric]);
  const columnTypes = useMemo(() => typeDistribution(profiles), [profiles]);
  const score = qualityScore(profiles, data.length);
  const profileByName = useMemo(() => new Map(profiles.map((profile) => [profile.name, profile])), [profiles]);
  const previewColumns = useMemo(() => {
    const preferred = [
      findColumn(columns, [/product.*id/i, /^id$/i], ""),
      findColumn(columns, [/product.*name/i, /name/i, /title/i], ""),
      categoryColumn,
      priceColumn,
      discountColumn,
      ratingColumn,
      findColumn(columns, [/review/i, /count/i], ""),
    ].filter(Boolean);
    return Array.from(new Set([...preferred, ...columns])).slice(0, 8);
  }, [categoryColumn, columns, discountColumn, priceColumn, ratingColumn]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pageEnd = Math.min(pageStart + rowsPerPage, filteredRows.length);
  const visibleRows = filteredRows.slice(pageStart, pageEnd);
  const missingProfiles = profiles.filter((profile) => profile.missing > 0).sort((a, b) => b.missingPercent - a.missingPercent);
  const topCategory = categoryRows[0];
  const totalMetric = categoryRows.reduce((sum, item) => sum + item.value, 0);
  const scatterRows = filteredRows
    .slice(0, 300)
    .map((row) => ({
      x: discountColumn ? parseNumber(row[discountColumn]) ?? 0 : parseNumber(row[selectedMetric]) ?? 0,
      y: ratingColumn ? parseNumber(row[ratingColumn]) ?? 0 : parseNumber(row[selectedMetric]) ?? 0,
    }));

  const localAnswer = useMemo(() => {
    const activeQuestion = question || "What should I look at first?";
    if (/missing/i.test(activeQuestion)) {
      const topMissing = missingProfiles[0];
      return topMissing
        ? `${topMissing.name} has the highest missing value rate at ${formatNumber(topMissing.missingPercent, 1)}%. Review this column before relying on downstream analysis.`
        : "No meaningful missing-value risk was detected in the active dataset preview.";
    }
    if (/anomal|outlier/i.test(activeQuestion)) {
      return `I found ${formatNumber(missingProfiles.length, 0)} columns with quality signals to inspect. Use the missing-values panel and discount/rating chart to prioritize anomalies.`;
    }
    if (/revenue|driver|sales|top/i.test(activeQuestion)) {
      return topCategory
        ? `${topCategory.name} is currently the strongest ${selectedMetric || "metric"} contributor with ${formatNumber(topCategory.value, 1)}. It represents ${formatNumber(totalMetric ? (topCategory.value / totalMetric) * 100 : 0, 1)}% of the visible contribution.`
        : "Upload or select category and numeric fields to identify the strongest business drivers.";
    }
    return `The active explorer view has ${formatNumber(filteredRows.length, 0)} rows across ${formatNumber(columns.length, 0)} columns. Start with top categories, missing values, and discount/rating relationships.`;
  }, [columns.length, filteredRows.length, missingProfiles, question, selectedMetric, topCategory, totalMetric]);

  const suggestedQuestions = [
    { label: "Top Products", prompt: "Show me the top products by revenue", icon: <TrendingUp className="h-5 w-5" /> },
    { label: "Missing Values", prompt: "Which columns have missing values?", icon: <ShieldCheck className="h-5 w-5" /> },
    { label: "Revenue Drivers", prompt: "Which category is driving revenue?", icon: <BarChart2 className="h-5 w-5" /> },
    { label: "Anomalies", prompt: "Find anomalies and outliers in this dataset", icon: <AlertTriangle className="h-5 w-5" /> },
  ];

  const ask = (prompt: string) => {
    setQuestion(prompt);
    if (aiMode) onAskQuestion(prompt);
  };

  const saveView = () => {
    const saved = {
      fileName,
      query,
      view,
      categoryColumn,
      categoryValue,
      priceMax: activePriceMax,
      ratingMin,
      discountMin,
      rowsPerPage,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(`adviso_data_explorer_view_${fileName || "workspace"}`, JSON.stringify(saved));
    setSavedNotice("Saved this explorer view locally.");
    window.setTimeout(() => setSavedNotice(""), 2600);
  };

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
    >
      <section className="ap-card rounded-2xl border p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[var(--ap-text)]">Data Explorer</h1>
            <p className="mt-1 text-sm ap-muted">Explore, filter, and understand your data with AI.</p>
          </div>
          <form
            className="relative w-full max-w-3xl"
            onSubmit={(event) => {
              event.preventDefault();
              if (question.trim()) ask(question.trim());
            }}
          >
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ap-muted" />
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              className="ap-input w-full rounded-xl border py-3 pl-12 pr-12 text-sm"
              placeholder="Ask anything about your data..."
            />
            <Sparkles className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#145DFF]" />
          </form>
          <div className="flex shrink-0 items-center gap-3">
            <button className="ap-btn rounded-xl px-4 py-2.5 text-sm font-black" onClick={saveView}>
              Saved Views
            </button>
            <button className="ap-btn-primary rounded-xl px-5 py-2.5 text-sm font-black" onClick={saveView}>
              Save View
            </button>
          </div>
        </div>
        {savedNotice && <div className="mt-3 text-xs font-bold text-emerald-600">{savedNotice}</div>}
      </section>

      <section className="ap-card rounded-2xl border p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <FileSpreadsheet className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-[var(--ap-text)]">{fileName || "Active dataset"}</h2>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-600">CSV</span>
              </div>
              <p className="mt-1 text-sm ap-muted">{formatNumber(data.length, 0)} rows | {formatNumber(allColumns.length, 0)} columns</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black">View</span>
              {[
                { id: "table", icon: <Table className="h-4 w-4" /> },
                { id: "cards", icon: <Database className="h-4 w-4" /> },
                { id: "charts", icon: <BarChart2 className="h-4 w-4" /> },
              ].map((item) => (
                <button key={item.id} onClick={() => setView(item.id as ExplorerView)} className={`rounded-xl p-3 ${view === item.id ? "ap-btn-primary" : "ap-btn"}`}>
                  {item.icon}
                </button>
              ))}
            </div>
            <button
              className={`rounded-full px-4 py-3 text-xs font-black transition ${aiMode ? "ap-btn-primary" : "ap-btn"}`}
              onClick={() => setAiMode((value) => !value)}
            >
              AI Mode {aiMode ? "On" : "Off"}
            </button>
            <button className="ap-btn rounded-xl px-5 py-3 text-sm font-black inline-flex items-center gap-2" onClick={onExport}>
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="space-y-5">
          <section className="ap-card rounded-2xl border p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-black">Filters</h2>
              <button
                className="text-xs font-black text-[#145DFF]"
                onClick={() => {
                  setQuery("");
                  setCategoryValue("All");
                  setPriceMax(null);
                  setRatingMin("All");
                  setDiscountMin("All");
                }}
              >
                Clear all
              </button>
            </div>
            <div className="space-y-5">
              <FilterSelect label="Category Field" value={categoryColumn} onChange={setCategoryColumn} options={categoryColumns.length ? categoryColumns : columns} />
              <FilterSelect label="Category" value={categoryValue} onChange={setCategoryValue} options={["All", ...categoryValues]} />
              <label className="block">
                <span className="mb-2 block text-sm font-black">Search your data</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} className="ap-input w-full rounded-xl border px-4 py-3 text-sm" placeholder="Search rows..." />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-black">Price Range</span>
                <input
                  type="range"
                  min={0}
                  max={computedPriceMax || 1}
                  value={activePriceMax || 0}
                  onChange={(event) => setPriceMax(Number(event.target.value))}
                  className="w-full accent-[#145DFF]"
                  disabled={!priceColumn}
                />
                <div className="mt-2 flex justify-between text-xs ap-muted">
                  <span>0</span>
                  <span>{formatNumber(activePriceMax, 0)}+</span>
                </div>
              </label>
              <FilterSelect label="Rating" value={ratingMin} onChange={setRatingMin} options={["All", "1", "2", "3", "4"]} disabled={!ratingColumn} />
              <FilterSelect label="Discount %" value={discountMin} onChange={setDiscountMin} options={["All", "10", "20", "30", "50"]} disabled={!discountColumn} />
              <button className="ap-btn w-full rounded-xl px-4 py-3 text-sm font-black inline-flex items-center justify-center gap-2">
                <Sliders className="h-4 w-4" />
                Add Filter
              </button>
            </div>
          </section>
        </aside>

        <main className="min-w-0 space-y-5">
          <section className="ap-card rounded-2xl border p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-[#145DFF]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black">AI Suggested Questions</h2>
                  <p className="text-xs ap-muted">Click a question to run a focused exploration.</p>
                </div>
              </div>
              <button className="text-xs font-black text-[#145DFF]" onClick={() => setView("ai")}>See all</button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 scroll-thin">
              {suggestedQuestions.map((item, index) => (
                <button
                  key={item.label}
                  onClick={() => ask(item.prompt)}
                  className="ap-panel flex min-w-[210px] items-center gap-3 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <span className={`grid h-11 w-11 place-items-center rounded-xl ${chipTone(index)}`}>{item.icon}</span>
                  <span>
                    <span className="block text-sm font-black text-[var(--ap-text)]">{item.label}</span>
                    <span className="mt-1 block text-xs leading-4 ap-muted">{item.prompt}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="ap-card rounded-2xl border p-5">
            <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-black text-[var(--ap-text)]">
                  {view === "table" ? "Data Preview" : view === "cards" ? "Card View" : view === "charts" ? "Chart View" : "AI View"}
                  <span className="ml-3 text-sm font-bold ap-muted">{formatNumber(filteredRows.length, 0)} rows x {formatNumber(columns.length, 0)} columns</span>
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "table", label: "Table View" },
                  { id: "charts", label: "Chart View" },
                  { id: "ai", label: "AI View" },
                ].map((item) => (
                  <button key={item.id} onClick={() => setView(item.id as ExplorerView)} className={`rounded-xl px-4 py-2.5 text-xs font-black ${view === item.id ? "ap-btn-primary" : "ap-btn"}`}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {view === "table" && (
              <div className="ap-table-wrap overflow-auto rounded-xl border">
                <table className="ap-table w-full min-w-[980px] text-left text-[13px]">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="w-12 px-4 py-3"><input type="checkbox" aria-label="Select all rows" /></th>
                      <th className="w-14 px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] ap-muted">Row</th>
                      {previewColumns.map((column) => {
                        const profile = profileByName.get(column);
                        return (
                          <th key={column} className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] ap-muted">
                            <span className="mr-2 text-[10px] opacity-70">{profile?.type === "number" ? "#" : "A"}</span>
                            <span className="text-[var(--ap-text)]">{column}</span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row, rowIndex) => (
                      <tr key={`${pageStart}-${rowIndex}`} className="border-t transition hover:bg-slate-500/5">
                        <td className="px-4 py-2.5"><input type="checkbox" aria-label={`Select row ${pageStart + rowIndex + 1}`} /></td>
                        <td className="px-4 py-2.5 font-mono text-xs ap-muted">{pageStart + rowIndex + 1}</td>
                        {previewColumns.map((column) => (
                          <td key={column} className="max-w-[280px] truncate px-4 py-2.5 text-[var(--ap-text)]" title={valueText(row[column])}>
                            {profileByName.get(column)?.type === "number" && parseNumber(row[column]) !== null
                              ? formatNumber(parseNumber(row[column]), 2)
                              : valueText(row[column])}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {!visibleRows.length && (
                      <tr className="border-t">
                        <td colSpan={previewColumns.length + 2} className="px-4 py-10 text-center text-sm font-bold ap-muted">
                          No rows match the current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {view === "cards" && (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {visibleRows.slice(0, 12).map((row, rowIndex) => (
                  <article key={rowIndex} className="ap-panel rounded-2xl border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-black ap-muted">Record {rowIndex + 1}</span>
                      <span className="rounded-full bg-blue-500/10 px-2 py-1 text-[10px] font-black text-[#145DFF]">{valueText(row[categoryColumn]).slice(0, 20)}</span>
                    </div>
                    <div className="space-y-2">
                      {previewColumns.slice(0, 5).map((column) => (
                        <div key={column} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 text-sm">
                          <span className="truncate font-bold ap-muted">{column}</span>
                          <span className="truncate font-black text-[var(--ap-text)]">{valueText(row[column])}</span>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {view === "charts" && (
              <div className="grid gap-4 xl:grid-cols-2">
                <ChartPanel title={`Sales by ${categoryColumn || "category"}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--ap-muted)" />
                      <YAxis tick={{ fontSize: 10 }} stroke="var(--ap-muted)" />
                      <Tooltip />
                      <Bar dataKey="value" fill="#145DFF" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartPanel>
                <ChartPanel title={`${selectedMetric || "Metric"} distribution`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distributionRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 10 }} stroke="var(--ap-muted)" />
                      <YAxis tick={{ fontSize: 10 }} stroke="var(--ap-muted)" />
                      <Tooltip />
                      <Bar dataKey="count" fill="#20D7FF" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartPanel>
                <ChartPanel title={discountColumn && ratingColumn ? "Discount vs Rating" : "Metric relationship"}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
                      <XAxis type="number" dataKey="x" name={discountColumn || selectedMetric} tick={{ fontSize: 10 }} stroke="var(--ap-muted)" />
                      <YAxis type="number" dataKey="y" name={ratingColumn || selectedMetric} tick={{ fontSize: 10 }} stroke="var(--ap-muted)" />
                      <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                      <Scatter data={scatterRows} fill="#145DFF" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </ChartPanel>
                <ChartPanel title="Missing values">
                  <div className="space-y-4 p-2">
                    {missingProfiles.slice(0, 6).map((profile, index) => (
                      <div key={profile.name}>
                        <div className="mb-1 flex justify-between text-xs font-black">
                          <span className="truncate">{profile.name}</span>
                          <span>{formatNumber(profile.missingPercent, 1)}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-500/10">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, profile.missingPercent)}%`, background: EXPLORER_COLORS[index % EXPLORER_COLORS.length] }} />
                        </div>
                      </div>
                    ))}
                    {!missingProfiles.length && <div className="grid h-full place-items-center text-sm font-bold ap-muted">No missing-value issues detected.</div>}
                  </div>
                </ChartPanel>
              </div>
            )}

            {view === "ai" && (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="ap-panel rounded-2xl border p-5">
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/10 text-[#145DFF]">
                      <BrainCircuit className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black uppercase tracking-[0.14em] ap-muted">Explorer Answer</div>
                      <h3 className="mt-1 text-xl font-black text-[var(--ap-text)]">{question || "Ask a question about this dataset"}</h3>
                      <p className="mt-3 text-sm leading-7 ap-muted">{loading ? "Asking backend AI..." : insight?.answer || localAnswer}</p>
                      {insight?.source && <span className="mt-4 inline-flex rounded-full bg-blue-500/10 px-3 py-1 text-xs font-black text-[#145DFF]">{insight.source.toUpperCase()} source</span>}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {suggestedQuestions.map((item) => (
                    <button key={item.label} onClick={() => ask(item.prompt)} className="ap-btn w-full rounded-xl px-4 py-3 text-left text-sm font-black">
                      {item.label}
                      <span className="mt-1 block text-xs font-medium ap-muted">{item.prompt}</span>
                    </button>
                  ))}
                  <button className="ap-btn-primary w-full rounded-xl px-4 py-3 text-sm font-black" onClick={() => onOpenTab("Chat")}>Open AI Chat</button>
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between" style={{ borderColor: "var(--ap-border)" }}>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "table", label: "Data Table", icon: <Table className="h-4 w-4" /> },
                  { id: "cards", label: "Card View", icon: <Database className="h-4 w-4" /> },
                  { id: "charts", label: "Chart View", icon: <BarChart2 className="h-4 w-4" /> },
                  { id: "ai", label: "AI View", icon: <Sparkles className="h-4 w-4" /> },
                ].map((item) => (
                  <button key={item.id} onClick={() => setView(item.id as ExplorerView)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black ${view === item.id ? "ap-btn-primary" : "ap-btn"}`}>
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="text-xs font-bold ap-muted">
                  Showing {filteredRows.length ? formatNumber(pageStart + 1, 0) : "0"}-{formatNumber(pageEnd, 0)} of {formatNumber(filteredRows.length, 0)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={safePage <= 1}
                    className="ap-btn rounded-lg px-3 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Previous
                  </button>
                  <span className="min-w-[82px] text-center text-xs font-black ap-muted">
                    Page {safePage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                    disabled={safePage >= totalPages}
                    className="ap-btn rounded-lg px-3 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Next
                  </button>
                </div>
                <label className="flex items-center gap-3 text-xs font-black ap-muted">
                  Rows
                  <select value={rowsPerPage} onChange={(event) => setRowsPerPage(Number(event.target.value))} className="ap-input rounded-xl border px-3 py-2">
                    {[25, 50, 100, 250].map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
              </div>
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className="ap-card rounded-2xl border p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#145DFF]" />
              <h2 className="font-black">AI Insights</h2>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-black text-[#145DFF]">Beta</span>
            </div>
            <div className="space-y-3">
              <InsightCard tone="green" title={`${topCategory?.name || "Top segment"} is the leading category`} body={`${formatNumber(topCategory?.value || 0, 1)} contribution from the selected metric.`} />
              <InsightCard tone="orange" title="Discount and rating relationship" body={discountColumn && ratingColumn ? "Use the scatter view to inspect whether higher discounts lower ratings." : "Add discount and rating columns for deeper relationship analysis."} />
              <InsightCard tone="pink" title={`${formatNumber(missingProfiles.length, 0)} columns need quality review`} body="Prioritize missing values before exporting reports or running simulations." />
            </div>
          </section>

          <section className="ap-card rounded-2xl border p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-black">Column Summary</h2>
              <span className="text-xs font-black ap-muted">{formatNumber(profiles.length, 0)} columns</span>
            </div>
            <div className="mt-6 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={columnTypes} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={2}>
                    {columnTypes.map((entry, index) => <Cell key={entry.name} fill={EXPLORER_COLORS[index % EXPLORER_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {columnTypes.map((item, index) => (
                <div key={item.name} className="flex items-center gap-3 text-xs">
                  <span className="h-3 w-3 rounded-full" style={{ background: EXPLORER_COLORS[index % EXPLORER_COLORS.length] }} />
                  <span className="flex-1 font-bold">{item.name}</span>
                  <span className="ap-muted">{formatNumber(item.value, 0)} ({formatNumber(profiles.length ? (item.value / profiles.length) * 100 : 0, 1)}%)</span>
                </div>
              ))}
            </div>
          </section>

          <section className="ap-card rounded-2xl border p-5">
            <h2 className="font-black">Exploration Health</h2>
            <div className="mt-5 flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <div className="text-3xl font-black">{score}%</div>
                <div className="text-sm font-black text-emerald-600">Ready for exploration</div>
              </div>
            </div>
            <button className="ap-btn mt-5 w-full rounded-xl px-4 py-3 text-sm font-black inline-flex items-center justify-center gap-2" onClick={() => onOpenTab("AI")}>
              Generate full report
              <ArrowRight className="h-4 w-4" />
            </button>
          </section>
        </aside>
      </div>
    </motion.div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black">{label}</span>
      <select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} className="ap-input w-full rounded-xl border px-4 py-3 text-sm disabled:opacity-50">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ap-panel h-[310px] rounded-2xl border p-4">
      <h3 className="mb-3 text-sm font-black text-[var(--ap-text)]">{title}</h3>
      <div className="h-[250px]">{children}</div>
    </div>
  );
}

function InsightCard({ tone, title, body }: { tone: "green" | "orange" | "pink"; title: string; body: string }) {
  const toneClass = {
    green: "bg-emerald-500/10 text-emerald-600",
    orange: "bg-orange-500/10 text-orange-600",
    pink: "bg-rose-500/10 text-rose-600",
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`} style={{ borderColor: "var(--ap-border)" }}>
      <div className="text-sm font-black">{title}</div>
      <p className="mt-2 text-xs leading-5 opacity-80">{body}</p>
    </div>
  );
}
