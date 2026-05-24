import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart2,
  BrainCircuit,
  ChartDonut,
  CheckCircle2,
  Compass,
  Database,
  DollarSign,
  Download,
  FileSpreadsheet,
  HelpCircle,
  Leaf,
  Lightbulb,
  LogOut,
  MessageSquare,
  Moon,
  PieChart as PieChartIcon,
  Send,
  Shield,
  Sun,
  Table,
  Target,
  TrendingUp,
  UploadCloud,
  X,
} from "lucide-react";
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
import { apiUrl } from "../config";

type ThemeMode = "dark" | "light";
type TabType =
  | "Overview"
  | "Charts"
  | "AI"
  | "Chat"
  | "Ideas"
  | "Profit"
  | "Forecast"
  | "Budget"
  | "Sustainability"
  | "Competitor"
  | "KPI";

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

interface PlatformDashboardProps {
  userEmail: string;
  onLogout: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
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
  savedAt: number;
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

const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: "Overview", label: "Overview", icon: <FileSpreadsheet className="w-4 h-4" /> },
  { id: "Charts", label: "Visual Analytics", icon: <BarChart2 className="w-4 h-4" /> },
  { id: "AI", label: "AI Insights", icon: <BrainCircuit className="w-4 h-4" /> },
  { id: "Chat", label: "Data Chat", icon: <MessageSquare className="w-4 h-4" /> },
  { id: "Ideas", label: "Ideas", icon: <Lightbulb className="w-4 h-4" /> },
  { id: "Profit", label: "Profit", icon: <DollarSign className="w-4 h-4" /> },
  { id: "Forecast", label: "Forecast", icon: <TrendingUp className="w-4 h-4" /> },
  { id: "Budget", label: "Budget", icon: <PieChartIcon className="w-4 h-4" /> },
  { id: "Sustainability", label: "ESG", icon: <Leaf className="w-4 h-4" /> },
  { id: "Competitor", label: "Competitor", icon: <Shield className="w-4 h-4" /> },
  { id: "KPI", label: "KPI", icon: <Target className="w-4 h-4" /> },
];

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
      savedAt: Number(parsed.savedAt || Date.now()),
    };
  } catch {
    return null;
  }
}

