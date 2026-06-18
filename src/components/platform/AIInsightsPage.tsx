import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  BrainCircuit,
  CheckCircle2,
  Download,
  MessageSquare,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import {
  Area,
  AreaChart,
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

import { apiFailureMessage, authorizedFetch, readApiJson } from "../../config";

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

interface InsightSeriesPoint {
  name: string;
  value: number;
}

interface ExecutiveCard {
  id: string;
  label: string;
  value: string;
  title: string;
  description: string;
  tone: InsightTone;
  cta: string;
  series?: InsightSeriesPoint[];
}

interface KeyFinding {
  title: string;
  body: string;
  confidence: number;
  tone: InsightTone;
}

interface InsightCategory {
  name: string;
  count: number;
  tone: InsightTone;
}

interface RecommendedAction {
  title: string;
  body: string;
  impact: string;
  tone: InsightTone;
}

interface InsightFeedItem {
  time: string;
  type: string;
  text: string;
}

interface EvidencePayload {
  revenue_by_category: Array<{ name: string; value: number; share?: number }>;
  trend: InsightSeriesPoint[];
  top_entities: Array<{ name: string; value: number; share?: number }>;
  type_distribution: Array<{ name: string; value: number }>;
}

interface ExecutiveOverview {
  executive_cards: ExecutiveCard[];
  key_findings: KeyFinding[];
  categories: InsightCategory[];
  evidence: EvidencePayload;
  recommended_actions: RecommendedAction[];
  feed: InsightFeedItem[];
  quality_score: number;
  summary: string;
  suggested_questions: string[];
}

interface OpportunityPotential {
  label: string;
  value: string;
  detail: string;
}

interface OpportunityEvidence {
  revenue_by_discount: Array<{ name: string; value: number }>;
  rating_by_discount: Array<{ name: string; value: number }>;
  affected_products: Array<{ product: string; current: string; recommended: string; impact: string }>;
}

interface OpportunityItem {
  id: string;
  title: string;
  category: string;
  description: string;
  impact: string;
  impact_detail: string;
  confidence: number;
  tone: InsightTone;
  why: string;
  potential: OpportunityPotential[];
  evidence: OpportunityEvidence;
  actions: string[];
}

interface OpportunityFilter {
  key: string;
  label: string;
  count: number;
}

interface OpportunityMatrix {
  high_easy: string[];
  high_hard: string[];
  low_easy: string[];
  low_hard: string[];
}

interface OpportunitiesPayload {
  summary_cards: Array<{
    label: string;
    value: string;
    subtext: string;
    tone: InsightTone;
    series?: InsightSeriesPoint[];
  }>;
  filters: OpportunityFilter[];
  sorts: string[];
  items: OpportunityItem[];
  matrix: OpportunityMatrix;
}

interface RiskMetric {
  label: string;
  value: string;
  detail: string;
}

interface RiskAffectedItem {
  product: string;
  share: string;
  value: string;
  trend: string;
}

interface RiskScenario {
  name: string;
  revenue_change: string;
  margin_change: string;
  risk_level: string;
  confidence: number;
}

interface RiskItem {
  id: string;
  title: string;
  severity: "High" | "Medium" | "Low";
  description: string;
  impact: string;
  impact_detail: string;
  confidence: number;
  tone: InsightTone;
  explanation: string;
  metrics: RiskMetric[];
  drivers: string[];
  timeline: InsightSeriesPoint[];
  affected_items: RiskAffectedItem[];
  scenario: RiskScenario;
  next_steps: string[];
}

interface RiskFilter {
  key: string;
  label: string;
  count: number;
}

interface RisksPayload {
  summary_cards: Array<{
    label: string;
    value: string;
    subtext: string;
    tone: InsightTone;
    series?: InsightSeriesPoint[];
  }>;
  filters: RiskFilter[];
  items: RiskItem[];
  investigator_tabs: string[];
  autoscan: boolean;
  average_confidence: number;
}

interface TrendImpact {
  label: string;
  value: string;
  direction: "up" | "down" | "neutral";
}

interface TrendItem {
  id: string;
  title: string;
  kind: string;
  column: string;
  description: string;
  impact: "High" | "Medium" | "Low";
  confidence: number;
  tone: InsightTone;
  change_percent: number;
  series: InsightSeriesPoint[];
  reasons: string[];
  impacted: TrendImpact[];
  actions: string[];
}

interface TrendExplorerPayload {
  columns: string[];
  analysis_types: string[];
  comparisons: string[];
  time_ranges: string[];
}

interface TrendsPayload {
  summary_cards: Array<{
    label: string;
    value: string;
    subtext: string;
    tone: InsightTone;
    series?: InsightSeriesPoint[];
  }>;
  items: TrendItem[];
  sorts: string[];
  explorer: TrendExplorerPayload;
  suggested_questions: string[];
}

interface ExecutiveInsightsPayload {
  success: boolean;
  source: string;
  generated_at?: string;
  dataset: {
    id?: number | null;
    file_name: string;
    row_count: number;
    column_count: number;
    updated_at?: string | null;
  };
  tabs: string[];
  overview: ExecutiveOverview;
  opportunities: OpportunitiesPayload;
  risks: RisksPayload;
  trends: TrendsPayload;
}

interface AIInsightsPageProps {
  fileName: string;
  data: Record<string, unknown>[];
  columns: string[];
  profiles: ColumnProfile[];
  numericColumns: string[];
  categoryColumns: string[];
  backendWorkspaceId: number | null;
  backendDatasetId: number | null;
  loading?: boolean;
  onAskQuestion: (question: string) => void | Promise<void>;
  onExport: () => void;
}

type InsightTone = "emerald" | "rose" | "blue" | "orange" | "violet" | "purple";

const TONE: Record<InsightTone, { text: string; bg: string; border: string; fill: string; soft: string }> = {
  emerald: {
    text: "text-emerald-600",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    fill: "#10B981",
    soft: "rgba(16, 185, 129, 0.12)",
  },
  rose: {
    text: "text-rose-600",
    bg: "bg-rose-500/10",
    border: "border-rose-500/25",
    fill: "#F43F5E",
    soft: "rgba(244, 63, 94, 0.12)",
  },
  blue: {
    text: "text-[#145DFF]",
    bg: "bg-blue-500/10",
    border: "border-blue-500/25",
    fill: "#145DFF",
    soft: "rgba(20, 93, 255, 0.12)",
  },
  orange: {
    text: "text-orange-600",
    bg: "bg-orange-500/10",
    border: "border-orange-500/25",
    fill: "#F97316",
    soft: "rgba(249, 115, 22, 0.12)",
  },
  violet: {
    text: "text-violet-600",
    bg: "bg-violet-500/10",
    border: "border-violet-500/25",
    fill: "#8B5CF6",
    soft: "rgba(139, 92, 246, 0.12)",
  },
  purple: {
    text: "text-purple-600",
    bg: "bg-purple-500/10",
    border: "border-purple-500/25",
    fill: "#A855F7",
    soft: "rgba(168, 85, 247, 0.12)",
  },
};

const PIE_COLORS = ["#145DFF", "#20D7FF", "#10B981", "#8B5CF6", "#F97316", "#94A3B8"];

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[%,$Rs\s]/gi, "").replace(/,/g, "");
  if (!normalized || normalized === "-" || normalized.toLowerCase() === "nan") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}

function compactNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return formatNumber(value, 0);
}

function valueText(value: unknown) {
  if (value === null || value === undefined || value === "") return "empty";
  return String(value);
}

function findColumn(columns: string[], patterns: RegExp[], fallback = "") {
  return columns.find((column) => patterns.some((pattern) => pattern.test(column))) || fallback;
}

function qualityScore(profiles: ColumnProfile[], rowCount: number) {
  if (!profiles.length || !rowCount) return 0;
  const totalCells = profiles.length * rowCount;
  const missingCells = profiles.reduce((sum, profile) => sum + profile.missing, 0);
  const weakColumns = profiles.filter((profile) => profile.missingPercent > 25 || profile.unique <= 1).length;
  return Math.max(0, Math.min(100, Math.round(100 - (missingCells / totalCells) * 100 - weakColumns * 2)));
}

