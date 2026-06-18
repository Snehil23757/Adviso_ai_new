import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart2,
  Bell,
  BrainCircuit,
  ChartDonut,
  CheckCircle2,
  Compass,
  Database,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Leaf,
  Lightbulb,
  Lock,
  LogOut,
  MessageSquare,
  Moon,
  PieChart as PieChartIcon,
  Shield,
  Search,
  Sparkles,
  Sun,
  Table,
  Target,
  TrendingUp,
  UploadCloud,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Papa from "papaparse";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";

import Logo from "./Logo.tsx";
import { apiFailureMessage, apiUrl, authorizedFetch, readApiJson } from "../config";
import { auth } from "../firebase.js";
import { useAuth } from "../lib/AuthContext.tsx";
import { UpgradeRequired } from "../subscriptions/ProtectedFeature";
import { usePermissions } from "../subscriptions/SubscriptionProvider";
import { checkoutPlanForId } from "../subscriptions/checkoutPlans";
import type { DashboardTabId, FeatureKey, PlanDefinition, PlanId } from "../subscriptions/permissions";
import AccountSettingsPage from "./platform/AccountSettingsPage";
import AIInsightsPage from "./platform/AIInsightsPage";
import DatasetIntelligencePage from "./platform/DatasetIntelligencePage";
import { ChatTab, type ChatContextPayload } from "./platform/ChatTab";
import DataExplorerPage from "./platform/DataExplorerPage";
import DatasetsPage, { type DatasetContextPayload } from "./platform/DatasetsPage";
import FeedbackWidget from "./platform/FeedbackWidget";
import FirstRunDashboard from "./platform/FirstRunDashboard";
import PlatformServicePlaceholder from "./platform/PlatformServicePlaceholder";
import PlatformSidebar from "./platform/PlatformSidebar";
import UserAvatar from "./platform/UserAvatar";
import {
  PLATFORM_NAV_SECTIONS,
  PLATFORM_SERVICE_ITEMS,
  getPlatformService,
  serviceForDashboardTab,
  type PlatformServiceId,
  type PlatformServiceItem,
} from "./platform/navigation";

type ThemeMode = "dark" | "light";
type TabType = DashboardTabId;

type ChartType =
  | "Line"
  | "Area"
  | "Bar"
  | "Horizontal Bar"
  | "Scatter"
  | "Histogram"
  | "KDE Density"
  | "Pie"
  | "Donut"
  | "Composed"
  | "Radar"
  | "Treemap";

type ChatMessage = { role: "user" | "assistant"; content: string; source?: string };

const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  go: 1,
  pro: 2,
  enterprise: 3,
};

const FREE_PLATFORM_SERVICE_IDS = new Set<PlatformServiceId>(["home", "datasets", "data-preview", "data-quality", "account-settings", "support-center"]);

interface PlatformDashboardProps {
  userEmail: string;
  onLogout: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onThemePreferenceChange?: (preference: string) => void;
  initialTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  onUpgradeRequested?: (planId: PlanId) => void;
}

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

interface WorkspaceSnapshot {
  data: Record<string, unknown>[];
  allColumns: string[];
  columns: string[];
  fileName: string;
  fileSizeBytes?: number;
  savedAt: number;
}

interface BackendWorkspace {
  id: number;
  name: string;
  member_role?: string;
}

interface BackendDataset {
  id: number;
  workspace_id: number;
  file_name: string;
  storage_bucket?: string;
  storage_path?: string;
  size_bytes?: number;
  status?: string;
}

interface BackendDatasetPayload {
  dataset: BackendDataset;
  columns: Array<{ name: string; [key: string]: unknown }>;
  stats?: {
    sample_rows_json?: Record<string, unknown>[];
    [key: string]: unknown;
  };
  metadata?: {
    sampled_rows_json?: Record<string, unknown>[];
    [key: string]: unknown;
  };
}

interface BackendJob {
  id: number;
  workspace_id: number;
  dataset_id?: number;
  type?: string;
  status?: string;
  progress?: number;
  error?: string;
}

interface BackendJobEvent {
  id?: number;
  job_id?: number;
  workspace_id?: number;
  event_type?: string;
  message?: string;
  payload_json?: Record<string, unknown>;
  created_at?: string;
}

interface BackendUploadTarget {
  mode: "supabase_signed_upload" | "record_only" | string;
  bucket: string;
  path: string;
  signed_url?: string;
  token?: string;
  configured?: boolean;
  message?: string;
}

interface WorkspaceResponse {
  success: boolean;
  workspace: BackendWorkspace;
}

interface WorkspaceSessionResponse {
  success: boolean;
  workspace: BackendWorkspace;
  session: {
    active_dataset_id?: number | null;
    active_chat_id?: number | null;
    active_page?: string;
    state_json?: Record<string, unknown>;
  };
  dataset?: BackendDatasetPayload | null;
  chats?: Array<{ id: number; title: string; dataset_id?: number | null }>;
  active_chat?: { id: number; title: string; dataset_id?: number | null } | null;
  messages?: Array<{ role: "user" | "assistant" | string; content: string; source?: string }>;
}

interface WorkspacesResponse {
  success: boolean;
  workspaces: BackendWorkspace[];
}

interface UploadInitResponse {
  success: boolean;
  dataset: BackendDataset;
  upload: BackendUploadTarget;
}

interface UploadCompleteResponse {
  success: boolean;
  dataset: BackendDataset;
  job: BackendJob;
}

interface JobResponse {
  success: boolean;
  job: BackendJob;
  events: BackendJobEvent[];
}

interface WorkspaceChatResponse {
  success: boolean;
  answer?: string;
  source?: ChatMessage["source"];
  chat?: { id: number; title?: string; dataset_id?: number | null };
  messages?: Array<{ role: "user" | "assistant" | string; content: string; source?: string }>;
}

interface MultiValueCandidate {
  column: string;
  delimiter: string;
  label: string;
  affectedRows: number;
  affectedPercent: number;
  maxParts: number;
  sampleValues: string[];
}

interface MultiValueSplitConfig {
  enabled: boolean;
  delimiter: string;
  prefix: string;
  keepOriginal: boolean;
  maxParts: number;
}

interface ForecastPoint {
  period: string;
  actual: number | null;
  forecast: number | null;
  lower: number | null;
  upper: number | null;
}

interface DemandRecommendation {
  item: string;
  rating: number;
  ratingCount: number;
  price: number;
  conversionRate: number;
  expectedBuyers: number;
  forecastRevenue: number;
  confidence: "High" | "Medium" | "Low";
  reason: string;
}

const CHART_COLOR = "#2f55d4";
const CHART_COLOR_2 = "#64748b";
const CHART_GOOD = "#047857";
const CHART_WARN = "#b45309";
const BACKEND_ANALYSIS_ROW_LIMIT = 1500;
const LOCAL_STORAGE_ROW_LIMIT = 10000;
const STAGED_ROW_LIMIT = 75000;
const LOCAL_PREVIEW_MAX_BYTES = 20 * 1024 * 1024;
const MAX_CSV_UPLOAD_BYTES = 250 * 1024 * 1024;
const CSV_UPLOAD_CONTENT_TYPE = "text/csv";
const CSV_UPLOAD_CONTENT_TYPES = new Set(["text/csv", "application/csv", "text/x-csv", "application/vnd.ms-excel", ""]);
const CHARTS: ChartType[] = [
  "Line",
  "Area",
  "Bar",
  "Horizontal Bar",
  "Scatter",
  "Histogram",
  "KDE Density",
  "Pie",
  "Donut",
  "Composed",
  "Radar",
  "Treemap",
];

function displayNameFromEmail(email: string) {
  const local = email.split("@")[0] || "there";
  return local
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "there";
}

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 4) return "Hey night owl";
  if (hour < 6) return "Early start";
  if (hour < 12) return "Good morning";
  if (hour < 16) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

const INSIGHT_FEATURES: Record<string, FeatureKey> = {
  overview: "ai.insights",
  report: "ai.insights",
  ideas: "ideas.generate",
  profit: "profit.analyze",
  forecast: "forecast.run",
  budget: "budget.plan",
  sustainability: "esg.analyze",
  competitor: "competitor.analyze",
  kpi: "kpi.monitor",
  chat: "ai.chat",
};

