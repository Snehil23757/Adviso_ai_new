import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import {
  BarChart2, BrainCircuit, Database, DollarSign, Download, FileSpreadsheet,
  Leaf, Lightbulb, LogOut, MessageSquare, Moon, PieChart as PieChartIcon,
  Shield, Sun, Target, TrendingUp, UploadCloud,
} from "lucide-react";

import type { ChatMessage, ChartType, InsightResult, MultiValueSplitConfig, TabType, ThemeMode } from "./platform/types";
import {
  aggregateByCategory, applyMultiValueSplits, average, buildDemandRecommendations,
  correlationRows, defaultAnalysisColumns, densityRows, detectMultiValueColumns,
  forecastSeries, histogram, hypothesisTest, parseNumber, profileColumns,
  readWorkspaceSnapshot, sanitizeActiveColumns, sanitizeColumnName, saveWorkspaceSnapshot,
} from "./platform/analytics";

import { OverviewTab } from "./platform/OverviewTab";
import { ChartsTab } from "./platform/ChartsTab";
import { ChatTab } from "./platform/ChatTab";
import { ReportTab, ForecastTab, KpiTab, ProfitTab } from "./platform/AnalyticsTabs";
import { IdeasTab, BudgetTab, SustainabilityTab, CompetitorTab } from "./platform/BusinessTabs";
import { DatasetValidationModal } from "./platform/DatasetValidationModal";

// ── CSS variables injected into :root ────────────────────────────────────────

const DARK_VARS = `
  :root.dark {
    --ap-bg:          #090e1a;
    --ap-surface:     #0d1526;
    --ap-surface-2:   #111d32;
    --ap-surface-3:   #182440;
    --ap-border:      #1e2d47;
    --ap-text:        #e2e8f0;
    --ap-text-2:      #94a3b8;
    --ap-muted:       #475569;
    --ap-accent:      #3b82f6;
    --ap-accent-soft: rgba(59,130,246,.12);
    --ap-good:        #10b981;
    --ap-warn:        #f59e0b;
    --ap-chart-grid:  rgba(255,255,255,.04);
    --ap-row-hover:   rgba(255,255,255,.02);
    --ap-modal-bg:    #0d1526;
    --ap-header-bg:   rgba(9,14,26,.92);
    --ap-sidebar-bg:  #0a1120;
  }
`;

const LIGHT_VARS = `
  :root.light {
    --ap-bg:          #f0f4f8;
    --ap-surface:     #ffffff;
    --ap-surface-2:   #f8fafc;
    --ap-surface-3:   #f1f5f9;
    --ap-border:      #dde3ed;
    --ap-text:        #0f172a;
    --ap-text-2:      #475569;
    --ap-muted:       #94a3b8;
    --ap-accent:      #2563eb;
    --ap-accent-soft: rgba(37,99,235,.08);
    --ap-good:        #059669;
    --ap-warn:        #d97706;
    --ap-chart-grid:  rgba(0,0,0,.05);
    --ap-row-hover:   rgba(0,0,0,.02);
    --ap-modal-bg:    #ffffff;
    --ap-header-bg:   rgba(240,244,248,.95);
    --ap-sidebar-bg:  #ffffff;
  }
`;

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&family=Inter:wght@400;500;600;700;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html { background: var(--ap-bg); color: var(--ap-text); font-family: 'Inter', sans-serif; font-size: 14px; }

  /* scrollbar */
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--ap-border); border-radius: 3px; }

  /* layout blocks */
  .ap-header  { background: var(--ap-header-bg); border-color: var(--ap-border) !important; backdrop-filter: blur(12px); }
  .ap-sidebar { background: var(--ap-sidebar-bg); border-color: var(--ap-border) !important; }
  .ap-card    { background: var(--ap-surface); }
  .ap-panel   { background: var(--ap-surface-2); }
  .ap-modal   { background: var(--ap-modal-bg); border-color: var(--ap-border) !important; }

  /* text */
  .ap-muted       { color: var(--ap-muted); }
  .ap-accent      { color: var(--ap-accent); }
  .ap-text-secondary { color: var(--ap-text-2); }

  /* buttons */
  .ap-btn {
    background: var(--ap-surface-2);
    color: var(--ap-text-2);
    border-color: var(--ap-border);
    cursor: pointer;
    transition: opacity .15s;
  }
  .ap-btn:hover { opacity: .75; }
  .ap-btn-primary {
    background: var(--ap-accent);
    color: #fff;
    cursor: pointer;
    transition: opacity .15s;
  }
  .ap-btn-primary:hover { opacity: .88; }

  /* form inputs */
  .ap-input {
    background: var(--ap-surface-3);
    color: var(--ap-text);
    border-color: var(--ap-border);
    outline: none;
    font-family: 'JetBrains Mono', monospace;
  }
  .ap-input:focus { border-color: var(--ap-accent); }

  /* table */
  .ap-table-wrap { border-color: var(--ap-border) !important; }
  .ap-table { border-collapse: collapse; font-family: 'JetBrains Mono', monospace; }
  .ap-table thead { background: var(--ap-surface-3); color: var(--ap-muted); border-bottom: 1px solid var(--ap-border); }
  .ap-table tbody tr { border-color: var(--ap-border); }
  .ap-table tbody tr:hover { background: var(--ap-row-hover); }

  /* font-mono override */
  .font-mono { font-family: 'JetBrains Mono', monospace; }
