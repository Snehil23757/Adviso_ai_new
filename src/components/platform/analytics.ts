import type { ColumnProfile, DemandRecommendation, ForecastPoint, MultiValueCandidate, MultiValueSplitConfig } from "./types";
import { MULTI_VALUE_DELIMITERS } from "./types";

// ─── number helpers ────────────────────────────────────────────────────────────

export function parseNumber(value: unknown): number | null {
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
  if (/^\([+-]?\d+(\.\d+)?\)$/.test(cleaned)) cleaned = `-${cleaned.slice(1, -1)}`;
  if (!/^[+-]?\d+(\.\d+)?$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isBlank(value: unknown) {
  return value === null || value === undefined || value === "";
}

export function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "NA";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}

export function average(values: number[]) {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
}

export function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function sumColumn(rows: Record<string, unknown>[], column: string) {
  return rows.reduce((s, r) => s + (parseNumber(r[column]) || 0), 0);
}

// ─── column profiling ──────────────────────────────────────────────────────────

export function profileColumns(rows: Record<string, unknown>[], columns: string[]): ColumnProfile[] {
  return columns.map((column) => {
    const values = rows.map((r) => r[column]);
    const present = values.filter((v) => !isBlank(v));
    const numVals = present.map(parseNumber).filter((v): v is number => v !== null);
    const numRatio = present.length ? numVals.length / present.length : 0;
    const counts = new Map<string, number>();
    present.forEach((v) => { const k = String(v); counts.set(k, (counts.get(k) || 0) + 1); });
    const topValues = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([value, count]) => ({ value, count }));
    const missing = values.length - present.length;
    const isNumeric = numVals.length > 0 && numRatio >= 0.6;
    if (!isNumeric) {
      return { name: column, type: "category", missing, missingPercent: rows.length ? (missing / rows.length) * 100 : 0, unique: counts.size, topValues };
    }
    const sorted = [...numVals].sort((a, b) => a - b);
    return {
      name: column, type: "number", missing, missingPercent: rows.length ? (missing / rows.length) * 100 : 0, unique: counts.size,
      numeric: { count: numVals.length, min: sorted[0], max: sorted[sorted.length - 1], sum: numVals.reduce((s, v) => s + v, 0), mean: average(numVals), median: median(numVals) },
      topValues,
    };
  });
}

export function aggregateByCategory(rows: Record<string, unknown>[], catCol: string, valCol: string) {
  const totals = new Map<string, number>();
  rows.forEach((row) => {
    const label = String(row[catCol] ?? "Unclassified").slice(0, 80);
    const value = parseNumber(row[valCol]) ?? 1;
    totals.set(label, (totals.get(label) || 0) + value);
  });
  return [...totals.entries()].map(([name, value]) => ({ name, value: Number(value.toFixed(2)) })).sort((a, b) => b.value - a.value).slice(0, 15);
}

export function histogram(rows: Record<string, unknown>[], column: string, bins = 14) {
  const values = rows.map((r) => parseNumber(r[column])).filter((v): v is number => v !== null);
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = max === min ? 1 : (max - min) / bins;
  const counts = new Array(bins).fill(0);
  values.forEach((v) => { const i = Math.min(bins - 1, Math.floor((v - min) / width)); counts[i]++; });
  return counts.map((count, i) => {
    const start = min + i * width;
    return { bucket: `${formatNumber(start, 1)}-${formatNumber(start + width, 1)}`, count };
  });
}

export function densityRows(rows: Record<string, unknown>[], column: string) {
  const values = rows.map((r) => parseNumber(r[column])).filter((v): v is number => v !== null);
  if (values.length < 3) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const std = Math.sqrt(average(values.map((v) => (v - average(values)) ** 2))) || 1;
  const bw = Math.max((1.06 * std) / Math.pow(values.length, 0.2), (max - min) / 80 || 1);
  return Array.from({ length: 80 }, (_, i) => {
    const x = min + ((max - min || 1) * i) / 79;
    const density = values.reduce((s, v) => { const z = (x - v) / bw; return s + Math.exp(-0.5 * z * z); }, 0) / (values.length * bw * Math.sqrt(2 * Math.PI));
    return { x: Number(x.toFixed(2)), density: Number(density.toFixed(6)) };
  });
}