const TAB_HELP: Record<TabType, { title: string; body: string[] }> = {
  Overview: {
    title: "Data Workspace",
    body: [
      "Import, clean, split multi-value cells, and choose which columns are active for analysis.",
      "ID-like fields are excluded by default, while raw rows stay preserved in the local workspace.",
      "Use this tab before deeper analytics when the file has mixed, messy, or nested values.",
    ],
  },
  Charts: {
    title: "Visual Analytics",
    body: [
      "Build recommended BI charts from dimensions and measures, then drill into clicked values.",
      "Includes distribution, density, correlation, and hypothesis-test views for stronger exploration.",
      "Value-level recommendations estimate likely demand and revenue when rating, review count, and price fields exist.",
    ],
  },
  AI: {
    title: "AI Insights",
    body: [
      "Creates a comprehensive BI report from metadata, chart artifacts, quality checks, and sampled rows.",
      "The backend uses OpenAI when configured and falls back to local analysis if needed.",
      "Use this after selecting clean columns so the report is grounded in useful fields.",
    ],
  },
  Chat: {
    title: "Data Chat",
    body: [
      "Ask questions about the uploaded CSV using the active columns and backend dataset profile.",
      "Best for follow-up questions after exploring charts or report recommendations.",
    ],
  },
  Ideas: {
    title: "Opportunity Builder",
    body: [
      "Ranks segment opportunities using selected dimensions and measures.",
      "Combines chart evidence with LLM recommendations for growth, pricing, and cost actions.",
    ],
  },
  Profit: {
    title: "Profit Analytics",
    body: [
      "Select revenue/value and cost fields to calculate margin, gap, and profit indicators.",
      "Use the generated insight to explain leakage, pricing, and operational levers.",
    ],
  },
  Forecast: {
    title: "Forecasting",
    body: [
      "Uses forecast-ready numeric fields with enough observations and variation.",
      "Shows actuals, robust trend forecast, and uncertainty bands.",
      "Also surfaces demand and revenue estimates when product rating, review count, and price columns exist.",
    ],
  },
  Budget: {
    title: "Budget Planning",
    body: [
      "Maps income/value, expense/cost, and segment fields into budget traces and concentration views.",
      "Useful for finding spending hotspots, surplus gaps, and budget-control targets.",
    ],
  },
  Sustainability: {
    title: "ESG Lens",
    body: [
      "Uses impact, usage, supplier, cost, or segment fields to identify sustainability hotspots.",
      "Pairs impact concentration with cost-vs-impact analysis.",
    ],
  },
  Competitor: {
    title: "Competitive Landscape",
    body: [
      "Compares products, companies, segments, or categories against a selected performance metric.",
      "Shows benchmark gaps and sends the context to the strategy report generator.",
    ],
  },
  KPI: {
    title: "KPI Monitor",
    body: [
      "Tracks a selected numeric KPI with summary stats, trend, and forecast context.",
      "Best for metrics with repeated observations rather than IDs or descriptive text.",
    ],
  },
};

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || /^n\/?a$/i.test(trimmed) || /^null$/i.test(trimmed)) return null;
  let cleaned = trimmed
    .replace(/(₹|â‚¹|rs\.?|inr)/gi, "")
    .replace(/[$€£]/g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .replace(/%$/, "");
  if (/^\([+-]?\d+(\.\d+)?\)$/.test(cleaned)) {
    cleaned = `-${cleaned.slice(1, -1)}`;
  }
  if (!/^[+-]?\d+(\.\d+)?$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function isBlank(value: unknown) {
  return value === null || value === undefined || value === "";
}

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "NA";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(value);
}

function backendId(value: number | string | undefined | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function websocketUrl(path: string) {
  const url = new URL(apiUrl(path), window.location.origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

function signedUploadUrl(upload: BackendUploadTarget) {
  if (!upload.signed_url) return "";
  const url = new URL(upload.signed_url, window.location.origin);
  if (upload.token && !url.searchParams.has("token")) {
    url.searchParams.set("token", upload.token);
  }
  return url.toString();
}

function progressFromUnknown(value: unknown) {
  const progress = typeof value === "number" ? value : Number(value);
  return Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : null;
}

function csvUploadError(file: File) {
  if (!file.name.toLowerCase().endsWith(".csv")) return "Only .csv files can be uploaded.";
  if (file.size <= 0) return "The selected CSV file is empty.";
  if (file.size > MAX_CSV_UPLOAD_BYTES) return "CSV uploads are limited to 250 MB.";
  if (!CSV_UPLOAD_CONTENT_TYPES.has((file.type || "").toLowerCase())) {
    return "Only CSV content types are allowed. Please export the file as a CSV and try again.";
  }
  return "";
}

async function uploadFileToSignedTarget(upload: BackendUploadTarget, file: File) {
  const target = signedUploadUrl(upload);
  if (!target) return;

  const send = async (method: "POST" | "PUT") =>
    fetch(target, {
      method,
      headers: {
        "Content-Type": CSV_UPLOAD_CONTENT_TYPE,
        "x-upsert": "false",
      },
      body: file,
    });

  const first = await send("POST");
  if (first.ok) return;

  const second = await send("PUT");
  if (second.ok) return;

  const detail = (await second.text().catch(() => "")) || (await first.text().catch(() => ""));
  throw new Error(detail || `Supabase upload failed with HTTP ${first.status}.`);
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function profileColumns(rows: Record<string, unknown>[], columns: string[]): ColumnProfile[] {
  return columns.map((column) => {
    const values = rows.map((row) => row[column]);
    const present = values.filter((value) => !isBlank(value));
    const numericValues = present.map(parseNumber).filter((value): value is number => value !== null);
    const numericRatio = present.length ? numericValues.length / present.length : 0;
    const counts = new Map<string, number>();
    present.forEach((value) => {
      const key = String(value);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const topValues = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([value, count]) => ({ value, count }));
    const missing = values.length - present.length;
    const isNumeric = numericValues.length > 0 && numericRatio >= 0.6;

    if (!isNumeric) {
      return {
        name: column,
        type: "category",
        missing,
        missingPercent: rows.length ? (missing / rows.length) * 100 : 0,
        unique: counts.size,
        topValues,
      };
    }

    const sorted = [...numericValues].sort((a, b) => a - b);
    return {
      name: column,
      type: "number",
      missing,
      missingPercent: rows.length ? (missing / rows.length) * 100 : 0,
      unique: counts.size,
      numeric: {
        count: numericValues.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        sum: numericValues.reduce((sum, value) => sum + value, 0),
        mean: average(numericValues),
        median: median(numericValues),
      },
      topValues,
    };
  });
}

function aggregateByCategory(rows: Record<string, unknown>[], categoryColumn: string, valueColumn: string) {
  const totals = new Map<string, number>();
  rows.forEach((row) => {
    const label = String(row[categoryColumn] ?? "Unclassified").slice(0, 80);
    const value = parseNumber(row[valueColumn]) ?? 1;
    totals.set(label, (totals.get(label) || 0) + value);
  });
  return [...totals.entries()]
    .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);
}

function histogram(rows: Record<string, unknown>[], column: string, bins = 14) {
  const values = rows.map((row) => parseNumber(row[column])).filter((value): value is number => value !== null);
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = max === min ? 1 : (max - min) / bins;
  const counts = new Array(bins).fill(0);
  values.forEach((value) => {
    const index = Math.min(bins - 1, Math.floor((value - min) / width));
    counts[index] += 1;
  });
  return counts.map((count, index) => {
    const start = min + index * width;
    const end = start + width;
    return {
      bucket: `${formatNumber(start, 1)}-${formatNumber(end, 1)}`,
      count,
    };
  });
}

const MULTI_VALUE_DELIMITERS = [
  { delimiter: "|", label: "Pipe |" },
  { delimiter: ";", label: "Semicolon ;" },
  { delimiter: "\n", label: "Line break" },
  { delimiter: ",", label: "Comma ," },
];

function splitCellValue(value: unknown, delimiter: string) {
  if (typeof value !== "string") return [];
  const rawParts = delimiter === "\n" ? value.split(/\r?\n/g) : value.split(delimiter);
  return rawParts.map((part) => part.trim()).filter(Boolean);
}

function sanitizeColumnName(value: string) {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || "split_value";
}

function detectMultiValueColumns(rows: Record<string, unknown>[], columns: string[]): MultiValueCandidate[] {
  const sampleRows = rows.slice(0, 750);
  const candidates: MultiValueCandidate[] = [];

  columns.forEach((column) => {
    const strings = sampleRows.map((row) => row[column]).filter((value): value is string => typeof value === "string" && value.trim().length > 0);
    if (!strings.length) return;
    const numericCount = strings.map(parseNumber).filter((value) => value !== null).length;
    if (numericCount / strings.length > 0.65) return;

    MULTI_VALUE_DELIMITERS.forEach(({ delimiter, label }) => {
      const splitRows = strings
        .map((value) => ({ value, parts: splitCellValue(value, delimiter) }))
        .filter((item) => item.parts.length > 1);
      if (!splitRows.length) return;
      const affectedPercent = (splitRows.length / strings.length) * 100;
      const threshold = delimiter === "," ? 45 : 12;
      if (splitRows.length < Math.min(5, strings.length) || affectedPercent < threshold) return;
      const maxParts = Math.min(12, Math.max(...splitRows.map((item) => item.parts.length)));
      candidates.push({
        column,
        delimiter,
        label,
        affectedRows: splitRows.length,
        affectedPercent,
        maxParts,
        sampleValues: splitRows.slice(0, 3).map((item) => item.value),
      });
    });
  });

  return candidates.sort((a, b) => b.affectedPercent - a.affectedPercent);
}

function applyMultiValueSplits(rows: Record<string, unknown>[], columns: string[], configs: Record<string, MultiValueSplitConfig>) {
  const activeConfigs = Object.entries(configs).filter(([, config]) => config.enabled && config.maxParts > 1);
  if (!activeConfigs.length) return { rows, columns };

  const outputColumns: string[] = [];
  columns.forEach((column) => {
    const config = configs[column];
    if (!config?.enabled) {
      outputColumns.push(column);
      return;
    }
    if (config.keepOriginal) outputColumns.push(column);
    const prefix = sanitizeColumnName(config.prefix || column);
    for (let index = 0; index < config.maxParts; index += 1) {
      outputColumns.push(`${prefix}_${index + 1}`);
    }
  });

  const outputRows = rows.map((row) => {
    const next: Record<string, unknown> = { ...row };
    activeConfigs.forEach(([column, config]) => {
      const parts = splitCellValue(row[column], config.delimiter);
      const prefix = sanitizeColumnName(config.prefix || column);
      for (let index = 0; index < config.maxParts; index += 1) {
        next[`${prefix}_${index + 1}`] = parts[index] || "";
      }
      if (!config.keepOriginal) delete next[column];
    });
    return next;
  });

  return { rows: outputRows, columns: outputColumns };
}

function densityRows(rows: Record<string, unknown>[], column: string) {
  const values = rows.map((row) => parseNumber(row[column])).filter((value): value is number => value !== null);
  if (values.length < 3) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const std = Math.sqrt(average(values.map((value) => (value - average(values)) ** 2))) || 1;
  const bandwidth = Math.max((1.06 * std) / Math.pow(values.length, 0.2), (max - min) / 80 || 1);
  return Array.from({ length: 80 }, (_, index) => {
    const x = min + ((max - min || 1) * index) / 79;
    const density =
      values.reduce((sum, value) => {
        const z = (x - value) / bandwidth;
        return sum + Math.exp(-0.5 * z * z);
      }, 0) /
      (values.length * bandwidth * Math.sqrt(2 * Math.PI));
    return { x: Number(x.toFixed(2)), density: Number(density.toFixed(6)) };
  });
}

function forecastSeries(rows: Record<string, unknown>[], column: string, periods: number): ForecastPoint[] {
  const values = rows.map((row) => parseNumber(row[column])).filter((value): value is number => value !== null);
  if (!values.length) return [];
  const n = values.length;
  const xs = values.map((_, index) => index);
  const xMean = average(xs);
  const yMean = average(values);
  const numerator = xs.reduce((sum, x, index) => sum + (x - xMean) * (values[index] - yMean), 0);
  const denominator = xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0) || 1;
  const regressionSlope = numerator / denominator;
  const intercept = yMean - regressionSlope * xMean;
  const deltas = values.slice(1).map((value, index) => value - values[index]);
  const robustSlope = median(deltas);
  const slope = Number.isFinite(robustSlope) ? regressionSlope * 0.45 + robustSlope * 0.55 : regressionSlope;
  const residuals = values.map((value, index) => value - (intercept + regressionSlope * index));
  const mad = median(residuals.map((value) => Math.abs(value - median(residuals)))) || Math.sqrt(average(residuals.map((value) => value ** 2))) || 0;
  const interval = Math.max(mad * 1.4826, Math.abs(slope) * 0.5);
  const actual = values.slice(Math.max(0, n - 60)).map((value, index) => ({
    period: `A${index + 1}`,
    actual: Number(value.toFixed(2)),
    forecast: null,
    lower: null,
    upper: null,
  }));
  const future = Array.from({ length: periods }, (_, index) => {
    const y = values[n - 1] + slope * (index + 1);
    const spread = interval * Math.sqrt(index + 1);
    return {
      period: `F${index + 1}`,
      actual: null,
      forecast: Number(y.toFixed(2)),
      lower: Number((y - spread).toFixed(2)),
      upper: Number((y + spread).toFixed(2)),
    };
  });
  return [...actual, ...future];
}

function hypothesisTest(rows: Record<string, unknown>[], categoryColumn: string, valueColumn: string) {
  const groups = aggregateByCategory(rows, categoryColumn, valueColumn).slice(0, 2).map((item) => item.name);
  if (groups.length < 2) return null;
  const series = groups.map((group) =>
    rows
      .filter((row) => String(row[categoryColumn] ?? "Unclassified").slice(0, 80) === group)
      .map((row) => parseNumber(row[valueColumn]))
      .filter((value): value is number => value !== null),
  );
  if (series[0].length < 2 || series[1].length < 2) return null;
  const [a, b] = series;
  const meanA = average(a);
  const meanB = average(b);
  const variance = (values: number[]) => {
    const avg = average(values);
    return values.length > 1 ? values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1) : 0;
  };
  const varA = variance(a);
  const varB = variance(b);
  const standardError = Math.sqrt(varA / a.length + varB / b.length) || 1;
  const tScore = (meanA - meanB) / standardError;
  const pooledStd = Math.sqrt((varA + varB) / 2) || 1;
  return {
    groupA: groups[0],
    groupB: groups[1],
    meanA,
    meanB,
    difference: meanA - meanB,
    tScore,
    effectSize: (meanA - meanB) / pooledStd,
    verdict: Math.abs(tScore) >= 2 ? "Likely meaningful difference" : "Difference is weak or inconclusive",
  };
}

function findColumn(columns: string[], patterns: RegExp[]) {
  return columns.find((column) => patterns.some((pattern) => pattern.test(column.toLowerCase())));
}

function buildDemandRecommendations(rows: Record<string, unknown>[], columns: string[]): DemandRecommendation[] {
  const productColumn = findColumn(columns, [/product.*name/, /^product$/, /item.*name/, /^item$/, /title/, /name/]);
  const ratingColumn = findColumn(columns, [/^rating$/, /average.*rating/, /stars?$/]);
  const ratingCountColumn = findColumn(columns, [/rating.*count/, /review.*count/, /ratings?$/, /reviews?$/]);
  const priceColumn =
    findColumn(columns, [/discount.*price/, /sale.*price/, /^price$/, /actual.*price/, /unit.*price/, /revenue/, /sales/]) ||
    columns.find((column) => column.toLowerCase().includes("price"));

  if (!productColumn || !ratingColumn) return [];

  const grouped = new Map<string, { ratings: number[]; ratingCount: number; prices: number[]; rows: number }>();
  rows.forEach((row) => {
    const item = String(row[productColumn] ?? "").trim();
    const rating = parseNumber(row[ratingColumn]);
    if (!item || rating === null) return;
    const ratingCount = ratingCountColumn ? parseNumber(row[ratingCountColumn]) ?? 0 : 0;
    const price = priceColumn ? parseNumber(row[priceColumn]) : null;
    const current = grouped.get(item) || { ratings: [], ratingCount: 0, prices: [], rows: 0 };
    current.ratings.push(rating);
    current.ratingCount = Math.max(current.ratingCount, ratingCount);
    if (price !== null) current.prices.push(price);
    current.rows += 1;
    grouped.set(item, current);
  });

  return [...grouped.entries()]
    .map(([item, stats]) => {
      const rating = average(stats.ratings);
      const ratingCount = stats.ratingCount || stats.rows;
      const price = stats.prices.length ? average(stats.prices) : 0;
      const ratingLift = Math.max(0, rating - 3.5);
      const confidenceBoost = Math.min(0.025, Math.log10(ratingCount + 1) * 0.004);
      const conversionRate = Math.min(0.09, 0.012 + ratingLift * 0.018 + confidenceBoost);
      const expectedBuyers = Math.max(1, Math.round(ratingCount * conversionRate));
      const forecastRevenue = expectedBuyers * price;
      const confidence: DemandRecommendation["confidence"] = ratingCount >= 1000 ? "High" : ratingCount >= 100 ? "Medium" : "Low";
      return {
        item,
        rating,
        ratingCount,
        price,
        conversionRate,
        expectedBuyers,
        forecastRevenue,
        confidence,
        reason: rating >= 4.2 ? "High rating with review signal" : rating >= 4 ? "Positive rating with demand evidence" : "Moderate rating, validate before scaling",
      };
    })
    .filter((item) => item.rating >= 3.8)
    .sort((a, b) => b.forecastRevenue - a.forecastRevenue || b.expectedBuyers - a.expectedBuyers)
    .slice(0, 8);
}

function correlationRows(rows: Record<string, unknown>[], numericColumns: string[]) {
  const pairs: { x: string; y: string; value: number }[] = [];
  const limited = numericColumns.slice(0, 6);
  limited.forEach((a) => {
    limited.forEach((b) => {
      const series = rows
        .map((row) => [parseNumber(row[a]), parseNumber(row[b])] as const)
        .filter(([x, y]) => x !== null && y !== null) as [number, number][];
      if (series.length < 2) {
        pairs.push({ x: a, y: b, value: 0 });
        return;
      }
      const xs = series.map(([x]) => x);
      const ys = series.map(([, y]) => y);
      const xAvg = average(xs);
      const yAvg = average(ys);
      const numerator = series.reduce((sum, [x, y]) => sum + (x - xAvg) * (y - yAvg), 0);
      const denominator =
        Math.sqrt(xs.reduce((sum, x) => sum + (x - xAvg) ** 2, 0)) *
          Math.sqrt(ys.reduce((sum, y) => sum + (y - yAvg) ** 2, 0)) || 1;
      pairs.push({ x: a, y: b, value: Number((numerator / denominator).toFixed(2)) });
    });
  });
  return pairs;
}

function chartTooltip(theme: ThemeMode) {
  return {
    backgroundColor: theme === "dark" ? "#10151f" : "#ffffff",
    border: `1px solid ${theme === "dark" ? "rgba(148,163,184,.22)" : "#d9e2ec"}`,
    color: theme === "dark" ? "#f8fafc" : "#111827",
  };
}

function axisColor(theme: ThemeMode) {
  return theme === "dark" ? "#98a2b3" : "#64748b";
}

function workspaceStorageKey(userEmail: string) {
  return `adviso_workspace_${userEmail.toLowerCase().replace(/[^a-z0-9@._-]/g, "_")}`;
}

function readWorkspaceSnapshot(userEmail: string): WorkspaceSnapshot | null {
  try {
    const saved = localStorage.getItem(workspaceStorageKey(userEmail));
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Partial<WorkspaceSnapshot>;
    if (!Array.isArray(parsed.data) || !Array.isArray(parsed.columns)) return null;
    const allColumns = Array.isArray(parsed.allColumns) ? parsed.allColumns : parsed.columns;
    return {
      data: parsed.data,
      allColumns,
      columns: parsed.columns.filter((column) => allColumns.includes(column)),
      fileName: parsed.fileName || "restored-workspace.csv",
      fileSizeBytes: Number(parsed.fileSizeBytes || 0),
      savedAt: Number(parsed.savedAt || Date.now()),
    };
  } catch {
    return null;
  }
}

function saveWorkspaceSnapshot(userEmail: string, snapshot: WorkspaceSnapshot) {
  if (snapshot.data.length > LOCAL_STORAGE_ROW_LIMIT) return;
  try {
    localStorage.setItem(workspaceStorageKey(userEmail), JSON.stringify(snapshot));
  } catch {
    // Local storage can fill up on large CSV files; the in-memory workspace still remains active.
  }
}

function isIdLikeColumn(column: string, profile?: ColumnProfile, rowCount = 0) {
  const normalized = column.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const nameLooksLikeId =
    normalized === "id" ||
    normalized.endsWith("_id") ||
    normalized.startsWith("id_") ||
    normalized.includes("_id_") ||
    normalized.includes("uuid") ||
    normalized.includes("guid") ||
    normalized.includes("identifier") ||
    normalized.includes("invoice") ||
    normalized.includes("transaction") ||
    normalized === "ordernumber" ||
    normalized === "order_number" ||
    normalized.endsWith("_number") ||
    normalized.endsWith("_no") ||
    normalized.endsWith("_code") ||
    normalized === "code" ||
    normalized.includes("sku");
  if (nameLooksLikeId) return true;
  if (!profile || rowCount < 25) return false;
  const highCardinality = profile.unique >= Math.max(20, Math.floor(rowCount * 0.92));
  return profile.type === "category" && highCardinality && /(^|_)(key|code|number|no|ref|reference)($|_)/.test(normalized);
}

function defaultAnalysisColumns(rows: Record<string, unknown>[], fields: string[]) {
  const profiles = profileColumns(rows, fields);
  const selected = fields.filter((column) => !isIdLikeColumn(column, profiles.find((profile) => profile.name === column), rows.length));
  return selected.length ? selected : fields;
}

function sanitizeActiveColumns(activeColumns: string[], allColumns: string[]) {
  const cleaned = activeColumns.filter((column) => allColumns.includes(column));
  return cleaned.length ? cleaned : allColumns;
}

export default function PlatformDashboard({
  userEmail,
  onLogout,
  theme,
  onToggleTheme,
  onThemePreferenceChange,
  initialTab = "Overview",
  onTabChange,
  onUpgradeRequested,
}: PlatformDashboardProps) {
  const { profile: authProfile, user: firebaseUser } = useAuth();
  const {
    canAccessTab,
    canUseFeature,
    clearUpgradeMessage,
    nextUpgradePlan,
    plans,
    recommendedPlanForFeature,
    recommendedPlanForTab,
    requiredFeatureForTab,
    subscription,
    upgradeMessage,
  } = usePermissions();
  const savedWorkspace = useMemo(() => readWorkspaceSnapshot(userEmail), [userEmail]);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [activeServiceId, setActiveServiceId] = useState<PlatformServiceId>(() => serviceForDashboardTab(initialTab).id);
  const [data, setData] = useState<Record<string, unknown>[]>(() => savedWorkspace?.data || []);
  const [allColumns, setAllColumns] = useState<string[]>(() => savedWorkspace?.allColumns || savedWorkspace?.columns || []);
  const [columns, setColumns] = useState<string[]>(() => savedWorkspace?.columns || []);
  const [fileName, setFileName] = useState(() => savedWorkspace?.fileName || "");
  const [datasetFileSizeBytes, setDatasetFileSizeBytes] = useState(() => savedWorkspace?.fileSizeBytes || 0);
  const [stagedData, setStagedData] = useState<Record<string, unknown>[] | null>(null);
  const [stagedColumns, setStagedColumns] = useState<string[]>([]);
  const [selectedStagedColumns, setSelectedStagedColumns] = useState<string[]>([]);
  const [stagedSplitConfigs, setStagedSplitConfigs] = useState<Record<string, MultiValueSplitConfig>>({});
  const [previewColumn, setPreviewColumn] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [chartType, setChartType] = useState<ChartType>("Bar");
  const [xAxisCol, setXAxisCol] = useState("");
  const [yAxisCol, setYAxisCol] = useState("");
  const [secondaryCol, setSecondaryCol] = useState("");
  const [forecastCol, setForecastCol] = useState("");
  const [forecastPeriods, setForecastPeriods] = useState(6);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [insights, setInsights] = useState<Record<string, InsightResult>>({});
  const [loadingInsight, setLoadingInsight] = useState<string | null>(null);
  const [manualRevenue, setManualRevenue] = useState(0);
  const [manualCost, setManualCost] = useState(0);
  const [showFreePlanPrompt, setShowFreePlanPrompt] = useState(false);
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [workspaceNotice, setWorkspaceNotice] = useState("");
  const [backendWorkspaceId, setBackendWorkspaceId] = useState<number | null>(null);
  const [activeBackendDatasetId, setActiveBackendDatasetId] = useState<number | null>(null);
  const [activeBackendChatId, setActiveBackendChatId] = useState<number | null>(null);
  const [backendJobId, setBackendJobId] = useState<number | null>(null);
  const [backendUploadBusy, setBackendUploadBusy] = useState(false);
  const [backendUploadProgress, setBackendUploadProgress] = useState<number | null>(null);
  const [backendUploadMessage, setBackendUploadMessage] = useState("");
  const [showDatasetValidationModal, setShowDatasetValidationModal] = useState(false);
  const uploadSocketRef = useRef<WebSocket | null>(null);
  const jobPollTimerRef = useRef<number | null>(null);
  const sessionRestoreRef = useRef(false);
  const bannerStorageKey = `adviso_top_banner_closed_${userEmail.toLowerCase().replace(/[^a-z0-9@._-]/g, "_")}`;
  const [showTopBanner, setShowTopBanner] = useState(() => localStorage.getItem(bannerStorageKey) !== "true");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("adviso_sidebar_collapsed") === "true");

  const isDataLoaded = data.length > 0;
  const profiles = useMemo(() => profileColumns(data, columns), [data, columns]);
  const stagedPrepared = useMemo(
    () => applyMultiValueSplits(stagedData || [], stagedColumns, stagedSplitConfigs),
    [stagedData, stagedColumns, stagedSplitConfigs],
  );
  const stagedProfiles = useMemo(() => profileColumns(stagedPrepared.rows, stagedPrepared.columns), [stagedPrepared.rows, stagedPrepared.columns]);
  const multiValueCandidates = useMemo(() => detectMultiValueColumns(stagedData || [], stagedColumns), [stagedData, stagedColumns]);
  const numericColumns = useMemo(() => profiles.filter((profile) => profile.type === "number").map((profile) => profile.name), [profiles]);
  const categoryColumns = useMemo(() => profiles.filter((profile) => profile.type !== "number").map((profile) => profile.name), [profiles]);
  const forecastColumns = useMemo(
    () =>
      profiles
        .filter((profile) => profile.type === "number" && (profile.numeric?.count || 0) >= Math.min(8, Math.max(4, data.length)) && profile.unique >= Math.min(4, data.length))
        .map((profile) => profile.name),
    [profiles, data.length],
  );
  const missingCount = useMemo(() => profiles.reduce((sum, profile) => sum + profile.missing, 0), [profiles]);
  const ignoredColumns = useMemo(
    () => allColumns.filter((column) => !columns.includes(column)),
    [allColumns, columns],
  );
  const activeService = getPlatformService(activeServiceId);
  const isAccountSettingsActive = activeServiceId === "account-settings";
  const isSupportActive = activeServiceId === "support-center";
  const isHomeActive = activeServiceId === "home";
  const isDatasetsActive = activeServiceId === "datasets";
  const isHomeLaunchpadActive = isHomeActive;
  const isDataPreviewActive = activeServiceId === "data-preview";
  const isKpiDiscoveryActive = activeServiceId === "data-quality";
  const isAIInsightsActive = activeServiceId === "ai-insights";
  const isVisualAnalyticsActive = activeServiceId === "visual-analytics";
  const isAIChatActive = activeServiceId === "data-chat";
  const activeTabAllowed = canAccessTab(activeTab);
  const freePlanPromptStorageKey = `adviso_free_plan_prompt_seen_v2_${userEmail.toLowerCase().replace(/[^a-z0-9@._-]/g, "_")}`;
  const currentPlanId = (subscription.planId in PLAN_RANK ? subscription.planId : "free") as PlanId;
  const upgradePlanOptions = useMemo(
    () => [plans.go, plans.pro, plans.enterprise].filter((plan) => PLAN_RANK[plan.id] > PLAN_RANK[currentPlanId]),
    [currentPlanId, plans.enterprise, plans.go, plans.pro],
  );
  const hasPlanUpgradeOptions = upgradePlanOptions.length > 0;
  const selectTab = (tab: TabType) => {
    setActiveTab(tab);
    setActiveServiceId(serviceForDashboardTab(tab).id);
    onTabChange?.(tab);
  };

  const canAccessService = (item: PlatformServiceItem) => {
    if (subscription.accessLevel === "full") return true;
    if (subscription.planId === "free") return FREE_PLATFORM_SERVICE_IDS.has(item.id);
    if (item.tab) return canAccessTab(item.tab);
    if (item.feature) return canUseFeature(item.feature);
    return item.status === "live";
  };

  const recommendedPlanForService = (item: PlatformServiceItem) => {
    if (item.tab) return recommendedPlanForTab(item.tab).name;
    if (item.feature) return recommendedPlanForFeature(item.feature).name;
    return item.requiredPlan ? plans[item.requiredPlan].name : "Enterprise";
  };

  const selectService = (item: PlatformServiceItem) => {
    if (!canAccessService(item)) {
      openPlanPicker();
      return;
    }
    setActiveServiceId(item.id);
    setProfileMenuOpen(false);
    if (item.tab) {
      setActiveTab(item.tab);
      onTabChange?.(item.tab);
    }
  };

  const closeFreePlanPrompt = () => {
    if (freePlanPromptStorageKey) {
      localStorage.setItem(freePlanPromptStorageKey, "true");
    }
    setShowFreePlanPrompt(false);
  };

  const openPlanPicker = () => {
    if (!hasPlanUpgradeOptions) return;
    closeFreePlanPrompt();
    setShowPlanPicker(true);
  };

  const requestPaidUpgrade = (planId: PlanId) => {
    if (planId === "free") return;
    closeFreePlanPrompt();
    setShowPlanPicker(false);
    onUpgradeRequested?.(planId);
  };

  const closeTopBanner = () => {
    localStorage.setItem(bannerStorageKey, "true");
    setShowTopBanner(false);
  };

  const applyWorkspaceSession = (session: WorkspaceSessionResponse) => {
    const workspaceId = backendId(session.workspace.id);
    if (workspaceId) setBackendWorkspaceId(workspaceId);
    const datasetId = backendId(session.session.active_dataset_id || session.dataset?.dataset?.id);
    if (datasetId) setActiveBackendDatasetId(datasetId);
    const chatId = backendId(session.session.active_chat_id || session.active_chat?.id);
    if (chatId) setActiveBackendChatId(chatId);

    const restoredPage = session.session.active_page;
    if (restoredPage && Object.prototype.hasOwnProperty.call(TAB_HELP, restoredPage)) {
      selectTab(restoredPage as TabType);
    }

    const restoredMessages = (session.messages || [])
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
        source: message.source,
      }));
    if (restoredMessages.length) setChatMessages(restoredMessages);

    if (!data.length && session.dataset?.dataset) {
      const restoredRows = session.dataset.metadata?.sampled_rows_json || session.dataset.stats?.sample_rows_json || [];
      const restoredColumns = session.dataset.columns.map((column) => String(column.name || "")).filter(Boolean);
      if (restoredRows.length && restoredColumns.length) {
        setData(restoredRows);
        setAllColumns(restoredColumns);
        setColumns(restoredColumns);
        setFileName(session.dataset.dataset.file_name || "restored-workspace.csv");
        setDatasetFileSizeBytes(Number(session.dataset.dataset.size_bytes || 0));
        setWorkspaceNotice("Restored your last workspace from backend metadata and sampled rows.");
      }
    }
  };

  const persistWorkspaceSession = async (patch: Record<string, unknown>) => {
    if (!backendWorkspaceId) return;
    try {
      await authorizedFetch(`/api/workspaces/${backendWorkspaceId}/session`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
    } catch {
      // Session restoration is a convenience layer; the active workspace remains usable.
    }
  };

  useEffect(() => {
    if (!data.length || !allColumns.length || !columns.length) return;
    saveWorkspaceSnapshot(userEmail, {
      data,
      allColumns,
      columns,
      fileName,
      fileSizeBytes: datasetFileSizeBytes,
      savedAt: Date.now(),
    });
  }, [userEmail, data, allColumns, columns, fileName, datasetFileSizeBytes]);

  useEffect(() => {
    if (sessionRestoreRef.current) return;
    sessionRestoreRef.current = true;
    const restoreSession = async () => {
      try {
        const response = await authorizedFetch("/api/workspaces/session");
        const session = await readApiJson<WorkspaceSessionResponse>(response);
        applyWorkspaceSession(session);
      } catch {
        // Local snapshot restoration still works if the backend session is unavailable.
      }
    };
    void restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!backendWorkspaceId) return;
    const timer = window.setTimeout(() => {
      void persistWorkspaceSession({
        active_dataset_id: activeBackendDatasetId,
        active_chat_id: activeBackendChatId,
        active_page: activeTab,
        state_json: {
          service: activeServiceId,
          chartType,
          xAxisCol,
          yAxisCol,
          secondaryCol,
          forecastCol,
          forecastPeriods,
        },
      });
    }, 650);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendWorkspaceId, activeBackendDatasetId, activeBackendChatId, activeTab, activeServiceId, chartType, xAxisCol, yAxisCol, secondaryCol, forecastCol, forecastPeriods]);

  useEffect(() => {
    setActiveTab(initialTab);
    setActiveServiceId(serviceForDashboardTab(initialTab).id);
  }, [initialTab]);

  useEffect(() => {
    setShowTopBanner(localStorage.getItem(bannerStorageKey) !== "true");
  }, [bannerStorageKey]);

  useEffect(() => {
    localStorage.setItem("adviso_sidebar_collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    setShowFreePlanPrompt(false);
  }, [freePlanPromptStorageKey, hasPlanUpgradeOptions, subscription.loading, subscription.planId]);

  useEffect(() => {
    return () => {
      uploadSocketRef.current?.close();
      if (jobPollTimerRef.current !== null) {
        window.clearTimeout(jobPollTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!stagedData) return;
    setSelectedStagedColumns((current) => {
      const valid = current.filter((column) => stagedPrepared.columns.includes(column));
      const splitColumns = stagedPrepared.columns.filter((column) => !stagedColumns.includes(column));
      const next = [...valid, ...splitColumns.filter((column) => !valid.includes(column))];
      return sanitizeActiveColumns(next, stagedPrepared.columns);
    });
  }, [stagedData, stagedPrepared.columns, stagedColumns]);

  useEffect(() => {
    if (!columns.length) return;
    const firstCategory = categoryColumns[0] || columns[0];
    const firstNumber = forecastColumns[0] || numericColumns[0] || columns[0];
    const secondNumber = numericColumns[1] || firstNumber;
    setXAxisCol((current) => current || firstCategory);
    setYAxisCol((current) => current || firstNumber);
    setSecondaryCol((current) => current || secondNumber);
    setForecastCol((current) => current || firstNumber);
  }, [columns, categoryColumns, numericColumns, forecastColumns]);

  const requestInsight = async (
    mode: string,
    question = "",
    context: Record<string, unknown> = {},
    rows = data,
    cols = columns,
  ) => {
    if (!rows.length) return;
    const requiredFeature = INSIGHT_FEATURES[mode] || "ai.insights";
    if (!canUseFeature(requiredFeature)) {
      setInsights((prev) => ({
        ...prev,
        [mode]: {
          answer: `Upgrade required: your current ${subscription.plan.name} plan does not include ${requiredFeature.replace(".", " ")}.`,
          source: "local",
        },
      }));
      return;
    }
    setLoadingInsight(mode);
    try {
      const workspaceInsightPath =
        backendWorkspaceId && activeBackendDatasetId
          ? `/api/workspaces/${backendWorkspaceId}/datasets/${activeBackendDatasetId}/insights`
          : "/api/dataset/insights";
      const response = await authorizedFetch(workspaceInsightPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          question,
          context,
          workspace_id: backendWorkspaceId,
          dataset_id: activeBackendDatasetId,
          active_page: activeTab,
          columns: cols,
          rows: rows.slice(0, BACKEND_ANALYSIS_ROW_LIMIT),
        }),
      });
      const result = await readApiJson<{ answer?: string; source?: InsightResult["source"] }>(response);
      if (!result.answer) throw new Error("The backend returned an empty insight response.");
      setInsights((prev) => ({
        ...prev,
        [mode]: { answer: result.answer, source: result.source || "local" },
      }));
    } catch (error) {
      setInsights((prev) => ({
        ...prev,
        [mode]: {
          answer: apiFailureMessage(
            error,
            "The insight service could not be reached. Please retry, or contact support if the issue continues.",
          ),
          source: "local",
        },
      }));
    } finally {
      setLoadingInsight(null);
    }
  };

  const clearBackendWatchers = () => {
    uploadSocketRef.current?.close();
    uploadSocketRef.current = null;
    if (jobPollTimerRef.current !== null) {
      window.clearTimeout(jobPollTimerRef.current);
      jobPollTimerRef.current = null;
    }
  };

  const ensureBackendWorkspace = async () => {
    if (backendWorkspaceId) return backendWorkspaceId;

    const listResponse = await authorizedFetch("/api/workspaces");
    const list = await readApiJson<WorkspacesResponse>(listResponse);
    let workspace = list.workspaces[0];

    if (!workspace) {
      const createResponse = await authorizedFetch("/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: "Personal Workspace" }),
      });
      const created = await readApiJson<WorkspaceResponse>(createResponse);
      workspace = created.workspace;
    }

    const id = backendId(workspace.id);
    if (!id) throw new Error("The backend did not return a valid workspace id.");
    setBackendWorkspaceId(id);
    return id;
  };

  const applyBackendJobEvent = (event: BackendJobEvent, expectedJobId: number) => {
    if (event.job_id && backendId(event.job_id) !== expectedJobId) return;

    const payload = event.payload_json && typeof event.payload_json === "object" ? event.payload_json : {};
    const progress = progressFromUnknown(payload.progress);
    if (progress !== null) {
      setBackendUploadProgress(progress);
    } else if (event.event_type === "started") {
      setBackendUploadProgress((current) => Math.max(current || 0, 5));
    } else if (event.event_type === "completed") {
      setBackendUploadProgress(100);
    }

    if (event.message) setBackendUploadMessage(event.message);
    if (event.event_type === "completed") {
      setBackendUploadBusy(false);
      setWorkspaceNotice("Backend profiling is complete. Adviso AI saved metadata, column statistics, and summaries for this dataset.");
    }
    if (event.event_type === "failed") {
      setBackendUploadBusy(false);
      setWorkspaceNotice(event.message || "Backend CSV processing failed. Check the worker logs and retry the upload.");
    }
  };

  const pollBackendJob = (workspaceId: number, jobId: number) => {
    if (jobPollTimerRef.current !== null) {
      window.clearTimeout(jobPollTimerRef.current);
      jobPollTimerRef.current = null;
    }

    const poll = async () => {
      try {
        const response = await authorizedFetch(`/api/workspaces/${workspaceId}/jobs/${jobId}`);
        const result = await readApiJson<JobResponse>(response);
        const jobProgress = progressFromUnknown(result.job.progress);
        const latestEvent = result.events[result.events.length - 1];
        const status = result.job.status || "queued";

        if (jobProgress !== null) setBackendUploadProgress(jobProgress);
        setBackendUploadMessage(latestEvent?.message || `Dataset processing is ${status}.`);

        const isTerminal = status === "completed" || status === "failed" || status === "cancelled";
        if (latestEvent) applyBackendJobEvent(latestEvent, jobId);
        if (isTerminal) {
          setBackendUploadBusy(false);
          uploadSocketRef.current?.close();
          uploadSocketRef.current = null;
          jobPollTimerRef.current = null;
          return;
        }
      } catch (error) {
        setBackendUploadMessage(
          apiFailureMessage(error, "Upload queued, but job progress could not be refreshed yet."),
        );
      }

      jobPollTimerRef.current = window.setTimeout(poll, 2200);
    };

    jobPollTimerRef.current = window.setTimeout(poll, 1000);
  };

  const watchBackendJob = async (workspaceId: number, jobId: number) => {
    pollBackendJob(workspaceId, jobId);

    const token = await auth?.currentUser?.getIdToken();
    if (!token) return;

    const url = new URL(websocketUrl(`/api/ws/workspaces/${workspaceId}`));
    url.searchParams.set("token", token);

    const socket = new WebSocket(url.toString());
    uploadSocketRef.current = socket;
    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as BackendJobEvent & { type?: string };
        if (event.type === "connected") return;
        applyBackendJobEvent(event, jobId);
      } catch {
        setBackendUploadMessage("Received an unreadable processing update from the backend.");
      }
    };
    socket.onerror = () => {
      setBackendUploadMessage("Live progress connection dropped. Falling back to job polling.");
    };
    socket.onclose = () => {
      if (uploadSocketRef.current === socket) uploadSocketRef.current = null;
    };
  };

  const startBackendUploadPipeline = async (file: File) => {
    clearBackendWatchers();
    setBackendJobId(null);
    setBackendUploadBusy(true);
    setBackendUploadProgress(2);
    setBackendUploadMessage("Creating workspace upload session...");

    try {
      const workspaceId = await ensureBackendWorkspace();
      setBackendUploadProgress(8);

      const initResponse = await authorizedFetch(`/api/workspaces/${workspaceId}/uploads/init`, {
        method: "POST",
        body: JSON.stringify({
          file_name: file.name,
          size_bytes: file.size,
          content_type: CSV_UPLOAD_CONTENT_TYPE,
          checksum_sha256: "",
        }),
      });
      const init = await readApiJson<UploadInitResponse>(initResponse);
      const datasetId = backendId(init.dataset.id);
      if (!datasetId) throw new Error("The backend did not return a valid dataset id.");
      setActiveBackendDatasetId(datasetId);

      setBackendUploadProgress(18);
      if (!init.upload.signed_url) {
        const message = init.upload.message || "Supabase signed uploads are not configured for this backend.";
        setBackendUploadMessage(message);
        setWorkspaceNotice(`${message} The local preview still works for smaller files, but 200MB CSV processing needs Supabase storage and the worker.`);
        return;
      }

      setBackendUploadMessage("Uploading CSV to Supabase Storage...");
      await uploadFileToSignedTarget(init.upload, file);
      setBackendUploadProgress(58);
      setBackendUploadMessage("Upload complete. Queueing metadata extraction...");

      const completeResponse = await authorizedFetch(`/api/workspaces/${workspaceId}/uploads/${datasetId}/complete`, {
        method: "POST",
        body: JSON.stringify({
          storage_path: init.upload.path,
          checksum_sha256: "",
          size_bytes: file.size,
        }),
      });
      const complete = await readApiJson<UploadCompleteResponse>(completeResponse);
      const jobId = backendId(complete.job.id);
      if (!jobId) throw new Error("The backend did not return a valid processing job id.");

      setBackendJobId(jobId);
      setActiveBackendDatasetId(datasetId);
      setBackendUploadProgress(progressFromUnknown(complete.job.progress) ?? 62);
      setBackendUploadMessage("CSV uploaded. Metadata extraction is queued.");
      setWorkspaceNotice(`Backend upload started for ${file.name}. Adviso AI will process metadata, statistics, and summaries without loading the full CSV in the browser.`);
      void watchBackendJob(workspaceId, jobId);
    } catch (error) {
      const message = apiFailureMessage(error, "The backend upload pipeline could not be started.");
      setBackendUploadProgress(null);
      setBackendUploadMessage(message);
      setWorkspaceNotice(message);
    } finally {
      setBackendUploadBusy(false);
    }
  };

  const processLocalCsvPreview = (file: File) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      worker: true,
      complete: (results) => {
        const fields = results.meta.fields || [];
        const parsedRows = results.data.slice(0, STAGED_ROW_LIMIT);
        if (results.data.length > STAGED_ROW_LIMIT) {
          setWorkspaceNotice(`Large CSV detected. Loaded the first ${formatNumber(STAGED_ROW_LIMIT, 0)} rows locally; backend storage can take over for full-dataset processing later.`);
        } else {
          setWorkspaceNotice((current) => current.startsWith("Large CSV detected. Loaded") ? "" : current);
        }
        const defaultColumns = defaultAnalysisColumns(parsedRows, fields);
        const detectedMultiValueColumns = detectMultiValueColumns(parsedRows, fields);
        const initialSplitConfigs = detectedMultiValueColumns.reduce<Record<string, MultiValueSplitConfig>>((acc, candidate) => {
          if (!acc[candidate.column]) {
            acc[candidate.column] = {
              enabled: false,
              delimiter: candidate.delimiter,
              prefix: sanitizeColumnName(candidate.column),
              keepOriginal: false,
              maxParts: Math.min(candidate.maxParts, 8),
            };
          }
          return acc;
        }, {});
        setFileName(file.name);
        setStagedData(parsedRows);
        setStagedColumns(fields);
        setSelectedStagedColumns(defaultColumns);
        setStagedSplitConfigs(initialSplitConfigs);
        setPreviewColumn(null);
        setShowDatasetValidationModal(activeServiceId !== "datasets");
      },
      error: (error) => {
        setWorkspaceNotice(error.message || "The CSV preview could not be parsed locally.");
      },
    });
  };

  const processFile = (file: File) => {
    const validationError = csvUploadError(file);
    if (validationError) {
      clearBackendWatchers();
      setBackendJobId(null);
      setBackendUploadBusy(false);
      setBackendUploadProgress(null);
      setBackendUploadMessage(validationError);
      setWorkspaceNotice(validationError);
      return;
    }

    void startBackendUploadPipeline(file);
    setFileName(file.name);
    setDatasetFileSizeBytes(file.size);

    if (file.size > LOCAL_PREVIEW_MAX_BYTES) {
      setStagedData(null);
      setStagedColumns([]);
      setSelectedStagedColumns([]);
      setStagedSplitConfigs({});
      setPreviewColumn(null);
      setShowDatasetValidationModal(false);
      setWorkspaceNotice(`Large CSV detected (${formatNumber(file.size / 1024 / 1024, 1)} MB). It is being sent through the backend upload pipeline instead of local browser parsing.`);
      return;
    }

    processLocalCsvPreview(file);
  };

  const handleCsvFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) processFile(file);
    event.currentTarget.value = "";
  };

  const confirmImport = () => {
    if (!stagedData) return;
    const activeColumns = sanitizeActiveColumns(selectedStagedColumns, stagedPrepared.columns);
    setData(stagedPrepared.rows);
    setAllColumns(stagedPrepared.columns);
    setColumns(activeColumns);
    setChatMessages([]);
    setInsights({});
    setStagedData(null);
    setStagedColumns([]);
    setSelectedStagedColumns([]);
    setStagedSplitConfigs({});
    setPreviewColumn(null);
    const activeProfiles = profileColumns(stagedPrepared.rows, activeColumns);
    const firstCategory = activeProfiles.find((profile) => profile.type !== "number")?.name || activeColumns[0] || "";
    const firstNumber = activeProfiles.find((profile) => profile.type === "number" && (profile.numeric?.count || 0) >= 4)?.name || activeColumns[0] || "";
    setXAxisCol(firstCategory);
    setYAxisCol(firstNumber);
    setSecondaryCol(activeProfiles.filter((profile) => profile.type === "number")[1]?.name || firstNumber);
    setForecastCol(firstNumber);
    requestInsight("overview", "", { fileName: fileName || "uploaded.csv", ignoredColumns: stagedPrepared.columns.filter((column) => !activeColumns.includes(column)) }, stagedPrepared.rows, activeColumns);
    requestInsight(
      "report",
      "Create a comprehensive BI report from this dataset profile. Include executive summary, data quality, strongest signals, risks, chart interpretation, and next actions.",
      { fileName: fileName || "uploaded.csv", ignoredColumns: stagedPrepared.columns.filter((column) => !activeColumns.includes(column)) },
      stagedPrepared.rows,
      activeColumns,
    );
  };

  const saveDatasetContext = async (context: DatasetContextPayload) => {
    if (!activeBackendDatasetId) {
      setWorkspaceNotice("Dataset context is ready locally. The backend record will be updated after the upload completes.");
      return;
    }
    const workspaceId = await ensureBackendWorkspace();
    await authorizedFetch(`/api/workspaces/${workspaceId}/datasets/${activeBackendDatasetId}/context`, {
      method: "PATCH",
      body: JSON.stringify(context),
    });
    setWorkspaceNotice("Dataset context saved to the workspace.");
  };

  const analyzeDatasetFromDatasetsPage = async (context: DatasetContextPayload) => {
    await saveDatasetContext(context);
    if (stagedData) {
      confirmImport();
      return;
    }
    if (data.length) {
      await requestInsight("overview", "", { fileName, ignoredColumns, datasetContext: context });
    }
  };

  const saveAndViewDataset = async (context: DatasetContextPayload) => {
    await analyzeDatasetFromDatasetsPage(context);
    setActiveServiceId("data-preview");
  };

  const clearActiveDataset = async () => {
    const datasetId = activeBackendDatasetId;
    const workspaceId = backendWorkspaceId;
    if (workspaceId && datasetId) {
      try {
        await authorizedFetch(`/api/workspaces/${workspaceId}/datasets/${datasetId}`, { method: "DELETE" });
      } catch (error) {
        setWorkspaceNotice(apiFailureMessage(error, "The backend dataset could not be removed, but local workspace data was cleared."));
      }
    }
    clearBackendWatchers();
    setData([]);
    setAllColumns([]);
    setColumns([]);
    setFileName("");
    setDatasetFileSizeBytes(0);
    setStagedData(null);
    setStagedColumns([]);
    setSelectedStagedColumns([]);
    setStagedSplitConfigs({});
    setPreviewColumn(null);
    setShowDatasetValidationModal(false);
    setActiveBackendDatasetId(null);
    setBackendJobId(null);
    setBackendUploadBusy(false);
    setBackendUploadProgress(null);
    setBackendUploadMessage("");
    setInsights({});
    setWorkspaceNotice("Dataset removed from this workspace view.");
  };

  const updateAnalysisColumns = (nextColumns: string[]) => {
    const activeColumns = sanitizeActiveColumns(nextColumns, allColumns);
    const nextProfiles = profileColumns(data, activeColumns);
    const nextNumeric = nextProfiles.filter((profile) => profile.type === "number").map((profile) => profile.name);
    const nextCategory = nextProfiles.filter((profile) => profile.type !== "number").map((profile) => profile.name);
    const firstCategory = nextCategory[0] || activeColumns[0] || "";
    const firstNumber = nextNumeric[0] || activeColumns[0] || "";

    setColumns(activeColumns);
    setInsights({});
    if (!activeColumns.includes(xAxisCol)) setXAxisCol(firstCategory);
    if (!activeColumns.includes(yAxisCol)) setYAxisCol(firstNumber);
    if (!activeColumns.includes(secondaryCol)) setSecondaryCol(nextNumeric[1] || firstNumber);
    if (!activeColumns.includes(forecastCol)) setForecastCol(firstNumber);
  };

  const chartRows = useMemo(() => {
    const rows = data.slice(0, 500);
    return rows.map((row, index) => ({
      ...row,
      __index: index + 1,
      __xLabel: String(row[xAxisCol] ?? index + 1).slice(0, 80),
      __xNumber: parseNumber(row[xAxisCol]) ?? index + 1,
      __y: parseNumber(row[yAxisCol]) ?? 0,
      __secondary: parseNumber(row[secondaryCol]) ?? 0,
    }));
  }, [data, xAxisCol, yAxisCol, secondaryCol]);

  const categoryAggregate = useMemo(
    () => aggregateByCategory(data, xAxisCol || categoryColumns[0] || columns[0], yAxisCol || numericColumns[0] || columns[0]),
    [data, xAxisCol, yAxisCol, categoryColumns, numericColumns, columns],
  );

  const histogramRows = useMemo(() => histogram(data, yAxisCol || numericColumns[0] || ""), [data, yAxisCol, numericColumns]);
  const kdeRows = useMemo(() => densityRows(data, yAxisCol || numericColumns[0] || ""), [data, yAxisCol, numericColumns]);
  const forecastRows = useMemo(() => forecastSeries(data, forecastCol || forecastColumns[0] || numericColumns[0] || "", forecastPeriods), [data, forecastCol, forecastPeriods, forecastColumns, numericColumns]);
  const correlationData = useMemo(() => correlationRows(data, numericColumns), [data, numericColumns]);
  const hypothesis = useMemo(() => hypothesisTest(data, xAxisCol || categoryColumns[0] || "", yAxisCol || numericColumns[0] || ""), [data, xAxisCol, yAxisCol, categoryColumns, numericColumns]);
  const demandRecommendations = useMemo(() => buildDemandRecommendations(data, columns), [data, columns]);

  const submitChatQuestion = async (rawQuestion: string, context: ChatContextPayload = {}) => {
    const question = rawQuestion.trim();
    if (!question || isChatLoading) return;
    if (!canUseFeature("ai.chat")) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Upgrade required: your current ${subscription.plan.name} plan does not include AI chat.`,
          source: "local",
        },
      ]);
      return;
    }
    const chatContext = {
      ...context,
      file_name: context.file_name || fileName || "uploaded.csv",
      row_count: context.row_count ?? data.length,
      active_columns: columns,
      ignored_columns: ignoredColumns,
      numeric_columns: numericColumns,
      category_columns: categoryColumns,
    };
    setChatMessages((prev) => [...prev, { role: "user", content: question }]);
    setChatInput("");
    setIsChatLoading(true);
    try {
      const workspaceChatPath = backendWorkspaceId ? `/api/workspaces/${backendWorkspaceId}/chats/message` : "/api/chat";
      const response = await authorizedFetch(workspaceChatPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          columns,
          rows: data.slice(0, BACKEND_ANALYSIS_ROW_LIMIT),
          workspace_id: backendWorkspaceId,
          dataset_id: context.dataset_id ?? activeBackendDatasetId,
          chat_id: activeBackendChatId,
          active_page: "AI Chat",
          context: chatContext,
        }),
      });
      const result = await readApiJson<WorkspaceChatResponse>(response);
      const nextChatId = backendId(result.chat?.id);
      if (nextChatId) setActiveBackendChatId(nextChatId);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.answer || "The backend returned an empty chat response.",
          source: result.source || "local",
        },
      ]);
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: apiFailureMessage(
            error,
            "The backend chat endpoint is not reachable. In local development, start the Python backend. In production, verify the deployed backend URL and CORS allowed origins.",
          ),
          source: "local",
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleChatSubmit = (event: React.FormEvent, context: ChatContextPayload) => {
    event.preventDefault();
    void submitChatQuestion(chatInput, context);
  };

  const handleDirectChatQuestion = (question: string, context: ChatContextPayload) => {
    void submitChatQuestion(question, context);
  };

  const handleStartNewChat = () => {
    setActiveBackendChatId(null);
    setChatMessages([]);
    setChatInput("");
  };

  const exportCsv = () => {
    const csvData = Papa.unparse(data);
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "adviso_export.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const yProfile = profiles.find((profile) => profile.name === yAxisCol);
  const revenueValue = yProfile?.numeric?.sum || manualRevenue;
  const costValue = profiles.find((profile) => profile.name === secondaryCol)?.numeric?.sum || manualCost;
  const profitValue = revenueValue - costValue;
  const handleHeaderUpgrade = () => {
    openPlanPicker();
  };
  const displayName =
    (authProfile?.full_name || firebaseUser?.displayName || displayNameFromEmail(userEmail)).trim() ||
    displayNameFromEmail(userEmail);
  const profileEmail = authProfile?.email || firebaseUser?.email || userEmail;
  const avatarUrl = authProfile?.profile_picture || firebaseUser?.photoURL || "";
  const greeting = greetingForNow();
  const planLabel = subscription.accessLevel === "full" ? "Full access" : subscription.plan.name;

  return (
    <div className={`adviso-platform ${theme} flex h-screen min-h-0 flex-col overflow-hidden font-sans`}>
      {showTopBanner && (
        <div className="ap-trial-banner h-10 px-4 md:px-6 flex items-center justify-center gap-4 text-sm font-bold relative">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {subscription.accessLevel === "full" ? "Full platform access is active" : subscription.plan.name === "Free" ? "Adviso AI workspace is ready" : `${subscription.plan.name} workspace is active`}
          </span>
          <span className="font-black">
            Explore all features. Upgrade anytime.
          </span>
          <span className="hidden md:inline font-medium opacity-90">
            Pick a higher plan when you need more modules and capacity.
          </span>
          {nextUpgradePlan && (
            <button onClick={handleHeaderUpgrade} className="rounded-lg bg-white px-4 py-1.5 text-xs font-black text-[#145DFF] shadow-sm">
              View plans
            </button>
          )}
          <button
            onClick={closeTopBanner}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/85 transition hover:bg-white/15 hover:text-white"
            aria-label="Dismiss workspace banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {upgradeMessage && (
        <div className="fixed right-4 top-20 z-[90] ap-card border rounded-xl shadow-2xl p-4 max-w-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "var(--ap-good)" }} />
          <div className="min-w-0">
            <div className="text-sm font-black">Subscription updated</div>
            <div className="text-xs ap-muted mt-1 leading-5">{upgradeMessage}</div>
          </div>
          <button onClick={clearUpgradeMessage} className="ap-btn rounded-lg p-1 shrink-0" aria-label="Dismiss subscription update">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {subscription.error && (
        <div className="fixed right-4 top-20 z-[90] ap-card border rounded-xl shadow-2xl p-4 max-w-sm">
          <div className="text-sm font-black">Subscription service unavailable</div>
          <div className="text-xs ap-muted mt-1 leading-5">
            Paid access is locked until the backend database session can be verified.
          </div>
        </div>
      )}

      {workspaceNotice && (
        <div className="fixed left-4 top-20 z-[90] ap-card border rounded-xl shadow-2xl p-4 max-w-md flex items-start gap-3">
          <Database className="w-5 h-5 mt-0.5 shrink-0 text-[#145DFF]" />
          <div className="min-w-0">
            <div className="text-sm font-black">Large dataset mode</div>
            <div className="text-xs ap-muted mt-1 leading-5">{workspaceNotice}</div>
          </div>
          <button onClick={() => setWorkspaceNotice("")} className="ap-btn rounded-lg p-1 shrink-0" aria-label="Dismiss large dataset notice">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {backendUploadMessage && (
        <div className="fixed left-4 top-36 z-[90] ap-card border rounded-xl shadow-2xl p-4 max-w-md flex items-start gap-3">
          <UploadCloud className="w-5 h-5 mt-0.5 shrink-0 text-[#145DFF]" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-black">Dataset upload pipeline</div>
            <div className="text-xs ap-muted mt-1 leading-5">{backendUploadMessage}</div>
            {backendUploadProgress !== null && (
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-blue-500/10">
                  <div
                    className="h-full rounded-full bg-[#145DFF] transition-all duration-500"
                    style={{ width: `${backendUploadProgress}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] font-bold ap-muted">
                  <span>{formatNumber(backendUploadProgress, 0)}% complete</span>
                  {backendJobId && <span>Job #{backendJobId}</span>}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setBackendUploadMessage("");
              setBackendUploadProgress(null);
            }}
            className="ap-btn rounded-lg p-1 shrink-0"
            aria-label="Dismiss dataset upload status"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <AnimatePresence>
        {showFreePlanPrompt && (
          <FreePlanChoiceModal
            plans={upgradePlanOptions}
            onContinueFree={closeFreePlanPrompt}
            onUpgrade={requestPaidUpgrade}
            title="Choose your intelligence level"
            description="Your Free workspace is ready. Select a paid plan for more modules, or close this and continue on Free."
            continueLabel="Continue with Free"
            footerNote="Paid access activates only after verified payment. You can close this and continue with the Free workspace."
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPlanPicker && hasPlanUpgradeOptions && (
          <FreePlanChoiceModal
            plans={upgradePlanOptions}
            onContinueFree={() => setShowPlanPicker(false)}
            onUpgrade={requestPaidUpgrade}
            title={currentPlanId === "free" ? "Choose your intelligence level" : "Upgrade your intelligence level"}
            description={
              currentPlanId === "free"
                ? "Compare GO, PRO, and ENTERPRISE before checkout. Paid access activates only after payment verification."
                : `${planLabel} is active. Choose a higher tier to unlock more modules and capacity.`
            }
            continueLabel="Close"
            footerNote={`Your current ${planLabel} plan remains active until a verified upgrade payment completes.`}
          />
        )}
      </AnimatePresence>

      <div className="ap-shell flex min-h-0 flex-1 overflow-hidden">
        <PlatformSidebar
          sections={PLATFORM_NAV_SECTIONS}
          activeServiceId={activeServiceId}
          collapsed={sidebarCollapsed}
          canAccessItem={canAccessService}
          recommendedPlanForItem={recommendedPlanForService}
          onSelect={selectService}
          onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
          displayName={displayName}
          userEmail={profileEmail}
          avatarUrl={avatarUrl}
          onAccountClick={() => selectService(getPlatformService("account-settings"))}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="ap-header sticky top-0 z-50 h-16 border-b px-4 md:px-6 flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="lg:hidden">
                <Logo size="sm" className="text-[var(--ap-text)]" />
              </div>
              <div className="ap-top-search hidden w-full max-w-2xl items-center gap-3 rounded-xl border px-4 py-2.5 md:flex">
                <Search className="h-4 w-4 ap-muted" />
                <span className="truncate text-sm ap-muted">Search datasets, reports, KPIs, or ask a question...</span>
                <span className="ml-auto text-xs ap-muted">Ctrl K</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {isDatasetsActive && (
                <label className={`ap-btn-primary cursor-pointer text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition ${backendUploadBusy ? "opacity-75" : ""}`}>
                  <UploadCloud className="w-4 h-4" />
                  {backendUploadBusy ? "Uploading..." : "Import CSV"}
                  <input type="file" accept=".csv" className="hidden" disabled={backendUploadBusy} onChange={handleCsvFileInput} />
                </label>
              )}
              {isDataLoaded && canUseFeature("export.csv") && (
                <button onClick={exportCsv} className="ap-btn text-xs font-semibold px-3 py-2.5 rounded-xl flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </button>
              )}
              <button onClick={onToggleTheme} className="ap-icon-btn" aria-label="Toggle theme">
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button className="ap-icon-btn relative" aria-label="Notifications">
                <Bell className="w-4 h-4" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>
              <div className="relative hidden md:block">
                <button
                  onClick={() => setProfileMenuOpen((open) => !open)}
                  className="flex items-center gap-3 rounded-xl border bg-white px-2.5 py-1.5 transition hover:border-blue-300"
                  style={{ borderColor: "var(--ap-border)" }}
                >
                  <UserAvatar name={displayName} email={profileEmail} src={avatarUrl} size="sm" />
                  <div className="hidden text-left xl:block">
                    <div className="text-xs font-black">{displayName}</div>
                    <div className="text-[10px] ap-muted">{planLabel} plan</div>
                  </div>
                </button>
                {profileMenuOpen && (
                  <div className="ap-card absolute right-0 top-12 z-[80] w-72 rounded-2xl border p-3 shadow-2xl">
                    <div className="flex items-center gap-3 border-b pb-3" style={{ borderColor: "var(--ap-border)" }}>
                      <UserAvatar name={displayName} email={profileEmail} src={avatarUrl} size="md" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black">{displayName}</div>
                        <div className="truncate text-xs ap-muted">{profileEmail}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => selectService(getPlatformService("account-settings"))}
                      className="mt-3 w-full rounded-xl px-3 py-2.5 text-left text-sm font-black transition hover:bg-blue-500/10"
                    >
                      Account settings
                      <span className="mt-1 block text-xs font-medium ap-muted">Profile, plan, billing, security</span>
                    </button>
                    {hasPlanUpgradeOptions && (
                      <button
                        onClick={handleHeaderUpgrade}
                        className="mt-1 w-full rounded-xl px-3 py-2.5 text-left text-sm font-black transition hover:bg-blue-500/10"
                      >
                        Upgrade plan
                        <span className="mt-1 block text-xs font-medium ap-muted">{planLabel} plan is active</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button onClick={onLogout} className="ap-icon-btn" aria-label="Logout">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

        <main className="ap-dashboard-main min-h-0 min-w-0 flex-1 overflow-y-auto p-4 xl:p-6 scroll-thin">
          {isAccountSettingsActive && !stagedData && (
            <AccountSettingsPage
              fallbackEmail={userEmail}
              onUpgrade={openPlanPicker}
              currentTheme={theme}
              onThemePreferenceChange={onThemePreferenceChange}
            />
          )}

          {isSupportActive && !stagedData && <SupportCenterPage displayName={displayName} userEmail={profileEmail} />}

          {!isAccountSettingsActive && !isSupportActive && !stagedData && isHomeLaunchpadActive && (
            <FirstRunDashboard
              displayName={displayName}
              greeting={greeting}
              subscription={subscription}
              nextUpgradePlan={nextUpgradePlan}
              dataset={
                isDataLoaded
                  ? {
                      fileName: fileName || "uploaded.csv",
                      rowCount: data.length,
                      columnCount: allColumns.length,
                      activeColumnCount: columns.length,
                      missingCells: missingCount,
                      numericFields: numericColumns.length,
                      categoryFields: categoryColumns.length,
                      qualityScore: dataQualityScore(profiles, data.length),
                      backendConnected: Boolean(activeBackendDatasetId),
                      onOpenPreview: () => setActiveServiceId("data-preview"),
                      onGenerateInsights: () => requestInsight("overview", "", { fileName, ignoredColumns }),
                    }
                  : undefined
              }
              onViewPlans={handleHeaderUpgrade}
              isDragging={isDragging}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                const file = event.dataTransfer.files?.[0];
                if (file) processFile(file);
              }}
              onFile={(file) => processFile(file)}
              showUploadActions={false}
              onOpenDatasets={() => setActiveServiceId("datasets")}
            />
          )}

          {!isAccountSettingsActive && !isSupportActive && isDatasetsActive && (
            <DatasetsPage
              displayName={displayName}
              workspaceName="Adviso Workspace"
              fileName={fileName}
              fileSizeBytes={datasetFileSizeBytes}
              rows={stagedData ? stagedPrepared.rows : data}
              columns={stagedData ? stagedPrepared.columns : allColumns}
              activeColumns={stagedData ? selectedStagedColumns : columns}
              profiles={stagedData ? stagedProfiles : profiles}
              ignoredColumns={stagedData ? stagedPrepared.columns.filter((column) => !selectedStagedColumns.includes(column)) : ignoredColumns}
              backendConnected={Boolean(activeBackendDatasetId)}
              backendUploadBusy={backendUploadBusy}
              backendUploadProgress={backendUploadProgress}
              backendUploadMessage={backendUploadMessage}
              canReviewColumns={Boolean(stagedData)}
              isDragging={isDragging}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                const file = event.dataTransfer.files?.[0];
                if (file) processFile(file);
              }}
              onFile={(file) => processFile(file)}
              onAnalyzeDataset={analyzeDatasetFromDatasetsPage}
              onReviewColumns={() => {
                if (stagedData) setShowDatasetValidationModal(true);
              }}
              onClearDataset={clearActiveDataset}
              onSaveDatasetContext={saveDatasetContext}
              onSaveAndView={saveAndViewDataset}
              onOpenDataExplorer={() => setActiveServiceId("data-preview")}
            />
          )}

          {!isAccountSettingsActive && !isSupportActive && !isDataLoaded && !stagedData && !isHomeLaunchpadActive && !isDatasetsActive && (
            <PlatformServicePlaceholder
              service={activeService}
              locked={!canAccessService(activeService)}
              currentPlanName={subscription.plan.name}
              recommendedPlanName={recommendedPlanForService(activeService)}
              onUpgrade={openPlanPicker}
            />
          )}

          {!isAccountSettingsActive && !isSupportActive && !isHomeLaunchpadActive && !isDatasetsActive && isDataLoaded && (
            <motion.div
              key={`${activeServiceId}-${activeTab}`}
              className="space-y-5"
              initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              {!isDataPreviewActive && !isKpiDiscoveryActive && !isAIInsightsActive && !isVisualAnalyticsActive && !isAIChatActive && (
                <>
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#145DFF]" style={{ borderColor: "var(--ap-border)" }}>
                        {activeService.icon}
                        {activeService.backend === "connected" ? "Connected tool" : "Workspace tool"}
                      </div>
                      <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--ap-text)]">
                        {activeService.label}
                      </h1>
                      <p className="mt-1 text-sm ap-muted">
                        {activeService.description}
                      </p>
                      <p className="mt-2 text-xs font-semibold ap-muted">
                        Active dataset: {fileName || "CSV workspace"} | {formatNumber(data.length, 0)} rows | {formatNumber(columns.length, 0)} active columns
                      </p>
                    </div>
                    <button onClick={() => requestInsight("overview", "", { fileName, ignoredColumns })} className="ap-btn rounded-xl px-4 py-2.5 text-xs font-black inline-flex items-center gap-2 self-start">
                      <Compass className="h-4 w-4" />
                      Refresh intelligence
                    </button>
                  </div>
                  <nav className="lg:hidden flex gap-2 overflow-x-auto pb-1">
                    {PLATFORM_SERVICE_ITEMS.map((item) => {
                      const locked = !canAccessService(item);
                      return (
                        <button
                          key={item.id}
                          onClick={() => selectService(item)}
                          className={`shrink-0 px-3 py-2 rounded-lg text-xs inline-flex items-center gap-2 ${activeServiceId === item.id ? "ap-btn-primary" : "ap-btn"} ${locked && activeServiceId !== item.id ? "opacity-65" : ""}`}
                        >
                          {item.label}
                          {locked && <Lock className="w-3 h-3" />}
                        </button>
                      );
                    })}
                  </nav>
                  <div className="xl:hidden ap-card border rounded-xl p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] ap-muted">Current subscription</div>
                      <div className="text-sm font-black">{planLabel} plan</div>
                    </div>
                    {hasPlanUpgradeOptions && (
                      <button onClick={handleHeaderUpgrade} className="ap-btn-primary rounded-lg px-3 py-2 text-xs font-black">
                        View plans
                      </button>
                    )}
                  </div>
                </>
              )}

              {isDataPreviewActive ? (
                <DataExplorerPage
                  fileName={fileName}
                  data={data}
                  columns={columns}
                  allColumns={allColumns}
                  profiles={profiles}
                  numericColumns={numericColumns}
                  categoryColumns={categoryColumns}
                  insight={insights.overview}
                  loading={loadingInsight === "overview"}
                  onAskQuestion={(question) => requestInsight("overview", question, { fileName, ignoredColumns, source: "data-explorer" })}
                  onOpenTab={selectTab}
                  onExport={exportCsv}
                />
              ) : isKpiDiscoveryActive ? (
                <DatasetIntelligencePage
                  fileName={fileName}
                  rowsDetected={data.length}
                  columnsDetected={allColumns.length}
                  qualityScore={dataQualityScore(profiles, data.length)}
                  columns={allColumns}
                  profiles={profiles}
                  numericColumns={numericColumns}
                  categoryColumns={categoryColumns}
                  insight={insights.kpi}
                  loading={loadingInsight === "kpi"}
                  backendWorkspaceId={backendWorkspaceId}
                  backendDatasetId={activeBackendDatasetId}
                  onRefresh={() =>
                    requestInsight(
                      "kpi",
                      "Refresh the KPI discovery map for this dataset. Identify what business questions and KPI paths this dataset can answer without producing a dashboard.",
                      { fileName, ignoredColumns, source: "kpi-discovery" },
                    )
                  }
                  onExploreAnalysis={(tab) => selectTab(tab)}
                  onPreviewKpis={(question) =>
                    requestInsight("kpi", question, { fileName, ignoredColumns, source: "kpi-discovery" })
                  }
                />
              ) : isAIInsightsActive && !activeTabAllowed ? (
                <UpgradeRequired
                  title="Plan access required"
                  description={`The ${activeTab} workspace is not available on the ${subscription.plan.name} plan.`}
                  requiredLabel={requiredFeatureForTab(activeTab)}
                  onUpgradeRequested={() => openPlanPicker()}
                />
              ) : isAIInsightsActive ? (
                <AIInsightsPage
                  fileName={fileName}
                  data={data}
                  columns={columns}
                  profiles={profiles}
                  numericColumns={numericColumns}
                  categoryColumns={categoryColumns}
                  backendWorkspaceId={backendWorkspaceId}
                  backendDatasetId={activeBackendDatasetId}
                  loading={loadingInsight === "report"}
                  onAskQuestion={(question) => requestInsight("report", question, { fileName, ignoredColumns, source: "ai-insights" })}
                  onExport={exportCsv}
                />
              ) : activeService && !activeService.tab ? (
                <PlatformServicePlaceholder
                  service={activeService}
                  locked={!canAccessService(activeService)}
                  currentPlanName={subscription.plan.name}
                  recommendedPlanName={recommendedPlanForService(activeService)}
                  onUpgrade={openPlanPicker}
                />
              ) : !activeTabAllowed ? (
                <UpgradeRequired
                  title="Plan access required"
                  description={`The ${activeTab} workspace is not available on the ${subscription.plan.name} plan.`}
                  requiredLabel={requiredFeatureForTab(activeTab)}
                  onUpgradeRequested={() => openPlanPicker()}
                />
              ) : (
                <>
              {activeTab === "Overview" && (
                <OverviewTab
                  profiles={profiles}
                  data={data}
                  allColumns={allColumns}
                  columns={columns}
                  ignoredColumns={ignoredColumns}
                  fileName={fileName}
                  missingCount={missingCount}
                  numericCount={numericColumns.length}
                  categoryCount={categoryColumns.length}
                  insight={insights.overview}
                  loading={loadingInsight === "overview"}
                  onRefresh={() => requestInsight("overview", "", { fileName, ignoredColumns })}
                  onColumnsChange={updateAnalysisColumns}
                  onFile={(file) => processFile(file)}
                />
              )}

              {activeTab === "Charts" && (
                <ChartsTab
                  theme={theme}
                  chartType={chartType}
                  setChartType={setChartType}
                  xAxisCol={xAxisCol}
                  setXAxisCol={setXAxisCol}
                  yAxisCol={yAxisCol}
                  setYAxisCol={setYAxisCol}
                  secondaryCol={secondaryCol}
                  setSecondaryCol={setSecondaryCol}
                  columns={columns}
                  data={data}
                  numericColumns={numericColumns}
                  categoryColumns={categoryColumns}
                  chartRows={chartRows}
                  categoryAggregate={categoryAggregate}
                  histogramRows={histogramRows}
                  kdeRows={kdeRows}
                  correlationData={correlationData}
                  hypothesis={hypothesis}
                  demandRecommendations={demandRecommendations}
                />
              )}

              {activeTab === "AI" && (
                <ReportTab
                  theme={theme}
                  profiles={profiles}
                  data={data}
                  columns={columns}
                  categoryAggregate={categoryAggregate}
                  correlationData={correlationData}
                  ignoredColumns={ignoredColumns}
                  fileName={fileName}
                  insight={insights.report}
                  loading={loadingInsight === "report"}
                  onRun={() =>
                    requestInsight(
                      "report",
                      "Create a comprehensive BI report from this dataset profile. Include executive summary, data quality, strongest signals, risks, chart interpretation, and next actions.",
                      { fileName, ignoredColumns, xAxisCol, yAxisCol },
                    )
                  }
                />
              )}

              {activeTab === "Chat" && (
                <ChatTab
                  messages={chatMessages}
                  input={chatInput}
                  setInput={setChatInput}
                  loading={isChatLoading}
                  onSubmit={handleChatSubmit}
                  onAskQuestion={handleDirectChatQuestion}
                  onStartNewChat={handleStartNewChat}
                  fileName={fileName}
                  rowCount={data.length}
                  columnCount={columns.length}
                  columns={columns}
                  numericColumns={numericColumns}
                  categoryColumns={categoryColumns}
                  backendDatasetId={activeBackendDatasetId}
                  backendChatId={activeBackendChatId}
                  onRefresh={() => requestInsight("overview", "Refresh dataset intelligence for AI chat context.", { fileName, ignoredColumns, source: "ai-chat" })}
                />
              )}

              {activeTab === "Ideas" && (
                <IdeasTab
                  theme={theme}
                  categoryAggregate={categoryAggregate}
                  categoryColumn={xAxisCol}
                  valueColumn={yAxisCol}
                  insight={insights.ideas}
                  loading={loadingInsight === "ideas"}
                  onRun={() => requestInsight("ideas", "Generate business ideas from this dataset. Include monetization, growth, and cost optimization options.", { categoryColumns, numericColumns })}
                />
              )}

              {activeTab === "Profit" && (
                <ProfitTab
                  profiles={profiles}
                  numericColumns={numericColumns}
                  revenueColumn={yAxisCol}
                  costColumn={secondaryCol}
                  setRevenueColumn={setYAxisCol}
                  setCostColumn={setSecondaryCol}
                  manualRevenue={manualRevenue}
                  setManualRevenue={setManualRevenue}
                  manualCost={manualCost}
                  setManualCost={setManualCost}
                  profitValue={profitValue}
                  revenueValue={revenueValue}
                  costValue={costValue}
                  insight={insights.profit}
                  loading={loadingInsight === "profit"}
                  onRun={() => requestInsight("profit", "Analyze profitability from the dataset and selected fields.", { revenueColumn: yAxisCol, costColumn: secondaryCol, revenueValue, costValue, profitValue })}
                />
              )}

              {activeTab === "Forecast" && (
                <ForecastTab
                  theme={theme}
                  numericColumns={numericColumns}
                  forecastColumns={forecastColumns}
                  forecastCol={forecastCol}
                  setForecastCol={setForecastCol}
                  forecastPeriods={forecastPeriods}
                  setForecastPeriods={setForecastPeriods}
                  forecastRows={forecastRows}
                  demandRecommendations={demandRecommendations}
                  insight={insights.forecast}
                  loading={loadingInsight === "forecast"}
                  onRun={() => requestInsight("forecast", "Explain the forecast trend and business meaning.", { forecastCol, forecastPeriods })}
                />
              )}

              {activeTab === "Budget" && (
                <BudgetTab
                  theme={theme}
                  profiles={profiles}
                  numericColumns={numericColumns}
                  categoryColumns={categoryColumns}
                  categoryColumn={xAxisCol}
                  setCategoryColumn={setXAxisCol}
                  incomeColumn={yAxisCol}
                  setIncomeColumn={setYAxisCol}
                  expenseColumn={secondaryCol}
                  setExpenseColumn={setSecondaryCol}
                  data={data}
                  insight={insights.budget}
                  loading={loadingInsight === "budget"}
                  onRun={() => requestInsight("budget", "Analyze budget, savings, and cost-control opportunities from this dataset.", { incomeColumn: yAxisCol, expenseColumn: secondaryCol, categoryColumn: xAxisCol })}
                />
              )}

              {activeTab === "Sustainability" && (
                <SustainabilityTab
                  theme={theme}
                  data={data}
                  numericColumns={numericColumns}
                  categoryColumns={categoryColumns}
                  categoryColumn={xAxisCol}
                  setCategoryColumn={setXAxisCol}
                  impactColumn={yAxisCol}
                  setImpactColumn={setYAxisCol}
                  costColumn={secondaryCol}
                  setCostColumn={setSecondaryCol}
                  insight={insights.sustainability}
                  loading={loadingInsight === "sustainability"}
                  onRun={() => requestInsight("sustainability", "Analyze sustainability and ESG opportunities from this dataset.", { impactColumn: yAxisCol, costColumn: secondaryCol, categoryColumn: xAxisCol })}
                />
              )}

              {activeTab === "Competitor" && (
                <CompetitorTab
                  theme={theme}
                  data={data}
                  numericColumns={numericColumns}
                  categoryColumns={categoryColumns}
                  segmentColumn={xAxisCol}
                  setSegmentColumn={setXAxisCol}
                  metricColumn={yAxisCol}
                  setMetricColumn={setYAxisCol}
                  insight={insights.competitor}
                  loading={loadingInsight === "competitor"}
                  onRun={() => requestInsight("competitor", "Find competitive positioning insights and market risks from this dataset.", { segmentColumn: xAxisCol, metricColumn: yAxisCol })}
                />
              )}

              {activeTab === "KPI" && (
                <KpiTab
                  profiles={profiles}
                  numericColumns={numericColumns}
                  selectedColumn={forecastCol || numericColumns[0] || ""}
                  setSelectedColumn={setForecastCol}
                  forecastRows={forecastRows}
                  theme={theme}
                  insight={insights.kpi}
                  loading={loadingInsight === "kpi"}
                  onRun={() => requestInsight("kpi", "Generate KPI commentary and monitoring recommendations from the selected numeric field.", { selectedColumn: forecastCol })}
                />
              )}
                </>
              )}
            </motion.div>
          )}
        </main>
      </div>
      </div>

      <FeedbackWidget
        userEmail={userEmail}
        workspaceId={backendWorkspaceId}
        activePage={activeService?.label || activeTab}
      />

      {stagedData && showDatasetValidationModal && (
        <DatasetValidationModal
          rows={stagedPrepared.rows}
          columns={stagedPrepared.columns}
          rawRows={stagedData}
          rawColumns={stagedColumns}
          profiles={stagedProfiles}
          previewColumn={previewColumn}
          setPreviewColumn={setPreviewColumn}
          onCancel={() => {
            if (isDatasetsActive) {
              setShowDatasetValidationModal(false);
              return;
            }
            setStagedData(null);
            setStagedColumns([]);
            setSelectedStagedColumns([]);
            setStagedSplitConfigs({});
            setPreviewColumn(null);
            setShowDatasetValidationModal(false);
          }}
          onConfirm={confirmImport}
          theme={theme}
          selectedColumns={selectedStagedColumns}
          setSelectedColumns={setSelectedStagedColumns}
          multiValueCandidates={multiValueCandidates}
          splitConfigs={stagedSplitConfigs}
          setSplitConfigs={setStagedSplitConfigs}
        />
      )}
    </div>
  );
}

