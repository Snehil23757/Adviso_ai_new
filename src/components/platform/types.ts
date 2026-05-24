export type ThemeMode = "dark" | "light";

export type TabType =
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

export type ChartType =
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

export interface ColumnProfile {
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

export interface InsightResult {
  answer: string;
  source: "ai" | "local";
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  source?: string;
}

export interface WorkspaceSnapshot {
  data: Record<string, unknown>[];
  allColumns: string[];
  columns: string[];
  fileName: string;
  savedAt: number;
}

export interface MultiValueCandidate {
  column: string;
  delimiter: string;
  label: string;
  affectedRows: number;
  affectedPercent: number;
  maxParts: number;
  sampleValues: string[];
}

export interface MultiValueSplitConfig {
  enabled: boolean;
  delimiter: string;
  prefix: string;
  keepOriginal: boolean;
  maxParts: number;
}

export interface ForecastPoint {
  period: string;
  actual: number | null;
  forecast: number | null;
  lower: number | null;
  upper: number | null;
}

export interface DemandRecommendation {
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

export const CHART_COLOR = "#3b82f6";
export const CHART_COLOR_2 = "#64748b";
export const CHART_GOOD = "#10b981";
export const CHART_WARN = "#f59e0b";

export const CHARTS: ChartType[] = [
  "Line", "Area", "Bar", "Horizontal Bar", "Scatter",
  "Histogram", "KDE Density", "Pie", "Donut",
  "Composed", "Radar", "Treemap",
];

export const MULTI_VALUE_DELIMITERS = [
  { delimiter: "|", label: "Pipe |" },
  { delimiter: ";", label: "Semicolon ;" },
  { delimiter: "\n", label: "Line break" },
  { delimiter: ",", label: "Comma ," },
];