export function correlationRows(rows: Record<string, unknown>[], numCols: string[]) {
  const limited = numCols.slice(0, 6);
  const pairs: { x: string; y: string; value: number }[] = [];
  limited.forEach((a) => {
    limited.forEach((b) => {
      const series = rows.map((r) => [parseNumber(r[a]), parseNumber(r[b])] as const).filter(([x, y]) => x !== null && y !== null) as [number, number][];
      if (series.length < 2) { pairs.push({ x: a, y: b, value: 0 }); return; }
      const xs = series.map(([x]) => x);
      const ys = series.map(([, y]) => y);
      const xAvg = average(xs), yAvg = average(ys);
      const num = series.reduce((s, [x, y]) => s + (x - xAvg) * (y - yAvg), 0);
      const den = Math.sqrt(xs.reduce((s, x) => s + (x - xAvg) ** 2, 0)) * Math.sqrt(ys.reduce((s, y) => s + (y - yAvg) ** 2, 0)) || 1;
      pairs.push({ x: a, y: b, value: Number((num / den).toFixed(2)) });
    });
  });
  return pairs;
}

export function hypothesisTest(rows: Record<string, unknown>[], catCol: string, valCol: string) {
  const groups = aggregateByCategory(rows, catCol, valCol).slice(0, 2).map((i) => i.name);
  if (groups.length < 2) return null;
  const series = groups.map((g) => rows.filter((r) => String(r[catCol] ?? "Unclassified").slice(0, 80) === g).map((r) => parseNumber(r[valCol])).filter((v): v is number => v !== null));
  if (series[0].length < 2 || series[1].length < 2) return null;
  const [a, b] = series;
  const meanA = average(a), meanB = average(b);
  const variance = (vs: number[]) => { const avg = average(vs); return vs.length > 1 ? vs.reduce((s, v) => s + (v - avg) ** 2, 0) / (vs.length - 1) : 0; };
  const varA = variance(a), varB = variance(b);
  const se = Math.sqrt(varA / a.length + varB / b.length) || 1;
  const tScore = (meanA - meanB) / se;
  const pooledStd = Math.sqrt((varA + varB) / 2) || 1;
  return { groupA: groups[0], groupB: groups[1], meanA, meanB, difference: meanA - meanB, tScore, effectSize: (meanA - meanB) / pooledStd, verdict: Math.abs(tScore) >= 2 ? "Likely meaningful difference" : "Difference is weak or inconclusive" };
}

export function forecastSeries(rows: Record<string, unknown>[], column: string, periods: number): ForecastPoint[] {
  const values = rows.map((r) => parseNumber(r[column])).filter((v): v is number => v !== null);
  if (!values.length) return [];
  const n = values.length;
  const xs = values.map((_, i) => i);
  const xMean = average(xs), yMean = average(values);
  const num = xs.reduce((s, x, i) => s + (x - xMean) * (values[i] - yMean), 0);
  const den = xs.reduce((s, x) => s + (x - xMean) ** 2, 0) || 1;
  const regSlope = num / den;
  const intercept = yMean - regSlope * xMean;
  const deltas = values.slice(1).map((v, i) => v - values[i]);
  const robustSlope = median(deltas);
  const slope = Number.isFinite(robustSlope) ? regSlope * 0.45 + robustSlope * 0.55 : regSlope;
  const residuals = values.map((v, i) => v - (intercept + regSlope * i));
  const mad = median(residuals.map((v) => Math.abs(v - median(residuals)))) || Math.sqrt(average(residuals.map((v) => v ** 2))) || 0;
  const interval = Math.max(mad * 1.4826, Math.abs(slope) * 0.5);
  const actual = values.slice(Math.max(0, n - 60)).map((v, i) => ({ period: `A${i + 1}`, actual: Number(v.toFixed(2)), forecast: null, lower: null, upper: null }));
  const future = Array.from({ length: periods }, (_, i) => {
    const y = values[n - 1] + slope * (i + 1);
    const spread = interval * Math.sqrt(i + 1);
    return { period: `F${i + 1}`, actual: null, forecast: Number(y.toFixed(2)), lower: Number((y - spread).toFixed(2)), upper: Number((y + spread).toFixed(2)) };
  });
  return [...actual, ...future];
}