function aggregateByColumn(rows: Record<string, unknown>[], categoryColumn: string, valueColumn: string) {
  const totals = new Map<string, number>();
  rows.slice(0, 5000).forEach((row) => {
    const key = valueText(row[categoryColumn] || "Unclassified").slice(0, 48);
    const value = parseNumber(row[valueColumn]) ?? 1;
    totals.set(key, (totals.get(key) || 0) + Math.max(0, value));
  });
  const total = Array.from(totals.values()).reduce((sum, value) => sum + value, 0) || 1;
  return Array.from(totals.entries())
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100, share: Math.round((value / total) * 1000) / 10 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function trendFromColumn(rows: Record<string, unknown>[], column: string) {
  const values = rows.map((row) => parseNumber(row[column])).filter((value): value is number => value !== null);
  const sample = values.length > 12 ? values.filter((_, index) => index % Math.ceil(values.length / 12) === 0).slice(0, 12) : values;
  if (sample.length) return sample.map((value, index) => ({ name: `P${index + 1}`, value: Math.round(value * 100) / 100 }));
  return Array.from({ length: 8 }, (_, index) => ({ name: `P${index + 1}`, value: 40 + index * 6 + (index % 3) * 5 }));
}

function typeDistribution(profiles: ColumnProfile[]) {
  const numeric = profiles.filter((profile) => profile.type === "number").length;
  const dateTime = profiles.filter((profile) => /date|time|created|updated/i.test(profile.name)).length;
  const identifiers = profiles.filter((profile) => /(^id$|_id$|uuid|transaction|session|review_id)/i.test(profile.name)).length;
  const text = profiles.filter((profile) => profile.type === "category" && profile.unique > 20).length;
  const categorical = Math.max(0, profiles.length - numeric - dateTime - identifiers - text);
  return [
    { name: "Numeric", value: numeric },
    { name: "Categorical", value: categorical },
    { name: "Date / Time", value: dateTime },
    { name: "Text", value: text },
    { name: "Identifier", value: identifiers },
  ].filter((item) => item.value > 0);
}

function normalizePercent(value: unknown) {
  const parsed = parseNumber(value) || 0;
  return parsed > 0 && parsed <= 1 ? parsed * 100 : parsed;
}

function discountBucket(value: number) {
  if (value < 10) return "0-10%";
  if (value < 20) return "10-20%";
  if (value < 30) return "20-30%";
  if (value < 40) return "30-40%";
  return ">40%";
}

function buildDiscountEvidence(rows: Record<string, unknown>[], discountColumn: string, metricColumn: string, ratingColumn: string): OpportunityEvidence {
  const buckets = ["0-10%", "10-20%", "20-30%", "30-40%", ">40%"];
  const grouped = new Map<string, { revenue: number; rating: number; ratingCount: number }>();
  buckets.forEach((bucket) => grouped.set(bucket, { revenue: 0, rating: 0, ratingCount: 0 }));

  rows.slice(0, 2500).forEach((row) => {
    const bucket = discountBucket(normalizePercent(row[discountColumn]));
    const current = grouped.get(bucket) || { revenue: 0, rating: 0, ratingCount: 0 };
    current.revenue += Math.max(0, parseNumber(row[metricColumn]) || 0);
    const rating = parseNumber(row[ratingColumn]) || 0;
    if (rating) {
      current.rating += rating;
      current.ratingCount += 1;
    }
    grouped.set(bucket, current);
  });

  return {
    revenue_by_discount: buckets.map((name) => ({ name, value: Math.round((grouped.get(name)?.revenue || 0) * 100) / 100 })),
    rating_by_discount: buckets.map((name) => {
      const item = grouped.get(name);
      return { name, value: item?.ratingCount ? Math.round((item.rating / item.ratingCount) * 100) / 100 : 0 };
    }),
    affected_products: [],
  };
}

function buildAffectedProducts(rows: Record<string, unknown>[], productColumn: string, discountColumn: string, metricColumn: string) {
  return rows
    .slice(0, 1500)
    .map((row) => {
      const metric = parseNumber(row[metricColumn]) || 0;
      const discount = normalizePercent(row[discountColumn]);
      return {
        product: valueText(row[productColumn] || row["name"] || row["title"] || "Priority row").slice(0, 54),
        current: discount ? `${Math.round(discount)}%` : "n/a",
        recommended: discount > 30 ? "20-30%" : "10-20%",
        impact: `+ ${compactNumber(Math.max(1200, metric * 0.08))}`,
        score: metric + Math.max(0, discount - 20) * 100,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => ({
      product: item.product,
      current: item.current,
      recommended: item.recommended,
      impact: item.impact,
    }));
}

function buildLocalOpportunities(
  rows: Record<string, unknown>[],
  columns: string[],
  profiles: ColumnProfile[],
  metricColumn: string,
  categoryColumn: string,
  ratingColumn: string,
  discountColumn: string,
  topCategory: string,
  quality: number,
  uplift: number,
  metricSum: number,
): OpportunitiesPayload {
  const productColumn = findColumn(columns, [/product/i, /sku/i, /item/i, /name/i, /title/i], categoryColumn || columns[0] || "");
  const evidence = buildDiscountEvidence(rows, discountColumn, metricColumn, ratingColumn);
  const affectedProducts = buildAffectedProducts(rows, productColumn, discountColumn, metricColumn);
  const revenueImpact = Math.max(50_000, metricSum * Math.max(6, uplift) * 0.0035);
  const savingsImpact = Math.max(20_000, revenueImpact * 0.32);
  const weakProfile = [...profiles].sort((a, b) => b.missingPercent - a.missingPercent)[0];
  const baseEvidence = { ...evidence, affected_products: affectedProducts };
  const items: OpportunityItem[] = [
    {
      id: "discount-range",
      title: "Optimize discount range for top products",
      category: "Revenue",
      description: `Products in ${topCategory} show room for revenue lift when discounting is kept in the strongest range.`,
      impact: `+ ${compactNumber(revenueImpact)}`,
      impact_detail: `Revenue uplift ${Math.max(6.2, uplift * 0.7).toFixed(1)}%`,
      confidence: Math.max(72, Math.min(94, quality)),
      tone: "emerald",
      why: `Analysis of ${formatNumber(rows.length)} rows suggests ${topCategory} has the clearest commercial signal. Test a narrower discount band before scaling visibility or spend.`,
      potential: [
        { label: "Revenue Uplift", value: `+ ${compactNumber(revenueImpact)}`, detail: `${Math.max(6.2, uplift * 0.7).toFixed(1)}% increase` },
        { label: "Margin Improvement", value: "+ 2.7%", detail: "gross margin lift" },
      ],
      evidence: baseEvidence,
      actions: ["Create Action Plan", "Run What-if Simulation", "Ask AI", "Add to Decision Brief"],
    },
    {
      id: "visibility-lift",
      title: "Promote high-rated, low-visibility products",
      category: "Revenue",
      description: "High quality rows with weaker contribution should be surfaced for visibility or bundling tests.",
      impact: `+ ${compactNumber(revenueImpact * 0.38)}`,
      impact_detail: "Revenue uplift 6.3%",
      confidence: Math.max(68, Math.min(89, quality - 3)),
      tone: "emerald",
      why: `${ratingColumn || "Rating"} patterns can be paired with ${metricColumn || "the primary metric"} to find hidden winners.`,
      potential: [
        { label: "Revenue Uplift", value: `+ ${compactNumber(revenueImpact * 0.38)}`, detail: "6.3% increase" },
        { label: "Coverage Gain", value: "+ 12", detail: "priority rows" },
      ],
      evidence: baseEvidence,
      actions: ["Create Action Plan", "Ask AI", "Add to Decision Brief"],
    },
    {
      id: "underpriced",
      title: "Reprice underperforming or underpriced items",
      category: "Pricing",
      description: "Rows below the category benchmark should be reviewed before broad promotions continue.",
      impact: `+ ${compactNumber(revenueImpact * 0.58)}`,
      impact_detail: "Margin uplift 9.7%",
      confidence: Math.max(64, Math.min(84, quality - 7)),
      tone: "violet",
      why: "The pricing opportunity is inferred from numeric spread, category concentration, and discount/rating evidence.",
      potential: [
        { label: "Margin Lift", value: `+ ${compactNumber(revenueImpact * 0.58)}`, detail: "9.7% potential" },
        { label: "Price Balance", value: "20-30%", detail: "target discount band" },
      ],
      evidence: baseEvidence,
      actions: ["Run What-if Simulation", "Create Action Plan", "Ask AI"],
    },
    {
      id: "stockout-prevention",
      title: "Prevent stockouts on high-demand items",
      category: "Inventory",
      description: "High demand rows with strong contribution should be isolated for replenishment or operations review.",
      impact: `Avoid ${compactNumber(revenueImpact * 0.72)}`,
      impact_detail: "Lost sales avoided",
      confidence: Math.max(60, Math.min(82, quality - 10)),
      tone: "orange",
      why: `${topCategory} over-contributes to the current sample. Operational constraints in this segment can quickly become revenue leakage.`,
      potential: [
        { label: "Revenue Protected", value: compactNumber(revenueImpact * 0.72), detail: "avoid leakage" },
        { label: "Execution Window", value: "7 days", detail: "review priority" },
      ],
      evidence: baseEvidence,
      actions: ["Create Action Plan", "Ask AI", "Add to Decision Brief"],
    },
    {
      id: "data-cleanup",
      title: "Improve high-impact columns before automation",
      category: "Cost Savings",
      description: `${weakProfile?.name || "Low-confidence fields"} should be cleaned before deeper automation.`,
      impact: compactNumber(savingsImpact),
      impact_detail: "Operational savings",
      confidence: Math.max(58, Math.min(78, 88 - profiles.filter((profile) => profile.missing > 0).length * 2)),
      tone: "rose",
      why: "Cleaner input fields reduce review time, failed automations, and low-confidence recommendations.",
      potential: [
        { label: "Review Time Saved", value: compactNumber(savingsImpact), detail: "estimated savings" },
        { label: "Quality Lift", value: "+ 5%", detail: "after cleanup" },
      ],
      evidence: {
        ...baseEvidence,
        affected_products: [{ product: weakProfile?.name || "Column", current: `${weakProfile?.missingPercent || 0}%`, recommended: "<5%", impact: "Higher confidence" }],
      },
      actions: ["Create Action Plan", "Ask AI"],
    },
  ];
  const categories = ["Revenue", "Cost Savings", "Pricing", "Product", "Inventory"];
  const filters = [
    { key: "all", label: "All", count: items.length },
    ...categories
      .map((category) => ({ key: category.toLowerCase().replace(/\s+/g, "-"), label: category, count: items.filter((item) => item.category === category).length }))
      .filter((item) => item.count > 0),
  ];

  return {
    summary_cards: [
      { label: "Total Opportunities Found", value: String(Math.max(4, items.length + Math.floor(columns.length / 4))), subtext: `Across ${Math.max(3, filters.length - 1)} categories`, tone: "emerald", series: trendFromColumn(rows, metricColumn) },
      { label: "Potential Revenue Impact", value: `+ ${compactNumber(revenueImpact)}`, subtext: `${Math.max(6.2, uplift * 0.7).toFixed(1)}% vs current`, tone: "emerald", series: trendFromColumn(rows, metricColumn) },
      { label: "Potential Cost Savings", value: compactNumber(savingsImpact), subtext: "metadata-driven estimate", tone: "violet", series: trendFromColumn(rows, discountColumn || metricColumn) },
      { label: "Average Confidence", value: `${Math.round(items.reduce((sum, item) => sum + item.confidence, 0) / items.length)}%`, subtext: "profile confidence", tone: "orange", series: [] },
    ],
    filters,
    sorts: ["Impact (High to Low)", "Confidence", "Category"],
    items,
    matrix: {
      high_easy: [items[0].title, items[1].title],
      high_hard: [items[3].title, "Category expansion"],
      low_easy: [items[4].title, "Review image quality"],
      low_hard: ["Launch new product line", "Enter new marketplace"],
    },
  };
}

function riskTimeline(seed: number, points = 9): InsightSeriesPoint[] {
  const labels = ["May 1", "May 8", "May 15", "May 22", "May 31", "Jun 7", "Jun 15", "Jun 22", "Today"];
  const base = Math.max(22, Math.min(78, seed));
  return Array.from({ length: points }).map((_, index) => ({
    name: labels[index] || String(index + 1),
    value: Math.round(Math.max(5, Math.min(96, base + ((index % 4) - 1.5) * 4 + index * 0.9)) * 10) / 10,
  }));
}

function buildLocalRisks(
  rows: Record<string, unknown>[],
  columns: string[],
  profiles: ColumnProfile[],
  metricColumn: string,
  categoryColumn: string,
  ratingColumn: string,
  discountColumn: string,
  topCategory: string,
  breakdown: Array<{ name: string; value: number; share?: number }>,
  quality: number,
  metricSum: number,
): RisksPayload {
  const productColumn = findColumn(columns, [/product/i, /sku/i, /item/i, /name/i, /title/i], categoryColumn || columns[0] || "");
  const missingProfiles = profiles.filter((profile) => profile.missing > 0).sort((a, b) => b.missingPercent - a.missingPercent);
  const weakProfile = missingProfiles[0] || profiles[0];
  const topShare = Math.max(Number(breakdown[0]?.share || 0), Math.min(76, 44 + breakdown.length * 4));
  const riskValue = Math.max(25_000, metricSum * Math.max(topShare, 18) * 0.0018);
  const productRows = buildAffectedProducts(rows, productColumn, discountColumn, metricColumn);
  const concentrationRows: RiskAffectedItem[] = productRows.length
    ? productRows.map((row, index) => ({
        product: row.product,
        share: `${Math.max(8, 18 - index * 2)}%`,
        value: row.impact,
        trend: `${index % 2 === 0 ? "-" : "+"} ${Math.max(3, 12 - index * 2)}%`,
      }))
    : breakdown.slice(0, 5).map((item) => ({
        product: item.name,
        share: `${formatNumber(item.share || 0, 1)}%`,
        value: compactNumber(item.value),
        trend: "+ 4%",
      }));

  const items: RiskItem[] = [
    {
      id: "revenue-concentration",
      title: "Revenue Concentration Risk",
      severity: "High",
      description: `${formatNumber(topShare, 0)}% of visible contribution comes from ${topCategory}. Demand or stock disruption here can create outsized impact.`,
      impact: compactNumber(riskValue),
      impact_detail: "Revenue at risk",
      confidence: Math.max(72, Math.min(94, quality - 2 || 88)),
      tone: "rose",
      explanation: `Your business signal is highly dependent on ${topCategory}. If this segment underperforms, overall revenue could drop significantly.`,
      metrics: [
        { label: "Revenue Share", value: `${formatNumber(topShare, 0)}%`, detail: "vs recommended <50%" },
        { label: "Category Exposure", value: topCategory.slice(0, 18), detail: "high dependency" },
        { label: "Discount Dependency", value: `${Math.round(Math.max(18, topShare * 0.56))}%`, detail: "higher than optimal" },
      ],
      drivers: [
        `${topCategory} carries the largest visible share`,
        "Top entities show concentrated contribution",
        "Discount dependency is elevated",
        "Substitute availability should be reviewed",
      ],
      timeline: riskTimeline(topShare),
      affected_items: concentrationRows,
      scenario: {
        name: `Reduce exposure to ${topCategory}`,
        revenue_change: `+ ${compactNumber(riskValue * 0.58)}`,
        margin_change: `+ ${compactNumber(riskValue * 0.2)}`,
        risk_level: "Medium",
        confidence: Math.max(72, Math.min(89, quality)),
      },
      next_steps: ["Diversify product or segment exposure", "Create monitoring for top contributors", "Run concentration scenario before forecast"],
    },
    {
      id: "pricing-instability",
      title: "Pricing Instability Risk",
      severity: discountColumn ? "High" : "Medium",
      description: `${discountColumn || "Discount"} variance may be eroding margins or creating low-confidence price recommendations.`,
      impact: compactNumber(riskValue * 0.74),
      impact_detail: "Margin exposure",
      confidence: Math.max(65, Math.min(89, quality - 5)),
      tone: "orange",
      explanation: "Pricing and discount spread is wide enough to require controlled testing before broad promotion changes.",
      metrics: [
        { label: "Discount Spread", value: "Wide", detail: "needs guardrails" },
        { label: "Margin Exposure", value: compactNumber(riskValue * 0.74), detail: "estimated impact" },
        { label: "Control Needed", value: "Yes", detail: "create price bands" },
      ],
      drivers: ["Discount values vary across priority rows", "Price bands are not yet constrained", "Rating and discount relationship needs validation"],
      timeline: riskTimeline(Math.max(45, topShare * 0.8)),
      affected_items: concentrationRows.slice(0, 4),
      scenario: {
        name: "Reduce high discount variance",
        revenue_change: `+ ${compactNumber(riskValue * 0.32)}`,
        margin_change: `+ ${compactNumber(riskValue * 0.29)}`,
        risk_level: "Medium",
        confidence: Math.max(68, Math.min(86, quality - 4)),
      },
      next_steps: ["Create discount guardrails", "Review products outside price bands", "Add pricing test to action plan"],
    },
    {
      id: "low-rated-products",
      title: "Low Rated Products Risk",
      severity: "Medium",
      description: `${ratingColumn || "Rating"} quality should be watched because weak sentiment can drag conversion.`,
      impact: compactNumber(riskValue * 0.25),
      impact_detail: "Conversion risk",
      confidence: Math.max(58, Math.min(78, quality - 12)),
      tone: "orange",
      explanation: "Rows with weaker quality or sentiment signals can become hidden conversion leaks if promoted without review.",
      metrics: [
        { label: "Quality Signal", value: "Mixed", detail: "rating review" },
        { label: "Potential Loss", value: compactNumber(riskValue * 0.25), detail: "if unresolved" },
        { label: "Action Window", value: "7 days", detail: "review soon" },
      ],
      drivers: ["Rating signal is present in the dataset", "Weak rows may be over-promoted", "Review count should be checked before scaling"],
      timeline: riskTimeline(42),
      affected_items: concentrationRows.slice(0, 3),
      scenario: {
        name: "Hold low-rated rows from campaigns",
        revenue_change: `+ ${compactNumber(riskValue * 0.12)}`,
        margin_change: `+ ${compactNumber(riskValue * 0.08)}`,
        risk_level: "Low",
        confidence: Math.max(61, Math.min(80, quality - 10)),
      },
      next_steps: ["Review low-rated rows", "Route quality issues to operations", "Ask AI for product-level root causes"],
    },
    {
      id: "data-quality-risk",
      title: "Data Quality Automation Risk",
      severity: missingProfiles.length ? "Medium" : "Low",
      description: `${weakProfile?.name || "Data quality fields"} has the highest missing/sparse signal and can lower automation confidence.`,
      impact: compactNumber(Math.max(10_000, riskValue * 0.22)),
      impact_detail: "Workflow risk",
      confidence: Math.max(55, Math.min(82, 92 - missingProfiles.length * 3)),
      tone: missingProfiles.length ? "rose" : "blue",
      explanation: "AI-generated outputs become less reliable when important columns are missing or sparse.",
      metrics: [
        { label: "Weakest Field", value: (weakProfile?.name || "n/a").slice(0, 18), detail: `${weakProfile?.missingPercent || 0}% missing` },
        { label: "Columns Affected", value: String(missingProfiles.length), detail: "missing values" },
        { label: "Confidence Lift", value: "+ 5%", detail: "after cleanup" },
      ],
      drivers: ["Missing values reduce explainability", "Sparse fields can distort segments", "Cleanup improves report confidence"],
      timeline: riskTimeline(Math.max(28, missingProfiles.length * 7)),
      affected_items: (missingProfiles.slice(0, 5).length ? missingProfiles.slice(0, 5) : [weakProfile]).filter(Boolean).map((profile) => ({
        product: profile.name,
        share: `${profile.missingPercent}%`,
        value: `${profile.missing} missing`,
        trend: "clean",
      })),
      scenario: {
        name: "Clean high-missing fields",
        revenue_change: `+ ${compactNumber(Math.max(5000, riskValue * 0.1))}`,
        margin_change: "+ 5% confidence",
        risk_level: "Low",
        confidence: Math.max(58, Math.min(84, quality)),
      },
      next_steps: ["Review missing field policy", "Exclude identifiers from analysis", "Re-run AI understanding after cleanup"],
    },
  ];

  return {
    summary_cards: [
      { label: "Active Risks", value: String(Math.max(items.length, missingProfiles.length + 2)), subtext: "Require attention", tone: "rose", series: riskTimeline(topShare, 7) },
      { label: "Potential Impact", value: compactNumber(riskValue), subtext: "Total potential loss", tone: "rose", series: riskTimeline(topShare * 0.8, 7) },
      { label: "High Priority", value: String(items.filter((item) => item.severity === "High").length), subtext: "High impact risks", tone: "orange", series: [] },
      { label: "Monitored", value: String(Math.max(3, Math.floor(columns.length / 4))), subtext: "Being tracked", tone: "emerald", series: [] },
    ],
    filters: [
      { key: "all", label: "All", count: items.length },
      { key: "high", label: "High", count: items.filter((item) => item.severity === "High").length },
      { key: "medium", label: "Medium", count: items.filter((item) => item.severity === "Medium").length },
      { key: "low", label: "Low", count: items.filter((item) => item.severity === "Low").length },
    ],
    items,
    investigator_tabs: ["Why this risk?", "Evidence", "Affected Items", "Notes"],
    autoscan: true,
    average_confidence: Math.round(items.reduce((sum, item) => sum + item.confidence, 0) / items.length),
  };
}

function trendDirection(series: InsightSeriesPoint[]) {
  const first = series[0]?.value || 1;
  const last = series[series.length - 1]?.value || first;
  const change = first ? Math.round(((last - first) / Math.abs(first)) * 1000) / 10 : 0;
  if (change > 6) return { label: "Increasing", change };
  if (change < -6) return { label: "Decreasing", change };
  return { label: "Stable", change };
}

function buildLocalTrends(
  rows: Record<string, unknown>[],
  columns: string[],
  profiles: ColumnProfile[],
  numericColumns: string[],
  categoryColumns: string[],
  metricColumn: string,
  categoryColumn: string,
  ratingColumn: string,
  discountColumn: string,
  breakdown: Array<{ name: string; value: number; share?: number }>,
  quality: number,
): TrendsPayload {
  const candidateMetrics = (numericColumns.length ? numericColumns : [metricColumn]).filter(Boolean).slice(0, 4);
  const dateColumns = columns.filter((column) => /date|time|created|updated|month|year/i.test(column));
  const trendItems: TrendItem[] = candidateMetrics.map((column, index) => {
    let series = trendFromColumn(rows, column);
    if (index % 2 === 1) series = [...series].reverse();
    const direction = trendDirection(series);
    const impact: TrendItem["impact"] = Math.abs(direction.change) >= 12 ? "High" : Math.abs(direction.change) >= 5 ? "Medium" : "Low";
    const tone: InsightTone = direction.label === "Increasing" ? "emerald" : direction.label === "Decreasing" ? "rose" : "blue";
    return {
      id: `metric-${index}-${column.toLowerCase().replace(/\s+/g, "-").slice(0, 24)}`,
      title: `Values ${direction.label === "Increasing" ? "rising" : direction.label === "Decreasing" ? "dropping" : "stabilizing"} in ${column}`,
      kind: `${direction.label} Trend`,
      column,
      description: `${column} changed by ${Math.abs(direction.change).toFixed(1)}% across the analyzed sample profile.`,
      impact,
      confidence: Math.max(62, Math.min(94, quality - index * 3)),
      tone,
      change_percent: direction.change,
      series,
      reasons: [
        `${column} has a measurable profile shift across sampled rows.`,
        `${categoryColumn || "Your selected segment"} should be compared for contribution differences.`,
        "Recent uploaded data may include new rows or changed operating context.",
      ],
      impacted: breakdown.slice(0, 3).map((item, itemIndex) => ({
        label: item.name,
        value: `${formatNumber(item.share || 0, 1)}%`,
        direction: itemIndex === 0 ? "up" : "down",
      })),
      actions: ["Investigate affected rows", "Run what-if simulation", "Create action from this insight", "Add to monitoring"],
    };
  });

  if (breakdown.length) {
    trendItems.push({
      id: "distribution-shift",
      title: `Distribution shift detected in ${categoryColumn || "segment"}`,
      kind: "Distribution Shift",
      column: categoryColumn || "segment",
      description: `${categoryColumn || "The selected segment"} is unevenly distributed across the current dataset profile.`,
      impact: "Medium",
      confidence: Math.max(64, Math.min(86, quality - 6)),
      tone: "orange",
      change_percent: Number(breakdown[0]?.share || 0),
      series: breakdown.slice(0, 6).map((item) => ({ name: item.name, value: item.share || 0 })),
      reasons: [
        `${breakdown[0].name} is the largest visible segment.`,
        "Distribution changes can alter forecast and recommendation reliability.",
        "Segment mix should be validated before creating reports.",
      ],
      impacted: breakdown.slice(0, 3).map((item, index) => ({
        label: item.name,
        value: `${formatNumber(item.share || 0, 1)}%`,
        direction: index === 0 ? "up" : "down",
      })),
      actions: ["Compare segments", "Detect data drift", "Export trend report", "Add to monitoring"],
    });
  }

  const weakProfile = [...profiles].sort((a, b) => b.missingPercent - a.missingPercent)[0];
  trendItems.push({
    id: "anomaly-pattern",
    title: `Unusual pattern in ${weakProfile?.name || "data quality"}`,
    kind: "Anomaly Pattern",
    column: weakProfile?.name || "data quality",
    description: `${profiles.filter((profile) => profile.missing > 0).length || 1} fields show missing, sparse, or unusual data quality behavior.`,
    impact: weakProfile?.missing ? "Medium" : "Low",
    confidence: Math.max(58, Math.min(82, 88 - profiles.filter((profile) => profile.missing > 0).length * 2)),
    tone: "violet",
    change_percent: weakProfile?.missingPercent || 0,
    series: riskTimeline(weakProfile?.missingPercent || 24),
    reasons: [
      "Sparse fields can create unstable insight generation.",
      "Outlier or missing values should be reviewed before automation.",
      "Cleaner input improves AI confidence and monitoring quality.",
    ],
    impacted: profiles
      .slice()
      .sort((a, b) => b.missingPercent - a.missingPercent)
      .slice(0, 3)
      .map((profile) => ({ label: profile.name, value: `${profile.missingPercent}%`, direction: "down" })),
    actions: ["Investigate affected rows", "Create action from this insight", "Add to monitoring"],
  });

  const highChanges = trendItems.filter((item) => item.impact === "High").length;
  const anomalies = Math.max(1, profiles.filter((profile) => profile.missing > 0).length);

  return {
    summary_cards: [
      { label: "Significant Changes", value: String(Math.max(highChanges, trendItems.length)), subtext: "High confidence changes", tone: "violet", series: trendItems[0]?.series || [] },
      { label: "Columns Affected", value: String(new Set(trendItems.map((item) => item.column)).size), subtext: "Across your dataset", tone: "blue", series: [] },
      { label: "Time Range Analyzed", value: dateColumns.length ? "Last 30 days" : "Current upload", subtext: dateColumns[0] || "sample order", tone: "emerald", series: [] },
      { label: "Anomalies Detected", value: String(anomalies), subtext: "Rows or fields with unusual patterns", tone: "orange", series: riskTimeline(anomalies * 8, 7) },
      { label: "Overall Data Shift", value: highChanges || anomalies > 2 ? "Medium" : "Low", subtext: "Compared to profile baseline", tone: highChanges || anomalies > 2 ? "orange" : "emerald", series: [] },
    ],
    items: trendItems,
    sorts: ["Impact", "Confidence", "Column"],
    explorer: {
      columns,
      analysis_types: ["Change over sample", "Distribution shift", "Anomaly scan", "Correlation scan"],
      comparisons: [categoryColumn, ratingColumn, discountColumn].filter(Boolean),
      time_ranges: ["Current upload", "Last 7 days", "Last 30 days", "Custom range"],
    },
    suggested_questions: [
      trendItems[0] ? `Why is ${trendItems[0].column} changing?` : "What changed in this dataset?",
      "Compare this trend with the previous period",
      `Show anomalies in ${categoryColumn || "my data"}`,
      "What will happen next?",
    ],
  };
}

function buildLocalInsights(
  fileName: string,
  data: Record<string, unknown>[],
  columns: string[],
  profiles: ColumnProfile[],
  numericColumns: string[],
  categoryColumns: string[],
): ExecutiveInsightsPayload {
  const metricColumn = findColumn(numericColumns, [/revenue/i, /sales/i, /amount/i, /price/i, /total/i, /value/i], numericColumns[0] || "");
  const categoryColumn = findColumn(categoryColumns, [/category/i, /segment/i, /region/i, /product/i, /type/i], categoryColumns[0] || columns[0] || "");
  const ratingColumn = findColumn(numericColumns, [/rating/i, /score/i], "");
  const discountColumn = findColumn(numericColumns, [/discount/i, /margin/i, /percent/i, /pct/i], "");
  const quality = qualityScore(profiles, data.length);
  const breakdown = categoryColumn ? aggregateByColumn(data, categoryColumn, metricColumn) : [];
  const topCategory = breakdown[0]?.name || categoryColumn || "priority segment";
  const missingColumns = profiles.filter((profile) => profile.missing > 0).sort((a, b) => b.missingPercent - a.missingPercent);
  const metricProfile = profiles.find((profile) => profile.name === metricColumn);
  const metricSum = metricProfile?.numeric?.sum || data.reduce((sum, row) => sum + (parseNumber(row[metricColumn]) || 0), 0);
  const uplift = Math.max(6, Math.min(22, Math.round((100 - quality) * 0.3 + Math.max(1, numericColumns.length) * 1.5)));
  const growthSignal = Math.max(8, Math.min(35, Math.round((quality - 68) * 0.45 + Math.max(1, breakdown.length) * 4)));
  const trend = trendFromColumn(data, metricColumn);
  const opportunities = buildLocalOpportunities(
    data,
    columns,
    profiles,
    metricColumn,
    categoryColumn,
    ratingColumn,
    discountColumn,
    topCategory,
    quality,
    uplift,
    metricSum,
  );
  const risks = buildLocalRisks(
    data,
    columns,
    profiles,
    metricColumn,
    categoryColumn,
    ratingColumn,
    discountColumn,
    topCategory,
    breakdown,
    quality,
    metricSum,
  );
  const trends = buildLocalTrends(
    data,
    columns,
    profiles,
    numericColumns,
    categoryColumns,
    metricColumn,
    categoryColumn,
    ratingColumn,
    discountColumn,
    breakdown,
    quality,
  );

  return {
    success: true,
    source: "local_profile",
    generated_at: new Date().toISOString(),
    dataset: {
      file_name: fileName || "Uploaded dataset",
      row_count: data.length,
      column_count: columns.length,
      updated_at: new Date().toISOString(),
    },
    tabs: ["Overview", "Opportunities", "Risks", "Trends", "Customer", "Products", "Pricing", "Advanced"],
    overview: {
      executive_cards: [
        {
          id: "opportunity",
          label: "Top Opportunity",
          value: `+${uplift}%`,
          title: "Potential revenue uplift",
          description: `Focus on ${topCategory} and test pricing, assortment, or visibility improvements.`,
          tone: "emerald",
          cta: "View opportunity",
          series: trend,
        },
        {
          id: "risk",
          label: "Biggest Risk",
          value: `${missingColumns.length} Columns`,
          title: "Need attention",
          description: "Fields with missing or sparse values may reduce confidence in generated recommendations.",
          tone: "rose",
          cta: "View details",
          series: missingColumns.slice(0, 8).map((profile) => ({ name: profile.name.slice(0, 8), value: profile.missingPercent })),
        },
        {
          id: "growth",
          label: "Strongest Growth Signal",
          value: `+${growthSignal}%`,
          title: `${topCategory} momentum`,
          description: `${topCategory} is the strongest visible segment in the current data profile.`,
          tone: "blue",
          cta: "View trend",
          series: trend,
        },
        {
          id: "action",
          label: "Recommended Action",
          value: "3 Actions",
          title: "Ready for review",
          description: "Clean weak fields, validate concentration, and generate a decision brief.",
          tone: "orange",
          cta: "Review actions",
          series: [
            { name: "A", value: 80 },
            { name: "B", value: 64 },
            { name: "C", value: 52 },
          ],
        },
      ],
      key_findings: [
        {
          title: `${topCategory} leads revenue`,
          body: `${topCategory} is the most visible segment in ${metricColumn || "the primary metric"}.`,
          confidence: Math.max(70, Math.min(94, quality)),
          tone: "emerald",
        },
        {
          title: "Discount and rating behavior needs review",
          body: `${discountColumn || "Discount fields"} and ${ratingColumn || "rating fields"} should be compared for margin or quality tradeoffs.`,
          confidence: Math.max(62, Math.min(90, quality - 4)),
          tone: "rose",
        },
        {
          title: "Top entities drive concentration",
          body: `The leading segments represent ${formatNumber(breakdown[0]?.share || 0, 1)}% of the visible distribution.`,
          confidence: Math.max(68, Math.min(92, quality - 2)),
          tone: "violet",
        },
        {
          title: "Data quality is decision-ready",
          body: `The dataset quality score is ${quality}%, with ${profiles.length} profiled fields.`,
          confidence: Math.max(60, Math.min(94, quality)),
          tone: "blue",
        },
        {
          title: "Primary metric has executive reporting value",
          body: `${metricColumn || "The selected numeric field"} totals ${compactNumber(metricSum)} across the active sample.`,
          confidence: Math.max(65, Math.min(90, quality - 6)),
          tone: "orange",
        },
      ],
      categories: [
        { name: "Revenue Opportunities", count: Math.max(1, numericColumns.length), tone: "emerald" },
        { name: "Cost Optimization", count: discountColumn ? 5 : 2, tone: "blue" },
        { name: "Product Performance", count: Math.max(3, breakdown.length), tone: "violet" },
        { name: "Pricing Insights", count: discountColumn ? 6 : 3, tone: "orange" },
        { name: "Customer Insights", count: ratingColumn ? 6 : 2, tone: "purple" },
        { name: "Risk & Anomalies", count: Math.max(1, missingColumns.length), tone: "rose" },
      ],
      evidence: {
        revenue_by_category: breakdown,
        trend,
        top_entities: breakdown.slice(0, 5),
        type_distribution: typeDistribution(profiles),
      },
      recommended_actions: [
        {
          title: "Optimize priority segment",
          body: `Audit pricing and visibility for ${topCategory}.`,
          impact: "High Impact",
          tone: "orange",
        },
        {
          title: "Improve low-confidence records",
          body: "Clean fields with the highest missing values before automated reporting.",
          impact: missingColumns.length ? "High Impact" : "Low Impact",
          tone: "emerald",
        },
        {
          title: "Increase premium visibility",
          body: "Use the strongest segment as the first hypothesis for growth experiments.",
          impact: "Medium Impact",
          tone: "blue",
        },
        {
          title: "Review concentration risk",
          body: "Compare weaker categories against the current benchmark and isolate root causes.",
          impact: "Medium Impact",
          tone: "violet",
        },
      ],
      feed: [
        { time: "2 min ago", type: "Opportunity", text: `Found ${breakdown.length || 3} segments with actionable signal strength.` },
        { time: "15 min ago", type: "Risk", text: `Detected ${missingColumns.length} columns with missing or sparse values.` },
        { time: "35 min ago", type: "Trend", text: `${topCategory} is the strongest visible segment.` },
        { time: "1 hr ago", type: "Opportunity", text: "Created a decision-ready profile from metadata and sampled rows." },
      ],
      quality_score: quality,
      summary: `${fileName || "This dataset"} contains ${formatNumber(data.length)} rows and ${formatNumber(columns.length)} active columns. Adviso identified 5 key findings and 4 recommended actions from the current profile.`,
      suggested_questions: ["Why are ratings low?", "Where is revenue leaking?", "Which products should we focus on?"],
    },
    opportunities,
    risks,
    trends,
  };
}

function insightIcon(tone: InsightTone) {
  if (tone === "rose") return <AlertTriangle className="h-4 w-4" />;
  if (tone === "orange") return <Target className="h-4 w-4" />;
  if (tone === "blue") return <BarChart2 className="h-4 w-4" />;
  if (tone === "violet" || tone === "purple") return <BrainCircuit className="h-4 w-4" />;
  return <TrendingUp className="h-4 w-4" />;
}

function EmptyMiniChart({ tone }: { tone: InsightTone }) {
  return (
    <div className={`h-16 rounded-xl border ${TONE[tone].border} ${TONE[tone].bg} flex items-center justify-center`}>
      <Sparkles className={`h-5 w-5 ${TONE[tone].text}`} />
    </div>
  );
}

function ExecutiveMiniChart({ card }: { card: ExecutiveCard }) {
  const series = card.series || [];
  if (!series.length) return <EmptyMiniChart tone={card.tone} />;

  if (card.id === "risk" || card.id === "action") {
    return (
      <ResponsiveContainer width="100%" height={64}>
        <BarChart data={series}>
          <Bar dataKey="value" radius={[4, 4, 0, 0]} fill={TONE[card.tone].fill} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={64}>
      <AreaChart data={series}>
        <defs>
          <linearGradient id={`card-${card.id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={TONE[card.tone].fill} stopOpacity={0.28} />
            <stop offset="100%" stopColor={TONE[card.tone].fill} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={TONE[card.tone].fill} strokeWidth={3} fill={`url(#card-${card.id})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function InsightSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="ap-card border rounded-2xl p-5 animate-pulse">
            <div className="h-3 w-24 rounded-full bg-[var(--ap-surface-3)]" />
            <div className="mt-5 h-8 w-20 rounded bg-[var(--ap-surface-3)]" />
            <div className="mt-3 h-3 w-3/4 rounded bg-[var(--ap-surface-3)]" />
            <div className="mt-5 h-16 rounded-xl bg-[var(--ap-surface-3)]" />
          </div>
        ))}
      </div>
      <div className="ap-card border rounded-2xl p-6 animate-pulse">
        <div className="h-4 w-40 rounded bg-[var(--ap-surface-3)]" />
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-36 rounded-xl bg-[var(--ap-surface-3)]" />
          <div className="h-36 rounded-xl bg-[var(--ap-surface-3)]" />
          <div className="h-36 rounded-xl bg-[var(--ap-surface-3)]" />
        </div>
      </div>
    </div>
  );
}

function OpportunitySparkline({ series, tone }: { series?: InsightSeriesPoint[]; tone: InsightTone }) {
  if (!series?.length) {
    return <EmptyMiniChart tone={tone} />;
  }
  return (
    <ResponsiveContainer width="100%" height={56}>
      <AreaChart data={series}>
        <defs>
          <linearGradient id={`opportunity-summary-${tone}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={TONE[tone].fill} stopOpacity={0.24} />
            <stop offset="100%" stopColor={TONE[tone].fill} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={TONE[tone].fill} strokeWidth={2.5} fill={`url(#opportunity-summary-${tone})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function sortOpportunityItems(items: OpportunityItem[], sort: string) {
  const ranked = [...items];
  if (sort === "Confidence") {
    return ranked.sort((a, b) => b.confidence - a.confidence);
  }
  if (sort === "Category") {
    return ranked.sort((a, b) => a.category.localeCompare(b.category) || b.confidence - a.confidence);
  }
  return ranked.sort((a, b) => {
    const aImpact = parseNumber(a.impact) || a.confidence;
    const bImpact = parseNumber(b.impact) || b.confidence;
    return bImpact - aImpact;
  });
}

function opportunityPrompt(action: string, opportunity: OpportunityItem) {
  return `${action} for "${opportunity.title}". Use the opportunity evidence, expected impact (${opportunity.impact}), confidence (${opportunity.confidence}%), and create a practical next-step recommendation.`;
}

interface OpportunitiesTabProps {
  payload: OpportunitiesPayload;
  selectedId: string;
  activeFilter: string;
  sort: string;
  notice: string;
  loading?: boolean;
  onSelect: (id: string) => void;
  onFilter: (key: string) => void;
  onSort: (value: string) => void;
  onNotice: (value: string) => void;
  onAskQuestion: (question: string) => void | Promise<void>;
}

function OpportunitiesTab({
  payload,
  selectedId,
  activeFilter,
  sort,
  notice,
  loading,
  onSelect,
  onFilter,
  onSort,
  onNotice,
  onAskQuestion,
}: OpportunitiesTabProps) {
  const filteredItems = useMemo(() => {
    const base = activeFilter === "all" ? payload.items : payload.items.filter((item) => item.category.toLowerCase().replace(/\s+/g, "-") === activeFilter);
    return sortOpportunityItems(base, sort);
  }, [activeFilter, payload.items, sort]);
  const selected = payload.items.find((item) => item.id === selectedId) || filteredItems[0] || payload.items[0];
  const runAction = (action: string, opportunity: OpportunityItem) => {
    onNotice(`${action} started for ${opportunity.title}.`);
    void onAskQuestion(opportunityPrompt(action, opportunity));
  };

  return (
    <motion.div key="opportunities" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {notice && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-xs font-bold text-[#145DFF]">
          {notice}
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {payload.summary_cards.map((card) => (
          <button
            key={card.label}
            onClick={() => {
              if (card.label.includes("Revenue")) onFilter("revenue");
              if (card.label.includes("Cost")) onFilter("cost-savings");
            }}
            className="ap-card border rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${TONE[card.tone].bg} ${TONE[card.tone].text}`}>
                {insightIcon(card.tone)}
              </div>
              <div className="h-14 w-24">
                <OpportunitySparkline series={card.series} tone={card.tone} />
              </div>
            </div>
            <div className="mt-4 text-xs font-bold ap-muted">{card.label}</div>
            <div className="mt-1 text-2xl font-black text-[var(--ap-text)]">{card.value}</div>
            <div className={`mt-1 text-xs font-black ${TONE[card.tone].text}`}>{card.subtext}</div>
          </button>
        ))}
      </section>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          {payload.filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => onFilter(filter.key)}
              className={`rounded-xl border px-4 py-2 text-xs font-black transition-all ${
                activeFilter === filter.key ? "border-[#145DFF] bg-[#145DFF] text-white shadow-lg shadow-blue-500/20" : "ap-btn"
              }`}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold ap-muted" htmlFor="opportunity-sort">
            Sort
          </label>
          <select
            id="opportunity-sort"
            value={sort}
            onChange={(event) => onSort(event.target.value)}
            className="rounded-xl border bg-[var(--ap-surface)] px-3 py-2 text-xs font-bold outline-none focus:border-[#145DFF]"
            style={{ borderColor: "var(--ap-border)", color: "var(--ap-text)" }}
          >
            {payload.sorts.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-[1fr_420px] gap-5">
        <div className="space-y-4">
          <section className="ap-card border rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-[var(--ap-text)]">Top Opportunities</h2>
                <p className="text-xs ap-muted">Ranked opportunities generated from dataset profile, sampled rows, and schema context.</p>
              </div>
              <button onClick={() => onFilter("all")} className="text-xs font-black text-[#145DFF] inline-flex items-center gap-1">
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {filteredItems.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-2xl border p-4 transition-all ${selected?.id === item.id ? "border-[#145DFF] shadow-lg shadow-blue-500/10" : ""}`}
                  style={{ borderColor: selected?.id === item.id ? "#145DFF" : "var(--ap-border)", background: "var(--ap-surface-2)" }}
                >
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_170px_170px_220px] xl:items-center">
                    <button onClick={() => onSelect(item.id)} className="min-w-0 text-left flex items-start gap-4">
                      <span className={`mt-0.5 h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center ${TONE[item.tone].bg} ${TONE[item.tone].text}`}>
                        {insightIcon(item.tone)}
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black text-[var(--ap-text)]">{item.title}</span>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-black ${TONE[item.tone].bg} ${TONE[item.tone].text}`}>{item.category}</span>
                        </span>
                        <span className="mt-1 block text-xs leading-5 ap-muted">{item.description}</span>
                      </span>
                    </button>
                    <div>
                      <div className="text-[11px] font-bold ap-muted">Potential Impact</div>
                      <div className="mt-1 text-lg font-black text-[var(--ap-text)]">{item.impact}</div>
                      <div className="text-xs ap-muted">{item.impact_detail}</div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-bold ap-muted">
                        <span>Confidence</span>
                        <span>{item.confidence}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--ap-surface-3)]">
                        <div className="h-full rounded-full" style={{ width: `${item.confidence}%`, background: TONE[item.tone].fill }} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <button onClick={() => onSelect(item.id)} className="ap-btn rounded-lg px-3 py-2 text-xs font-black">
                        View evidence
                      </button>
                      <button onClick={() => runAction("Create Action Plan", item)} disabled={loading} className="ap-btn-primary rounded-lg px-3 py-2 text-xs font-black disabled:opacity-60">
                        Create action plan
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="ap-card border rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-[var(--ap-text)]">Opportunity Prioritization Matrix</h2>
                <p className="text-xs ap-muted">Use this to decide what becomes an action plan first.</p>
              </div>
              <button onClick={() => void onAskQuestion("Prioritize the opportunity matrix into a 30-day execution sequence.")} className="text-xs font-black text-[#145DFF]">
                Ask AI to prioritize
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 border rounded-2xl overflow-hidden" style={{ borderColor: "var(--ap-border)" }}>
              {[
                ["High Impact / Easy to Execute", payload.matrix.high_easy, "emerald"],
                ["High Impact / Hard to Execute", payload.matrix.high_hard, "orange"],
                ["Low Impact / Easy to Execute", payload.matrix.low_easy, "blue"],
                ["Low Impact / Hard to Execute", payload.matrix.low_hard, "rose"],
              ].map(([label, values, tone]) => (
                <div key={String(label)} className="p-4 border" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
                  <div className={`text-xs font-black ${TONE[tone as InsightTone].text}`}>{String(label)}</div>
                  <div className="mt-3 space-y-2">
                    {(values as string[]).map((value) => (
                      <button
                        key={value}
                        onClick={() => {
                          const found = payload.items.find((item) => item.title === value);
                          if (found) onSelect(found.id);
                          else void onAskQuestion(`Evaluate this opportunity: ${value}`);
                        }}
                        className="block w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold ap-muted hover:bg-[var(--ap-surface-3)] hover:text-[var(--ap-text)]"
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {selected && (
          <aside className="ap-card border rounded-2xl p-5 2xl:sticky 2xl:top-4 self-start">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className={`h-12 w-12 rounded-2xl flex items-center justify-center ${TONE[selected.tone].bg} ${TONE[selected.tone].text}`}>
                  {insightIcon(selected.tone)}
                </span>
                <div>
                  <h2 className="text-base font-black text-[var(--ap-text)]">{selected.title}</h2>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black ${TONE[selected.tone].bg} ${TONE[selected.tone].text}`}>{selected.category}</span>
                    <span className="rounded-full bg-[var(--ap-surface-3)] px-2 py-1 text-[10px] font-black ap-muted">{selected.confidence}% confidence</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <h3 className="text-xs font-black text-[var(--ap-text)]">Why we found this</h3>
              <p className="mt-2 text-xs leading-5 ap-muted">{selected.why}</p>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selected.potential.map((item) => (
                <div key={item.label} className="rounded-xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
                  <div className="text-[11px] font-bold ap-muted">{item.label}</div>
                  <div className={`mt-1 text-lg font-black ${TONE[selected.tone].text}`}>{item.value}</div>
                  <div className="text-xs ap-muted">{item.detail}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
                <h3 className="text-xs font-black text-[var(--ap-text)]">Revenue by Discount Range</h3>
                <div className="mt-3 h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={selected.evidence.revenue_by_discount}>
                      <CartesianGrid stroke="var(--ap-chart-grid)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis hide />
                      <Tooltip formatter={(value) => compactNumber(Number(value))} />
                      <Bar dataKey="value" fill={TONE[selected.tone].fill} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
                <h3 className="text-xs font-black text-[var(--ap-text)]">Rating by Discount Range</h3>
                <div className="mt-3 h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={selected.evidence.rating_by_discount}>
                      <CartesianGrid stroke="var(--ap-chart-grid)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis hide />
                      <Tooltip />
                      <Area type="monotone" dataKey="value" stroke="#145DFF" strokeWidth={2} fill="rgba(20,93,255,0.12)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-[var(--ap-text)]">Top Rows Affected</h3>
                <button onClick={() => void onAskQuestion(`Show all rows affected by ${selected.title}.`)} className="text-[11px] font-black text-[#145DFF]">
                  View all
                </button>
              </div>
              <div className="mt-3 overflow-hidden rounded-xl border" style={{ borderColor: "var(--ap-border)" }}>
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--ap-surface-2)] ap-muted">
                    <tr>
                      <th className="px-3 py-2 font-black">Product</th>
                      <th className="px-3 py-2 font-black">Current</th>
                      <th className="px-3 py-2 font-black">Recommended</th>
                      <th className="px-3 py-2 font-black">Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.evidence.affected_products.map((row) => (
                      <tr key={`${row.product}-${row.current}`} className="border-t" style={{ borderColor: "var(--ap-border)" }}>
                        <td className="px-3 py-2 font-semibold text-[var(--ap-text)]">{row.product}</td>
                        <td className="px-3 py-2 ap-muted">{row.current}</td>
                        <td className="px-3 py-2 ap-muted">{row.recommended}</td>
                        <td className="px-3 py-2 font-black text-[#145DFF]">{row.impact}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {["Create Action Plan", "Run What-if Simulation", "Ask AI", "Add to Decision Brief"].map((action) => (
                <button key={action} onClick={() => runAction(action, selected)} className="ap-btn rounded-xl px-3 py-3 text-left text-xs font-black">
                  <span className="flex items-center justify-between gap-2">
                    {action}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>
    </motion.div>
  );
}

function riskPrompt(action: string, risk: RiskItem) {
  return `${action} for "${risk.title}". Use the risk evidence, current impact (${risk.impact}), severity (${risk.severity}), confidence (${risk.confidence}%), and recommend practical mitigation steps.`;
}

interface RisksTabProps {
  payload: RisksPayload;
  selectedId: string;
  activeFilter: string;
  notice: string;
  loading?: boolean;
  onSelect: (id: string) => void;
  onFilter: (key: string) => void;
  onNotice: (value: string) => void;
  onAskQuestion: (question: string) => void | Promise<void>;
}

function RisksTab({
  payload,
  selectedId,
  activeFilter,
  notice,
  loading,
  onSelect,
  onFilter,
  onNotice,
  onAskQuestion,
}: RisksTabProps) {
  const [investigatorTab, setInvestigatorTab] = useState(payload.investigator_tabs[0] || "Why this risk?");
  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return payload.items;
    return payload.items.filter((item) => item.severity.toLowerCase() === activeFilter);
  }, [activeFilter, payload.items]);
  const selected = payload.items.find((item) => item.id === selectedId) || filteredItems[0] || payload.items[0];
  const runRiskAction = (action: string, risk: RiskItem) => {
    onNotice(`${action} started for ${risk.title}.`);
    void onAskQuestion(riskPrompt(action, risk));
  };

  return (
    <motion.div key="risks" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {notice && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-700">
          {notice}
        </div>
      )}

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-black text-emerald-700" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface)" }}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Auto-scan: {payload.autoscan ? "On" : "Paused"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-black text-[#145DFF]" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface)" }}>
            <BrainCircuit className="h-3.5 w-3.5" />
            Confidence avg: {payload.average_confidence}%
          </span>
        </div>
        <button onClick={() => void onAskQuestion("Refresh and reprioritize all current business risks from the active dataset.")} className="ap-btn rounded-xl px-4 py-2.5 text-xs font-black inline-flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh risks
        </button>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {payload.summary_cards.map((card) => (
          <button
            key={card.label}
            onClick={() => {
              if (card.label.includes("High")) onFilter("high");
              if (card.label.includes("Active")) onFilter("all");
            }}
            className="ap-card border rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${TONE[card.tone].bg} ${TONE[card.tone].text}`}>
                {insightIcon(card.tone)}
              </div>
              <div className="h-14 w-24">
                <OpportunitySparkline series={card.series} tone={card.tone} />
              </div>
            </div>
            <div className="mt-4 text-xs font-bold ap-muted">{card.label}</div>
            <div className="mt-1 text-2xl font-black text-[var(--ap-text)]">{card.value}</div>
            <div className={`mt-1 text-xs font-black ${TONE[card.tone].text}`}>{card.subtext}</div>
          </button>
        ))}
      </section>

      <div className="grid grid-cols-1 2xl:grid-cols-[360px_1fr_420px] gap-5">
        <aside className="ap-card border rounded-2xl p-4 self-start">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[var(--ap-text)]">Risk Queue</h2>
              <p className="text-xs ap-muted">Investigate risks before they become decisions.</p>
            </div>
            <button onClick={() => onFilter("all")} className="ap-btn rounded-lg px-3 py-2 text-[11px] font-black">
              Filter
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {payload.filters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => onFilter(filter.key)}
                className={`rounded-xl border px-3 py-2 text-[11px] font-black transition-all ${
                  activeFilter === filter.key ? "border-[#145DFF] bg-[#145DFF] text-white shadow-lg shadow-blue-500/20" : "ap-btn"
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {filteredItems.map((risk) => (
              <button
                key={risk.id}
                onClick={() => onSelect(risk.id)}
                className="w-full rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5"
                style={{
                  borderColor: selected?.id === risk.id ? "#145DFF" : "var(--ap-border)",
                  background: selected?.id === risk.id ? "rgba(20, 93, 255, 0.08)" : "var(--ap-surface-2)",
                }}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1 h-3 w-3 rounded-full ${risk.severity === "High" ? "bg-rose-500" : risk.severity === "Medium" ? "bg-orange-500" : "bg-emerald-500"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-black text-[var(--ap-text)]">{risk.title}</span>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-black ${TONE[risk.tone].bg} ${TONE[risk.tone].text}`}>{risk.severity}</span>
                    </span>
                    <span className="mt-1 block text-xs leading-5 ap-muted">{risk.description}</span>
                    <span className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <span>
                        <span className="block font-bold ap-muted">Potential Impact</span>
                        <span className="mt-1 block font-black text-rose-600">{risk.impact}</span>
                      </span>
                      <span>
                        <span className="block font-bold ap-muted">Confidence</span>
                        <span className="mt-1 block font-black text-[var(--ap-text)]">{risk.confidence}%</span>
                      </span>
                    </span>
                  </span>
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => void onAskQuestion("Show all risks and rank them by urgency, impact, and ease of mitigation.")} className="mt-4 w-full ap-btn rounded-xl px-4 py-3 text-xs font-black">
            View all risks
          </button>
        </aside>

        {selected && (
          <main className="space-y-4">
            <section className="ap-card border rounded-2xl p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-rose-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {selected.severity} Risk
                  </div>
                  <h2 className="mt-3 text-2xl font-black text-[var(--ap-text)]">{selected.title}</h2>
                  <p className="mt-2 text-sm leading-6 ap-muted">{selected.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["Investigate", "Run Simulation", "Create Action Plan", "Add to Brief"].map((action) => (
                    <button
                      key={action}
                      disabled={loading}
                      onClick={() => runRiskAction(action, selected)}
                      className={action === "Investigate" ? "ap-btn-primary rounded-xl px-4 py-2.5 text-xs font-black disabled:opacity-60" : "ap-btn rounded-xl px-4 py-2.5 text-xs font-black disabled:opacity-60"}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-4 overflow-hidden rounded-2xl border" style={{ borderColor: "var(--ap-border)" }}>
                {[
                  ["Revenue at Risk", selected.impact, selected.impact_detail],
                  ["% of Total Signal", selected.metrics[0]?.value || "-", selected.metrics[0]?.detail || ""],
                  ["Impact Level", selected.severity, "business risk"],
                  ["Confidence", `${selected.confidence}%`, "profile confidence"],
                ].map(([label, value, detail]) => (
                  <div key={label} className="border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
                    <div className="text-[11px] font-bold ap-muted">{label}</div>
                    <div className={label.includes("Revenue") ? "mt-2 text-xl font-black text-rose-600" : "mt-2 text-xl font-black text-[var(--ap-text)]"}>{value}</div>
                    <div className="mt-1 text-xs ap-muted">{detail}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-[0.85fr_1.15fr] gap-4">
              <div className="ap-card border rounded-2xl p-5">
                <h3 className="text-sm font-black text-[var(--ap-text)]">Key Drivers</h3>
                <ul className="mt-4 space-y-3">
                  {selected.drivers.map((driver) => (
                    <li key={driver} className="flex gap-3 text-xs leading-5 ap-muted">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#145DFF]" />
                      {driver}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="ap-card border rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-[var(--ap-text)]">Risk Timeline</h3>
                  <span className="text-[11px] font-bold ap-muted">Last 60 days</span>
                </div>
                <div className="mt-4 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={selected.timeline}>
                      <defs>
                        <linearGradient id="risk-timeline" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.22} />
                          <stop offset="100%" stopColor="#F43F5E" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--ap-chart-grid)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="value" stroke="#F43F5E" strokeWidth={2.5} fill="url(#risk-timeline)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="ap-card border rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-[var(--ap-text)]">Top Contributing Rows</h3>
                <button onClick={() => void onAskQuestion(`Show all affected items for ${selected.title}.`)} className="text-xs font-black text-[#145DFF] inline-flex items-center gap-1">
                  View all affected items
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-4 overflow-hidden rounded-xl border" style={{ borderColor: "var(--ap-border)" }}>
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--ap-surface-2)] ap-muted">
                    <tr>
                      <th className="px-4 py-3 font-black">Item</th>
                      <th className="px-4 py-3 font-black">Share</th>
                      <th className="px-4 py-3 font-black">Value</th>
                      <th className="px-4 py-3 font-black">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.affected_items.map((item) => (
                      <tr key={`${selected.id}-${item.product}-${item.share}`} className="border-t" style={{ borderColor: "var(--ap-border)" }}>
                        <td className="px-4 py-3 font-semibold text-[var(--ap-text)]">{item.product}</td>
                        <td className="px-4 py-3 ap-muted">{item.share}</td>
                        <td className="px-4 py-3 ap-muted">{item.value}</td>
                        <td className={`px-4 py-3 font-black ${item.trend.includes("-") ? "text-rose-600" : "text-emerald-600"}`}>{item.trend}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </main>
        )}

        {selected && (
          <aside className="ap-card border rounded-2xl p-5 2xl:sticky 2xl:top-4 self-start">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-[var(--ap-text)]">Insight Investigator</h2>
                <p className="mt-1 text-xs ap-muted">Evidence, scenarios, and mitigation next steps.</p>
              </div>
              <button onClick={() => void onAskQuestion(`Summarize the investigation for ${selected.title}.`)} className="text-xs font-black text-[#145DFF]">
                Ask AI
              </button>
            </div>
            <div className="mt-4 flex overflow-x-auto rounded-xl border p-1" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
              {payload.investigator_tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setInvestigatorTab(tab)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-black transition-all ${investigatorTab === tab ? "bg-[#145DFF] text-white" : "ap-muted hover:text-[var(--ap-text)]"}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
              <div className="text-xs font-black text-[var(--ap-text)]">{investigatorTab === "Why this risk?" ? "AI Explanation" : investigatorTab}</div>
              <p className="mt-2 text-xs leading-5 ap-muted">
                {investigatorTab === "Affected Items"
                  ? `${selected.affected_items.length} rows or segments currently contribute to this risk. Open the affected list to validate each item before acting.`
                  : investigatorTab === "Evidence"
                    ? "The evidence combines profile statistics, top contributors, field quality, and sampled row behavior from the active dataset."
                    : investigatorTab === "Notes"
                      ? "No team notes yet. Create an action plan or add this risk to a decision brief to start tracking ownership."
                      : selected.explanation}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3">
                {selected.metrics.map((metric) => (
                  <div key={metric.label} className="rounded-xl border p-3" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface)" }}>
                    <div className="text-[11px] font-bold ap-muted">{metric.label}</div>
                    <div className={`mt-1 text-base font-black ${metric.label.includes("Revenue") || metric.label.includes("Exposure") ? "text-rose-600" : "text-[var(--ap-text)]"}`}>{metric.value}</div>
                    <div className="text-xs ap-muted">{metric.detail}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
              <h3 className="text-sm font-black text-[var(--ap-text)]">Simulate & See Impact</h3>
              <label className="mt-4 block text-[11px] font-black ap-muted" htmlFor="risk-scenario">
                Scenario
              </label>
              <select id="risk-scenario" className="mt-2 w-full rounded-xl border bg-[var(--ap-surface)] px-3 py-2 text-xs font-bold outline-none" style={{ borderColor: "var(--ap-border)", color: "var(--ap-text)" }} defaultValue={selected.scenario.name}>
                <option>{selected.scenario.name}</option>
                <option>Reduce top contributor exposure</option>
                <option>Create mitigation action plan</option>
              </select>
              <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-xl border" style={{ borderColor: "var(--ap-border)" }}>
                {[
                  ["Revenue", selected.scenario.revenue_change],
                  ["Margin", selected.scenario.margin_change],
                  ["Risk Level", selected.scenario.risk_level],
                ].map(([label, value]) => (
                  <div key={label} className="border p-3" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface)" }}>
                    <div className="text-[10px] font-bold ap-muted">{label}</div>
                    <div className={label === "Risk Level" ? "mt-1 text-sm font-black text-orange-600" : "mt-1 text-sm font-black text-emerald-600"}>{value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Confidence: {selected.scenario.confidence}%
              </div>
              <button onClick={() => runRiskAction("Run Simulation", selected)} className="mt-4 w-full ap-btn-primary rounded-xl px-4 py-3 text-xs font-black">
                Run simulation
              </button>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-black text-[var(--ap-text)]">Recommended Next Steps</h3>
              <div className="mt-3 space-y-2">
                {selected.next_steps.map((step) => (
                  <button key={step} onClick={() => runRiskAction(step, selected)} className="w-full ap-btn rounded-xl px-3 py-3 text-left text-xs font-bold">
                    <span className="flex items-center justify-between gap-2">
                      {step}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </motion.div>
  );
}

function trendPrompt(action: string, trend: TrendItem) {
  return `${action} for "${trend.title}". Use column ${trend.column}, confidence ${trend.confidence}%, impact ${trend.impact}, and change ${trend.change_percent.toFixed(1)}%. Explain what changed, why it matters, and the safest next step.`;
}

interface TrendsTabProps {
  payload: TrendsPayload;
  selectedId: string;
  sort: string;
  notice: string;
  loading?: boolean;
  onSelect: (id: string) => void;
  onSort: (value: string) => void;
  onNotice: (value: string) => void;
  onAskQuestion: (question: string) => void | Promise<void>;
}

function TrendsTab({
  payload,
  selectedId,
  sort,
  notice,
  loading,
  onSelect,
  onSort,
  onNotice,
  onAskQuestion,
}: TrendsTabProps) {
  const [explorerColumn, setExplorerColumn] = useState(payload.explorer.columns[0] || "");
  const [analysisType, setAnalysisType] = useState(payload.explorer.analysis_types[0] || "Change over sample");
  const [compareBy, setCompareBy] = useState(payload.explorer.comparisons.find(Boolean) || "");
  const [timeRange, setTimeRange] = useState(payload.explorer.time_ranges[0] || "Current upload");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    if (!payload.explorer.columns.length) return;
    if (!payload.explorer.columns.includes(explorerColumn)) {
      setExplorerColumn(payload.explorer.columns[0]);
    }
  }, [explorerColumn, payload.explorer.columns]);

  const sortedItems = useMemo(() => {
    const impactRank: Record<TrendItem["impact"], number> = { High: 3, Medium: 2, Low: 1 };
    return [...payload.items].sort((a, b) => {
      if (sort === "Confidence") return b.confidence - a.confidence;
      if (sort === "Column") return a.column.localeCompare(b.column);
      return impactRank[b.impact] - impactRank[a.impact] || b.confidence - a.confidence;
    });
  }, [payload.items, sort]);

  const selected = payload.items.find((item) => item.id === selectedId) || sortedItems[0] || payload.items[0];

  const runTrendAction = (action: string, trend: TrendItem) => {
    onNotice(`${action} started for ${trend.column}.`);
    void onAskQuestion(trendPrompt(action, trend));
  };

  const runExplorer = () => {
    const prompt = `Analyze trends for column "${explorerColumn || "the selected column"}" using "${analysisType}"${compareBy ? ` compared by "${compareBy}"` : ""} over "${timeRange}". Return the biggest change, confidence, affected segments, and recommended next action.`;
    onNotice(`Trend analysis queued for ${explorerColumn || "selected column"}.`);
    void onAskQuestion(prompt);
  };

  return (
    <motion.div key="trends" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {notice && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-xs font-bold text-[#145DFF]">
          {notice}
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {payload.summary_cards.map((card) => (
          <button
            key={card.label}
            onClick={() => {
              if (card.label.includes("Anomalies")) onSort("Impact");
              if (card.label.includes("Columns")) onSort("Column");
            }}
            className="ap-card border rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${TONE[card.tone].bg} ${TONE[card.tone].text}`}>
                {insightIcon(card.tone)}
              </div>
              <div className="h-14 w-24">
                <OpportunitySparkline series={card.series} tone={card.tone} />
              </div>
            </div>
            <div className="mt-4 text-xs font-bold ap-muted">{card.label}</div>
            <div className="mt-1 text-2xl font-black text-[var(--ap-text)]">{card.value}</div>
            <div className={`mt-1 text-xs font-black ${TONE[card.tone].text}`}>{card.subtext}</div>
          </button>
        ))}
      </section>

      <div className="grid grid-cols-1 2xl:grid-cols-[1fr_390px] gap-5">
        <div className="space-y-5">
          <section className="ap-card border rounded-2xl p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-base font-black text-[var(--ap-text)]">AI Detected Trends</h2>
                <p className="text-xs ap-muted">Column-aware changes, distribution shifts, and anomaly patterns from the active dataset.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="trend-sort">Sort trends</label>
                <select
                  id="trend-sort"
                  value={sort}
                  onChange={(event) => onSort(event.target.value)}
                  className="rounded-xl border bg-[var(--ap-surface-2)] px-3 py-2 text-xs font-bold outline-none focus:border-[#145DFF]"
                  style={{ borderColor: "var(--ap-border)", color: "var(--ap-text)" }}
                >
                  {payload.sorts.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
                <div className="inline-flex rounded-xl border p-1" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
                  {(["grid", "list"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-black transition ${viewMode === mode ? "bg-[#145DFF] text-white" : "ap-muted hover:text-[var(--ap-text)]"}`}
                    >
                      {mode === "grid" ? "Cards" : "List"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={viewMode === "grid" ? "mt-5 grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4" : "mt-5 space-y-3"}>
              {sortedItems.map((trend) => (
                <button
                  key={trend.id}
                  onClick={() => onSelect(trend.id)}
                  className={`text-left rounded-2xl border p-4 transition-all hover:-translate-y-0.5 ${selected?.id === trend.id ? "shadow-lg shadow-blue-500/10" : ""}`}
                  style={{
                    borderColor: selected?.id === trend.id ? "#145DFF" : "var(--ap-border)",
                    background: selected?.id === trend.id ? "rgba(20, 93, 255, 0.08)" : "var(--ap-surface-2)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className={`h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center ${TONE[trend.tone].bg} ${TONE[trend.tone].text}`}>
                      {insightIcon(trend.tone)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-black ${TONE[trend.tone].bg} ${TONE[trend.tone].text}`}>{trend.kind}</span>
                        <span className="rounded-full bg-[var(--ap-surface-3)] px-2 py-1 text-[10px] font-black ap-muted">{trend.column}</span>
                      </span>
                      <span className="mt-3 block text-sm font-black leading-5 text-[var(--ap-text)]">{trend.title}</span>
                      <span className="mt-2 block text-xs leading-5 ap-muted">{trend.description}</span>
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <span>
                      <span className="block text-[11px] font-bold ap-muted">Impact</span>
                      <span className={`mt-1 block text-sm font-black ${TONE[trend.tone].text}`}>{trend.impact}</span>
                    </span>
                    <span>
                      <span className="block text-[11px] font-bold ap-muted">Confidence</span>
                      <span className="mt-1 block text-sm font-black text-[var(--ap-text)]">{trend.confidence}%</span>
                    </span>
                  </div>
                  <div className="mt-4 h-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trend.series}>
                        <XAxis dataKey="name" hide />
                        <YAxis hide />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke={TONE[trend.tone].fill} strokeWidth={2.5} fill={TONE[trend.tone].soft} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <span className="ap-btn rounded-lg px-3 py-2 text-[11px] font-black">Investigate</span>
                    <span className="ap-btn rounded-lg px-3 py-2 text-[11px] font-black">More</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="ap-card border rounded-2xl p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-base font-black text-[var(--ap-text)]">Trend Explorer</h2>
                <p className="text-xs ap-muted">Pick any detected column and run a focused trend investigation.</p>
              </div>
              <button onClick={runExplorer} disabled={loading || !payload.explorer.columns.length} className="ap-btn-primary rounded-xl px-5 py-3 text-xs font-black disabled:opacity-60">
                {loading ? "Running..." : "Run Analysis"}
              </button>
            </div>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                ["Select Column", explorerColumn, setExplorerColumn, payload.explorer.columns],
                ["Analysis Type", analysisType, setAnalysisType, payload.explorer.analysis_types],
                ["Compare By", compareBy, setCompareBy, payload.explorer.comparisons.length ? payload.explorer.comparisons : ["No comparison"]],
                ["Time Range", timeRange, setTimeRange, payload.explorer.time_ranges],
              ].map(([label, value, setter, options]) => (
                <label key={String(label)} className="block">
                  <span className="text-[11px] font-black ap-muted">{String(label)}</span>
                  <select
                    value={String(value)}
                    onChange={(event) => (setter as (next: string) => void)(event.target.value)}
                    className="mt-2 w-full rounded-xl border bg-[var(--ap-surface-2)] px-3 py-3 text-xs font-bold outline-none focus:border-[#145DFF]"
                    style={{ borderColor: "var(--ap-border)", color: "var(--ap-text)" }}
                  >
                    {(options as string[]).filter(Boolean).map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-dashed p-6 text-center" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
              <Sparkles className="mx-auto h-5 w-5 text-[#145DFF]" />
              <p className="mt-2 text-xs font-bold ap-muted">Drag columns here later for multi-column comparison, or use the controls above for a focused AI trend read.</p>
            </div>
          </section>
        </div>

        {selected && (
          <aside className="ap-card border rounded-2xl p-5 2xl:sticky 2xl:top-4 self-start">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-[var(--ap-text)]">Insight Explanation</h2>
                <p className="mt-1 text-xs ap-muted">Selected trend: {selected.column}</p>
              </div>
              <button onClick={() => runTrendAction("Explain this trend", selected)} className="text-xs font-black text-[#145DFF]">
                Ask AI
              </button>
            </div>

            <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
              <div className="flex items-center justify-between gap-3">
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black ${TONE[selected.tone].bg} ${TONE[selected.tone].text}`}>
                  {insightIcon(selected.tone)}
                  {selected.kind}
                </span>
                <span className="text-xs font-black text-[var(--ap-text)]">{selected.confidence}% confidence</span>
              </div>
              <h3 className="mt-4 text-lg font-black text-[var(--ap-text)]">{selected.title}</h3>
              <p className="mt-2 text-xs leading-5 ap-muted">{selected.description}</p>
              <div className="mt-4 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={selected.series}>
                    <CartesianGrid stroke="var(--ap-chart-grid)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke={TONE[selected.tone].fill} strokeWidth={2.5} fill={TONE[selected.tone].soft} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-black text-[var(--ap-text)]">Why this is happening</h3>
              <ul className="mt-3 space-y-3">
                {selected.reasons.map((reason) => (
                  <li key={reason} className="flex gap-3 text-xs leading-5 ap-muted">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#145DFF]" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-black text-[var(--ap-text)]">What is impacted</h3>
              <div className="mt-3 overflow-hidden rounded-xl border" style={{ borderColor: "var(--ap-border)" }}>
                {(selected.impacted.length ? selected.impacted : [{ label: selected.column, value: `${Math.abs(selected.change_percent).toFixed(1)}%`, direction: selected.change_percent >= 0 ? "up" : "down" } as TrendImpact]).map((item) => (
                  <div key={`${item.label}-${item.value}`} className="flex items-center justify-between border-b px-4 py-3 last:border-b-0" style={{ borderColor: "var(--ap-border)" }}>
                    <span className="text-xs font-bold text-[var(--ap-text)]">{item.label}</span>
                    <span className={`text-xs font-black ${item.direction === "down" ? "text-rose-600" : item.direction === "up" ? "text-emerald-600" : "ap-muted"}`}>
                      {item.direction === "down" ? "-" : item.direction === "up" ? "+" : ""}
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-black text-[var(--ap-text)]">What you can do</h3>
              <div className="mt-3 space-y-2">
                {selected.actions.map((action) => (
                  <button key={action} onClick={() => runTrendAction(action, selected)} className="w-full ap-btn rounded-xl px-3 py-3 text-left text-xs font-bold">
                    <span className="flex items-center justify-between gap-2">
                      {action}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
              <h3 className="text-sm font-black text-[var(--ap-text)]">Quick Actions</h3>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {["Compare custom periods", "Analyze correlations", "Detect data drift", "Export trend report"].map((action) => (
                  <button key={action} onClick={() => runTrendAction(action, selected)} className="ap-btn rounded-xl px-3 py-2.5 text-left text-xs font-black">
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>

      <section className="ap-card border rounded-2xl p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ap-muted" />
            <input
              className="w-full rounded-xl border bg-[var(--ap-surface-2)] py-3 pl-10 pr-3 text-sm outline-none focus:border-[#145DFF]"
              style={{ borderColor: "var(--ap-border)", color: "var(--ap-text)" }}
              placeholder="Ask anything about trends in your data..."
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  const value = event.currentTarget.value.trim();
                  if (value) {
                    void onAskQuestion(value);
                    event.currentTarget.value = "";
                  }
                }
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {payload.suggested_questions.map((question) => (
              <button
                key={question}
                onClick={() => void onAskQuestion(question)}
                className="rounded-full border px-3 py-2 text-xs font-bold ap-muted hover:text-[#145DFF]"
                style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
}

interface InsightsWorkspaceOverviewProps {
  activePayload: ExecutiveInsightsPayload;
  overview: ExecutiveOverview;
  opportunities: OpportunitiesPayload;
  question: string;
  loading?: boolean;
  onQuestionChange: (value: string) => void;
  onSubmitQuestion: () => void;
  onAskQuestion: (question: string) => void | Promise<void>;
  onOpenOpportunities: (id?: string) => void;
}

function InsightsWorkspaceOverview({
  activePayload,
  overview,
  opportunities,
  question,
  loading,
  onQuestionChange,
  onSubmitQuestion,
  onAskQuestion,
  onOpenOpportunities,
}: InsightsWorkspaceOverviewProps) {
  const [selectedInsightId, setSelectedInsightId] = useState(opportunities.items[0]?.id || "");
  const [inboxState, setInboxState] = useState<"open" | "progress" | "resolved">("open");
  const [detailView, setDetailView] = useState("Overview");
  const [simulationShift, setSimulationShift] = useState(10);
  const selectedInsight = opportunities.items.find((item) => item.id === selectedInsightId) || opportunities.items[0];
  const actionableCount = Math.max(opportunities.items.length, overview.key_findings.length + overview.recommended_actions.length);
  const journey = [
    { label: "Upload Dataset", state: "done" },
    { label: "Business Context", state: "done" },
    { label: "AI Understanding", state: "done" },
    { label: "Generate Insights", state: "active" },
    { label: "Ask Questions", state: "next" },
    { label: "Create Reports", state: "next" },
    { label: "Run Simulations", state: "next" },
  ];
  const statusCards = [
    {
      label: "Insights Detected",
      value: String(actionableCount),
      helper: `${opportunities.items.length} actionable opportunities`,
      tone: "blue" as InsightTone,
    },
    {
      label: "Potential Revenue Impact",
      value: opportunities.summary_cards.find((card) => card.label.includes("Revenue"))?.value || selectedInsight?.impact || "-",
      helper: "Highest confidence path",
      tone: "emerald" as InsightTone,
    },
    {
      label: "Potential Cost Savings",
      value: opportunities.summary_cards.find((card) => card.label.includes("Cost"))?.value || "-",
      helper: "From cleanup and process fixes",
      tone: "orange" as InsightTone,
    },
    {
      label: "Insights Actioned",
      value: String(Math.max(1, overview.recommended_actions.length * 2)),
      helper: "Last 7 days",
      tone: "violet" as InsightTone,
    },
  ];
  const inboxItems = opportunities.items.map((item, index) => ({
    ...item,
    status: index < 3 ? "open" : index === 3 ? "progress" : "resolved",
    age: index === 0 ? "2 min ago" : index === 1 ? "15 min ago" : index === 2 ? "35 min ago" : index === 3 ? "1 hr ago" : "2 hrs ago",
  }));
  const visibleInboxItems = inboxItems.filter((item) => item.status === inboxState);
  const drivers = [
    { label: "Discount %", value: 44 },
    { label: "Category", value: 28 },
    { label: "Rating", value: 17 },
    { label: "Review Count", value: 11 },
  ];
  const primaryEvidence = selectedInsight?.evidence || opportunities.items[0]?.evidence;
  const relatedQuestions = [
    "Which products are affected?",
    "Show similar insights",
    "What if we increase price?",
  ];

  const runAction = (action: string) => {
    if (!selectedInsight) return;
    void onAskQuestion(opportunityPrompt(action, selectedInsight));
  };

  if (!selectedInsight) {
    return (
      <motion.div key="overview-empty" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="ap-card border rounded-2xl p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--ap-accent-soft)] text-[#145DFF]">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-2xl font-black text-[var(--ap-text)]">AI understanding is ready</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 ap-muted">{overview.summary}</p>
      </motion.div>
    );
  }

  return (
    <motion.div key="overview-workspace" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <section className="ap-card border rounded-2xl p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#145DFF]" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
              <Sparkles className="h-3.5 w-3.5" />
              Actionable workspace
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-[var(--ap-text)]">Connect the dots from data to decision</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 ap-muted">
              Adviso detected opportunities, risks, and recommended actions from {activePayload.dataset.file_name}. Move from understanding to evidence, questions, reports, and simulations without leaving the insight.
            </p>
          </div>
          <div className="min-w-0 xl:min-w-[520px]">
            <div className="text-xs font-black text-[var(--ap-text)]">Your insight journey</div>
            <div className="mt-3 flex overflow-x-auto rounded-2xl border p-3" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
              {journey.map((step, index) => (
                <div key={step.label} className="flex min-w-[116px] items-center">
                  <div className="flex flex-col items-center text-center">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full border ${step.state === "active" ? "border-[#145DFF] bg-[#145DFF] text-white" : step.state === "done" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-[var(--ap-border)] bg-[var(--ap-surface)] ap-muted"}`}>
                      {step.state === "done" ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </div>
                    <div className={`mt-2 text-[10px] font-black ${step.state === "active" ? "text-[#145DFF]" : "ap-muted"}`}>{step.label}</div>
                  </div>
                  {index < journey.length - 1 && <div className="mx-2 h-px flex-1 min-w-8 bg-[var(--ap-border)]" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statusCards.map((card) => (
          <button
            key={card.label}
            onClick={() => {
              if (card.label.includes("Revenue")) onOpenOpportunities(selectedInsight.id);
              if (card.label.includes("Insights")) setInboxState("open");
            }}
            className="ap-card border rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            <div className="flex items-center justify-between gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${TONE[card.tone].bg} ${TONE[card.tone].text}`}>
                {insightIcon(card.tone)}
              </div>
              <div className="h-10 w-20">
                <OpportunitySparkline series={opportunities.summary_cards.find((item) => item.tone === card.tone)?.series} tone={card.tone} />
              </div>
            </div>
            <div className="mt-3 text-xs font-bold ap-muted">{card.label}</div>
            <div className="mt-1 text-2xl font-black text-[var(--ap-text)]">{card.value}</div>
            <div className={`mt-1 text-xs font-black ${TONE[card.tone].text}`}>{card.helper}</div>
          </button>
        ))}
      </section>

      <div className="grid grid-cols-1 2xl:grid-cols-[340px_1fr_360px] gap-5">
        <section className="ap-card border rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[var(--ap-text)]">Insights Inbox</h2>
              <p className="text-xs ap-muted">{actionableCount} detected items</p>
            </div>
            <div className="flex gap-2">
              <button className="ap-icon-btn" aria-label="Filter insights">
                <Target className="h-4 w-4" />
              </button>
              <button className="ap-icon-btn" aria-label="Sort insights">
                <BarChart2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-[var(--ap-surface-2)] p-1">
            {[
              ["open", "Open"],
              ["progress", "In Progress"],
              ["resolved", "Resolved"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setInboxState(key as "open" | "progress" | "resolved")}
                className={`rounded-lg px-2 py-2 text-[11px] font-black transition ${inboxState === key ? "bg-[#145DFF] text-white shadow-lg shadow-blue-500/20" : "ap-muted hover:text-[var(--ap-text)]"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {visibleInboxItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedInsightId(item.id);
                  setDetailView("Overview");
                }}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${selectedInsight.id === item.id ? "border-[#145DFF] shadow-lg shadow-blue-500/10" : "hover:border-[#145DFF]/40"}`}
                style={{ borderColor: selectedInsight.id === item.id ? "#145DFF" : "var(--ap-border)", background: "var(--ap-surface-2)" }}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${TONE[item.tone].bg} ${TONE[item.tone].text}`}>
                    {insightIcon(item.tone)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-black leading-5 text-[var(--ap-text)]">{item.title}</div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-black ${item.confidence >= 85 ? "bg-emerald-500/10 text-emerald-600" : "bg-blue-500/10 text-[#145DFF]"}`}>
                        {item.confidence >= 85 ? "High" : "Medium"}
                      </span>
                    </div>
                    <div className="mt-2 text-xs font-bold ap-muted">Potential gain: <span className={TONE[item.tone].text}>{item.impact}</span></div>
                    <div className="mt-1 text-[11px] ap-muted">{item.age}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => onOpenOpportunities()} className="mt-4 w-full ap-btn rounded-xl px-4 py-3 text-xs font-black">
            View all insights
            <ArrowRight className="ml-2 inline h-3.5 w-3.5" />
          </button>
        </section>

        <section className="ap-card border rounded-2xl p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <button onClick={() => onOpenOpportunities(selectedInsight.id)} className="ap-btn rounded-lg px-3 py-2 text-[11px] font-black">
                Back to all insights
              </button>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-black tracking-tight text-[var(--ap-text)]">{selectedInsight.title}</h2>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${TONE[selectedInsight.tone].bg} ${TONE[selectedInsight.tone].text}`}>
                  {selectedInsight.confidence >= 85 ? "High Impact" : "Actionable"}
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 ap-muted">{selectedInsight.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => runAction("Share insight")} className="ap-btn rounded-xl px-4 py-2.5 text-xs font-black">Share</button>
              <button onClick={() => runAction("Add to Decision Brief")} className="ap-btn rounded-xl px-4 py-2.5 text-xs font-black">Add to Brief</button>
            </div>
          </div>

          <nav className="mt-5 flex gap-5 overflow-x-auto border-b" style={{ borderColor: "var(--ap-border)" }}>
            {["Overview", "Evidence", "Affected Items", "Why It Matters", "Recommendations"].map((tab) => (
              <button
                key={tab}
                onClick={() => setDetailView(tab)}
                className={`relative py-3 text-xs font-black transition-colors ${detailView === tab ? "text-[#145DFF]" : "ap-muted hover:text-[var(--ap-text)]"}`}
              >
                {tab}
                {detailView === tab && <motion.span layoutId="insight-detail-tab" className="absolute bottom-[-1px] left-0 h-0.5 w-full rounded-full bg-[#145DFF]" />}
              </button>
            ))}
          </nav>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              ["Potential Gain", selectedInsight.impact, selectedInsight.impact_detail, selectedInsight.tone],
              ["Confidence Score", `${selectedInsight.confidence}%`, "Profile-backed", "emerald"],
              ["Effort to Implement", selectedInsight.confidence > 85 ? "Low" : "Medium", "Execution estimate", "blue"],
              ["Impact Type", selectedInsight.category, "Business lever", "violet"],
            ].map(([label, value, helper, tone]) => (
              <div key={String(label)} className="rounded-2xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
                <div className="text-[11px] font-bold ap-muted">{String(label)}</div>
                <div className="mt-2 text-2xl font-black text-[var(--ap-text)]">{String(value)}</div>
                <div className={`mt-1 text-xs font-black ${TONE[tone as InsightTone].text}`}>{String(helper)}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-1 xl:grid-cols-[1fr_260px_330px] gap-4">
            <div className="rounded-2xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
              <h3 className="text-sm font-black text-[var(--ap-text)]">Key Finding</h3>
              <p className="mt-2 text-sm leading-6 ap-muted">{selectedInsight.why}</p>
              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="text-xs font-black text-emerald-600">What to do</div>
                <ul className="mt-3 space-y-2">
                  {[
                    `Focus on the ${selectedInsight.category.toLowerCase()} lever first.`,
                    "Validate the evidence against the active dataset before rollout.",
                    "Create an owner, deadline, and measurement checkpoint.",
                  ].map((item) => (
                    <li key={item} className="flex gap-2 text-xs leading-5 ap-muted">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      {item}
                    </li>
                  ))}
                </ul>
                <button onClick={() => runAction("Write recommendations")} className="mt-4 ap-btn-primary rounded-lg px-3 py-2 text-xs font-black">
                  View Recommendations
                  <ArrowRight className="ml-2 inline h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="rounded-2xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
              <h3 className="text-sm font-black text-[var(--ap-text)]">Top Drivers</h3>
              <div className="mt-4 space-y-3">
                {drivers.map((driver) => (
                  <div key={driver.label}>
                    <div className="flex justify-between text-xs font-bold">
                      <span className="ap-muted">{driver.label}</span>
                      <span className="text-[var(--ap-text)]">{driver.value}%</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-[var(--ap-surface-3)]">
                      <div className="h-full rounded-full bg-[#145DFF]" style={{ width: `${driver.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
              <h3 className="text-sm font-black text-[var(--ap-text)]">Impact Breakdown</h3>
              <div className="mt-3 grid grid-cols-[130px_1fr] items-center gap-3">
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={overview.evidence.revenue_by_category} dataKey="value" nameKey="name" innerRadius={36} outerRadius={58} paddingAngle={3}>
                        {overview.evidence.revenue_by_category.map((entry, index) => (
                          <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => compactNumber(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {overview.evidence.revenue_by_category.slice(0, 4).map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-2 ap-muted">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} />
                        <span className="truncate">{entry.name}</span>
                      </span>
                      <span className="font-black text-[var(--ap-text)]">{compactNumber(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-[var(--ap-text)]">Evidence Snapshot</h3>
                <p className="text-xs ap-muted">The charts below are tied to the selected insight.</p>
              </div>
              <button onClick={() => onOpenOpportunities(selectedInsight.id)} className="text-xs font-black text-[#145DFF]">View full analysis</button>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
                <h4 className="text-xs font-black text-[var(--ap-text)]">Revenue by Discount Range</h4>
                <div className="mt-3 h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={primaryEvidence?.revenue_by_discount || []}>
                      <CartesianGrid stroke="var(--ap-chart-grid)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis hide />
                      <Tooltip formatter={(value) => compactNumber(Number(value))} />
                      <Bar dataKey="value" fill={TONE[selectedInsight.tone].fill} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-2xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
                <h4 className="text-xs font-black text-[var(--ap-text)]">Rating vs Discount</h4>
                <div className="mt-3 h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={primaryEvidence?.rating_by_discount || []}>
                      <CartesianGrid stroke="var(--ap-chart-grid)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis hide />
                      <Tooltip />
                      <Area type="monotone" dataKey="value" stroke="#145DFF" strokeWidth={2} fill="rgba(20,93,255,0.14)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-2xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
                <h4 className="text-xs font-black text-[var(--ap-text)]">Revenue Trend</h4>
                <div className="mt-3 h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overview.evidence.trend}>
                      <CartesianGrid stroke="var(--ap-chart-grid)" />
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip formatter={(value) => compactNumber(Number(value))} />
                      <Area type="monotone" dataKey="value" stroke="#145DFF" strokeWidth={2} fill="rgba(20,93,255,0.14)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="ap-card border rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[var(--ap-text)]">What-if Simulator</h2>
                <p className="text-xs ap-muted">Test the selected insight before action.</p>
              </div>
              <span className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] font-black text-violet-600">Beta</span>
            </div>
            <label className="mt-4 block text-xs font-black text-[var(--ap-text)]">Change variable</label>
            <select className="mt-2 w-full rounded-xl border bg-[var(--ap-surface-2)] px-3 py-3 text-sm font-bold outline-none focus:border-[#145DFF]" style={{ borderColor: "var(--ap-border)", color: "var(--ap-text)" }}>
              <option>Discount Percentage</option>
              <option>Price</option>
              <option>Visibility</option>
            </select>
            <div className="mt-4">
              <div className="flex justify-between text-xs font-bold ap-muted">
                <span>Change by</span>
                <span>{simulationShift > 0 ? "+" : ""}{simulationShift}%</span>
              </div>
              <input
                value={simulationShift}
                onChange={(event) => setSimulationShift(Number(event.target.value))}
                type="range"
                min={-20}
                max={20}
                step={5}
                className="mt-3 w-full"
              />
            </div>
            <button onClick={() => runAction(`Run simulation with ${simulationShift}% change`)} className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#145DFF] to-violet-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-blue-500/20">
              Run Simulation
            </button>
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="text-xs font-black text-emerald-600">Simulation Result</div>
              <p className="mt-2 text-xs leading-5 ap-muted">If this insight is actioned, Adviso estimates measurable uplift with moderate implementation risk.</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  ["Revenue", "+11.2%"],
                  ["Margin", "+7.3%"],
                  ["Orders", "+4.6%"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="text-[10px] font-bold ap-muted">{label}</div>
                    <div className="text-lg font-black text-emerald-600">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="ap-card border rounded-2xl p-5">
            <h2 className="text-lg font-black text-[var(--ap-text)]">Next Actions</h2>
            <div className="mt-4 space-y-3">
              {["Create Action Plan", "Run What-if Simulation", "Add to Decision Brief", "Assign to Team Member"].map((action) => (
                <button key={action} onClick={() => runAction(action)} className="ap-btn w-full rounded-xl px-4 py-3 text-left text-xs font-black">
                  <span className="flex items-center justify-between gap-3">
                    <span>
                      <span className="block text-[var(--ap-text)]">{action}</span>
                      <span className="mt-1 block font-medium ap-muted">
                        {action === "Create Action Plan" ? "Build a step-by-step plan" : action === "Run What-if Simulation" ? "Test more scenarios" : action === "Add to Decision Brief" ? "Include in executive brief" : "Take action together"}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-5">
        <div className="ap-card border rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--ap-accent-soft)] text-[#145DFF]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[var(--ap-text)]">Ask AI about this insight</h2>
              <p className="text-xs ap-muted">Ask a follow-up without losing the current evidence.</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ap-muted" />
              <input
                value={question}
                onChange={(event) => onQuestionChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onSubmitQuestion();
                }}
                className="w-full rounded-xl border bg-[var(--ap-surface-2)] py-3 pl-10 pr-3 text-sm outline-none focus:border-[#145DFF]"
                style={{ borderColor: "var(--ap-border)", color: "var(--ap-text)" }}
                placeholder="Ask anything... e.g., which products should we prioritize?"
              />
            </div>
            <button onClick={onSubmitQuestion} disabled={!question.trim() || loading} className="ap-btn-primary rounded-xl px-4 py-3 text-xs font-black disabled:opacity-60">
              {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" /> : <MessageSquare className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="ap-card border rounded-2xl p-4">
          <h2 className="text-sm font-black text-[var(--ap-text)]">Related Questions</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {relatedQuestions.map((item) => (
              <button
                key={item}
                onClick={() => void onAskQuestion(`${item} For selected insight: ${selectedInsight.title}`)}
                className="rounded-full border px-4 py-2 text-xs font-black ap-muted transition hover:border-[#145DFF]/50 hover:text-[#145DFF]"
                style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
}

export default function AIInsightsPage({
  fileName,
  data,
  columns,
  profiles,
  numericColumns,
  categoryColumns,
  backendWorkspaceId,
  backendDatasetId,
  loading,
  onAskQuestion,
  onExport,
}: AIInsightsPageProps) {
  const [payload, setPayload] = useState<ExecutiveInsightsPayload | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("Overview");
  const [question, setQuestion] = useState("");
  const [opportunityFilter, setOpportunityFilter] = useState("all");
  const [opportunitySort, setOpportunitySort] = useState("Impact (High to Low)");
  const [selectedOpportunityId, setSelectedOpportunityId] = useState("");
  const [opportunityNotice, setOpportunityNotice] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [selectedRiskId, setSelectedRiskId] = useState("");
  const [riskNotice, setRiskNotice] = useState("");
  const [trendSort, setTrendSort] = useState("Impact");
  const [selectedTrendId, setSelectedTrendId] = useState("");
  const [trendNotice, setTrendNotice] = useState("");

  const fallbackPayload = useMemo(
    () => buildLocalInsights(fileName, data, columns, profiles, numericColumns, categoryColumns),
    [categoryColumns, columns, data, fileName, numericColumns, profiles],
  );

  const loadInsights = useCallback(async () => {
    setIsRefreshing(true);
    setError("");
    if (!backendWorkspaceId || !backendDatasetId) {
      setPayload(fallbackPayload);
      setIsRefreshing(false);
      return;
    }

    try {
      const response = await authorizedFetch(`/api/workspaces/${backendWorkspaceId}/datasets/${backendDatasetId}/executive-insights`);
      const result = await readApiJson<ExecutiveInsightsPayload>(response);
      setPayload(result.success ? result : fallbackPayload);
    } catch (fetchError) {
      setError(apiFailureMessage(fetchError, "Could not refresh executive insights. Showing local profile insights."));
      setPayload(fallbackPayload);
    } finally {
      setIsRefreshing(false);
    }
  }, [backendDatasetId, backendWorkspaceId, fallbackPayload]);

  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  const activePayload = payload || fallbackPayload;
  const overview = activePayload.overview;
  const opportunities = activePayload.opportunities || fallbackPayload.opportunities;
  const risks = activePayload.risks || fallbackPayload.risks;
  const trends = activePayload.trends || fallbackPayload.trends;
  const tabs = activePayload.tabs?.length ? activePayload.tabs : fallbackPayload.tabs;
  const showLoading = isRefreshing && !payload;
  const discountColumn = findColumn(numericColumns, [/discount/i, /margin/i, /percent/i, /pct/i], "");
  const ratingColumn = findColumn(numericColumns, [/rating/i, /score/i], "");
  const scatterData = useMemo(
    () =>
      data
        .slice(0, 250)
        .map((row) => ({
          x: parseNumber(row[discountColumn]) || 0,
          y: parseNumber(row[ratingColumn]) || 0,
        }))
        .filter((point) => point.x || point.y),
    [data, discountColumn, ratingColumn],
  );

  const submitQuestion = () => {
    const trimmed = question.trim();
    if (!trimmed) return;
    void onAskQuestion(trimmed);
    setQuestion("");
  };

  useEffect(() => {
    if (!opportunities.items.length) return;
    if (!selectedOpportunityId || !opportunities.items.some((item) => item.id === selectedOpportunityId)) {
      setSelectedOpportunityId(opportunities.items[0].id);
    }
  }, [opportunities.items, selectedOpportunityId]);

  useEffect(() => {
    if (!risks.items.length) return;
    if (!selectedRiskId || !risks.items.some((item) => item.id === selectedRiskId)) {
      setSelectedRiskId(risks.items[0].id);
    }
  }, [risks.items, selectedRiskId]);

  useEffect(() => {
    if (!trends.items.length) return;
    if (!selectedTrendId || !trends.items.some((item) => item.id === selectedTrendId)) {
      setSelectedTrendId(trends.items[0].id);
    }
  }, [trends.items, selectedTrendId]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#145DFF]" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface)" }}>
            <Sparkles className="h-3.5 w-3.5" />
            AI Insights
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--ap-text)]">AI Insights Workspace</h1>
          <p className="mt-1 text-sm ap-muted">AI-detected opportunities, risks, and next actions connected to your dataset workflow.</p>
          <p className="mt-2 text-xs font-semibold ap-muted">
            Dataset: {activePayload.dataset.file_name || fileName || "uploaded.csv"} | {formatNumber(activePayload.dataset.row_count)} rows | Last updated:{" "}
            {activePayload.generated_at ? new Date(activePayload.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "now"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={onExport} className="ap-btn rounded-xl px-4 py-2.5 text-xs font-black inline-flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button onClick={loadInsights} disabled={isRefreshing} className="ap-btn rounded-xl px-4 py-2.5 text-xs font-black inline-flex items-center gap-2 disabled:opacity-60">
            {isRefreshing ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/25 border-t-current" /> : <RefreshCw className="h-4 w-4" />}
            Refresh insights
          </button>
        </div>
      </div>

      <nav className="flex gap-6 overflow-x-auto border-b pb-0" style={{ borderColor: "var(--ap-border)" }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative py-3 text-xs font-black transition-colors ${activeTab === tab ? "text-[#145DFF]" : "ap-muted hover:text-[var(--ap-text)]"}`}
          >
            {tab}
            {activeTab === tab && <motion.span layoutId="ai-insights-tab" className="absolute bottom-[-1px] left-0 h-0.5 w-full rounded-full bg-[#145DFF]" />}
          </button>
        ))}
      </nav>

      {error && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-700">
          {error}
        </div>
      )}

      {showLoading ? (
        <InsightSkeleton />
      ) : activeTab === "Opportunities" ? (
        <OpportunitiesTab
          payload={opportunities}
          selectedId={selectedOpportunityId}
          activeFilter={opportunityFilter}
          sort={opportunitySort}
          notice={opportunityNotice}
          loading={loading}
          onSelect={setSelectedOpportunityId}
          onFilter={(key) => {
            setOpportunityFilter(key);
            setOpportunityNotice("");
          }}
          onSort={setOpportunitySort}
          onNotice={setOpportunityNotice}
          onAskQuestion={onAskQuestion}
        />
      ) : activeTab === "Risks" ? (
        <RisksTab
          payload={risks}
          selectedId={selectedRiskId}
          activeFilter={riskFilter}
          notice={riskNotice}
          loading={loading}
          onSelect={setSelectedRiskId}
          onFilter={(key) => {
            setRiskFilter(key);
            setRiskNotice("");
          }}
          onNotice={setRiskNotice}
          onAskQuestion={onAskQuestion}
        />
      ) : activeTab === "Trends" ? (
        <TrendsTab
          payload={trends}
          selectedId={selectedTrendId}
          sort={trendSort}
          notice={trendNotice}
          loading={loading}
          onSelect={setSelectedTrendId}
          onSort={(value) => {
            setTrendSort(value);
            setTrendNotice("");
          }}
          onNotice={setTrendNotice}
          onAskQuestion={onAskQuestion}
        />
      ) : activeTab !== "Overview" ? (
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="ap-card border rounded-2xl p-10 min-h-[440px] flex items-center justify-center text-center"
        >
          <div className="max-w-md">
            <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-[var(--ap-accent-soft)] text-[#145DFF] flex items-center justify-center">
              <BrainCircuit className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-black text-[var(--ap-text)]">{activeTab} Insights</h2>
            <p className="mt-3 text-sm leading-6 ap-muted">
              This workspace is reserved for the next insight layer. Use Overview and Opportunities to move between insight evidence, actions, and AI follow-up.
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <InsightsWorkspaceOverview
            activePayload={activePayload}
            overview={overview}
            opportunities={opportunities}
            question={question}
            loading={loading}
            onQuestionChange={setQuestion}
            onSubmitQuestion={submitQuestion}
            onAskQuestion={onAskQuestion}
            onOpenOpportunities={(id) => {
              setActiveTab("Opportunities");
              if (id) setSelectedOpportunityId(id);
            }}
          />
          {false && (
            <>
          <section className="ap-card border rounded-2xl p-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-black text-[var(--ap-text)]">Executive Summary</h2>
              <p className="text-xs ap-muted">{overview.summary}</p>
            </div>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {overview.executive_cards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => {
                    if (card.id === "opportunity") {
                      setActiveTab("Opportunities");
                      setSelectedOpportunityId(opportunities.items[0]?.id || "");
                      return;
                    }
                    void onAskQuestion(`${card.title}: explain the evidence and next action.`);
                  }}
                  className={`text-left rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-xl ${TONE[card.tone].border}`}
                  style={{ background: `linear-gradient(135deg, ${TONE[card.tone].soft}, var(--ap-surface) 62%)` }}
                >
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-2 text-[11px] font-black ${TONE[card.tone].text}`}>
                      {insightIcon(card.tone)}
                      {card.label}
                    </span>
                    <span className={`h-9 w-9 rounded-full flex items-center justify-center ${TONE[card.tone].bg} ${TONE[card.tone].text}`}>
                      {insightIcon(card.tone)}
                    </span>
                  </div>
                  <div className="mt-4 text-2xl font-black text-[var(--ap-text)]">{card.value}</div>
                  <div className={`mt-1 text-sm font-black ${TONE[card.tone].text}`}>{card.title}</div>
                  <p className="mt-1 min-h-[48px] text-xs leading-5 ap-muted">{card.description}</p>
                  <div className="mt-3 h-16">
                    <ExecutiveMiniChart card={card} />
                  </div>
                  <div className={`mt-3 inline-flex items-center gap-1 text-xs font-black ${TONE[card.tone].text}`}>
                    {card.cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="ap-card border rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-[var(--ap-text)]">Key Findings</h2>
                <p className="text-xs ap-muted">AI identified insights that matter most</p>
              </div>
              <button onClick={() => void onAskQuestion("Show all key findings with evidence and confidence scores.")} className="text-xs font-black text-[#145DFF] inline-flex items-center gap-1">
                See all findings
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              {overview.key_findings.map((finding) => (
                <div key={finding.title} className="rounded-2xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
                  <div className={`mb-3 h-10 w-10 rounded-2xl flex items-center justify-center ${TONE[finding.tone].bg} ${TONE[finding.tone].text}`}>
                    {insightIcon(finding.tone)}
                  </div>
                  <h3 className="text-sm font-black text-[var(--ap-text)]">{finding.title}</h3>
                  <p className="mt-1 min-h-[58px] text-xs leading-5 ap-muted">{finding.body}</p>
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] font-bold ap-muted">
                      <span>Confidence</span>
                      <span>{finding.confidence}%</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-[var(--ap-surface-3)] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${finding.confidence}%`, background: TONE[finding.tone].fill }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-[0.85fr_1.2fr_0.9fr] gap-5">
            <section className="ap-card border rounded-2xl p-5">
              <h2 className="text-base font-black text-[var(--ap-text)]">Insights by Category</h2>
              <p className="text-xs ap-muted">Breakdown across key areas</p>
              <div className="mt-4 space-y-2">
                {overview.categories.map((category) => (
                  <button
                    key={category.name}
                    onClick={() => setActiveTab(category.name.includes("Risk") ? "Risks" : category.name.includes("Pricing") ? "Pricing" : "Opportunities")}
                    className="w-full rounded-xl border px-3 py-3 text-left flex items-center justify-between transition hover:border-[#145DFF]/50"
                    style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}
                  >
                    <span className="inline-flex items-center gap-3">
                      <span className={`h-8 w-8 rounded-xl flex items-center justify-center ${TONE[category.tone].bg} ${TONE[category.tone].text}`}>
                        {insightIcon(category.tone)}
                      </span>
                      <span className="text-sm font-black text-[var(--ap-text)]">{category.name}</span>
                    </span>
                    <span className="rounded-full bg-[var(--ap-surface-3)] px-2 py-1 text-xs font-black ap-muted">{category.count}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => void onAskQuestion("List every insight category and recommended next step.")} className="mt-4 text-xs font-black text-[#145DFF] inline-flex items-center gap-1">
                View all insights
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </section>

            <section className="ap-card border rounded-2xl p-5">
              <h2 className="text-base font-black text-[var(--ap-text)]">Evidence & Analysis</h2>
              <p className="text-xs ap-muted">Visual evidence supporting insights</p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="rounded-2xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
                  <h3 className="text-xs font-black text-[var(--ap-text)]">Revenue by Category</h3>
                  <div className="mt-3 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={overview.evidence.revenue_by_category} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={3}>
                          {overview.evidence.revenue_by_category.map((entry, index) => (
                            <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => compactNumber(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
                  <h3 className="text-xs font-black text-[var(--ap-text)]">Discount vs Rating</h3>
                  <div className="mt-3 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart data={scatterData}>
                        <CartesianGrid stroke="var(--ap-chart-grid)" />
                        <XAxis dataKey="x" tick={{ fontSize: 10 }} />
                        <YAxis dataKey="y" tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Scatter data={scatterData} fill="#145DFF" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
                  <h3 className="text-xs font-black text-[var(--ap-text)]">Revenue Trend</h3>
                  <div className="mt-3 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={overview.evidence.trend}>
                        <CartesianGrid stroke="var(--ap-chart-grid)" />
                        <XAxis dataKey="name" hide />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value) => compactNumber(Number(value))} />
                        <Area type="monotone" dataKey="value" stroke="#145DFF" strokeWidth={2} fill="rgba(20, 93, 255, 0.16)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
                  <h3 className="text-xs font-black text-[var(--ap-text)]">Top Segments</h3>
                  <div className="mt-3 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={overview.evidence.top_entities} layout="vertical" margin={{ left: 12, right: 8 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value) => compactNumber(Number(value))} />
                        <Bar dataKey="value" fill="#145DFF" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </section>

            <section className="ap-card border rounded-2xl p-5">
              <h2 className="text-base font-black text-[var(--ap-text)]">Recommended Actions</h2>
              <p className="text-xs ap-muted">AI recommended actions for you</p>
              <div className="mt-4 space-y-3">
                {overview.recommended_actions.map((action) => (
                  <button
                    key={action.title}
                    onClick={() => void onAskQuestion(`${action.title}: build an action plan with owner, timeline, and expected impact.`)}
                    className={`w-full rounded-xl border p-3 text-left transition hover:-translate-y-0.5 ${TONE[action.tone].border}`}
                    style={{ background: "var(--ap-surface-2)" }}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 h-8 w-8 rounded-xl flex items-center justify-center ${TONE[action.tone].bg} ${TONE[action.tone].text}`}>
                        {insightIcon(action.tone)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black text-[var(--ap-text)]">{action.title}</span>
                        <span className="mt-1 block text-xs leading-5 ap-muted">{action.body}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${TONE[action.tone].bg} ${TONE[action.tone].text}`}>{action.impact}</span>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => void onAskQuestion("Turn the recommended actions into a prioritized execution plan.")} className="mt-4 text-xs font-black text-[#145DFF] inline-flex items-center gap-1">
                View all actions
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </section>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.75fr] gap-5">
            <section className="ap-card border rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-[var(--ap-text)]">Insight Feed</h2>
                  <p className="text-xs ap-muted">Recent insights discovered by AI</p>
                </div>
                <button onClick={() => void onAskQuestion("Summarize the insight feed and what changed most recently.")} className="text-xs font-black text-[#145DFF] inline-flex items-center gap-1">
                  View all feed
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {overview.feed.map((item) => (
                  <div key={`${item.time}-${item.type}`} className="rounded-2xl border p-4" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}>
                    <div className="flex items-center justify-between text-[11px] font-black">
                      <span className="ap-muted">{item.time}</span>
                      <span className="rounded-full bg-[var(--ap-accent-soft)] px-2 py-1 text-[#145DFF]">{item.type}</span>
                    </div>
                    <p className="mt-3 text-sm font-semibold leading-5 text-[var(--ap-text)]">{item.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="ap-card border rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-2xl bg-[var(--ap-accent-soft)] text-[#145DFF] flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[var(--ap-text)]">Ask AI about your data</h2>
                  <p className="text-xs ap-muted">Get answers and deeper insights</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ap-muted" />
                  <input
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") submitQuestion();
                    }}
                    className="w-full rounded-xl border bg-[var(--ap-surface-2)] py-3 pl-10 pr-3 text-sm outline-none focus:border-[#145DFF]"
                    style={{ borderColor: "var(--ap-border)", color: "var(--ap-text)" }}
                    placeholder="Ask anything... e.g., Which segment is underperforming?"
                  />
                </div>
                <button onClick={submitQuestion} disabled={!question.trim() || loading} className="ap-btn-primary rounded-xl px-4 py-3 text-xs font-black disabled:opacity-60">
                  {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" /> : <MessageSquare className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {overview.suggested_questions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => void onAskQuestion(suggestion)}
                    className="rounded-full border px-3 py-2 text-xs font-bold ap-muted hover:text-[#145DFF]"
                    style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface-2)" }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <section className="ap-card border rounded-2xl p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-black text-[var(--ap-text)]">Analysis profile</h2>
                <p className="text-xs ap-muted">
                  Quality score {overview.quality_score}% | {formatNumber(activePayload.dataset.row_count)} rows | {formatNumber(activePayload.dataset.column_count)} columns | Source {activePayload.source.replace(/_/g, " ")}
                </p>
              </div>
            </div>
          </section>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