`;

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: "Overview",      label: "Workspace",   icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
  { id: "Charts",        label: "Charts",      icon: <BarChart2 className="w-3.5 h-3.5" /> },
  { id: "AI",            label: "AI Report",   icon: <BrainCircuit className="w-3.5 h-3.5" /> },
  { id: "Chat",          label: "Data Chat",   icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { id: "Ideas",         label: "Ideas",       icon: <Lightbulb className="w-3.5 h-3.5" /> },
  { id: "Profit",        label: "Profit",      icon: <DollarSign className="w-3.5 h-3.5" /> },
  { id: "Forecast",      label: "Forecast",    icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { id: "Budget",        label: "Budget",      icon: <PieChartIcon className="w-3.5 h-3.5" /> },
  { id: "Sustainability",label: "ESG",         icon: <Leaf className="w-3.5 h-3.5" /> },
  { id: "Competitor",    label: "Competitor",  icon: <Shield className="w-3.5 h-3.5" /> },
  { id: "KPI",           label: "KPI",         icon: <Target className="w-3.5 h-3.5" /> },
];

interface PlatformDashboardProps {
  userEmail: string;
  onLogout: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export default function PlatformDashboard({ userEmail, onLogout, theme, onToggleTheme }: PlatformDashboardProps) {
  // inject CSS vars once
  useEffect(() => {
    let styleEl = document.getElementById("ap-vars") as HTMLStyleElement | null;
    if (!styleEl) { styleEl = document.createElement("style"); styleEl.id = "ap-vars"; document.head.appendChild(styleEl); }
    styleEl.textContent = DARK_VARS + LIGHT_VARS + GLOBAL_CSS;
  }, []);

  // theme class on <html>
  useEffect(() => {
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(theme);
  }, [theme]);

  // ── state ─────────────────────────────────────────────────────────────────

  const saved = useMemo(() => readWorkspaceSnapshot(userEmail), [userEmail]);

  const [activeTab, setActiveTab]   = useState<TabType>("Overview");
  const [data, setData]             = useState<Record<string, unknown>[]>(() => saved?.data || []);
  const [allColumns, setAllColumns] = useState<string[]>(() => saved?.allColumns || saved?.columns || []);
  const [columns, setColumns]       = useState<string[]>(() => saved?.columns || []);
  const [fileName, setFileName]     = useState(() => saved?.fileName || "");

  // staged import
  const [stagedData, setStagedData]   = useState<Record<string, unknown>[] | null>(null);
  const [stagedCols, setStagedCols]   = useState<string[]>([]);
  const [selStagedCols, setSelStagedCols] = useState<string[]>([]);
  const [splitConfigs, setSplitConfigs]   = useState<Record<string, MultiValueSplitConfig>>({});
  const [previewCol, setPreviewCol]   = useState<string | null>(null);
  const [isDragging, setIsDragging]   = useState(false);

  // chart controls
  const [chartType, setChartType]     = useState<ChartType>("Bar");
  const [xAxisCol, setXAxisCol]       = useState("");
  const [yAxisCol, setYAxisCol]       = useState("");
  const [secondaryCol, setSecondaryCol] = useState("");
  const [forecastCol, setForecastCol] = useState("");
  const [forecastPeriods, setForecastPeriods] = useState(6);

  // chat
  const [chatInput, setChatInput]   = useState("");
  const [chatMsgs, setChatMsgs]     = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  // insights
  const [insights, setInsights]           = useState<Record<string, InsightResult>>({});
  const [loadingInsight, setLoadingInsight] = useState<string | null>(null);

  // profit manual
  const [manualRevenue, setManualRevenue] = useState(0);
  const [manualCost, setManualCost]       = useState(0);

  // ── derived ───────────────────────────────────────────────────────────────

  const isLoaded = data.length > 0;
  const profiles = useMemo(() => profileColumns(data, columns), [data, columns]);
  const numericCols = useMemo(() => profiles.filter((p) => p.type === "number").map((p) => p.name), [profiles]);
  const categoryCols = useMemo(() => profiles.filter((p) => p.type !== "number").map((p) => p.name), [profiles]);
  const forecastCols = useMemo(() => profiles.filter((p) => p.type === "number" && (p.numeric?.count || 0) >= Math.min(8, Math.max(4, data.length)) && p.unique >= Math.min(4, data.length)).map((p) => p.name), [profiles, data.length]);
  const missingCount = useMemo(() => profiles.reduce((s, p) => s + p.missing, 0), [profiles]);
  const ignoredCols  = useMemo(() => allColumns.filter((c) => !columns.includes(c)), [allColumns, columns]);

  const stagedPrepared = useMemo(() => applyMultiValueSplits(stagedData || [], stagedCols, splitConfigs), [stagedData, stagedCols, splitConfigs]);
  const multiValueCandidates = useMemo(() => detectMultiValueColumns(stagedData || [], stagedCols), [stagedData, stagedCols]);
  const stagedProfiles = useMemo(() => profileColumns(stagedPrepared.rows, stagedPrepared.columns), [stagedPrepared]);

  // chart-derived
  const chartRows = useMemo(() => data.slice(0, 500).map((r, i) => ({
    ...r,
    __index: i + 1,
    __xLabel: String(r[xAxisCol] ?? i + 1).slice(0, 80),
    __xNumber: parseNumber(r[xAxisCol]) ?? i + 1,
    __y: parseNumber(r[yAxisCol]) ?? 0,
    __secondary: parseNumber(r[secondaryCol]) ?? 0,
  })), [data, xAxisCol, yAxisCol, secondaryCol]);

  const catAggregate = useMemo(() => aggregateByCategory(data, xAxisCol || categoryCols[0] || columns[0], yAxisCol || numericCols[0] || columns[0]), [data, xAxisCol, yAxisCol, categoryCols, numericCols, columns]);
  const histRows = useMemo(() => histogram(data, yAxisCol || numericCols[0] || ""), [data, yAxisCol, numericCols]);
  const kdeRows  = useMemo(() => densityRows(data, yAxisCol || numericCols[0] || ""), [data, yAxisCol, numericCols]);
  const forecastRows = useMemo(() => forecastSeries(data, forecastCol || forecastCols[0] || numericCols[0] || "", forecastPeriods), [data, forecastCol, forecastPeriods, forecastCols, numericCols]);
  const corrData = useMemo(() => correlationRows(data, numericCols), [data, numericCols]);
  const hypothesis = useMemo(() => hypothesisTest(data, xAxisCol || categoryCols[0] || "", yAxisCol || numericCols[0] || ""), [data, xAxisCol, yAxisCol, categoryCols, numericCols]);
  const demandRecs = useMemo(() => buildDemandRecommendations(data, columns), [data, columns]);

  const yProfile = profiles.find((p) => p.name === yAxisCol);
  const revenueValue = yProfile?.numeric?.sum || manualRevenue;
  const costValue = profiles.find((p) => p.name === secondaryCol)?.numeric?.sum || manualCost;
  const profitValue = revenueValue - costValue;

  // ── persistence ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!data.length || !allColumns.length || !columns.length) return;
    saveWorkspaceSnapshot(userEmail, { data, allColumns, columns, fileName, savedAt: Date.now() });
  }, [userEmail, data, allColumns, columns, fileName]);

  // ── axis defaults ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!columns.length) return;
    const firstCat = categoryCols[0] || columns[0];
    const firstNum = forecastCols[0] || numericCols[0] || columns[0];
    setXAxisCol((c) => c || firstCat);
    setYAxisCol((c) => c || firstNum);
    setSecondaryCol((c) => c || numericCols[1] || firstNum);
    setForecastCol((c) => c || firstNum);
  }, [columns, categoryCols, numericCols, forecastCols]);

  useEffect(() => {
    if (stagedData) {
      setSelStagedCols((cur) => {
        const valid = cur.filter((c) => stagedPrepared.columns.includes(c));
        const added = stagedPrepared.columns.filter((c) => !stagedCols.includes(c) && !valid.includes(c));
        return sanitizeActiveColumns([...valid, ...added], stagedPrepared.columns);
      });
    }
  }, [stagedData, stagedPrepared.columns, stagedCols]);

  // ── file processing ───────────────────────────────────────────────────────

  const processFile = (file: File) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true, dynamicTyping: false, skipEmptyLines: true,
      complete: (res) => {
        const fields = res.meta.fields || [];
        const defaults = defaultAnalysisColumns(res.data, fields);
        const candidates = detectMultiValueColumns(res.data, fields);
        const initConfigs = candidates.reduce<Record<string, MultiValueSplitConfig>>((acc, c) => {
          if (!acc[c.column]) acc[c.column] = { enabled: false, delimiter: c.delimiter, prefix: sanitizeColumnName(c.column), keepOriginal: false, maxParts: Math.min(c.maxParts, 8) };
          return acc;
        }, {});
        setFileName(file.name);
        setStagedData(res.data);
        setStagedCols(fields);
        setSelStagedCols(defaults);
        setSplitConfigs(initConfigs);
        setPreviewCol(null);
      },
    });
  };

  const confirmImport = () => {
    if (!stagedData) return;
    const active = sanitizeActiveColumns(selStagedCols, stagedPrepared.columns);
    setData(stagedPrepared.rows);
    setAllColumns(stagedPrepared.columns);
    setColumns(active);
    setChatMsgs([]);
    setInsights({});
    setStagedData(null); setStagedCols([]); setSelStagedCols([]); setSplitConfigs({}); setPreviewCol(null);

    const ap = profileColumns(stagedPrepared.rows, active);
    const firstCat = ap.find((p) => p.type !== "number")?.name || active[0] || "";
    const firstNum = ap.find((p) => p.type === "number" && (p.numeric?.count || 0) >= 4)?.name || active[0] || "";
    setXAxisCol(firstCat); setYAxisCol(firstNum);
    setSecondaryCol(ap.filter((p) => p.type === "number")[1]?.name || firstNum);
    setForecastCol(firstNum);

    requestInsight("overview", "", { fileName, ignoredColumns: stagedPrepared.columns.filter((c) => !active.includes(c)) }, stagedPrepared.rows, active);
    requestInsight("report", "Create a comprehensive BI report. Include executive summary, data quality, strongest signals, risks, and next actions.", { fileName }, stagedPrepared.rows, active);
  };

  const updateAnalysisColumns = (next: string[]) => {
    const active = sanitizeActiveColumns(next, allColumns);
    const ap = profileColumns(data, active);
    const num = ap.filter((p) => p.type === "number").map((p) => p.name);
    const cat = ap.filter((p) => p.type !== "number").map((p) => p.name);
    setColumns(active);
    setInsights({});
    if (!active.includes(xAxisCol)) setXAxisCol(cat[0] || active[0] || "");
    if (!active.includes(yAxisCol)) setYAxisCol(num[0] || active[0] || "");
    if (!active.includes(secondaryCol)) setSecondaryCol(num[1] || num[0] || "");
    if (!active.includes(forecastCol)) setForecastCol(num[0] || "");
  };

  // ── API calls ─────────────────────────────────────────────────────────────

  const requestInsight = async (mode: string, question = "", context: Record<string, unknown> = {}, rows = data, cols = columns) => {
    if (!rows.length) return;
    setLoadingInsight(mode);
    try {
      const res = await fetch("/api/dataset/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, question, context, columns: cols, rows: rows.slice(0, 1500) }),
      });
      if (!res.ok) throw new Error("API error");
      const result = await res.json();
      setInsights((prev) => ({ ...prev, [mode]: { answer: result.answer, source: result.source } }));
    } catch {
      setInsights((prev) => ({ ...prev, [mode]: { answer: "Backend unreachable. Start the Python server and retry.", source: "local" } }));
    } finally {
      setLoadingInsight(null);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = chatInput.trim();
    if (!q || chatLoading) return;
    setChatMsgs((p) => [...p, { role: "user", content: q }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q, columns, rows: data.slice(0, 1500) }) });
      if (!res.ok) throw new Error("Chat API error");
      const result = await res.json();
      setChatMsgs((p) => [...p, { role: "assistant", content: result.answer, source: result.source }]);
    } catch {
      setChatMsgs((p) => [...p, { role: "assistant", content: "Chat backend unreachable.", source: "local" }]);
    } finally {
      setChatLoading(false);
    }
  };

  const exportCsv = () => {
    const csv = Papa.unparse(data);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "adviso_export.csv" });
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--ap-bg)", color: "var(--ap-text)" }}>
      {/* topbar */}
      <header className="ap-header h-12 border-b px-4 flex items-center justify-between sticky top-0 z-50" style={{ borderColor: "var(--ap-border)" }}>
        <div className="flex items-center gap-3">
          <Database className="w-4 h-4 ap-accent" />
          <span className="font-mono text-xs font-black tracking-wider">ADVISO</span>
          <span className="text-[10px] ap-muted font-mono hidden sm:block">/ analytics platform</span>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="ap-btn-primary cursor-pointer text-[10px] font-mono font-bold px-3 py-1.5 rounded flex items-center gap-1.5">
            <UploadCloud className="w-3 h-3" />
            Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
          </label>
          {isLoaded && (
            <button onClick={exportCsv} className="ap-btn text-[10px] font-mono px-2.5 py-1.5 rounded border flex items-center gap-1">
              <Download className="w-3 h-3" />
              Export
            </button>
          )}
          <button onClick={onToggleTheme} className="ap-btn text-[10px] font-mono px-2.5 py-1.5 rounded border">
            {theme === "dark" ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
          </button>
          <span className="hidden md:block text-[10px] ap-muted font-mono px-2">{userEmail}</span>
          <button onClick={onLogout} className="ap-btn rounded p-1.5 border" aria-label="Logout"><LogOut className="w-3 h-3" /></button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* sidebar nav */}
        {isLoaded && (
          <aside className="ap-sidebar w-48 border-r p-2 overflow-y-auto hidden lg:flex flex-col gap-0.5 shrink-0" style={{ borderColor: "var(--ap-border)" }}>
            <div className="text-[9px] uppercase tracking-[0.18em] ap-muted font-mono px-2 py-2">Modules</div>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-[11px] font-mono font-bold transition ${activeTab === tab.id ? "ap-btn-primary" : "ap-btn text-[var(--ap-text-2)]"}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
            {/* file info at bottom */}
            <div className="mt-auto pt-4 pb-1 px-2">
              <div className="text-[9px] ap-muted font-mono leading-4">
                {fileName && <div className="truncate" title={fileName}>↑ {fileName}</div>}
                <div>{data.length.toLocaleString()} rows</div>
                <div>{columns.length} cols active</div>
              </div>
            </div>
          </aside>
        )}

        {/* main content */}
        <main className="flex-1 min-w-0 overflow-y-auto p-3">
          {!isLoaded && !stagedData && <DropZone isDragging={isDragging} setIsDragging={setIsDragging} onFile={processFile} />}

          {isLoaded && (
            <div className="space-y-3 max-w-[1600px]">
              {/* mobile nav */}
              <nav className="lg:hidden flex gap-1 overflow-x-auto pb-1">
                {TABS.map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`shrink-0 px-2.5 py-1.5 rounded text-[10px] font-mono ${activeTab === tab.id ? "ap-btn-primary" : "ap-btn border"}`}>{tab.label}</button>
                ))}
              </nav>

              {activeTab === "Overview" && <OverviewTab profiles={profiles} data={data} allColumns={allColumns} columns={columns} ignoredColumns={ignoredCols} fileName={fileName} missingCount={missingCount} numericCount={numericCols.length} categoryCount={categoryCols.length} insight={insights.overview} loading={loadingInsight === "overview"} onRefresh={() => requestInsight("overview", "", { fileName, ignoredColumns: ignoredCols })} onColumnsChange={updateAnalysisColumns} onFile={processFile} />}
              {activeTab === "Charts" && <ChartsTab theme={theme} chartType={chartType} setChartType={setChartType} xAxisCol={xAxisCol} setXAxisCol={setXAxisCol} yAxisCol={yAxisCol} setYAxisCol={setYAxisCol} secondaryCol={secondaryCol} setSecondaryCol={setSecondaryCol} columns={columns} data={data} numericColumns={numericCols} categoryColumns={categoryCols} chartRows={chartRows} categoryAggregate={catAggregate} histogramRows={histRows} kdeRows={kdeRows} correlationData={corrData} hypothesis={hypothesis} demandRecommendations={demandRecs} />}
              {activeTab === "AI" && <ReportTab theme={theme} profiles={profiles} data={data} columns={columns} categoryAggregate={catAggregate} correlationData={corrData} ignoredColumns={ignoredCols} fileName={fileName} insight={insights.report} loading={loadingInsight === "report"} onRun={() => requestInsight("report", "Create a comprehensive BI report. Include executive summary, data quality, strongest signals, risks, and next actions.", { fileName, ignoredColumns: ignoredCols })} />}
              {activeTab === "Chat" && <ChatTab messages={chatMsgs} input={chatInput} setInput={setChatInput} loading={chatLoading} onSubmit={handleChat} />}
              {activeTab === "Ideas" && <IdeasTab theme={theme} categoryAggregate={catAggregate} categoryColumn={xAxisCol} valueColumn={yAxisCol} insight={insights.ideas} loading={loadingInsight === "ideas"} onRun={() => requestInsight("ideas", "Generate business ideas from this dataset.", { categoryColumns: categoryCols, numericColumns: numericCols })} />}
              {activeTab === "Profit" && <ProfitTab profiles={profiles} numericColumns={numericCols} revenueColumn={yAxisCol} costColumn={secondaryCol} setRevenueColumn={setYAxisCol} setCostColumn={setSecondaryCol} manualRevenue={manualRevenue} setManualRevenue={setManualRevenue} manualCost={manualCost} setManualCost={setManualCost} revenueValue={revenueValue} costValue={costValue} profitValue={profitValue} insight={insights.profit} loading={loadingInsight === "profit"} onRun={() => requestInsight("profit", "Analyze profitability.", { revenueColumn: yAxisCol, costColumn: secondaryCol, revenueValue, costValue, profitValue })} />}
              {activeTab === "Forecast" && <ForecastTab theme={theme} numericColumns={numericCols} forecastColumns={forecastCols} forecastCol={forecastCol} setForecastCol={setForecastCol} forecastPeriods={forecastPeriods} setForecastPeriods={setForecastPeriods} forecastRows={forecastRows} demandRecommendations={demandRecs} insight={insights.forecast} loading={loadingInsight === "forecast"} onRun={() => requestInsight("forecast", "Explain the forecast trend.", { forecastCol, forecastPeriods })} />}
              {activeTab === "Budget" && <BudgetTab theme={theme} profiles={profiles} numericColumns={numericCols} categoryColumns={categoryCols} categoryColumn={xAxisCol} setCategoryColumn={setXAxisCol} incomeColumn={yAxisCol} setIncomeColumn={setYAxisCol} expenseColumn={secondaryCol} setExpenseColumn={setSecondaryCol} data={data} insight={insights.budget} loading={loadingInsight === "budget"} onRun={() => requestInsight("budget", "Analyze budget and cost-control opportunities.", { incomeColumn: yAxisCol, expenseColumn: secondaryCol, categoryColumn: xAxisCol })} />}
              {activeTab === "Sustainability" && <SustainabilityTab theme={theme} data={data} numericColumns={numericCols} categoryColumns={categoryCols} categoryColumn={xAxisCol} setCategoryColumn={setXAxisCol} impactColumn={yAxisCol} setImpactColumn={setYAxisCol} costColumn={secondaryCol} setCostColumn={setSecondaryCol} insight={insights.sustainability} loading={loadingInsight === "sustainability"} onRun={() => requestInsight("sustainability", "Analyze ESG and sustainability opportunities.", { impactColumn: yAxisCol, costColumn: secondaryCol, categoryColumn: xAxisCol })} />}
              {activeTab === "Competitor" && <CompetitorTab theme={theme} data={data} numericColumns={numericCols} categoryColumns={categoryCols} segmentColumn={xAxisCol} setSegmentColumn={setXAxisCol} metricColumn={yAxisCol} setMetricColumn={setYAxisCol} insight={insights.competitor} loading={loadingInsight === "competitor"} onRun={() => requestInsight("competitor", "Find competitive positioning insights.", { segmentColumn: xAxisCol, metricColumn: yAxisCol })} />}
              {activeTab === "KPI" && <KpiTab profiles={profiles} numericColumns={numericCols} selectedColumn={forecastCol || numericCols[0] || ""} setSelectedColumn={setForecastCol} forecastRows={forecastRows} theme={theme} insight={insights.kpi} loading={loadingInsight === "kpi"} onRun={() => requestInsight("kpi", "Generate KPI commentary and monitoring recommendations.", { selectedColumn: forecastCol })} />}
            </div>
          )}
        </main>
      </div>

      {/* import modal */}
      {stagedData && (
        <DatasetValidationModal
          rows={stagedPrepared.rows}
          columns={stagedPrepared.columns}
          rawRows={stagedData}
          rawColumns={stagedCols}
          profiles={stagedProfiles}
          previewColumn={previewCol}
          setPreviewColumn={setPreviewCol}
          onCancel={() => { setStagedData(null); setStagedCols([]); setSelStagedCols([]); setSplitConfigs({}); setPreviewCol(null); }}
          onConfirm={confirmImport}
          theme={theme}
          selectedColumns={selStagedCols}
          setSelectedColumns={setSelStagedCols}
          multiValueCandidates={multiValueCandidates}
          splitConfigs={splitConfigs}
          setSplitConfigs={setSplitConfigs}
        />
      )}
    </div>
  );
}

// ── Drop zone (empty state) ───────────────────────────────────────────────────

function DropZone({ isDragging, setIsDragging, onFile }: { isDragging: boolean; setIsDragging: (v: boolean) => void; onFile: (f: File) => void }) {
  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center">
      <div
        className="border rounded w-full max-w-2xl p-10 text-center transition"
        style={{
          background: "var(--ap-surface)",
          borderColor: isDragging ? "var(--ap-accent)" : "var(--ap-border)",
          borderStyle: "dashed",
          boxShadow: isDragging ? "0 0 0 2px var(--ap-accent)" : "none",
        }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
      >
        <Database className="w-8 h-8 mx-auto mb-4 ap-accent" />
        <h1 className="font-mono text-sm font-black tracking-wider mb-1">ADVISO ANALYTICS PLATFORM</h1>
        <p className="ap-muted text-xs font-mono mb-6">Drop a CSV file or click to import</p>
        <label className="ap-btn-primary cursor-pointer text-xs font-mono font-bold px-5 py-2.5 rounded inline-flex items-center gap-2">
          <UploadCloud className="w-3.5 h-3.5" />
          Select CSV
          <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
        <div className="mt-8 grid grid-cols-3 gap-3 text-[10px] ap-muted font-mono">
          {["Column profiling", "BI charts", "AI insights", "Forecasting", "Demand scoring", "Multi-value split"].map((f) => (
            <div key={f} className="ap-panel border rounded px-3 py-2" style={{ borderColor: "var(--ap-border)" }}>· {f}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