export function buildDemandRecommendations(rows: Record<string, unknown>[], columns: string[]): DemandRecommendation[] {
  const find = (patterns: RegExp[]) => columns.find((c) => patterns.some((p) => p.test(c.toLowerCase())));
  const productCol = find([/product.*name/, /^product$/, /item.*name/, /^item$/, /title/, /name/]);
  const ratingCol = find([/^rating$/, /average.*rating/, /stars?$/]);
  const ratingCountCol = find([/rating.*count/, /review.*count/, /ratings?$/, /reviews?$/]);
  const priceCol = find([/discount.*price/, /sale.*price/, /^price$/, /actual.*price/, /unit.*price/, /revenue/, /sales/]) || columns.find((c) => c.toLowerCase().includes("price"));
  if (!productCol || !ratingCol) return [];
  const grouped = new Map<string, { ratings: number[]; ratingCount: number; prices: number[]; rows: number }>();
  rows.forEach((row) => {
    const item = String(row[productCol] ?? "").trim();
    const rating = parseNumber(row[ratingCol]);
    if (!item || rating === null) return;
    const ratingCount = ratingCountCol ? parseNumber(row[ratingCountCol]) ?? 0 : 0;
    const price = priceCol ? parseNumber(row[priceCol]) : null;
    const cur = grouped.get(item) || { ratings: [], ratingCount: 0, prices: [], rows: 0 };
    cur.ratings.push(rating);
    cur.ratingCount = Math.max(cur.ratingCount, ratingCount);
    if (price !== null) cur.prices.push(price);
    cur.rows++;
    grouped.set(item, cur);
  });
  return [...grouped.entries()].map(([item, s]) => {
    const rating = average(s.ratings);
    const ratingCount = s.ratingCount || s.rows;
    const price = s.prices.length ? average(s.prices) : 0;
    const lift = Math.max(0, rating - 3.5);
    const boost = Math.min(0.025, Math.log10(ratingCount + 1) * 0.004);
    const conversionRate = Math.min(0.09, 0.012 + lift * 0.018 + boost);
    const expectedBuyers = Math.max(1, Math.round(ratingCount * conversionRate));
    const forecastRevenue = expectedBuyers * price;
    const confidence: DemandRecommendation["confidence"] = ratingCount >= 1000 ? "High" : ratingCount >= 100 ? "Medium" : "Low";
    return { item, rating, ratingCount, price, conversionRate, expectedBuyers, forecastRevenue, confidence, reason: rating >= 4.2 ? "High rating with review signal" : rating >= 4 ? "Positive rating with demand evidence" : "Moderate rating, validate before scaling" };
  }).filter((i) => i.rating >= 3.8).sort((a, b) => b.forecastRevenue - a.forecastRevenue || b.expectedBuyers - a.expectedBuyers).slice(0, 8);
}

export function findColumn(columns: string[], patterns: RegExp[]) {
  return columns.find((c) => patterns.some((p) => p.test(c.toLowerCase())));
}

// ─── column management ─────────────────────────────────────────────────────────

export function isIdLikeColumn(column: string, profile?: ColumnProfile, rowCount = 0) {
  const n = column.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const nameLike = n === "id" || n.endsWith("_id") || n.startsWith("id_") || n.includes("_id_") || n.includes("uuid") || n.includes("guid") || n.includes("identifier") || n.includes("invoice") || n.includes("transaction") || ["ordernumber", "order_number"].includes(n) || n.endsWith("_number") || n.endsWith("_no") || n.endsWith("_code") || n === "code" || n.includes("sku");
  if (nameLike) return true;
  if (!profile || rowCount < 25) return false;
  const highCard = profile.unique >= Math.max(20, Math.floor(rowCount * 0.92));
  return profile.type === "category" && highCard && /(^|_)(key|code|number|no|ref|reference)($|_)/.test(n);
}

export function defaultAnalysisColumns(rows: Record<string, unknown>[], fields: string[]) {
  const profiles = profileColumns(rows, fields);
  const selected = fields.filter((c) => !isIdLikeColumn(c, profiles.find((p) => p.name === c), rows.length));
  return selected.length ? selected : fields;
}

export function sanitizeActiveColumns(active: string[], all: string[]) {
  const cleaned = active.filter((c) => all.includes(c));
  return cleaned.length ? cleaned : all;
}

// ─── multi-value detection & splitting ────────────────────────────────────────

export function splitCellValue(value: unknown, delimiter: string) {
  if (typeof value !== "string") return [];
  const parts = delimiter === "\n" ? value.split(/\r?\n/g) : value.split(delimiter);
  return parts.map((p) => p.trim()).filter(Boolean);
}

