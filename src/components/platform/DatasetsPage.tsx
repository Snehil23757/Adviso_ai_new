import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Database,
  FileSpreadsheet,
  FileText,
  Layers,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  User,
  X,
} from "lucide-react";
import { motion } from "motion/react";

interface ColumnProfile {
  name: string;
  type: "number" | "category";
  missing: number;
  missingPercent: number;
  unique: number;
}

export interface DatasetContextPayload {
  dataset_name: string;
  business_function: string;
  source_system: string;
  data_state: string;
  description: string;
}

interface DatasetsPageProps {
  displayName: string;
  workspaceName: string;
  fileName: string;
  fileSizeBytes: number;
  rows: Record<string, unknown>[];
  columns: string[];
  activeColumns: string[];
  profiles: ColumnProfile[];
  ignoredColumns: string[];
  backendConnected: boolean;
  backendUploadBusy: boolean;
  backendUploadProgress: number | null;
  backendUploadMessage: string;
  canReviewColumns: boolean;
  isDragging: boolean;
  onDragOver: React.DragEventHandler<HTMLDivElement>;
  onDragLeave: React.DragEventHandler<HTMLDivElement>;
  onDrop: React.DragEventHandler<HTMLDivElement>;
  onFile: (file: File) => void;
  onAnalyzeDataset: (context: DatasetContextPayload) => Promise<void> | void;
  onReviewColumns: () => void;
  onClearDataset: () => Promise<void> | void;
  onSaveDatasetContext: (context: DatasetContextPayload) => Promise<void> | void;
  onSaveAndView: (context: DatasetContextPayload) => Promise<void> | void;
  onOpenDataExplorer: () => void;
}

const SOURCE_SYSTEMS = ["Amazon Marketplace", "Shopify", "Stripe", "Razorpay", "Internal ERP", "Manual CSV Export"];
const BUSINESS_FUNCTIONS = ["Sales", "Finance", "Marketing", "Operations", "Customer Success", "Product"];
const DATA_STATES = ["Raw", "Cleaned", "Modeled", "Merged"];
const TYPE_COLORS = ["#145DFF", "#20D7FF", "#8B5CF6", "#F97316", "#94A3B8"];

function formatCount(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value || 0);
}