function saveWorkspaceSnapshot(userEmail: string, snapshot: WorkspaceSnapshot) {
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

export default function PlatformDashboard({ userEmail, onLogout, theme, onToggleTheme }: PlatformDashboardProps) {
  const savedWorkspace = useMemo(() => readWorkspaceSnapshot(userEmail), [userEmail]);
  const [activeTab, setActiveTab] = useState<TabType>("Overview");
  const [data, setData] = useState<Record<string, unknown>[]>(() => savedWorkspace?.data || []);
  const [allColumns, setAllColumns] = useState<string[]>(() => savedWorkspace?.allColumns || savedWorkspace?.columns || []);
  const [columns, setColumns] = useState<string[]>(() => savedWorkspace?.columns || []);
  const [fileName, setFileName] = useState(() => savedWorkspace?.fileName || "");
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

  useEffect(() => {
    if (!data.length || !allColumns.length || !columns.length) return;
    saveWorkspaceSnapshot(userEmail, {
      data,
      allColumns,
      columns,
      fileName,
      savedAt: Date.now(),
    });
  }, [userEmail, data, allColumns, columns, fileName]);

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
    setLoadingInsight(mode);
    try {
      const response = await fetch(apiUrl("/api/dataset/insights"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          question,
          context,
          columns: cols,
          rows: rows.slice(0, 1500),
        }),
      });
      if (!response.ok) throw new Error("Insight API failed.");
      const result = await response.json();
      setInsights((prev) => ({
        ...prev,
        [mode]: { answer: result.answer, source: result.source },
      }));
    } catch {
      setInsights((prev) => ({
        ...prev,
        [mode]: {
          answer: "The backend insight service could not be reached. Run .\\start-dev.ps1 from the Adviso_ai folder and try again.",
          source: "local",
        },
      }));
    } finally {
      setLoadingInsight(null);
    }
  };

  const processFile = (file: File) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      complete: (results) => {
        const fields = results.meta.fields || [];
        const defaultColumns = defaultAnalysisColumns(results.data, fields);
        const detectedMultiValueColumns = detectMultiValueColumns(results.data, fields);
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
        setStagedData(results.data);
        setStagedColumns(fields);
        setSelectedStagedColumns(defaultColumns);
        setStagedSplitConfigs(initialSplitConfigs);
        setPreviewColumn(null);
      },
    });
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

  const handleChatSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const question = chatInput.trim();
    if (!question || isChatLoading) return;
    setChatMessages((prev) => [...prev, { role: "user", content: question }]);
    setChatInput("");
    setIsChatLoading(true);
    try {
      const response = await fetch(apiUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, columns, rows: data.slice(0, 1500) }),
      });
      if (!response.ok) throw new Error("Chat API failed.");
      const result = await response.json();
      setChatMessages((prev) => [...prev, { role: "assistant", content: result.answer, source: result.source }]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "The backend chat endpoint is not reachable. Start the Python backend and try again.",
          source: "local",
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
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

  return (
    <div className={`adviso-platform ${theme} min-h-screen flex flex-col font-sans`}>
      <header className="ap-header h-16 border-b px-5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <Logo size="md" className="text-[var(--ap-text)]" />
            <div className="text-[10px] uppercase tracking-[0.18em] ap-muted pl-[3.25rem] -mt-1">Platform workspace</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="ap-btn-primary cursor-pointer text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition">
            <UploadCloud className="w-4 h-4" />
            Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={(event) => event.target.files?.[0] && processFile(event.target.files[0])} />
          </label>
          {isDataLoaded && (
            <button onClick={exportCsv} className="ap-btn text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          )}
          <button onClick={onToggleTheme} className="ap-btn text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-2">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          <div className="hidden md:block text-xs ap-muted px-3 py-2 rounded-lg border" style={{ borderColor: "var(--ap-border)" }}>
            {userEmail}
          </div>
          <button onClick={onLogout} className="ap-btn p-2 rounded-lg" aria-label="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="ap-sidebar w-64 border-r p-3 overflow-y-auto hidden lg:block">
          <div className="text-[10px] uppercase tracking-[0.18em] ap-muted px-2 py-2">Modules</div>
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  activeTab === tab.id ? "ap-btn-primary" : "ap-btn"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-y-auto p-3 xl:p-4">
          {!isDataLoaded && !stagedData && (
            <UploadEmptyState
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
            />
          )}

          {isDataLoaded && (
            <div className="space-y-4">
              <nav className="lg:hidden flex gap-2 overflow-x-auto pb-1">
                {tabs.map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`shrink-0 px-3 py-2 rounded-lg text-xs ${activeTab === tab.id ? "ap-btn-primary" : "ap-btn"}`}>
                    {tab.label}
                  </button>
                ))}
              </nav>

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
                <ChatTab messages={chatMessages} input={chatInput} setInput={setChatInput} loading={isChatLoading} onSubmit={handleChatSubmit} />
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
            </div>
          )}
        </main>
      </div>

      {stagedData && (
        <DatasetValidationModal
          rows={stagedPrepared.rows}
          columns={stagedPrepared.columns}
          rawRows={stagedData}
          rawColumns={stagedColumns}
          profiles={stagedProfiles}
          previewColumn={previewColumn}
          setPreviewColumn={setPreviewColumn}
          onCancel={() => {
          setStagedData(null);
          setStagedColumns([]);
          setSelectedStagedColumns([]);
          setStagedSplitConfigs({});
          setPreviewColumn(null);
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

function UploadEmptyState({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFile,
}: {
  isDragging: boolean;
  onDragOver: React.DragEventHandler<HTMLDivElement>;
  onDragLeave: React.DragEventHandler<HTMLDivElement>;
  onDrop: React.DragEventHandler<HTMLDivElement>;
  onFile: (file: File) => void;
}) {
  return (
    <div className="min-h-[calc(100vh-7rem)] flex items-center justify-center">
      <div
        className={`ap-card border rounded-2xl w-full max-w-5xl p-10 text-center transition ${isDragging ? "ring-4" : ""}`}
        style={{ boxShadow: "0 24px 70px rgba(15,23,42,.08)" }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <Database className="w-12 h-12 mx-auto ap-accent mb-4" />
        <h1 className="text-3xl font-black tracking-tight mb-2">Import a CSV to start analysis</h1>
        <p className="ap-muted max-w-2xl mx-auto text-sm leading-relaxed">
          Upload a CSV and Adviso AI will profile columns, create BI charts, forecast numeric fields, and send dataset summaries to the backend insight engine.
        </p>
        <label className="ap-btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold mt-7 cursor-pointer">
          <UploadCloud className="w-4 h-4" />
          Select CSV file
          <input type="file" accept=".csv" className="hidden" onChange={(event) => event.target.files?.[0] && onFile(event.target.files[0])} />
        </label>
      </div>
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

function ChatTab({
  messages,
  input,
  setInput,
  loading,
  onSubmit,
}: {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  loading: boolean;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <section className="ap-card border rounded-xl h-[calc(100vh-13rem)] min-h-[560px] flex flex-col overflow-hidden">
      <div className="border-b p-4" style={{ borderColor: "var(--ap-border)" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-black">Data chat</h2>
            <p className="ap-muted text-sm">Ask natural-language questions. The Python backend answers from the uploaded rows and can use OpenAI when configured.</p>
          </div>
          <TabInfoButton tab="Chat" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && (
          <div className="ap-panel border rounded-xl p-5 text-sm ap-muted">
            Try: "Which columns have missing values?", "Summarize rating", or "What actions should I take from this data?"
          </div>
        )}
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[78%] rounded-xl border p-4 text-sm leading-7 ${message.role === "user" ? "ap-btn-primary" : "ap-panel"}`}>
              {message.role === "assistant" ? (
                <div className="space-y-4">
                  {message.source && <InsightSourceBadge source={message.source} />}
                  <FormattedInsight content={message.content} />
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{message.content}</div>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-sm ap-muted">Backend is analyzing...</div>}
      </div>
      <form onSubmit={onSubmit} className="border-t p-4 flex gap-2" style={{ borderColor: "var(--ap-border)" }}>
        <input className="ap-input border rounded-xl px-4 py-3 flex-1 text-sm" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask a question about the uploaded CSV" />
        <button className="ap-btn-primary rounded-xl px-4 py-3" disabled={loading || !input.trim()} aria-label="Send question">
          <Send className="w-4 h-4" />
        </button>
      </form>
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