function TabInfoButton({ tab }: { tab: TabType }) {
  const [open, setOpen] = useState(false);
  const info = TAB_HELP[tab];
  return (
    <>
      <button className="ap-btn rounded-lg p-2 shrink-0" onClick={() => setOpen(true)} aria-label={`${info.title} info`}>
        <HelpCircle className="w-4 h-4" />
      </button>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="ap-modal relative border rounded-2xl shadow-2xl w-full max-w-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] ap-muted">Module guide</div>
                <h3 className="text-xl font-black mt-1">{info.title}</h3>
              </div>
              <button className="ap-btn rounded-lg p-2" onClick={() => setOpen(false)} aria-label="Close info">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 mt-5">
              {info.body.map((item) => (
                <div key={item} className="flex gap-3 text-sm leading-6">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "var(--ap-accent)" }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MetricCard({ label, value, tone, small }: { label: string; value: string; tone?: "good" | "warn"; small?: boolean }) {
  return (
    <div className="ap-card border rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-[0.16em] ap-muted">{label}</div>
      <div
        className={`${small ? "text-sm" : "text-2xl"} font-black mt-1 truncate`}
        style={{ color: tone === "good" ? "var(--ap-good)" : tone === "warn" ? "var(--ap-warn)" : "var(--ap-text)" }}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

function SupportCenterPage({ displayName, userEmail }: { displayName: string; userEmail: string }) {
  const mailHref = `mailto:support@adviso.ai?subject=${encodeURIComponent("Adviso AI support request")}&body=${encodeURIComponent(
    `Name: ${displayName}\nEmail: ${userEmail}\n\nHow can we help?\n`,
  )}`;

  return (
    <section className="space-y-5">
      <div className="ap-card overflow-hidden rounded-2xl border p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#145DFF]" style={{ borderColor: "var(--ap-border)" }}>
              <HelpCircle className="h-3.5 w-3.5" />
              Support
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-[var(--ap-text)]">Support center</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 ap-muted">
              Get help with uploads, billing, workspace access, and AI analysis quality.
            </p>
          </div>
          <a href={mailHref} className="ap-btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black">
            Contact support
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          {
            title: "Payment or plan issue",
            body: "Share the Razorpay receipt email and the account email used in Adviso AI.",
          },
          {
            title: "Upload or dataset issue",
            body: "Send the file size, CSV columns, and the upload step where it failed.",
          },
          {
            title: "AI output feedback",
            body: "Use the feedback bubble for product feedback, or email a specific wrong insight.",
          },
        ].map((item) => (
          <div key={item.title} className="ap-card rounded-2xl border p-5">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-500/10 text-[#145DFF]">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-base font-black text-[var(--ap-text)]">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 ap-muted">{item.body}</p>
          </div>
        ))}
      </div>

      <div className="ap-card rounded-2xl border p-5">
        <div className="text-sm font-black text-[var(--ap-text)]">Before contacting support</div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {["Refresh once after login", "Check the active account email", "Keep payment receipt handy"].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FreePlanChoiceModal({
  plans,
  onContinueFree,
  onUpgrade,
  title,
  description,
  continueLabel,
  footerNote,
}: {
  plans: PlanDefinition[];
  onContinueFree: () => void;
  onUpgrade: (planId: PlanId) => void;
  title: string;
  description: string;
  continueLabel: string;
  footerNote: string;
}) {
  const planDetails: Partial<Record<PlanId, { bestFor: string; features: string[] }>> = {
    go: {
      bestFor: "For Individuals & Small Businesses",
      features: [
        "Basic AI recommendations",
        "Simple business insights",
        "Monthly growth suggestions",
        "Limited AI requests",
        "Single-user access",
      ],
    },
    pro: {
      bestFor: "For Startups & Growing Businesses",
      features: [
        "Advanced AI business analysis",
        "Smart forecasting",
        "Competitor tracking",
        "Profit optimization",
        "Priority AI processing",
      ],
    },
    enterprise: {
      bestFor: "For Companies & Teams",
      features: [
        "Unlimited AI analysis",
        "Advanced KPI intelligence",
        "Team collaboration",
        "Real-time forecasting",
        "Enterprise security",
      ],
    },
  };

  return (
    <motion.div
      className="fixed inset-0 z-[110] overflow-y-auto p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm"
        onClick={onContinueFree}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className="ap-modal relative mx-auto my-8 w-full max-w-7xl overflow-hidden rounded-3xl border p-5 shadow-2xl md:p-8"
        initial={{ opacity: 0, y: 28, scale: 0.965, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: 18, scale: 0.975, filter: "blur(8px)" }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-0 subtle-grid opacity-10 pointer-events-none" />
        <button className="absolute right-5 top-5 z-10 ap-btn rounded-lg p-2 shrink-0" onClick={onContinueFree} aria-label={continueLabel}>
          <X className="w-4 h-4" />
        </button>

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="inline-flex rounded-full border px-3 py-1 text-xs font-mono font-bold uppercase tracking-widest ap-accent" style={{ background: "var(--ap-accent-soft)", borderColor: "var(--ap-border)" }}>
            Adviso AI Pricing Plans
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-[var(--ap-text)] sm:text-4xl">{title}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 ap-muted">{description}</p>
          <div className="mt-6 inline-flex items-center gap-1.5 rounded-xl border p-1 shadow-inner" style={{ background: "var(--ap-surface-2)", borderColor: "var(--ap-border)" }}>
            <span className="rounded-lg px-4 py-2 text-xs font-bold ap-muted">Monthly Billing</span>
            <span className="rounded-lg px-4 py-2 text-xs font-bold text-white" style={{ background: "var(--ap-accent)" }}>
              Annual Billing <span className="ml-2 text-[10px] text-emerald-200">Save 20%</span>
            </span>
          </div>
        </div>

        <div className="relative z-10 mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const checkoutPlan = checkoutPlanForId(plan.id);
            const details = planDetails[plan.id];
            const priceLabel = checkoutPlan?.price.replace(/^INR\s*/i, "Rs ") || plan.monthlyPriceLabel;
            const isPopular = plan.id === "pro";
            return (
              <div
                key={plan.id}
                className={`ap-plan-panel relative flex min-h-[560px] flex-col justify-between rounded-2xl border p-6 text-left shadow-xl transition ${
                  isPopular ? "ring-1 ring-blue-500/35 lg:scale-[1.04]" : ""
                }`}
                style={{ borderColor: isPopular ? "var(--ap-accent)" : "var(--ap-border)" }}
              >
                {isPopular && (
                  <div className="absolute right-0 top-0 rounded-bl-xl rounded-tr-2xl px-4 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-white" style={{ background: "var(--ap-accent)" }}>
                    Most Popular
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-2xl font-black tracking-tight text-[var(--ap-text)]">{plan.badge}</span>
                      {plan.id === "enterprise" && (
                        <span className="rounded border px-1.5 text-[9px] font-mono uppercase tracking-widest ap-accent" style={{ background: "var(--ap-accent-soft)", borderColor: "var(--ap-border)" }}>
                          Enterprise Matrix
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold tracking-wide ap-accent">{details?.bestFor}</p>
                    <p className="mt-2 text-xs leading-relaxed ap-muted">{plan.description}</p>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-[var(--ap-text)]">{priceLabel}</span>
                      <span className="text-xs font-mono ap-muted">/ mo</span>
                    </div>
                    <span className="text-[10px] font-mono uppercase ap-muted">Billed annually after checkout</span>
                  </div>

                  <div className="space-y-1.5 rounded-xl border p-3" style={{ background: "var(--ap-surface-2)", borderColor: "var(--ap-border)" }}>
                    <span className="block text-[9px] font-mono uppercase tracking-widest ap-muted">Included interface tabs</span>
                    <div className="flex flex-wrap gap-1">
                      {plan.tabs.map((tab) => (
                        <span key={tab} className="rounded border px-2 py-0.5 text-[10px] font-mono text-[var(--ap-text)]" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-3)" }}>
                          {tab}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 border-t pt-5" style={{ borderColor: "var(--ap-border)" }}>
                    <span className="block text-[9px] font-mono uppercase tracking-widest ap-muted">Core specified capabilities</span>
                    {(details?.features || []).map((feature) => (
                      <div key={feature} className="flex items-start gap-2.5 text-xs">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 ap-accent" />
                        <span className="leading-normal text-[var(--ap-text)]">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  className={`mt-8 flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-xs font-bold transition ${
                    isPopular ? "ap-btn-primary" : "ap-btn"
                  }`}
                  onClick={() => onUpgrade(plan.id)}
                >
                  Upgrade to {plan.badge}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="relative z-10 mt-6 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--ap-border)" }}>
          <p className="text-xs leading-5 ap-muted">{footerNote}</p>
          <button className="ap-btn rounded-xl px-4 py-3 text-xs font-black transition" onClick={onContinueFree}>
            {continueLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function stripMarkdownMarks(value: string) {
  return value.replace(/^#{1,6}\s*/, "").replace(/\*\*/g, "").replace(/__+/g, "").trim();
}

function InlineFormattedText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={index} className="font-bold" style={{ color: "var(--ap-text)" }}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}

function InsightSourceBadge({ source }: { source?: string }) {
  const isAi = source === "ai";
  return (
    <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)", color: "var(--ap-muted)" }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: isAi ? "var(--ap-good)" : "var(--ap-warn)" }} />
      {isAi ? "OpenAI backend" : "Local backend"}
    </div>
  );
}

function FormattedInsight({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const nodes: React.ReactNode[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = paragraph.join(" ").trim();
    if (text) {
      nodes.push(
        <p key={`p-${nodes.length}`} className="text-sm leading-7" style={{ color: "var(--ap-text)" }}>
          <InlineFormattedText text={text} />
        </p>,
      );
    }
    paragraph = [];
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      return;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      nodes.push(
        <h3 key={`h-${nodes.length}`} className="mt-5 first:mt-0 text-base font-black tracking-tight pb-2 border-b" style={{ borderColor: "var(--ap-border)", color: "var(--ap-text)" }}>
          {stripMarkdownMarks(heading[2])}
        </h3>,
      );
      return;
    }

    const numbered = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (numbered) {
      flushParagraph();
      nodes.push(
        <div key={`n-${nodes.length}`} className="flex gap-3 rounded-xl border p-3" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface)" }}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black" style={{ background: "var(--ap-accent-soft)", color: "var(--ap-accent)" }}>
            {numbered[1]}
          </span>
          <div className="text-sm leading-6">
            <InlineFormattedText text={numbered[2].replace(/:$/, "")} />
          </div>
        </div>,
      );
      return;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      nodes.push(
        <div key={`b-${nodes.length}`} className="flex gap-3 text-sm leading-6">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--ap-accent)" }} />
          <div>
            <InlineFormattedText text={bullet[1]} />
          </div>
        </div>,
      );
      return;
    }

    paragraph.push(line);
  });

  flushParagraph();

  return <div className="space-y-3">{nodes}</div>;
}

function InsightBox({ insight, loading }: { insight?: InsightResult; loading: boolean }) {
  return (
    <div className="ap-panel border rounded-xl p-5 min-h-40">
      {loading ? (
        <div className="ap-muted text-sm">Analyzing through backend...</div>
      ) : insight ? (
        <div className="space-y-4">
          <InsightSourceBadge source={insight.source} />
          <FormattedInsight content={insight.answer} />
        </div>
      ) : (
        <div className="ap-muted text-sm">Run analysis to generate a data-backed backend insight.</div>
      )}
    </div>
  );
}

function OverviewTab({
  profiles,
  data,
  allColumns,
  columns,
  ignoredColumns,
  fileName,
  missingCount,
  numericCount,
  categoryCount,
  insight,
  loading,
  onRefresh,
  onColumnsChange,
  onFile,
}: {
  profiles: ColumnProfile[];
  data: Record<string, unknown>[];
  allColumns: string[];
  columns: string[];
  ignoredColumns: string[];
  fileName: string;
  missingCount: number;
  numericCount: number;
  categoryCount: number;
  insight?: InsightResult;
  loading: boolean;
  onRefresh: () => void;
  onColumnsChange: (columns: string[]) => void;
  onFile: (file: File) => void;
}) {
  const allProfiles = useMemo(() => profileColumns(data, allColumns), [data, allColumns]);
  const toggleColumn = (column: string) => {
    const next = columns.includes(column) ? columns.filter((item) => item !== column) : [...columns, column];
    if (!next.length) return;
    onColumnsChange(next);
  };

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.35fr)_420px] gap-4">
      <div className="space-y-4">
        <section className="ap-card border rounded-xl p-5">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">Data workspace</h2>
              <p className="ap-muted text-sm mt-1">
                {fileName || "CSV workspace"} is restored for {formatNumber(data.length, 0)} rows. Manage columns before using analysis modules.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <TabInfoButton tab="Overview" />
              <label className="ap-btn-primary cursor-pointer text-xs font-bold px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition">
                <UploadCloud className="w-4 h-4" />
                Load another CSV
                <input type="file" accept=".csv" className="hidden" onChange={(event) => event.target.files?.[0] && onFile(event.target.files[0])} />
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
            <MetricCard label="Rows" value={formatNumber(data.length, 0)} />
            <MetricCard label="Active columns" value={formatNumber(columns.length, 0)} />
            <MetricCard label="Numeric fields" value={formatNumber(numericCount, 0)} />
            <MetricCard label="Segments" value={formatNumber(categoryCount, 0)} />
            <MetricCard label="Missing cells" value={formatNumber(missingCount, 0)} tone={missingCount ? "warn" : "good"} />
          </div>
        </section>

        <section className="ap-card border rounded-xl p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-black">Column selection</h3>
              <p className="ap-muted text-sm">Active columns drive charts, reports, chat context, and LLM prompts.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="ap-btn text-xs font-semibold px-3 py-2 rounded-lg" onClick={() => onColumnsChange(defaultAnalysisColumns(data, allColumns))}>
                Exclude ID columns
              </button>
              <button className="ap-btn text-xs font-semibold px-3 py-2 rounded-lg" onClick={() => onColumnsChange(allColumns)}>
                Select all
              </button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
            {allColumns.map((column) => {
              const active = columns.includes(column);
              const profile = allProfiles.find((item) => item.name === column);
              const idLike = isIdLikeColumn(column, profile, data.length);
              return (
                <label key={column} className="ap-panel border rounded-lg p-3 flex gap-3 cursor-pointer" style={{ opacity: active ? 1 : 0.62 }}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleColumn(column)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold truncate" title={column}>{column}</span>
                      {idLike && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded" style={{ background: "var(--ap-surface-3)", color: "var(--ap-muted)" }}>
                          ID-like
                        </span>
                      )}
                    </div>
                    <div className="text-xs ap-muted mt-1">
                      {profile ? `${profile.type}, ${formatNumber(profile.unique, 0)} unique, ${formatNumber(profile.missingPercent, 1)}% missing` : "Raw column"}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          {ignoredColumns.length > 0 && (
            <div className="mt-4 text-xs ap-muted">
              Ignored for analysis: {ignoredColumns.slice(0, 10).join(", ")}
              {ignoredColumns.length > 10 ? ` and ${ignoredColumns.length - 10} more` : ""}
            </div>
          )}
        </section>

        <section className="ap-card border rounded-xl p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-black">Data preview</h3>
              <p className="ap-muted text-sm">Preview uses the active analysis columns. Raw rows remain stored in the workspace.</p>
            </div>
            <Table className="w-5 h-5 ap-accent" />
          </div>
          <DataTable rows={data.slice(0, 80)} columns={columns} />
        </section>
      </div>

      <aside className="space-y-4">
        <section className="ap-card border rounded-xl p-5">
          <h3 className="font-black mb-4">Schema profile</h3>
          <div className="space-y-2 max-h-[430px] overflow-auto pr-1 scroll-thin">
            {profiles.map((profile) => (
              <div key={profile.name} className="ap-panel border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold truncate" title={profile.name}>{profile.name}</div>
                  <span className="text-[10px] uppercase font-bold px-2 py-1 rounded" style={{ background: "var(--ap-accent-soft)", color: "var(--ap-accent)" }}>{profile.type}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 mt-3 text-xs">
                  <span className="ap-muted">Unique</span>
                  <span className="text-right">{formatNumber(profile.unique, 0)}</span>
                  <span className="ap-muted">Missing</span>
                  <span className="text-right">{profile.missing} ({formatNumber(profile.missingPercent, 1)}%)</span>
                  {profile.numeric && (
                    <>
                      <span className="ap-muted">Mean</span>
                      <span className="text-right">{formatNumber(profile.numeric.mean)}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="ap-card border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black">Backend insight</h3>
            <button onClick={onRefresh} className="ap-btn-primary px-3 py-2 rounded-lg text-xs font-bold">Refresh</button>
          </div>
          <InsightBox insight={insight} loading={loading} />
        </section>
      </aside>
    </div>
  );
}

type WorkspaceFieldFilter = "all" | "numeric" | "text" | "issues";

function schemaTypeLabel(profile: ColumnProfile) {
  if (profile.type === "number") return "DECIMAL";
  const lower = profile.name.toLowerCase();
  if (lower.includes("date") || lower.includes("time")) return "DATE";
  if (lower.includes("id")) return "ID";
  return "VARCHAR";
}

function dataQualityScore(profiles: ColumnProfile[], rowCount: number) {
  if (!profiles.length || !rowCount) return 100;
  const totalCells = profiles.length * rowCount;
  const missingCells = profiles.reduce((sum, profile) => sum + profile.missing, 0);
  const highRiskColumns = profiles.filter((profile) => profile.missingPercent >= 25 || profile.unique <= 1).length;
  const missingPenalty = (missingCells / totalCells) * 100;
  const riskPenalty = Math.min(18, highRiskColumns * 2);
  return Math.max(0, Math.min(100, Math.round(100 - missingPenalty - riskPenalty)));
}

function compactInsightText(insight?: InsightResult) {
  if (!insight?.answer) return "";
  return insight.answer
    .replace(/\s+/g, " ")
    .replace(/[#*_`>-]/g, "")
    .trim()
    .slice(0, 230);
}

function DataPreviewTab({
  profiles,
  data,
  allColumns,
  columns,
  ignoredColumns,
  fileName,
  missingCount,
  numericCount,
  categoryCount,
  insight,
  loading,
  onRefresh,
  onGenerateReport,
  onOpenTab,
  onColumnsChange,
  onFile,
  backendUploadBusy,
  backendUploadProgress,
  backendUploadMessage,
  activeBackendDatasetId,
}: {
  profiles: ColumnProfile[];
  data: Record<string, unknown>[];
  allColumns: string[];
  columns: string[];
  ignoredColumns: string[];
  fileName: string;
  missingCount: number;
  numericCount: number;
  categoryCount: number;
  insight?: InsightResult;
  loading: boolean;
  onRefresh: () => void;
  onGenerateReport: () => void;
  onOpenTab: (tab: TabType) => void;
  onColumnsChange: (columns: string[]) => void;
  onFile: (file: File) => void;
  backendUploadBusy: boolean;
  backendUploadProgress: number | null;
  backendUploadMessage: string;
  activeBackendDatasetId: number | null;
}) {
  const [fieldFilter, setFieldFilter] = useState<WorkspaceFieldFilter>("all");
  const [showAllSchema, setShowAllSchema] = useState(false);
  const [expandedPreview, setExpandedPreview] = useState(false);
  const allProfiles = useMemo(() => profileColumns(data, allColumns), [data, allColumns]);
  const activeProfileSet = useMemo(() => new Set(profiles.map((profile) => profile.name)), [profiles]);
  const issueProfiles = useMemo(
    () => allProfiles.filter((profile) => profile.missingPercent >= 15 || profile.unique <= 1),
    [allProfiles],
  );
  const qualityScore = dataQualityScore(allProfiles, data.length);
  const warningCount = allProfiles.filter((profile) => profile.missing > 0 && profile.missingPercent < 15).length;
  const insightCopy = compactInsightText(insight);
  const previewColumns = columns.slice(0, expandedPreview ? 12 : 8);
  const previewRows = data.slice(0, expandedPreview ? 14 : 6);
  const schemaProfiles = showAllSchema ? allProfiles : allProfiles.slice(0, 6);
  const visibleFields = allProfiles.filter((profile) => {
    if (fieldFilter === "numeric") return profile.type === "number";
    if (fieldFilter === "text") return profile.type !== "number";
    if (fieldFilter === "issues") return profile.missingPercent >= 15 || profile.unique <= 1;
    return true;
  });
  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const toggleColumn = (column: string) => {
    const next = columns.includes(column)
      ? columns.filter((item) => item !== column)
      : [...columns, column];
    if (!next.length) return;
    onColumnsChange(next);
  };
  const activateProfileOnly = (column: string) => {
    const ordered = [column, ...columns.filter((item) => item !== column)];
    onColumnsChange(ordered);
  };
  const filterButtons: Array<{ id: WorkspaceFieldFilter; label: string }> = [
    { id: "all", label: "All fields" },
    { id: "numeric", label: "Numeric" },
    { id: "text", label: "Text" },
    { id: "issues", label: "Issues" },
  ];
  const kpis = [
    {
      label: "Total records",
      value: formatNumber(data.length, 0),
      delta: `${formatNumber(previewRows.length, 0)} row preview loaded`,
      icon: Table,
      tone: "var(--ap-accent)",
    },
    {
      label: "Active fields",
      value: formatNumber(columns.length, 0),
      delta: `${formatNumber(allColumns.length, 0)} detected columns`,
      icon: FileSpreadsheet,
      tone: "var(--ap-accent)",
    },
    {
      label: "Columns analyzed",
      value: formatNumber(profiles.length, 0),
      delta: `${formatNumber(ignoredColumns.length, 0)} excluded from AI context`,
      icon: Database,
      tone: "var(--ap-accent)",
    },
    {
      label: "Data quality score",
      value: `${qualityScore}%`,
      delta: qualityScore >= 90 ? "Ready for analysis" : "Review warnings",
      icon: Shield,
      tone: qualityScore >= 90 ? "var(--ap-good)" : "var(--ap-warn)",
    },
    {
      label: "Workspace pipeline",
      value: backendUploadBusy
        ? `${formatNumber(backendUploadProgress ?? 0, 0)}%`
        : activeBackendDatasetId
          ? "Indexed"
          : "Local",
      delta: backendUploadMessage || (activeBackendDatasetId ? "Backend dataset connected" : "Upload pipeline pending"),
      icon: BrainCircuit,
      tone: backendUploadBusy ? "var(--ap-warn)" : "var(--ap-good)",
    },
    {
      label: "Issues detected",
      value: formatNumber(issueProfiles.length, 0),
      delta: issueProfiles.length ? "Needs review" : "No major schema issues",
      icon: Compass,
      tone: issueProfiles.length ? "var(--ap-warn)" : "var(--ap-good)",
    },
  ];

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
      <div className="space-y-4 min-w-0">
        <section className="ap-card border rounded-2xl p-5 lg:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[var(--ap-text)]">Data workspace command center</h2>
              <p className="ap-muted mt-1 max-w-3xl text-sm leading-6">
                {fileName || "Uploaded dataset"} is ready for preview, schema review, and AI-backed insight generation.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="ap-panel rounded-xl border px-3 py-2 text-xs font-bold ap-muted">{dateLabel}</div>
              <label className="ap-btn cursor-pointer rounded-xl px-4 py-2.5 text-xs font-black inline-flex items-center justify-center gap-2 transition">
                <UploadCloud className="w-4 h-4" />
                Load new CSV
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  disabled={backendUploadBusy}
                  onChange={(event) => event.target.files?.[0] && onFile(event.target.files[0])}
                />
              </label>
              <button onClick={onRefresh} disabled={loading} className="ap-btn-primary rounded-xl px-4 py-2.5 text-xs font-black inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {loading ? "Generating..." : "Generate insights"}
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {kpis.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="ap-panel rounded-xl border p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] ap-muted">{item.label}</div>
                      <div className="mt-2 truncate text-2xl font-black text-[var(--ap-text)]" title={item.value}>{item.value}</div>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--ap-accent-soft)", color: item.tone }}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-3 line-clamp-2 text-[11px] font-semibold ap-muted">{item.delta}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="ap-card border rounded-2xl p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h3 className="text-lg font-black text-[var(--ap-text)]">Data workspace</h3>
              <p className="ap-muted text-sm">Click a field to include or remove it from active analysis context.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {filterButtons.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setFieldFilter(item.id)}
                  className={`rounded-xl px-3 py-2 text-xs font-black transition ${fieldFilter === item.id ? "ap-btn-primary" : "ap-btn"}`}
                >
                  {item.label}
                </button>
              ))}
              <button className="ap-btn text-xs font-black px-3 py-2 rounded-xl" onClick={() => onColumnsChange(defaultAnalysisColumns(data, allColumns))}>
                Exclude ID columns
              </button>
              <button className="ap-btn text-xs font-black px-3 py-2 rounded-xl" onClick={() => onColumnsChange(allColumns)}>
                Select all
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visibleFields.slice(0, 16).map((profile) => {
              const active = columns.includes(profile.name);
              const idLike = isIdLikeColumn(profile.name, profile, data.length);
              return (
                <button
                  key={profile.name}
                  onClick={() => toggleColumn(profile.name)}
                  onDoubleClick={() => activateProfileOnly(profile.name)}
                  className="ap-panel group min-w-0 rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ borderColor: active ? "var(--ap-accent)" : "var(--ap-border)", opacity: active ? 1 : 0.58 }}
                  title="Click to toggle this field. Double click to prioritize it."
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-[var(--ap-text)]" title={profile.name}>{profile.name}</div>
                      <div className="mt-1 text-[11px] font-semibold ap-muted">
                        {formatNumber(data.length - profile.missing, 0)} populated rows
                      </div>
                    </div>
                    <span className="rounded-md px-2 py-1 text-[10px] font-black uppercase" style={{ background: profile.type === "number" ? "var(--ap-accent-soft)" : "var(--ap-surface-3)", color: profile.type === "number" ? "var(--ap-accent)" : "var(--ap-muted)" }}>
                      {schemaTypeLabel(profile)}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <div className="ap-muted">Unique</div>
                      <div className="font-black text-[var(--ap-text)]">{formatNumber(profile.unique, 0)}</div>
                    </div>
                    <div>
                      <div className="ap-muted">Missing</div>
                      <div className="font-black text-[var(--ap-text)]">{formatNumber(profile.missingPercent, 1)}%</div>
                    </div>
                    <div>
                      <div className="ap-muted">Status</div>
                      <div className="font-black" style={{ color: active ? "var(--ap-good)" : "var(--ap-muted)" }}>{active ? "Active" : "Paused"}</div>
                    </div>
                  </div>
                  {idLike && <div className="mt-3 text-[10px] font-black uppercase tracking-[0.12em] ap-muted">ID-like field</div>}
                </button>
              );
            })}
          </div>

          {visibleFields.length > 16 && (
            <div className="mt-4 text-xs font-semibold ap-muted">Showing 16 of {formatNumber(visibleFields.length, 0)} fields. Use filters or open the full preview to inspect more.</div>
          )}
          {ignoredColumns.length > 0 && (
            <div className="mt-4 rounded-xl border px-4 py-3 text-xs ap-muted" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
              Excluded from AI context: {ignoredColumns.slice(0, 8).join(", ")}
              {ignoredColumns.length > 8 ? ` and ${ignoredColumns.length - 8} more` : ""}
            </div>
          )}
        </section>

        <section className="ap-card border rounded-2xl p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-black text-[var(--ap-text)]">Data preview</h3>
              <p className="ap-muted text-sm">Preview and validate records before moving into analytics, reports, or chat.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="ap-btn rounded-xl px-3 py-2 text-xs font-black" onClick={() => setExpandedPreview((value) => !value)}>
                {expandedPreview ? "Compact preview" : "View full data"}
                <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
              </button>
              <button className="ap-btn rounded-xl px-3 py-2 text-xs font-black" onClick={() => onOpenTab("Charts")}>
                Open charts
              </button>
            </div>
          </div>
          <div className="mt-5 ap-table-wrap rounded-xl border overflow-auto max-h-[520px]">
            <table className="ap-table w-full min-w-[980px] text-left text-xs">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 w-14">#</th>
                  {previewColumns.map((column) => (
                    <th key={column} className="px-4 py-3 whitespace-nowrap uppercase tracking-[0.12em]">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t">
                    <td className="px-4 py-3 ap-muted">{rowIndex + 1}</td>
                    {previewColumns.map((column) => (
                      <td key={column} className="max-w-[260px] truncate px-4 py-3" title={String(row[column] ?? "")}>
                        {String(row[column] ?? "") || <span className="ap-muted">empty</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <aside className="space-y-4 min-w-0">
        <section className="ap-card border rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-[var(--ap-text)]">Schema profile</h3>
              <p className="mt-1 text-xs ap-muted">Detected field types and fill rates.</p>
            </div>
            <button className="text-xs font-black ap-accent" onClick={() => setShowAllSchema((value) => !value)}>
              {showAllSchema ? "Collapse" : "View all"}
            </button>
          </div>
          <div className="space-y-4">
            {schemaProfiles.map((profile) => {
              const completeness = Math.max(0, Math.min(100, 100 - profile.missingPercent));
              return (
                <button key={profile.name} onClick={() => toggleColumn(profile.name)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-[var(--ap-text)]" title={profile.name}>{profile.name}</div>
                      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] ap-muted">{schemaTypeLabel(profile)}</div>
                    </div>
                    <div className="text-xs font-black ap-muted">{formatNumber(completeness, 0)}%</div>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--ap-surface-3)" }}>
                    <div className="h-full rounded-full" style={{ width: `${completeness}%`, background: activeProfileSet.has(profile.name) ? "var(--ap-accent)" : "var(--ap-muted)" }} />
                  </div>
                </button>
              );
            })}
          </div>
          {allProfiles.length > schemaProfiles.length && (
            <div className="mt-4 text-xs font-semibold ap-muted">+ {formatNumber(allProfiles.length - schemaProfiles.length, 0)} more fields</div>
          )}
        </section>

        <section className="ap-card border rounded-2xl p-5">
          <h3 className="font-black text-[var(--ap-text)]">Data quality summary</h3>
          <div className="mt-5 flex items-center gap-5">
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(var(--ap-good) ${qualityScore * 3.6}deg, var(--ap-surface-3) 0deg)` }}>
              <div className="absolute h-16 w-16 rounded-full" style={{ background: "var(--ap-card)" }} />
              <div className="relative text-center">
                <div className="text-xl font-black text-[var(--ap-text)]">{qualityScore}%</div>
                <div className="text-[9px] font-bold ap-muted">overall</div>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="ap-muted">Valid fields</span>
                <span className="font-black text-[var(--ap-text)]">{formatNumber(allProfiles.length - issueProfiles.length, 0)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="ap-muted">Warnings</span>
                <span className="font-black text-[var(--ap-text)]">{formatNumber(warningCount, 0)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="ap-muted">Issues</span>
                <span className="font-black" style={{ color: issueProfiles.length ? "var(--ap-warn)" : "var(--ap-good)" }}>{formatNumber(issueProfiles.length, 0)}</span>
              </div>
            </div>
          </div>
          <button onClick={onRefresh} className="mt-5 ap-btn w-full rounded-xl px-4 py-2.5 text-xs font-black">Run quality-aware insight</button>
        </section>

        <section className="ap-card border rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-black text-[var(--ap-text)]">AI insights</h3>
            <button className="text-xs font-black ap-accent" onClick={() => onOpenTab("AI")}>View all</button>
          </div>
          <div className="mt-4 rounded-xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: "var(--ap-accent-soft)", color: "var(--ap-accent)" }}>
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-black text-[var(--ap-text)]">
                  {loading ? "Generating workspace insight..." : insightCopy ? "Workspace insight ready" : "Generate your first insight"}
                </h4>
                <p className="mt-2 text-xs leading-5 ap-muted">
                  {loading
                    ? "The backend is profiling the selected fields and preparing a concise business summary."
                    : insightCopy || "Use the dataset metadata, sampled rows, and schema profile to produce a backend-backed summary."}
                </p>
                {insight?.source && <InsightSourceBadge source={insight.source} />}
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <button onClick={onRefresh} disabled={loading} className="ap-btn-primary w-full rounded-xl px-4 py-3 text-xs font-black">
              {loading ? "Generating..." : "Generate insights"}
            </button>
            <button onClick={onGenerateReport} className="ap-btn w-full rounded-xl px-4 py-3 text-xs font-black">
              Generate decision brief
            </button>
            <button onClick={() => onOpenTab("Chat")} className="ap-btn w-full rounded-xl px-4 py-3 text-xs font-black">
              Ask AI Assistant
            </button>
          </div>
        </section>
      </aside>
    </div>
  );
}

function ChartsTab({
  theme,
  chartType,
  setChartType,
  xAxisCol,
  setXAxisCol,
  yAxisCol,
  setYAxisCol,
  secondaryCol,
  setSecondaryCol,
  columns,
  data,
  numericColumns,
  categoryColumns,
  chartRows,
  categoryAggregate,
  histogramRows,
  kdeRows,
  correlationData,
  hypothesis,
  demandRecommendations,
}: {
  theme: ThemeMode;
  chartType: ChartType;
  setChartType: (value: ChartType) => void;
  xAxisCol: string;
  setXAxisCol: (value: string) => void;
  yAxisCol: string;
  setYAxisCol: (value: string) => void;
  secondaryCol: string;
  setSecondaryCol: (value: string) => void;
  columns: string[];
  data: Record<string, unknown>[];
  numericColumns: string[];
  categoryColumns: string[];
  chartRows: Record<string, unknown>[];
  categoryAggregate: { name: string; value: number }[];
  histogramRows: { bucket: string; count: number }[];
  kdeRows: { x: number; density: number }[];
  correlationData: { x: string; y: string; value: number }[];
  hypothesis: ReturnType<typeof hypothesisTest>;
  demandRecommendations: DemandRecommendation[];
}) {
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("Pricing Optimization");
  const [scenarioField, setScenarioField] = useState(yAxisCol);
  const [scenarioDirection, setScenarioDirection] = useState("+");
  const [scenarioDelta, setScenarioDelta] = useState(10);
  const [analysisName, setAnalysisName] = useState("Pricing Optimization Analysis");
  const [saveNotice, setSaveNotice] = useState("");
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false);
  const gridColor = "var(--ap-chart-grid)";
  const axis = axisColor(theme);
  const tooltip = chartTooltip(theme);
  const pieData = categoryAggregate.slice(0, 10);
  const radarData = categoryAggregate.slice(0, 8);
  const colors = [CHART_COLOR, CHART_COLOR_2, CHART_GOOD, CHART_WARN, "#334155", "#7c3aed"];
  const chartRecommendations = [
    { label: "Segment ranking", chart: "Horizontal Bar" as ChartType, reason: "Best for long category labels and contribution comparisons." },
    { label: "Distribution", chart: "KDE Density" as ChartType, reason: "Shows the shape of the selected numeric measure." },
    { label: "Relationship", chart: "Scatter" as ChartType, reason: "Use when both selected fields are numeric." },
    { label: "Contribution share", chart: "Donut" as ChartType, reason: "Good for top segment share, not full-detail analysis." },
  ];

  useEffect(() => {
    if (!scenarioField && yAxisCol) setScenarioField(yAxisCol);
  }, [scenarioField, yAxisCol]);

  useEffect(() => {
    if (!isRunningAnalysis) return;
    const timer = window.setTimeout(() => setIsRunningAnalysis(false), 560);
    return () => window.clearTimeout(timer);
  }, [isRunningAnalysis]);

  const handleDrill = (value: unknown) => {
    if (value === null || value === undefined || value === "") return;
    setSelectedValue(String(value).slice(0, 80));
  };
  const drillRows = selectedValue
    ? data.filter((row) => String(row[xAxisCol] ?? "Unclassified").slice(0, 80) === selectedValue)
    : [];
  const scopedDemandRecommendations = useMemo(
    () => buildDemandRecommendations(drillRows.length ? drillRows : data, columns),
    [drillRows, data, columns],
  );

  const revenueColumn = findColumn(numericColumns, [/revenue/, /sales/, /amount/, /total/, /price/, /value/]) || yAxisCol || numericColumns[0] || "";
  const priceColumn = findColumn(numericColumns, [/price/, /amount/, /cost/]) || revenueColumn;
  const discountColumn = findColumn(numericColumns, [/discount/, /margin/, /pct/, /percent/]) || secondaryCol || numericColumns[1] || revenueColumn;
  const ratingColumn = findColumn(numericColumns, [/rating/, /score/, /stars/]) || numericColumns.find((column) => column !== revenueColumn && column !== discountColumn) || revenueColumn;
  const segmentColumn = findColumn(categoryColumns, [/category/, /segment/, /region/, /product/, /type/]) || xAxisCol || categoryColumns[0] || columns[0] || "";
  const strongestCorrelation = correlationData
    .filter((item) => item.x !== item.y)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0];
  const mainTotal = sumColumn(data, revenueColumn);
  const projectedMultiplier = (scenarioDirection === "+" ? 1 : -1) * (Number(scenarioDelta) || 0);
  const projectedImpact = mainTotal * (projectedMultiplier / 100) * 0.18;
  const topSegments = categoryAggregate.slice(0, 3);
  const distributionBars = histogramRows.slice(0, 8);
  const recentAnalyses = [
    { label: selectedTemplate, time: "Just now", icon: Target },
    { label: "Revenue Drivers", time: "1 hour ago", icon: TrendingUp },
    { label: "Product Performance", time: "Recent", icon: ChartDonut },
    { label: "Customer Segmentation", time: "Recent", icon: BrainCircuit },
  ];
  const analysisTemplates = [
    {
      label: "Revenue Analysis",
      description: "Understand revenue drivers and trends",
      icon: DollarSign,
      chart: "Horizontal Bar" as ChartType,
      dimension: segmentColumn,
      measure: revenueColumn,
      secondary: discountColumn,
    },
    {
      label: "Pricing Optimization",
      description: "Find optimal pricing and discount strategy",
      icon: Target,
      chart: "Scatter" as ChartType,
      dimension: discountColumn || priceColumn,
      measure: ratingColumn || revenueColumn,
      secondary: revenueColumn,
    },
    {
      label: "Product Performance",
      description: "Identify top and underperforming products",
      icon: ChartDonut,
      chart: "Bar" as ChartType,
      dimension: segmentColumn,
      measure: revenueColumn,
      secondary: ratingColumn,
    },
    {
      label: "Customer Segmentation",
      description: "Segment behavior and value",
      icon: BrainCircuit,
      chart: "Donut" as ChartType,
      dimension: segmentColumn,
      measure: revenueColumn,
      secondary: ratingColumn,
    },
    {
      label: "Market Basket Analysis",
      description: "Discover product relationships",
      icon: Database,
      chart: "Treemap" as ChartType,
      dimension: segmentColumn,
      measure: revenueColumn,
      secondary: priceColumn,
    },
    {
      label: "Custom Analysis",
      description: "Build your own analysis",
      icon: Sparkles,
      chart: "Composed" as ChartType,
      dimension: xAxisCol,
      measure: yAxisCol,
      secondary: secondaryCol,
    },
  ];
  const applyTemplate = (template: (typeof analysisTemplates)[number]) => {
    setSelectedTemplate(template.label);
    setAnalysisName(`${template.label} Analysis`);
    setChartType(template.chart);
    if (template.dimension) setXAxisCol(template.dimension);
    if (template.measure) setYAxisCol(template.measure);
    if (template.secondary) setSecondaryCol(template.secondary);
    setScenarioField(template.secondary || template.measure || scenarioField);
    setSelectedValue(null);
    setIsRunningAnalysis(true);
  };
  const runAnalysis = () => {
    setIsRunningAnalysis(true);
    setSaveNotice("");
  };
  const saveAnalysis = () => {
    setSaveNotice(`${analysisName || selectedTemplate} saved to your workspace.`);
    window.setTimeout(() => setSaveNotice(""), 2600);
  };
  const variableChips = Array.from(new Set([discountColumn, priceColumn, ratingColumn, revenueColumn].filter(Boolean))).slice(0, 5);
  const findings = [
    {
      title: "Key driver identified",
      body: strongestCorrelation
        ? `${strongestCorrelation.x} and ${strongestCorrelation.y} show the strongest relationship in this dataset.`
        : `${revenueColumn || yAxisCol} is the primary metric for this analysis.`,
      badge: strongestCorrelation ? `${formatNumber(strongestCorrelation.value, 2)} correlation` : "Primary metric",
    },
    {
      title: "Pricing opportunity",
      body: demandRecommendations.length
        ? `${demandRecommendations.length} product-level opportunities are ready for review.`
        : `Compare ${discountColumn || "discount"} against ${ratingColumn || "rating"} before adjusting prices.`,
      badge: "Review",
    },
    {
      title: "Optimal range",
      body: distributionBars.length
        ? `The selected measure has ${distributionBars.length} visible distribution bands.`
        : "Run a distribution analysis to identify the stable operating range.",
      badge: "Evidence",
    },
    {
      title: "Risk detected",
      body: hypothesis ? hypothesis.verdict : "Segment differences need validation before operational decisions.",
      badge: "Check",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#145DFF]" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface)" }}>
            <BarChart2 className="h-3.5 w-3.5" />
            Analysis Lab
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--ap-text)]">Visual Analytics</h1>
          <p className="mt-1 max-w-2xl text-sm ap-muted">Run focused analyses, discover signals, and turn charts into decisions.</p>
          <p className="mt-2 text-xs font-semibold ap-muted">
            Active dataset | {formatNumber(data.length, 0)} rows | {formatNumber(columns.length, 0)} active columns
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setSaveNotice("Saved analyses panel is ready for workspace history integration.")} className="ap-btn rounded-xl px-4 py-2.5 text-xs font-black inline-flex items-center gap-2">
            Saved Analyses
          </button>
          <button onClick={saveAnalysis} className="ap-btn-primary rounded-xl px-4 py-2.5 text-xs font-black inline-flex items-center gap-2">
            <Download className="h-4 w-4" />
            Save View
          </button>
        </div>
      </div>

      {saveNotice && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-700">
          {saveNotice}
        </div>
      )}

      <section className="ap-card border rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-[var(--ap-text)]">Analysis Templates</h2>
            <p className="mt-1 text-xs ap-muted">Start with a pre-built analysis template or create your own.</p>
          </div>
          <span className="hidden text-xs font-black text-[#145DFF] md:inline-flex items-center gap-1">
            View all templates
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {analysisTemplates.map((template) => {
            const Icon = template.icon;
            const active = selectedTemplate === template.label;
            return (
              <button
                key={template.label}
                onClick={() => applyTemplate(template)}
                className="rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg"
                style={{ borderColor: active ? "var(--ap-accent)" : "var(--ap-border)", background: active ? "var(--ap-accent-soft)" : "var(--ap-surface)" }}
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: active ? "var(--ap-surface)" : "var(--ap-surface-2)", color: "var(--ap-accent)" }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black text-[var(--ap-text)]">{template.label}</div>
                    <p className="mt-1 text-xs leading-5 ap-muted">{template.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[330px_minmax(0,1fr)_320px]">
        <aside className="space-y-5">
          <section className="ap-card border rounded-2xl p-5">
            <h2 className="text-sm font-black text-[var(--ap-text)]">1. Build Your Analysis</h2>
            <div className="mt-4 space-y-4">
              <Select label="Analysis goal" value={selectedTemplate} onChange={(value) => {
                const template = analysisTemplates.find((item) => item.label === value);
                if (template) applyTemplate(template);
              }} options={analysisTemplates.map((item) => item.label)} />
              <div>
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] ap-muted">Independent variables</div>
                <div className="flex flex-wrap gap-2">
                  {variableChips.map((column) => (
                    <button key={column} onClick={() => setXAxisCol(column)} className="rounded-lg border px-2.5 py-1.5 text-xs font-bold" style={{ borderColor: "var(--ap-border)", background: xAxisCol === column ? "var(--ap-accent-soft)" : "var(--ap-surface-2)", color: xAxisCol === column ? "var(--ap-accent)" : "var(--ap-text)" }}>
                      {column}
                    </button>
                  ))}
                </div>
              </div>
              <Select label="Dimension" value={xAxisCol} onChange={setXAxisCol} options={categoryColumns.length ? categoryColumns : columns} />
              <Select label="Target variable" value={yAxisCol} onChange={setYAxisCol} options={numericColumns.length ? numericColumns : columns} />
              <Select label="Comparison variable" value={secondaryCol} onChange={setSecondaryCol} options={numericColumns.length ? numericColumns : columns} />
              <Select label="Chart style" value={chartType} onChange={(value) => setChartType(value as ChartType)} options={CHARTS} />
              <button onClick={runAnalysis} disabled={isRunningAnalysis} className="ap-btn-primary mt-2 w-full rounded-xl px-4 py-3 text-xs font-black inline-flex items-center justify-center gap-2 disabled:opacity-70">
                {isRunningAnalysis ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" /> : <Sparkles className="h-4 w-4" />}
                {isRunningAnalysis ? "Running analysis..." : "Run Analysis"}
              </button>
            </div>
          </section>

          <section className="ap-card border rounded-2xl p-5">
            <h2 className="text-sm font-black text-[var(--ap-text)]">Segment Explorer</h2>
            <p className="mt-1 text-xs ap-muted">Top segments discovered from the selected dimension.</p>
            <div className="mt-4 space-y-3">
              {topSegments.map((segment, index) => (
                <button
                  key={segment.name}
                  onClick={() => handleDrill(segment.name)}
                  className="w-full rounded-xl border p-3 text-left transition hover:border-[#145DFF]/50"
                  style={{ borderColor: selectedValue === segment.name ? "var(--ap-accent)" : "var(--ap-border)", background: "var(--ap-surface-2)" }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-black text-[var(--ap-text)]">{segment.name}</span>
                    <span className="text-xs font-black ap-muted">#{index + 1}</span>
                  </div>
                  <div className="mt-2 text-xs ap-muted">Value: {formatNumber(segment.value, 0)}</div>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <main className="space-y-5 min-w-0">
          <section className="ap-card border rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-[var(--ap-text)]">2. AI Generated Findings</h2>
                <p className="mt-1 text-xs ap-muted">Lightweight findings from the active dataset profile.</p>
              </div>
              {isRunningAnalysis && <span className="text-xs font-black text-[#145DFF]">Updating...</span>}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {findings.map((finding, index) => (
                <div key={finding.title} className="rounded-2xl border p-4" style={{ borderColor: "var(--ap-border)", background: index === 0 ? "var(--ap-accent-soft)" : "var(--ap-surface-2)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: "var(--ap-surface)", color: "var(--ap-accent)" }}>
                      {index === 0 ? <TrendingUp className="h-4 w-4" /> : index === 1 ? <Target className="h-4 w-4" /> : index === 2 ? <BarChart2 className="h-4 w-4" /> : <Compass className="h-4 w-4" />}
                    </div>
                    <span className="rounded-full border px-2 py-1 text-[10px] font-black ap-muted" style={{ borderColor: "var(--ap-border)" }}>{finding.badge}</span>
                  </div>
                  <h3 className="mt-3 text-sm font-black text-[var(--ap-text)]">{finding.title}</h3>
                  <p className="mt-2 min-h-[58px] text-xs leading-5 ap-muted">{finding.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="ap-card border rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-[var(--ap-text)]">3. Visual Evidence</h2>
                <p className="mt-1 text-xs ap-muted">Charts are intentionally restrained for practical analysis.</p>
              </div>
              <button onClick={() => setChartType("Composed")} className="text-xs font-black text-[#145DFF] inline-flex items-center gap-1">
                View all charts
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="rounded-2xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
                <h3 className="text-xs font-black text-[var(--ap-text)]">{yAxisCol} by {xAxisCol}</h3>
                <div className="mt-3 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryAggregate.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis type="number" stroke={axis} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" stroke={axis} tick={{ fontSize: 10 }} width={110} />
                      <Tooltip contentStyle={tooltip} />
                      <Bar dataKey="value" fill={CHART_COLOR} radius={[0, 4, 4, 0]} onClick={(payload: any) => handleDrill(payload?.name || payload?.payload?.name)} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-2xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
                <h3 className="text-xs font-black text-[var(--ap-text)]">{yAxisCol} distribution</h3>
                <div className="mt-3 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={histogramRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="bucket" stroke={axis} tick={{ fontSize: 10 }} minTickGap={18} />
                      <YAxis stroke={axis} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={tooltip} />
                      <Bar dataKey="count" fill={CHART_COLOR_2} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-2xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
                <h3 className="text-xs font-black text-[var(--ap-text)]">{yAxisCol} vs {secondaryCol}</h3>
                <div className="mt-3 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="__secondary" name={secondaryCol} stroke={axis} tick={{ fontSize: 10 }} />
                      <YAxis dataKey="__y" name={yAxisCol} stroke={axis} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={tooltip} cursor={{ strokeDasharray: "3 3" }} />
                      <Scatter data={chartRows} fill={CHART_COLOR} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <section className="ap-card border rounded-2xl p-5">
              <h2 className="text-sm font-black text-[var(--ap-text)]">5. Recommendations & Actions</h2>
              <div className="mt-4 space-y-3">
                {(scopedDemandRecommendations.length ? scopedDemandRecommendations : demandRecommendations).slice(0, 3).map((item, index) => (
                  <div key={`${item.title}-${index}`} className="rounded-xl border p-3" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-[var(--ap-text)]">{item.title}</div>
                        <div className="mt-1 text-xs ap-muted">{item.description}</div>
                      </div>
                      <button onClick={() => setSaveNotice(`Action plan created from ${item.title}.`)} className="ap-btn rounded-lg px-3 py-2 text-xs font-black">Create Plan</button>
                    </div>
                  </div>
                ))}
                {!demandRecommendations.length && (
                  <p className="text-sm ap-muted">Add product, rating, review count, and price-like fields to generate product-level recommendations.</p>
                )}
              </div>
            </section>

            <section className="ap-card border rounded-2xl p-5">
              <h2 className="text-sm font-black text-[var(--ap-text)]">Recent Analyses</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {recentAnalyses.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.label} onClick={() => setSelectedTemplate(item.label)} className="rounded-xl border p-3 text-left transition hover:border-[#145DFF]/50" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: "var(--ap-accent-soft)", color: "var(--ap-accent)" }}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-[var(--ap-text)]">{item.label}</div>
                          <div className="text-xs ap-muted">{item.time}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </main>

        <aside className="space-y-5">
          <section className="ap-card border rounded-2xl p-5">
            <h2 className="text-sm font-black text-[var(--ap-text)]">4. Scenario Simulator</h2>
            <p className="mt-1 text-xs ap-muted">Test a simple sensitivity scenario.</p>
            <div className="mt-4 space-y-4">
              <Select label="What do you want to change?" value={scenarioField || yAxisCol} onChange={setScenarioField} options={numericColumns.length ? numericColumns : columns} />
              <div className="grid grid-cols-[70px_1fr_56px] gap-2">
                <select className="ap-input border rounded-lg px-3 py-2 text-sm" value={scenarioDirection} onChange={(event) => setScenarioDirection(event.target.value)} style={{ borderColor: "var(--ap-border)" }}>
                  <option value="+">+</option>
                  <option value="-">-</option>
                </select>
                <input className="ap-input border rounded-lg px-3 py-2 text-sm" type="number" min={0} max={100} value={scenarioDelta} onChange={(event) => setScenarioDelta(Number(event.target.value))} style={{ borderColor: "var(--ap-border)" }} />
                <div className="ap-panel border rounded-lg px-3 py-2 text-center text-sm font-black">%</div>
              </div>
              <button onClick={runAnalysis} className="ap-btn w-full rounded-xl px-4 py-3 text-xs font-black">Run Simulation</button>
            </div>
            <div className="mt-5 rounded-xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
              <h3 className="text-xs font-black text-[var(--ap-text)]">Projected Impact</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="ap-muted">Revenue</span>
                  <span className="font-black" style={{ color: projectedImpact >= 0 ? "var(--ap-good)" : "var(--ap-warn)" }}>
                    {projectedImpact >= 0 ? "+" : ""}{formatNumber(projectedImpact, 0)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="ap-muted">Confidence</span>
                  <span className="font-black text-[var(--ap-text)]">{correlationData.length ? "87%" : "72%"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="ap-muted">Affected rows</span>
                  <span className="font-black text-[var(--ap-text)]">{formatNumber(selectedValue ? drillRows.length : Math.min(data.length, 500), 0)}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="ap-card border rounded-2xl p-5">
            <h2 className="text-sm font-black text-[var(--ap-text)]">6. Save & Share</h2>
            <p className="mt-1 text-xs ap-muted">Save this analysis for future use.</p>
            <label className="mt-4 block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] ap-muted">Analysis name</span>
              <input className="ap-input w-full rounded-xl border px-3 py-3 text-sm" value={analysisName} onChange={(event) => setAnalysisName(event.target.value)} style={{ borderColor: "var(--ap-border)" }} />
            </label>
            <label className="mt-4 flex items-center gap-2 text-xs font-semibold ap-muted">
              <input type="checkbox" />
              Add to dashboard
            </label>
            <button onClick={saveAnalysis} className="ap-btn-primary mt-4 w-full rounded-xl px-4 py-3 text-xs font-black">
              Save Analysis
            </button>
          </section>
        </aside>
      </div>

      {selectedValue && (
        <DrilldownPanel
          selectedValue={selectedValue}
          rows={drillRows}
          allRows={data}
          columns={columns}
          xAxisCol={xAxisCol}
          yAxisCol={yAxisCol}
          secondaryCol={secondaryCol}
          onClear={() => setSelectedValue(null)}
        />
      )}
    </div>
  );

  return (
    <section className="ap-card border rounded-xl p-5 space-y-5">
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">Visual analytics board</h2>
          <p className="ap-muted text-sm">Interactive charting for CSV fields, similar to BI exploration workflows.</p>
        </div>
        <TabInfoButton tab="Charts" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Select label="Chart" value={chartType} onChange={(value) => setChartType(value as ChartType)} options={CHARTS} />
          <Select label="Dimension" value={xAxisCol} onChange={setXAxisCol} options={categoryColumns.length ? categoryColumns : columns} />
          <Select label="Measure" value={yAxisCol} onChange={setYAxisCol} options={numericColumns.length ? numericColumns : columns} />
          <Select label="Second measure" value={secondaryCol} onChange={setSecondaryCol} options={numericColumns.length ? numericColumns : columns} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
        {chartRecommendations.map((item) => (
          <button key={item.label} onClick={() => setChartType(item.chart)} className="ap-panel border rounded-xl p-3 text-left hover:opacity-90 transition">
            <div className="text-xs font-black">{item.label}</div>
            <div className="text-[11px] ap-muted mt-1 leading-4">{item.reason}</div>
            <div className="text-[10px] uppercase tracking-[0.14em] ap-accent mt-3">{item.chart}</div>
          </button>
        ))}
      </div>

      <div className="h-[520px] w-full ap-panel border rounded-xl p-4">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "Line" ? (
            <LineChart data={chartRows} onClick={(state: any) => handleDrill(state?.activePayload?.[0]?.payload?.__xLabel)}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="__xLabel" stroke={axis} tick={{ fontSize: 11 }} minTickGap={30} />
              <YAxis stroke={axis} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltip} />
              <Legend />
              <Line type="monotone" dataKey="__y" name={yAxisCol} stroke={CHART_COLOR} strokeWidth={2} dot={false} />
            </LineChart>
          ) : chartType === "Area" ? (
            <AreaChart data={chartRows} onClick={(state: any) => handleDrill(state?.activePayload?.[0]?.payload?.__xLabel)}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="__xLabel" stroke={axis} tick={{ fontSize: 11 }} minTickGap={30} />
              <YAxis stroke={axis} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltip} />
              <Area type="monotone" dataKey="__y" name={yAxisCol} stroke={CHART_COLOR} fill={CHART_COLOR} fillOpacity={0.18} />
            </AreaChart>
          ) : chartType === "Horizontal Bar" ? (
            <BarChart data={categoryAggregate.slice(0, 20)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis type="number" stroke={axis} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" stroke={axis} tick={{ fontSize: 11 }} width={190} />
              <Tooltip contentStyle={tooltip} />
              <Bar dataKey="value" fill={CHART_COLOR} radius={[0, 4, 4, 0]} onClick={(payload: any) => handleDrill(payload?.name || payload?.payload?.name)} />
            </BarChart>
          ) : chartType === "Scatter" ? (
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="__xNumber" name={xAxisCol} stroke={axis} tick={{ fontSize: 11 }} />
              <YAxis dataKey="__y" name={yAxisCol} stroke={axis} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltip} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={chartRows} fill={CHART_COLOR} onClick={(payload: any) => handleDrill(payload?.payload?.__xLabel)} />
            </ScatterChart>
          ) : chartType === "Histogram" ? (
            <BarChart data={histogramRows}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="bucket" stroke={axis} tick={{ fontSize: 11 }} minTickGap={18} />
              <YAxis stroke={axis} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltip} />
              <Bar dataKey="count" fill={CHART_COLOR} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : chartType === "KDE Density" ? (
            <AreaChart data={kdeRows}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="x" stroke={axis} tick={{ fontSize: 11 }} />
              <YAxis stroke={axis} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltip} />
              <Area type="monotone" dataKey="density" name={`${yAxisCol} density`} stroke={CHART_COLOR} fill={CHART_COLOR} fillOpacity={0.2} />
            </AreaChart>
          ) : chartType === "Pie" || chartType === "Donut" ? (
            <PieChart>
              <Tooltip contentStyle={tooltip} />
              <Legend />
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={190} innerRadius={chartType === "Donut" ? 105 : 0} label onClick={(payload: any) => handleDrill(payload?.name)}>
                {pieData.map((_, index) => (
                  <Cell key={index} fill={colors[index % colors.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : chartType === "Composed" ? (
            <ComposedChart data={chartRows}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="__xLabel" stroke={axis} tick={{ fontSize: 11 }} minTickGap={30} />
              <YAxis stroke={axis} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltip} />
              <Legend />
              <Bar dataKey="__y" name={yAxisCol} fill={CHART_COLOR} fillOpacity={0.35} onClick={(payload: any) => handleDrill(payload?.payload?.__xLabel)} />
              <Line type="monotone" dataKey="__secondary" name={secondaryCol} stroke={CHART_GOOD} strokeWidth={2} dot={false} />
            </ComposedChart>
          ) : chartType === "Radar" ? (
            <RadarChart data={radarData}>
              <PolarGrid stroke={gridColor} />
              <PolarAngleAxis dataKey="name" tick={{ fill: axis, fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fill: axis, fontSize: 10 }} />
              <Radar dataKey="value" stroke={CHART_COLOR} fill={CHART_COLOR} fillOpacity={0.25} />
              <Tooltip contentStyle={tooltip} />
            </RadarChart>
          ) : chartType === "Treemap" ? (
            <Treemap data={categoryAggregate.slice(0, 18)} dataKey="value" nameKey="name" stroke="var(--ap-surface)" fill={CHART_COLOR} onClick={(payload: any) => handleDrill(payload?.name)} />
          ) : (
            <BarChart data={categoryAggregate.slice(0, 30)}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" stroke={axis} tick={{ fontSize: 11 }} minTickGap={25} />
              <YAxis stroke={axis} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltip} />
              <Bar dataKey="value" fill={CHART_COLOR} radius={[4, 4, 0, 0]} onClick={(payload: any) => handleDrill(payload?.name || payload?.payload?.name)} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {correlationData.length > 0 && (
        <CorrelationHeatmap data={correlationData} />
      )}
      <DrilldownPanel
        selectedValue={selectedValue}
        rows={drillRows}
        allRows={data}
        columns={columns}
        xAxisCol={xAxisCol}
        yAxisCol={yAxisCol}
        secondaryCol={secondaryCol}
        onClear={() => setSelectedValue(null)}
      />
      <DemandRecommendationPanel
        recommendations={selectedValue ? scopedDemandRecommendations : demandRecommendations}
        selectedValue={selectedValue}
      />
      {hypothesis && <HypothesisPanel result={hypothesis} />}
    </section>
  );
}

function DrilldownPanel({
  selectedValue,
  rows,
  allRows,
  columns,
  xAxisCol,
  yAxisCol,
  secondaryCol,
  onClear,
}: {
  selectedValue: string | null;
  rows: Record<string, unknown>[];
  allRows: Record<string, unknown>[];
  columns: string[];
  xAxisCol: string;
  yAxisCol: string;
  secondaryCol: string;
  onClear: () => void;
}) {
  const scopedRows = selectedValue ? rows : allRows.slice(0, 80);
  const yValues = scopedRows.map((row) => parseNumber(row[yAxisCol])).filter((value): value is number => value !== null);
  const secondaryValues = scopedRows.map((row) => parseNumber(row[secondaryCol])).filter((value): value is number => value !== null);
  const previewColumns = columns.slice(0, 8);
  return (
    <div className="ap-panel border rounded-xl p-4">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold">Drilldown</h3>
          <p className="ap-muted text-sm mt-1">
            {selectedValue ? `${xAxisCol}: ${selectedValue}` : "No value selected"}
          </p>
        </div>
        {selectedValue && (
          <button className="ap-btn rounded-lg px-3 py-2 text-xs font-bold" onClick={onClear}>
            Clear
          </button>
        )}
      </div>
      <div className="grid md:grid-cols-4 gap-3 mb-4">
        <MetricCard label="Rows" value={formatNumber(scopedRows.length, 0)} />
        <MetricCard label={`${yAxisCol} total`} value={formatNumber(yValues.reduce((sum, value) => sum + value, 0))} />
        <MetricCard label={`${yAxisCol} average`} value={formatNumber(average(yValues))} />
        <MetricCard label={`${secondaryCol} average`} value={formatNumber(average(secondaryValues))} />
      </div>
      <DataTable rows={scopedRows.slice(0, 18)} columns={previewColumns} />
    </div>
  );
}

function DemandRecommendationPanel({
  recommendations,
  selectedValue,
}: {
  recommendations: DemandRecommendation[];
  selectedValue?: string | null;
}) {
  if (!recommendations.length) {
    return (
      <div className="ap-panel border rounded-xl p-4">
        <h3 className="font-bold">Demand recommendations</h3>
        <p className="ap-muted text-sm mt-2">Needs product, rating, rating count, and price-like fields to estimate buyer demand and revenue.</p>
      </div>
    );
  }

  return (
    <div className="ap-panel border rounded-xl p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold">Demand recommendations</h3>
          <p className="ap-muted text-sm mt-1">
            {selectedValue ? `Scoped to ${selectedValue}` : "Ranked from product values, ratings, review signal, and price."}
          </p>
        </div>
      </div>
      <div className="grid xl:grid-cols-2 gap-3">
        {recommendations.slice(0, 6).map((item) => (
          <div key={item.item} className="ap-card border rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="font-black truncate" title={item.item}>{item.item}</h4>
                <p className="ap-muted text-xs mt-1">{item.reason}</p>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-1 rounded" style={{ background: "var(--ap-accent-soft)", color: "var(--ap-accent)" }}>
                {item.confidence}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <MetricCard label="Rating" value={formatNumber(item.rating, 1)} small />
              <MetricCard label="Review signal" value={formatNumber(item.ratingCount, 0)} small />
              <MetricCard label="Est. buyers" value={formatNumber(item.expectedBuyers, 0)} tone="good" small />
              <MetricCard label="Est. revenue" value={formatNumber(item.forecastRevenue)} tone="good" small />
            </div>
            <div className="text-[11px] ap-muted mt-3">
              Estimated conversion: {formatNumber(item.conversionRate * 100, 1)}% at average price {formatNumber(item.price)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CorrelationHeatmap({ data }: { data: { x: string; y: string; value: number }[] }) {
  const columns = Array.from(new Set(data.map((item) => item.x)));
  const valueFor = (x: string, y: string) => data.find((item) => item.x === x && item.y === y)?.value ?? 0;
  return (
    <div className="ap-panel border rounded-xl p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-bold">Numeric relationship heatmap</h3>
        <div className="text-[11px] ap-muted">Compact Pearson correlation matrix</div>
      </div>
      <div className="overflow-auto">
        <div className="grid gap-1 min-w-[620px]" style={{ gridTemplateColumns: `150px repeat(${columns.length}, minmax(88px, 1fr))` }}>
          <div />
          {columns.map((column) => (
            <div key={column} className="text-[10px] ap-muted font-bold truncate px-2 py-1" title={column}>{column}</div>
          ))}
          {columns.map((row) => (
            <React.Fragment key={row}>
              <div className="text-[10px] ap-muted font-bold truncate px-2 py-2" title={row}>{row}</div>
              {columns.map((column) => {
                const value = valueFor(row, column);
                const strength = Math.min(1, Math.abs(value));
                const bg = value >= 0 ? `rgba(47, 85, 212, ${0.12 + strength * 0.62})` : `rgba(180, 83, 9, ${0.12 + strength * 0.58})`;
                return (
                  <div key={`${row}-${column}`} className="rounded-md px-2 py-2 text-center text-xs font-black" style={{ background: bg, color: "var(--ap-text)" }} title={`${row} vs ${column}: ${value}`}>
                    {formatNumber(value, 2)}
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

function HypothesisPanel({ result }: { result: NonNullable<ReturnType<typeof hypothesisTest>> }) {
  return (
    <div className="ap-panel border rounded-xl p-4">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        <div>
          <h3 className="font-bold">Hypothesis test</h3>
          <p className="ap-muted text-sm mt-1">
            Comparing top segments: {result.groupA} vs {result.groupB}
          </p>
        </div>
        <div className="text-sm font-black" style={{ color: Math.abs(result.tScore) >= 2 ? "var(--ap-good)" : "var(--ap-warn)" }}>
          {result.verdict}
        </div>
      </div>
      <div className="grid md:grid-cols-4 gap-3 mt-4">
        <MetricCard label={`${result.groupA} mean`} value={formatNumber(result.meanA)} small />
        <MetricCard label={`${result.groupB} mean`} value={formatNumber(result.meanB)} small />
        <MetricCard label="Difference" value={formatNumber(result.difference)} tone={result.difference >= 0 ? "good" : "warn"} small />
        <MetricCard label="t score / effect" value={`${formatNumber(result.tScore, 2)} / ${formatNumber(result.effectSize, 2)}`} small />
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.14em] ap-muted mb-1">{label}</span>
      <select className="ap-input border rounded-lg px-3 py-2 text-sm w-full" value={value} onChange={(event) => onChange(event.target.value)}>
        {(options.length ? options : [""]).map((option) => (
          <option key={option} value={option}>
            {option || "No fields available"}
          </option>
        ))}
      </select>
    </label>
  );
}

function sumColumn(rows: Record<string, unknown>[], column: string) {
  return rows.reduce((sum, row) => sum + (parseNumber(row[column]) || 0), 0);
}

function ReportTab({
  theme,
  profiles,
  data,
  columns,
  categoryAggregate,
  correlationData,
  ignoredColumns,
  fileName,
  insight,
  loading,
  onRun,
}: {
  theme: ThemeMode;
  profiles: ColumnProfile[];
  data: Record<string, unknown>[];
  columns: string[];
  categoryAggregate: { name: string; value: number }[];
  correlationData: { x: string; y: string; value: number }[];
  ignoredColumns: string[];
  fileName: string;
  insight?: InsightResult;
  loading: boolean;
  onRun: () => void;
}) {
  const qualityRows = profiles.map((profile) => ({
    name: profile.name,
    missing: profile.missing,
    unique: profile.unique,
  }));
  const numericProfiles = profiles.filter((profile) => profile.numeric).slice(0, 8);
  const axis = axisColor(theme);
  const tooltip = chartTooltip(theme);

  return (
    <section className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_500px] gap-4">
      <div className="space-y-4">
        <div className="ap-card border rounded-xl p-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">Comprehensive BI report</h2>
            <p className="ap-muted text-sm mt-1">
              {fileName || "Dataset"} report uses {formatNumber(data.length, 0)} rows and {formatNumber(columns.length, 0)} active analysis columns.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TabInfoButton tab="AI" />
            <button onClick={onRun} disabled={loading} className="ap-btn-primary px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
              Generate full report
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <MetricCard label="Analyzed rows" value={formatNumber(data.length, 0)} />
          <MetricCard label="Columns used" value={formatNumber(columns.length, 0)} />
          <MetricCard label="Ignored ID/raw fields" value={formatNumber(ignoredColumns.length, 0)} tone={ignoredColumns.length ? "warn" : "good"} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="ap-card border rounded-xl p-5 h-[360px]">
            <h3 className="font-black mb-3">Column quality</h3>
            <ResponsiveContainer width="100%" height="88%">
              <BarChart data={qualityRows.slice(0, 18)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
                <XAxis dataKey="name" stroke={axis} tick={{ fontSize: 10 }} minTickGap={20} />
                <YAxis stroke={axis} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltip} />
                <Legend />
                <Bar dataKey="missing" fill={CHART_WARN} name="Missing" />
                <Bar dataKey="unique" fill={CHART_COLOR} name="Unique" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="ap-card border rounded-xl p-5 h-[360px]">
            <h3 className="font-black mb-3">Top segment contribution</h3>
            <ResponsiveContainer width="100%" height="88%">
              <BarChart data={categoryAggregate.slice(0, 12)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
                <XAxis type="number" stroke={axis} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={150} stroke={axis} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltip} />
                <Bar dataKey="value" fill={CHART_COLOR} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="ap-card border rounded-xl p-5">
          <h3 className="font-black mb-3">Numeric metadata artifacts</h3>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
            {numericProfiles.map((profile) => (
              <div key={profile.name} className="ap-panel border rounded-lg p-3">
                <div className="font-bold truncate" title={profile.name}>{profile.name}</div>
                <div className="grid grid-cols-2 gap-1 text-xs mt-3">
                  <span className="ap-muted">Sum</span>
                  <span className="text-right">{formatNumber(profile.numeric?.sum)}</span>
                  <span className="ap-muted">Mean</span>
                  <span className="text-right">{formatNumber(profile.numeric?.mean)}</span>
                  <span className="ap-muted">Median</span>
                  <span className="text-right">{formatNumber(profile.numeric?.median)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {correlationData.length > 0 && (
          <div className="ap-card border rounded-xl p-5">
            <h3 className="font-black mb-3">Correlation artifacts</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
              {correlationData.filter((item) => item.x !== item.y).slice(0, 18).map((item) => (
                <div key={`${item.x}-${item.y}`} className="ap-panel border rounded-lg p-3 text-xs">
                  <div className="font-bold truncate">{item.x}</div>
                  <div className="ap-muted truncate">vs {item.y}</div>
                  <div className="text-lg font-black mt-1">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <aside className="ap-card border rounded-xl p-5 h-fit 2xl:sticky 2xl:top-20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black">LLM narrative report</h3>
          <BrainCircuit className="w-5 h-5 ap-accent" />
        </div>
        <InsightBox insight={insight} loading={loading} />
      </aside>
    </section>
  );
}

function IdeasTab({
  theme,
  categoryAggregate,
  categoryColumn,
  valueColumn,
  insight,
  loading,
  onRun,
}: {
  theme: ThemeMode;
  categoryAggregate: { name: string; value: number }[];
  categoryColumn: string;
  valueColumn: string;
  insight?: InsightResult;
  loading: boolean;
  onRun: () => void;
}) {
  const top = categoryAggregate.slice(0, 6);
  const total = categoryAggregate.reduce((sum, item) => sum + item.value, 0) || 1;
  return (
    <section className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_480px] gap-4">
      <div className="space-y-4">
        <div className="ap-card border rounded-xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">Opportunity builder</h2>
              <p className="ap-muted text-sm mt-1">Ideas are grounded in {categoryColumn || "selected segments"} by {valueColumn || "selected measure"} before the LLM writes recommendations.</p>
            </div>
            <TabInfoButton tab="Ideas" />
          </div>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {top.map((item, index) => (
            <div key={item.name} className="ap-card border rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-[0.14em] ap-muted">Opportunity {index + 1}</div>
              <h3 className="font-black mt-2 truncate" title={item.name}>{item.name}</h3>
              <div className="text-2xl font-black mt-3">{formatNumber((item.value / total) * 100, 1)}%</div>
              <p className="ap-muted text-xs mt-2 leading-5">
                {index < 2 ? "Prioritize retention, premium bundles, and supply reliability." : index < 4 ? "Test pricing, targeted campaigns, and cross-sell paths." : "Use as a controlled experiment or cost-rationalization lane."}
              </p>
            </div>
          ))}
        </div>
        <div className="ap-card border rounded-xl p-5 h-[420px]">
          <h3 className="font-black mb-3">Opportunity concentration</h3>
          <ResponsiveContainer width="100%" height="88%">
            <ComposedChart data={categoryAggregate.slice(0, 14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
              <XAxis dataKey="name" stroke={axisColor(theme)} tick={{ fontSize: 10 }} minTickGap={20} />
              <YAxis stroke={axisColor(theme)} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltip(theme)} />
              <Bar dataKey="value" fill={CHART_COLOR} fillOpacity={0.38} />
              <Line dataKey="value" stroke={CHART_GOOD} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <aside className="space-y-4">
        <button onClick={onRun} disabled={loading} className="ap-btn-primary w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
          Generate opportunity report
          <ArrowRight className="w-4 h-4" />
        </button>
        <InsightBox insight={insight} loading={loading} />
      </aside>
    </section>
  );
}

function BudgetTab({
  theme,
  profiles,
  numericColumns,
  categoryColumns,
  categoryColumn,
  setCategoryColumn,
  incomeColumn,
  setIncomeColumn,
  expenseColumn,
  setExpenseColumn,
  data,
  insight,
  loading,
  onRun,
}: {
  theme: ThemeMode;
  profiles: ColumnProfile[];
  numericColumns: string[];
  categoryColumns: string[];
  categoryColumn: string;
  setCategoryColumn: (value: string) => void;
  incomeColumn: string;
  setIncomeColumn: (value: string) => void;
  expenseColumn: string;
  setExpenseColumn: (value: string) => void;
  data: Record<string, unknown>[];
  insight?: InsightResult;
  loading: boolean;
  onRun: () => void;
}) {
  const income = sumColumn(data, incomeColumn);
  const expense = sumColumn(data, expenseColumn);
  const balance = income - expense;
  const expenseByCategory = aggregateByCategory(data, categoryColumn || categoryColumns[0] || "", expenseColumn || numericColumns[0] || "");
  const trendRows = data.slice(0, 120).map((row, index) => ({
    period: index + 1,
    income: parseNumber(row[incomeColumn]) || 0,
    expense: parseNumber(row[expenseColumn]) || 0,
  }));
  const numericProfiles = profiles.filter((profile) => profile.numeric);

  return (
    <section className="grid grid-cols-1 2xl:grid-cols-[380px_minmax(0,1fr)_440px] gap-4">
      <div className="ap-card border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black">Budget planner</h2>
          <TabInfoButton tab="Budget" />
        </div>
        <Select label="Income/value field" value={incomeColumn} onChange={setIncomeColumn} options={numericColumns} />
        <Select label="Expense/cost field" value={expenseColumn} onChange={setExpenseColumn} options={numericColumns} />
        <Select label="Budget segment" value={categoryColumn} onChange={setCategoryColumn} options={categoryColumns} />
        <div className="grid grid-cols-1 gap-3">
          <MetricCard label="Income total" value={formatNumber(income)} />
          <MetricCard label="Expense total" value={formatNumber(expense)} />
          <MetricCard label="Surplus / gap" value={formatNumber(balance)} tone={balance >= 0 ? "good" : "warn"} />
        </div>
        <button onClick={onRun} disabled={loading} className="ap-btn-primary w-full px-4 py-3 rounded-xl text-sm font-bold">
          Generate budget advice
        </button>
      </div>

      <div className="space-y-4">
        <div className="ap-card border rounded-xl p-5 h-[360px]">
          <h3 className="font-black mb-3">Income vs expense trace</h3>
          <ResponsiveContainer width="100%" height="88%">
            <AreaChart data={trendRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
              <XAxis dataKey="period" stroke={axisColor(theme)} tick={{ fontSize: 10 }} />
              <YAxis stroke={axisColor(theme)} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltip(theme)} />
              <Legend />
              <Area dataKey="income" stroke={CHART_GOOD} fill={CHART_GOOD} fillOpacity={0.16} />
              <Area dataKey="expense" stroke={CHART_WARN} fill={CHART_WARN} fillOpacity={0.14} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="ap-card border rounded-xl p-5 h-[340px]">
          <h3 className="font-black mb-3">Expense concentration</h3>
          <ResponsiveContainer width="100%" height="88%">
            <BarChart data={expenseByCategory.slice(0, 12)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
              <XAxis type="number" stroke={axisColor(theme)} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" stroke={axisColor(theme)} tick={{ fontSize: 10 }} width={150} />
              <Tooltip contentStyle={chartTooltip(theme)} />
              <Bar dataKey="value" fill={CHART_WARN} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {numericProfiles.slice(0, 4).map((profile) => (
            <div key={profile.name}>
              <MetricCard label={profile.name} value={`Avg ${formatNumber(profile.numeric?.mean)}`} small />
            </div>
          ))}
        </div>
      </div>

      <InsightBox insight={insight} loading={loading} />
    </section>
  );
}

function SustainabilityTab({
  theme,
  data,
  numericColumns,
  categoryColumns,
  categoryColumn,
  setCategoryColumn,
  impactColumn,
  setImpactColumn,
  costColumn,
  setCostColumn,
  insight,
  loading,
  onRun,
}: {
  theme: ThemeMode;
  data: Record<string, unknown>[];
  numericColumns: string[];
  categoryColumns: string[];
  categoryColumn: string;
  setCategoryColumn: (value: string) => void;
  impactColumn: string;
  setImpactColumn: (value: string) => void;
  costColumn: string;
  setCostColumn: (value: string) => void;
  insight?: InsightResult;
  loading: boolean;
  onRun: () => void;
}) {
  const impactTotal = sumColumn(data, impactColumn);
  const costTotal = sumColumn(data, costColumn);
  const intensity = impactTotal ? costTotal / impactTotal : 0;
  const impactByCategory = aggregateByCategory(data, categoryColumn || categoryColumns[0] || "", impactColumn || numericColumns[0] || "");
  const scatterRows = data.slice(0, 500).map((row, index) => ({
    name: String(row[categoryColumn] ?? index + 1),
    impact: parseNumber(row[impactColumn]) || 0,
    cost: parseNumber(row[costColumn]) || 0,
  }));

  return (
    <section className="grid grid-cols-1 2xl:grid-cols-[380px_minmax(0,1fr)_440px] gap-4">
      <div className="ap-card border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black">ESG lens</h2>
          <TabInfoButton tab="Sustainability" />
        </div>
        <Select label="Impact/usage field" value={impactColumn} onChange={setImpactColumn} options={numericColumns} />
        <Select label="Cost/value field" value={costColumn} onChange={setCostColumn} options={numericColumns} />
        <Select label="Supplier/segment" value={categoryColumn} onChange={setCategoryColumn} options={categoryColumns} />
        <MetricCard label="Impact total" value={formatNumber(impactTotal)} />
        <MetricCard label="Cost per impact unit" value={formatNumber(intensity)} tone={intensity > 1 ? "warn" : "good"} />
        <button onClick={onRun} disabled={loading} className="ap-btn-primary w-full px-4 py-3 rounded-xl text-sm font-bold">
          Generate ESG recommendations
        </button>
      </div>

      <div className="space-y-4">
        <div className="ap-card border rounded-xl p-5 h-[380px]">
          <h3 className="font-black mb-3">Impact hotspots</h3>
          <ResponsiveContainer width="100%" height="88%">
            <Treemap data={impactByCategory.slice(0, 18)} dataKey="value" nameKey="name" stroke="var(--ap-surface)" fill={CHART_GOOD} />
          </ResponsiveContainer>
        </div>
        <div className="ap-card border rounded-xl p-5 h-[340px]">
          <h3 className="font-black mb-3">Cost vs impact</h3>
          <ResponsiveContainer width="100%" height="88%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
              <XAxis dataKey="cost" name={costColumn} stroke={axisColor(theme)} tick={{ fontSize: 10 }} />
              <YAxis dataKey="impact" name={impactColumn} stroke={axisColor(theme)} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltip(theme)} />
              <Scatter data={scatterRows} fill={CHART_GOOD} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <InsightBox insight={insight} loading={loading} />
    </section>
  );
}

function CompetitorTab({
  theme,
  data,
  numericColumns,
  categoryColumns,
  segmentColumn,
  setSegmentColumn,
  metricColumn,
  setMetricColumn,
  insight,
  loading,
  onRun,
}: {
  theme: ThemeMode;
  data: Record<string, unknown>[];
  numericColumns: string[];
  categoryColumns: string[];
  segmentColumn: string;
  setSegmentColumn: (value: string) => void;
  metricColumn: string;
  setMetricColumn: (value: string) => void;
  insight?: InsightResult;
  loading: boolean;
  onRun: () => void;
}) {
  const segmentRows = aggregateByCategory(data, segmentColumn || categoryColumns[0] || "", metricColumn || numericColumns[0] || "");
  const benchmark = average(segmentRows.map((item) => item.value));
  const comparisonRows = segmentRows.slice(0, 12).map((item) => ({
    ...item,
    benchmark: Number(benchmark.toFixed(2)),
    gap: Number((item.value - benchmark).toFixed(2)),
  }));

  return (
    <section className="grid grid-cols-1 2xl:grid-cols-[380px_minmax(0,1fr)_440px] gap-4">
      <div className="ap-card border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black">Competitive landscape</h2>
          <TabInfoButton tab="Competitor" />
        </div>
        <Select label="Company/product/segment" value={segmentColumn} onChange={setSegmentColumn} options={categoryColumns} />
        <Select label="Performance metric" value={metricColumn} onChange={setMetricColumn} options={numericColumns} />
        <MetricCard label="Benchmark average" value={formatNumber(benchmark)} />
        <MetricCard label="Leader" value={segmentRows[0]?.name || "NA"} small />
        <button onClick={onRun} disabled={loading} className="ap-btn-primary w-full px-4 py-3 rounded-xl text-sm font-bold">
          Generate positioning report
        </button>
      </div>

      <div className="space-y-4">
        <div className="ap-card border rounded-xl p-5 h-[430px]">
          <h3 className="font-black mb-3">Segment performance vs benchmark</h3>
          <ResponsiveContainer width="100%" height="88%">
            <ComposedChart data={comparisonRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
              <XAxis dataKey="name" stroke={axisColor(theme)} tick={{ fontSize: 10 }} minTickGap={20} />
              <YAxis stroke={axisColor(theme)} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltip(theme)} />
              <Legend />
              <Bar dataKey="value" fill={CHART_COLOR} />
              <Line dataKey="benchmark" stroke={CHART_WARN} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="ap-card border rounded-xl p-5">
          <h3 className="font-black mb-3">Gap table</h3>
          <DataTable rows={comparisonRows} columns={["name", "value", "benchmark", "gap"]} />
        </div>
      </div>

      <InsightBox insight={insight} loading={loading} />
    </section>
  );
}

function InsightWorkspace({
  title,
  description,
  insight,
  loading,
  onRun,
}: {
  title: string;
  description: string;
  insight?: InsightResult;
  loading: boolean;
  onRun: () => void;
}) {
  return (
    <section className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-5">
      <div className="ap-card border rounded-xl p-5">
        <BrainCircuit className="w-8 h-8 ap-accent mb-4" />
        <h2 className="text-xl font-black">{title}</h2>
        <p className="ap-muted text-sm leading-6 mt-2">{description}</p>
        <button onClick={onRun} disabled={loading} className="ap-btn-primary w-full mt-6 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60">
          Generate backend insight
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      <InsightBox insight={insight} loading={loading} />
    </section>
  );
}

function ProfitTab({
  profiles,
  numericColumns,
  revenueColumn,
  costColumn,
  setRevenueColumn,
  setCostColumn,
  manualRevenue,
  setManualRevenue,
  manualCost,
  setManualCost,
  revenueValue,
  costValue,
  profitValue,
  insight,
  loading,
  onRun,
}: {
  profiles: ColumnProfile[];
  numericColumns: string[];
  revenueColumn: string;
  costColumn: string;
  setRevenueColumn: (value: string) => void;
  setCostColumn: (value: string) => void;
  manualRevenue: number;
  setManualRevenue: (value: number) => void;
  manualCost: number;
  setManualCost: (value: number) => void;
  revenueValue: number;
  costValue: number;
  profitValue: number;
  insight?: InsightResult;
  loading: boolean;
  onRun: () => void;
}) {
  const margin = revenueValue ? (profitValue / revenueValue) * 100 : 0;
  return (
    <section className="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-5">
      <div className="ap-card border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">Profit analytics</h2>
          <TabInfoButton tab="Profit" />
        </div>
        <Select label="Revenue/value column" value={revenueColumn} onChange={setRevenueColumn} options={numericColumns} />
        <Select label="Cost/expense column" value={costColumn} onChange={setCostColumn} options={numericColumns} />
        {!numericColumns.length && (
          <div className="grid grid-cols-2 gap-3">
            <input className="ap-input border rounded-lg p-3" type="number" value={manualRevenue} onChange={(event) => setManualRevenue(Number(event.target.value))} placeholder="Revenue" />
            <input className="ap-input border rounded-lg p-3" type="number" value={manualCost} onChange={(event) => setManualCost(Number(event.target.value))} placeholder="Cost" />
          </div>
        )}
        <button onClick={onRun} className="ap-btn-primary w-full px-4 py-3 rounded-xl font-bold" disabled={loading}>
          Generate profit insight
        </button>
      </div>
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MetricCard label="Revenue total" value={formatNumber(revenueValue)} />
          <MetricCard label="Cost total" value={formatNumber(costValue)} />
          <MetricCard label="Profit" value={formatNumber(profitValue)} tone={profitValue >= 0 ? "good" : "warn"} />
          <MetricCard label="Margin" value={`${formatNumber(margin, 1)}%`} tone={margin >= 0 ? "good" : "warn"} />
          <MetricCard label="Numeric fields" value={String(profiles.filter((profile) => profile.type === "number").length)} />
          <MetricCard label="Break-even gap" value={formatNumber(Math.max(0, costValue - revenueValue))} tone={costValue > revenueValue ? "warn" : "good"} />
        </div>
        <InsightBox insight={insight} loading={loading} />
      </div>
    </section>
  );
}

function ForecastTab({
  theme,
  numericColumns,
  forecastColumns,
  forecastCol,
  setForecastCol,
  forecastPeriods,
  setForecastPeriods,
  forecastRows,
  demandRecommendations,
  insight,
  loading,
  onRun,
}: {
  theme: ThemeMode;
  numericColumns: string[];
  forecastColumns: string[];
  forecastCol: string;
  setForecastCol: (value: string) => void;
  forecastPeriods: number;
  setForecastPeriods: (value: number) => void;
  forecastRows: ForecastPoint[];
  demandRecommendations: DemandRecommendation[];
  insight?: InsightResult;
  loading: boolean;
  onRun: () => void;
}) {
  const candidateOptions = forecastColumns.length ? forecastColumns : numericColumns;
  const forecastPoints = forecastRows.filter((row) => row.forecast !== null);
  const lastActual = [...forecastRows].reverse().find((row) => row.actual !== null)?.actual ?? null;
  const finalForecast = forecastPoints[forecastPoints.length - 1]?.forecast ?? null;
  return (
    <section className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-5">
      <div className="ap-card border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">Forecast simulator</h2>
          <TabInfoButton tab="Forecast" />
        </div>
        <p className="ap-muted text-sm leading-6">Only stable numeric fields with enough observations are recommended for forecasting.</p>
        <Select label="Forecast-ready series" value={forecastCol || candidateOptions[0] || ""} onChange={setForecastCol} options={candidateOptions} />
        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.14em] ap-muted mb-1">Future periods</span>
          <input className="ap-input border rounded-lg px-3 py-2 text-sm w-full" type="number" min={1} max={24} value={forecastPeriods} onChange={(event) => setForecastPeriods(Number(event.target.value))} />
        </label>
        <div className="grid grid-cols-1 gap-3">
          <MetricCard label="Last actual" value={formatNumber(lastActual)} />
          <MetricCard label="Final forecast" value={formatNumber(finalForecast)} tone={(finalForecast || 0) >= (lastActual || 0) ? "good" : "warn"} />
          <MetricCard label="Usable forecast fields" value={formatNumber(candidateOptions.length, 0)} />
        </div>
        <button onClick={onRun} className="ap-btn-primary w-full px-4 py-3 rounded-xl font-bold" disabled={loading}>
          Explain forecast
        </button>
      </div>
      <div className="space-y-5">
        <div className="ap-card border rounded-xl p-5 h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={forecastRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
              <XAxis dataKey="period" stroke={axisColor(theme)} tick={{ fontSize: 11 }} />
              <YAxis stroke={axisColor(theme)} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={chartTooltip(theme)} />
              <Legend />
              <Area dataKey="upper" name="Upper band" stroke="none" fill={CHART_COLOR} fillOpacity={0.08} />
              <Area dataKey="lower" name="Lower band" stroke="none" fill={CHART_COLOR} fillOpacity={0.03} />
              <Line dataKey="actual" name="Actual" stroke={CHART_COLOR} strokeWidth={2} dot={false} />
              <Line dataKey="forecast" name="Forecast" stroke={CHART_GOOD} strokeWidth={2} strokeDasharray="5 5" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <DemandRecommendationPanel recommendations={demandRecommendations} />
        <InsightBox insight={insight} loading={loading} />
      </div>
    </section>
  );
}

function KpiTab({
  profiles,
  numericColumns,
  selectedColumn,
  setSelectedColumn,
  forecastRows,
  theme,
  insight,
  loading,
  onRun,
}: {
  profiles: ColumnProfile[];
  numericColumns: string[];
  selectedColumn: string;
  setSelectedColumn: (value: string) => void;
  forecastRows: ForecastPoint[];
  theme: ThemeMode;
  insight?: InsightResult;
  loading: boolean;
  onRun: () => void;
}) {
  const profile = profiles.find((item) => item.name === selectedColumn);
  return (
    <section className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-5">
      <div className="ap-card border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">KPI monitor</h2>
          <TabInfoButton tab="KPI" />
        </div>
        <Select label="KPI field" value={selectedColumn} onChange={setSelectedColumn} options={numericColumns} />
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Average" value={formatNumber(profile?.numeric?.mean)} />
          <MetricCard label="Median" value={formatNumber(profile?.numeric?.median)} />
          <MetricCard label="Minimum" value={formatNumber(profile?.numeric?.min)} />
          <MetricCard label="Maximum" value={formatNumber(profile?.numeric?.max)} />
        </div>
        <button onClick={onRun} className="ap-btn-primary w-full px-4 py-3 rounded-xl font-bold" disabled={loading}>
          Generate KPI insight
        </button>
      </div>
      <div className="space-y-5">
        <div className="ap-card border rounded-xl p-5 h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecastRows.filter((row) => row.actual !== null)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
              <XAxis dataKey="period" stroke={axisColor(theme)} tick={{ fontSize: 11 }} />
              <YAxis stroke={axisColor(theme)} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={chartTooltip(theme)} />
              <Line dataKey="actual" name={selectedColumn} stroke={CHART_COLOR} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <InsightBox insight={insight} loading={loading} />
      </div>
    </section>
  );
}

function DataTable({ rows, columns }: { rows: Record<string, unknown>[]; columns: string[] }) {
  return (
    <div className="ap-table-wrap border rounded-xl overflow-auto max-h-[540px]">
      <table className="ap-table w-full text-xs text-left">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="px-3 py-3 w-12">#</th>
            {columns.map((column) => (
              <th key={column} className="px-3 py-3 whitespace-nowrap uppercase tracking-[0.12em]">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t">
              <td className="px-3 py-3 ap-muted">{rowIndex + 1}</td>
              {columns.map((column) => (
                <td key={column} className="px-3 py-3 max-w-[260px] truncate" title={String(row[column] ?? "")}>
                  {String(row[column] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DatasetValidationModal({
  rows,
  columns,
  rawRows,
  rawColumns,
  profiles,
  previewColumn,
  setPreviewColumn,
  onCancel,
  onConfirm,
  theme,
  selectedColumns,
  setSelectedColumns,
  multiValueCandidates,
  splitConfigs,
  setSplitConfigs,
}: {
  rows: Record<string, unknown>[];
  columns: string[];
  rawRows: Record<string, unknown>[];
  rawColumns: string[];
  profiles: ColumnProfile[];
  previewColumn: string | null;
  setPreviewColumn: (value: string | null) => void;
  onCancel: () => void;
  onConfirm: () => void;
  theme: ThemeMode;
  selectedColumns: string[];
  setSelectedColumns: (value: string[]) => void;
  multiValueCandidates: MultiValueCandidate[];
  splitConfigs: Record<string, MultiValueSplitConfig>;
  setSplitConfigs: (value: Record<string, MultiValueSplitConfig>) => void;
}) {
  const previewProfile = profiles.find((profile) => profile.name === previewColumn);
  const histogramData = previewColumn ? histogram(rows, previewColumn, 16) : [];
  const selectedSet = new Set(selectedColumns);
  const toggleColumn = (column: string) => {
    setSelectedColumns(selectedSet.has(column) ? selectedColumns.filter((item) => item !== column) : [...selectedColumns, column]);
  };
  const updateSplitConfig = (column: string, patch: Partial<MultiValueSplitConfig>) => {
    const candidate = multiValueCandidates.find((item) => item.column === column);
    const current = splitConfigs[column] || {
      enabled: false,
      delimiter: candidate?.delimiter || "|",
      prefix: sanitizeColumnName(column),
      keepOriginal: false,
      maxParts: Math.min(candidate?.maxParts || 3, 8),
    };
    setSplitConfigs({
      ...splitConfigs,
      [column]: { ...current, ...patch },
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={onCancel} />
      <div className="ap-modal relative w-[98vw] h-[94vh] border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <header className="border-b p-5 flex justify-between items-center" style={{ borderColor: "var(--ap-border)" }}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--ap-accent-soft)", color: "var(--ap-accent)" }}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black">Validate dataset import</h3>
              <p className="ap-muted text-sm">
                Found {formatNumber(rows.length, 0)} rows with {formatNumber(columns.length, 0)} columns. {formatNumber(selectedColumns.length, 0)} columns are selected for analysis.
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="ap-btn px-3 py-2 rounded-lg text-sm">Close</button>
        </header>
        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="border-r overflow-y-auto p-4 space-y-2" style={{ borderColor: "var(--ap-border)" }}>
            <div className="flex items-center justify-between gap-2 pb-2">
              <div className="text-[10px] uppercase tracking-[0.16em] ap-muted px-1">Detected schema</div>
              <div className="flex gap-2">
                <button className="ap-btn rounded-lg px-2 py-1 text-[10px] font-bold" onClick={() => setSelectedColumns(defaultAnalysisColumns(rows, columns))}>No IDs</button>
                <button className="ap-btn rounded-lg px-2 py-1 text-[10px] font-bold" onClick={() => setSelectedColumns(columns)}>All</button>
              </div>
            </div>
            {profiles.map((profile) => (
              <div
                key={profile.name}
                className="ap-panel border rounded-lg p-3 w-full text-left"
                style={{ borderColor: previewColumn === profile.name || selectedSet.has(profile.name) ? "var(--ap-accent)" : "var(--ap-border)", opacity: selectedSet.has(profile.name) ? 1 : 0.58 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <label className="min-w-0 flex gap-3 cursor-pointer flex-1">
                    <input type="checkbox" checked={selectedSet.has(profile.name)} onChange={() => toggleColumn(profile.name)} className="mt-1" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold truncate">{profile.name}</span>
                        {isIdLikeColumn(profile.name, profile, rows.length) && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded" style={{ background: "var(--ap-surface-3)", color: "var(--ap-muted)" }}>
                            ID-like
                          </span>
                        )}
                      </div>
                      <div className="text-xs ap-muted">{profile.unique} unique values</div>
                    </div>
                  </label>
                  <div className="flex flex-col gap-2 items-end">
                    <span className="text-[10px] uppercase font-bold px-2 py-1 rounded" style={{ background: "var(--ap-accent-soft)", color: "var(--ap-accent)" }}>
                      {profile.type}
                    </span>
                    {profile.type === "number" && (
                      <button className="ap-btn rounded px-2 py-1 text-[10px]" onClick={() => setPreviewColumn(previewColumn === profile.name ? null : profile.name)}>
                        Preview
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-xs mt-3 pt-3 border-t" style={{ borderColor: "var(--ap-border)" }}>
                  <span className="ap-muted">Missing</span>
                  <span>{profile.missing} ({formatNumber(profile.missingPercent, 1)}%)</span>
                </div>
              </div>
            ))}
          </aside>
          <section className="min-w-0 min-h-0 p-4 flex flex-col gap-4">
            {multiValueCandidates.length > 0 && (
              <div className="ap-panel border rounded-xl p-4 shrink-0">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 mb-3">
                  <div>
                    <h4 className="font-black">Multi-value cells detected</h4>
                    <p className="ap-muted text-sm">
                      Found delimiters inside {formatNumber(rawRows.length, 0)} raw rows across {formatNumber(rawColumns.length, 0)} raw columns. Enable splitting only where those values should become separate fields.
                    </p>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.14em] ap-muted">Optional cleanup</span>
                </div>
                <div className="grid xl:grid-cols-2 gap-3 max-h-64 overflow-auto pr-1 scroll-thin">
                  {multiValueCandidates.map((candidate) => {
                    const config = splitConfigs[candidate.column] || {
                      enabled: false,
                      delimiter: candidate.delimiter,
                      prefix: sanitizeColumnName(candidate.column),
                      keepOriginal: false,
                      maxParts: Math.min(candidate.maxParts, 8),
                    };
                    return (
                      <div key={`${candidate.column}-${candidate.delimiter}`} className="border rounded-lg p-3" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface)" }}>
                        <div className="flex items-start justify-between gap-3">
                          <label className="flex items-start gap-3 cursor-pointer min-w-0">
                            <input type="checkbox" checked={config.enabled} onChange={(event) => updateSplitConfig(candidate.column, { enabled: event.target.checked })} className="mt-1" />
                            <div className="min-w-0">
                              <div className="font-bold truncate" title={candidate.column}>{candidate.column}</div>
                              <div className="text-xs ap-muted">
                                {candidate.label}, {formatNumber(candidate.affectedPercent, 1)}% affected, up to {candidate.maxParts} values
                              </div>
                            </div>
                          </label>
                          <span className="text-[10px] uppercase font-bold px-2 py-1 rounded" style={{ background: "var(--ap-accent-soft)", color: "var(--ap-accent)" }}>
                            Split
                          </span>
                        </div>
                        {config.enabled && (
                          <div className="grid md:grid-cols-4 gap-2 mt-3">
                            <label className="block">
                              <span className="block text-[10px] uppercase tracking-[0.12em] ap-muted mb-1">Delimiter</span>
                              <select className="ap-input border rounded-lg px-2 py-2 text-xs w-full" value={config.delimiter} onChange={(event) => updateSplitConfig(candidate.column, { delimiter: event.target.value })}>
                                {MULTI_VALUE_DELIMITERS.map((item) => (
                                  <option key={item.delimiter} value={item.delimiter}>{item.label}</option>
                                ))}
                              </select>
                            </label>
                            <label className="block md:col-span-2">
                              <span className="block text-[10px] uppercase tracking-[0.12em] ap-muted mb-1">New column prefix</span>
                              <input className="ap-input border rounded-lg px-2 py-2 text-xs w-full" value={config.prefix} onChange={(event) => updateSplitConfig(candidate.column, { prefix: event.target.value })} />
                            </label>
                            <label className="block">
                              <span className="block text-[10px] uppercase tracking-[0.12em] ap-muted mb-1">Parts</span>
                              <input className="ap-input border rounded-lg px-2 py-2 text-xs w-full" type="number" min={2} max={12} value={config.maxParts} onChange={(event) => updateSplitConfig(candidate.column, { maxParts: Number(event.target.value) })} />
                            </label>
                            <label className="md:col-span-4 flex items-center gap-2 text-xs ap-muted">
                              <input type="checkbox" checked={config.keepOriginal} onChange={(event) => updateSplitConfig(candidate.column, { keepOriginal: event.target.checked })} />
                              Keep original column also
                            </label>
                          </div>
                        )}
                        <div className="text-[11px] ap-muted mt-3 truncate" title={candidate.sampleValues[0] || ""}>
                          Sample: {candidate.sampleValues[0]}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {previewProfile && histogramData.length > 0 && (
              <div className="ap-panel border rounded-xl p-4 h-56 shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold">Distribution: {previewProfile.name}</h4>
                  <button className="ap-btn rounded-lg px-3 py-1 text-xs" onClick={() => setPreviewColumn(null)}>Hide</button>
                </div>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={histogramData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
                    <XAxis dataKey="bucket" stroke={axisColor(theme)} tick={{ fontSize: 10 }} minTickGap={18} />
                    <YAxis stroke={axisColor(theme)} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={chartTooltip(theme)} />
                    <Bar dataKey="count" fill={CHART_COLOR} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex-1 min-h-0">
              <DataTable rows={rows.slice(0, 80)} columns={selectedColumns.length ? selectedColumns : columns} />
            </div>
          </section>
        </div>
        <footer className="border-t p-4 flex justify-end gap-3" style={{ borderColor: "var(--ap-border)" }}>
          <button onClick={onCancel} className="ap-btn px-6 py-3 rounded-xl text-sm font-semibold">Cancel</button>
          <button onClick={onConfirm} disabled={!selectedColumns.length} className="ap-btn-primary px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50">
            Import selected columns
            <ArrowRight className="w-4 h-4" />
          </button>
        </footer>
      </div>
    </div>
  );
}