export function sanitizeColumnName(value: string) {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || "split_value";
}

export function detectMultiValueColumns(rows: Record<string, unknown>[], columns: string[]): MultiValueCandidate[] {
  const sample = rows.slice(0, 750);
  const candidates: MultiValueCandidate[] = [];
  columns.forEach((col) => {
    const strings = sample.map((r) => r[col]).filter((v): v is string => typeof v === "string" && v.trim().length > 0);
    if (!strings.length) return;
    const numCount = strings.map(parseNumber).filter((v) => v !== null).length;
    if (numCount / strings.length > 0.65) return;
    MULTI_VALUE_DELIMITERS.forEach(({ delimiter, label }) => {
      const splitRows = strings.map((v) => ({ value: v, parts: splitCellValue(v, delimiter) })).filter((i) => i.parts.length > 1);
      if (!splitRows.length) return;
      const pct = (splitRows.length / strings.length) * 100;
      const threshold = delimiter === "," ? 45 : 12;
      if (splitRows.length < Math.min(5, strings.length) || pct < threshold) return;
      const maxParts = Math.min(12, Math.max(...splitRows.map((i) => i.parts.length)));
      candidates.push({ column: col, delimiter, label, affectedRows: splitRows.length, affectedPercent: pct, maxParts, sampleValues: splitRows.slice(0, 3).map((i) => i.value) });
    });
  });
  return candidates.sort((a, b) => b.affectedPercent - a.affectedPercent);
}

export function applyMultiValueSplits(rows: Record<string, unknown>[], columns: string[], configs: Record<string, MultiValueSplitConfig>) {
  const active = Object.entries(configs).filter(([, c]) => c.enabled && c.maxParts > 1);
  if (!active.length) return { rows, columns };
  const outCols: string[] = [];
  columns.forEach((col) => {
    const cfg = configs[col];
    if (!cfg?.enabled) { outCols.push(col); return; }
    if (cfg.keepOriginal) outCols.push(col);
    const prefix = sanitizeColumnName(cfg.prefix || col);
    for (let i = 0; i < cfg.maxParts; i++) outCols.push(`${prefix}_${i + 1}`);
  });
  const outRows = rows.map((row) => {
    const next: Record<string, unknown> = { ...row };
    active.forEach(([col, cfg]) => {
      const parts = splitCellValue(row[col], cfg.delimiter);
      const prefix = sanitizeColumnName(cfg.prefix || col);
      for (let i = 0; i < cfg.maxParts; i++) next[`${prefix}_${i + 1}`] = parts[i] || "";
      if (!cfg.keepOriginal) delete next[col];
    });
    return next;
  });
  return { rows: outRows, columns: outCols };
}

// ─── workspace persistence ────────────────────────────────────────────────────

export function workspaceStorageKey(userEmail: string) {
  return `adviso_workspace_${userEmail.toLowerCase().replace(/[^a-z0-9@._-]/g, "_")}`;
}

export function readWorkspaceSnapshot(userEmail: string) {
  try {
    const saved = localStorage.getItem(workspaceStorageKey(userEmail));
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed.data) || !Array.isArray(parsed.columns)) return null;
    const allColumns = Array.isArray(parsed.allColumns) ? parsed.allColumns : parsed.columns;
    return { data: parsed.data, allColumns, columns: parsed.columns.filter((c: string) => allColumns.includes(c)), fileName: parsed.fileName || "restored-workspace.csv", savedAt: Number(parsed.savedAt || Date.now()) };
  } catch { return null; }
}

export function saveWorkspaceSnapshot(userEmail: string, snapshot: { data: Record<string, unknown>[]; allColumns: string[]; columns: string[]; fileName: string; savedAt: number }) {
  try { localStorage.setItem(workspaceStorageKey(userEmail), JSON.stringify(snapshot)); } catch { /* quota */ }
}

// ─── chart theme helpers ───────────────────────────────────────────────────────

export function chartTooltip(theme: "dark" | "light") {
  return {
    backgroundColor: theme === "dark" ? "#0f172a" : "#ffffff",
    border: `1px solid ${theme === "dark" ? "rgba(148,163,184,.18)" : "#e2e8f0"}`,
    color: theme === "dark" ? "#f1f5f9" : "#0f172a",
    fontSize: 12,
  };
}

export function axisColor(theme: "dark" | "light") {
  return theme === "dark" ? "#475569" : "#94a3b8";
}