function formatBytes(bytes: number) {
  if (!bytes) return "Pending";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${formatCount(mb, 1)} MB`;
  return `${formatCount(bytes / 1024, 1)} KB`;
}

function titleFromFile(fileName: string) {
  const cleaned = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  if (!cleaned) return "Business Dataset";
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

function schemaType(profile: ColumnProfile) {
  const lower = profile.name.toLowerCase();
  if (profile.type === "number") return "DECIMAL";
  if (lower.includes("date") || lower.includes("time")) return "DATE";
  if (lower.endsWith("_id") || lower.includes("transaction") || lower.includes("session")) return "IDENTIFIER";
  return "VARCHAR";
}

function qualityScore(profiles: ColumnProfile[], rowCount: number) {
  if (!profiles.length || !rowCount) return 0;
  const totalCells = profiles.length * rowCount;
  const missingCells = profiles.reduce((sum, profile) => sum + profile.missing, 0);
  const weakColumns = profiles.filter((profile) => profile.missingPercent >= 25 || profile.unique <= 1).length;
  return Math.max(0, Math.min(100, Math.round(100 - (missingCells / totalCells) * 100 - weakColumns * 2)));
}

function duplicateRowEstimate(rows: Record<string, unknown>[]) {
  const seen = new Set<string>();
  let duplicates = 0;
  rows.slice(0, 1500).forEach((row) => {
    const key = JSON.stringify(row);
    if (seen.has(key)) duplicates += 1;
    seen.add(key);
  });
  return duplicates;
}

function inferDatasetType(fileName: string, columns: string[]) {
  const haystack = `${fileName} ${columns.join(" ")}`.toLowerCase();
  if (/sale|revenue|order|price|rating|review|product/.test(haystack)) return "Sales Dataset";
  if (/budget|expense|cost|runway|profit|margin/.test(haystack)) return "Finance Dataset";
  if (/customer|churn|retention|segment/.test(haystack)) return "Customer Dataset";
  return "Business Dataset";
}

export default function DatasetsPage({
  displayName,
  workspaceName,
  fileName,
  fileSizeBytes,
  rows,
  columns,
  activeColumns,
  profiles,
  ignoredColumns,
  backendConnected,
  backendUploadBusy,
  backendUploadProgress,
  backendUploadMessage,
  canReviewColumns,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFile,
  onAnalyzeDataset,
  onReviewColumns,
  onClearDataset,
  onSaveDatasetContext,
  onSaveAndView,
  onOpenDataExplorer,
}: DatasetsPageProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [datasetName, setDatasetName] = useState("");
  const [businessFunction, setBusinessFunction] = useState(BUSINESS_FUNCTIONS[0]);
  const [sourceSystem, setSourceSystem] = useState(SOURCE_SYSTEMS[0]);
  const [dataState, setDataState] = useState(DATA_STATES[0]);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const dataReady = rows.length > 0 && columns.length > 0;
  const hasUploadedFile = Boolean(fileName);
  const score = qualityScore(profiles, rows.length);
  const missingCells = profiles.reduce((sum, profile) => sum + profile.missing, 0);
  const missingPercent = rows.length && profiles.length ? (missingCells / (rows.length * profiles.length)) * 100 : 0;
  const duplicateRows = duplicateRowEstimate(rows);
  const datasetType = inferDatasetType(fileName, columns);
  const analyzedAt = dataReady || backendConnected ? new Date() : null;
  const activeColumnSet = new Set(activeColumns);

  useEffect(() => {
    if (fileName && !datasetName) {
      setDatasetName(titleFromFile(fileName));
    }
  }, [datasetName, fileName]);

  useEffect(() => {
    if (fileName && !description) {
      setDescription(`${titleFromFile(fileName)} imported for business analysis.`);
    }
  }, [description, fileName]);

  const contextPayload: DatasetContextPayload = {
    dataset_name: datasetName.trim() || titleFromFile(fileName || "dataset.csv"),
    business_function: businessFunction,
    source_system: sourceSystem,
    data_state: dataState,
    description: description.trim(),
  };

  const typeDistribution = useMemo(() => {
    const numerical = profiles.filter((profile) => profile.type === "number").length;
    const dateTime = profiles.filter((profile) => /date|time|created|updated/i.test(profile.name)).length;
    const identifiers = columns.filter((column) => /(^id$|_id$|transaction|session|uuid|user_id|review_id)/i.test(column)).length;
    const categorical = Math.max(0, profiles.length - numerical - dateTime - identifiers);
    const text = profiles.filter((profile) => profile.type === "category" && profile.unique > Math.max(12, rows.length * 0.2)).length;
    return [
      { label: "Numerical", value: numerical, percent: profiles.length ? (numerical / profiles.length) * 100 : 0 },
      { label: "Categorical", value: categorical, percent: profiles.length ? (categorical / profiles.length) * 100 : 0 },
      { label: "Date / Time", value: dateTime, percent: profiles.length ? (dateTime / profiles.length) * 100 : 0 },
      { label: "Text", value: text, percent: profiles.length ? (text / profiles.length) * 100 : 0 },
      { label: "Identifiers", value: identifiers, percent: profiles.length ? (identifiers / profiles.length) * 100 : 0 },
    ];
  }, [columns, profiles, rows.length]);

  const excludedColumns = useMemo(() => {
    const candidates = ignoredColumns.length
      ? ignoredColumns
      : columns.filter((column) => /(^id$|_id$|transaction|session|uuid|review_id)/i.test(column));
    return candidates.slice(0, 4).map((column) => ({
      name: column,
      reason: /session/i.test(column) ? "High cardinality identifier" : "Unique identifier detected",
    }));
  }, [columns, ignoredColumns]);

  const understanding = [
    { icon: <Database className="h-5 w-5" />, title: "Sales Transactions", detail: "Order-level transaction data" },
    { icon: <FileText className="h-5 w-5" />, title: "Pricing Information", detail: "Product pricing and discounts" },
    { icon: <Layers className="h-5 w-5" />, title: "Product Information", detail: "Catalog and category fields" },
    { icon: <User className="h-5 w-5" />, title: "Customer Signals", detail: "Behavior and ratings data" },
  ];

  const runAction = async (handler: (context: DatasetContextPayload) => Promise<void> | void) => {
    setSaving(true);
    try {
      await handler(contextPayload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0, y: 16, filter: "blur(5px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--ap-text)]">Upload Dataset</h1>
          <p className="mt-1 text-sm ap-muted">Upload your data and let Adviso AI understand it instantly.</p>
        </div>
        <button onClick={onOpenDataExplorer} disabled={!dataReady} className="ap-btn rounded-xl px-4 py-2.5 text-xs font-black disabled:opacity-50">
          View Data Explorer
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(320px,0.95fr)_minmax(420px,1.35fr)_minmax(300px,0.95fr)]">
        <section className="space-y-4">
          <div
            className={`ap-card rounded-2xl border p-7 text-center transition ${isDragging ? "ring-4 ring-blue-200" : ""}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) onFile(file);
                event.currentTarget.value = "";
              }}
            />
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-blue-500/10 text-[#145DFF]">
              <UploadCloud className="h-10 w-10" />
            </div>
            <h2 className="mt-5 text-base font-black">Drag and drop your file here</h2>
            <p className="mt-3 text-sm ap-muted">or</p>
            <button onClick={() => inputRef.current?.click()} className="ap-btn mt-3 rounded-xl px-7 py-3 text-sm font-black">
              Browse Files
            </button>
            <p className="mt-5 text-xs ap-muted">Supports: CSV | Max size: 250MB</p>
          </div>

          <div className="ap-card rounded-2xl border p-4">
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-black">{fileName || "No dataset selected"}</div>
                <div className="mt-1 text-xs ap-muted">
                  {formatBytes(fileSizeBytes)}
                  {dataReady ? ` | ${formatCount(rows.length)} rows | ${formatCount(columns.length)} columns` : ""}
                </div>
              </div>
              <span className={`rounded-xl px-3 py-2 text-xs font-black ${backendUploadBusy ? "bg-blue-500/10 text-[#145DFF]" : hasUploadedFile ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-500/10 text-slate-500"}`}>
                {backendUploadBusy ? "Uploading" : hasUploadedFile ? "Ready" : "Waiting"}
              </span>
              {hasUploadedFile && (
                <button onClick={() => void onClearDataset()} className="ap-btn rounded-xl p-2" aria-label="Remove dataset">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {(backendUploadBusy || backendUploadMessage) && (
              <div className="mt-4">
                <div className="h-2 overflow-hidden rounded-full bg-blue-500/10">
                  <div className="h-full rounded-full bg-[#145DFF] transition-all" style={{ width: `${backendUploadProgress ?? 8}%` }} />
                </div>
                <p className="mt-2 text-xs ap-muted">{backendUploadMessage || "Preparing backend upload..."}</p>
              </div>
            )}
          </div>
        </section>

        <section className="ap-card rounded-2xl border p-5">
          <h2 className="text-lg font-black">Dataset Context</h2>
          <p className="mt-1 text-sm ap-muted">Tell us more about your data</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Dataset Name" required>
              <input value={datasetName} onChange={(event) => setDatasetName(event.target.value)} className="ap-input w-full rounded-xl border px-4 py-3 text-sm" placeholder="Amazon Sales - May 2025" />
            </Field>
            <Field label="Business Function" required>
              <select value={businessFunction} onChange={(event) => setBusinessFunction(event.target.value)} className="ap-input w-full rounded-xl border px-4 py-3 text-sm">
                {BUSINESS_FUNCTIONS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Source System" required>
              <select value={sourceSystem} onChange={(event) => setSourceSystem(event.target.value)} className="ap-input w-full rounded-xl border px-4 py-3 text-sm">
                {SOURCE_SYSTEMS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Data State" required>
              <select value={dataState} onChange={(event) => setDataState(event.target.value)} className="ap-input w-full rounded-xl border px-4 py-3 text-sm">
                {DATA_STATES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Description" className="md:col-span-2">
              <textarea value={description} onChange={(event) => setDescription(event.target.value.slice(0, 500))} className="ap-input min-h-20 w-full resize-none rounded-xl border px-4 py-3 text-sm" placeholder="Sales data exported from Amazon Seller Central..." />
              <div className="mt-1 text-right text-[10px] ap-muted">{description.length}/500</div>
            </Field>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button disabled={!hasUploadedFile || backendUploadBusy || saving} onClick={() => void runAction(onAnalyzeDataset)} className="ap-btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black disabled:opacity-50">
              <Sparkles className="h-4 w-4" />
              Analyze Dataset
            </button>
            <span className="text-xs ap-muted">Adviso AI will automatically analyze your data.</span>
          </div>
        </section>

        <section className="ap-card rounded-2xl border p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">Dataset Summary</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${backendConnected || dataReady ? "bg-emerald-500/10 text-emerald-600" : "bg-blue-500/10 text-[#145DFF]"}`}>
              {backendConnected ? "AI Analysis Complete" : dataReady ? "Preview Ready" : "Awaiting Upload"}
            </span>
          </div>
          <div className="mt-8 grid grid-cols-2 rounded-2xl border" style={{ borderColor: "var(--ap-border)" }}>
            <SummaryBlock label="Detected Type" value={hasUploadedFile ? datasetType : "Pending"} />
            <div className="border-l p-5" style={{ borderColor: "var(--ap-border)" }}>
              <div className="text-xs ap-muted">Confidence Score</div>
              <div className="mt-4 flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-full" style={{ background: `conic-gradient(#10b981 ${dataReady ? 94 : 0}%, rgba(148,163,184,.18) 0)` }}>
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--ap-surface)] text-xs font-black">
                    {dataReady ? "94%" : "0%"}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 rounded-2xl border" style={{ borderColor: "var(--ap-border)" }}>
            <SummaryBlock label="Rows" value={dataReady ? formatCount(rows.length) : "-"} />
            <SummaryBlock label="Columns" value={dataReady ? formatCount(columns.length) : "-"} bordered />
            <SummaryBlock label="File Size" value={formatBytes(fileSizeBytes)} />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(320px,1fr)_minmax(320px,1fr)_minmax(360px,1.25fr)]">
        <section className="ap-card rounded-2xl border p-5">
          <h2 className="font-black">Excluded Columns <span className="ap-muted">(Auto-detected)</span></h2>
          <p className="mt-1 text-xs ap-muted">These columns look like identifiers and were excluded from analysis.</p>
          <div className="mt-5 space-y-3">
            <div className="grid grid-cols-[minmax(0,1fr)_1.2fr] gap-3 border-b pb-2 text-xs font-black ap-muted" style={{ borderColor: "var(--ap-border)" }}>
              <span>Column Name</span>
              <span>Reason</span>
            </div>
            {(excludedColumns.length ? excludedColumns : [{ name: "No excluded columns", reason: "All active columns look analysis-ready" }]).map((item) => (
              <div key={item.name} className="grid grid-cols-[minmax(0,1fr)_1.2fr] gap-3 text-sm">
                <span className="truncate font-bold">{item.name}</span>
                <span className="truncate ap-muted">{item.reason}</span>
              </div>
            ))}
          </div>
          <button onClick={onReviewColumns} disabled={!canReviewColumns} className="ap-btn mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black disabled:opacity-50">
            <Search className="h-4 w-4" />
            Review and Include Columns
          </button>
        </section>

        <section className="ap-card rounded-2xl border p-5">
          <h2 className="font-black">Column Type Distribution</h2>
          <p className="mt-1 text-xs ap-muted">Overview of data types in your dataset.</p>
          <div className="mt-6 grid gap-6 md:grid-cols-[170px_minmax(0,1fr)] md:items-center">
            <div className="relative mx-auto grid h-40 w-40 place-items-center rounded-full" style={{ background: `conic-gradient(${TYPE_COLORS.map((color, index) => `${color} ${typeDistribution.slice(0, index).reduce((sum, item) => sum + item.percent, 0)}% ${typeDistribution.slice(0, index + 1).reduce((sum, item) => sum + item.percent, 0)}%`).join(", ")})` }}>
              <div className="grid h-24 w-24 place-items-center rounded-full bg-[var(--ap-surface)] text-center">
                <div>
                  <div className="text-xl font-black">{formatCount(columns.length)}</div>
                  <div className="text-xs ap-muted">Columns</div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {typeDistribution.map((item, index) => (
                <div key={item.label} className="flex items-center gap-3 text-sm">
                  <span className="h-3 w-3 rounded-full" style={{ background: TYPE_COLORS[index] }} />
                  <span className="min-w-0 flex-1 font-bold">{item.label}</span>
                  <span className="ap-muted">{formatCount(item.value)} ({formatCount(item.percent, 1)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="ap-card rounded-2xl border p-5">
          <h2 className="font-black">Data Quality Overview</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <div>
                <div className="text-4xl font-black">{score || "-"}%</div>
                <div className="text-sm font-black text-emerald-600">{score >= 85 ? "Good Quality" : dataReady ? "Needs Review" : "Pending"}</div>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <QualityRow label="Missing Values" value={`${formatCount(missingPercent, 1)}%`} />
              <QualityRow label="Duplicate Rows" value={`${formatCount(rows.length ? (duplicateRows / rows.length) * 100 : 0, 1)}%`} />
              <QualityRow label="Outliers Detected" value={formatCount(profiles.filter((profile) => profile.missingPercent > 15).length)} />
              <QualityRow label="Inconsistent Formats" value={formatCount(profiles.filter((profile) => profile.unique <= 1).length)} />
              <QualityRow label="Total Columns Checked" value={formatCount(activeColumns.length || columns.length)} />
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
        <section className="ap-card rounded-2xl border p-5">
          <h2 className="font-black">AI Understanding</h2>
          <p className="mt-1 text-xs ap-muted">Here is what Adviso AI understands about your data.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {understanding.map((item) => (
              <div key={item.title} className="rounded-xl border p-4" style={{ borderColor: "var(--ap-border)" }}>
                <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-[#145DFF]">{item.icon}</div>
                <div className="text-sm font-black">{item.title}</div>
                <div className="mt-1 text-xs leading-5 ap-muted">{item.detail}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border bg-blue-500/5 px-4 py-3 text-xs" style={{ borderColor: "var(--ap-border)" }}>
            <span className="ap-muted">Adviso AI will use this understanding to generate better insights and recommendations.</span>
            <button className="font-black text-[#145DFF]">Learn more</button>
          </div>
        </section>

        <section className="ap-card rounded-2xl border p-5">
          <h2 className="font-black">Dataset Metadata</h2>
          <div className="mt-5 space-y-3 text-sm">
            <MetadataRow icon={<User className="h-4 w-4" />} label="Uploaded By" value={displayName} />
            <MetadataRow icon={<FileText className="h-4 w-4" />} label="Uploaded At" value={hasUploadedFile ? new Date().toLocaleString() : "-"} />
            <MetadataRow icon={<Sparkles className="h-4 w-4" />} label="Last Analyzed" value={analyzedAt ? analyzedAt.toLocaleString() : "-"} />
            <MetadataRow icon={<Database className="h-4 w-4" />} label="Dataset Version" value={hasUploadedFile ? "v1.0" : "-"} />
            <MetadataRow icon={<Database className="h-4 w-4" />} label="Workspace" value={workspaceName} />
            <MetadataRow icon={<FileSpreadsheet className="h-4 w-4" />} label="File Format" value={hasUploadedFile ? "CSV" : "-"} />
            <MetadataRow icon={<BarChart3 className="h-4 w-4" />} label="Timezone" value="Asia/Kolkata (IST)" />
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 border-t bg-[var(--ap-bg)]/90 px-4 py-4 backdrop-blur xl:-mx-6 xl:px-6" style={{ borderColor: "var(--ap-border)" }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button onClick={() => void onClearDataset()} disabled={!hasUploadedFile} className="ap-btn rounded-xl px-5 py-3 text-sm font-black disabled:opacity-50">
            Cancel
          </button>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={() => void runAction(onSaveDatasetContext)} disabled={!hasUploadedFile || saving} className="ap-btn inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black disabled:opacity-50">
              <FileText className="h-4 w-4" />
              Save to Workspace
            </button>
            <button onClick={() => void runAction(onSaveAndView)} disabled={!hasUploadedFile || saving} className="ap-btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black disabled:opacity-50">
              Save and View in Workspace
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Field({ label, required, className = "", children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-black">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function SummaryBlock({ label, value, bordered = false }: { label: string; value: string; bordered?: boolean }) {
  return (
    <div className={`p-5 ${bordered ? "border-x" : ""}`} style={{ borderColor: "var(--ap-border)" }}>
      <div className="text-xs ap-muted">{label}</div>
      <div className="mt-3 text-xl font-black">{value}</div>
    </div>
  );
}

function QualityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--ap-border)" }}>
      <span>{label}</span>
      <span className="font-black">{value}</span>
    </div>
  );
}

function MetadataRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[22px_minmax(0,0.8fr)_minmax(0,1fr)] items-center gap-2">
      <span className="text-[#145DFF]">{icon}</span>
      <span className="font-black">{label}</span>
      <span className="truncate ap-muted" title={value}>{value}</span>
    </div>
  );
}
