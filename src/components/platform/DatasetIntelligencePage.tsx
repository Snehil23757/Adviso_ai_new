import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  DollarSign,
  FileSpreadsheet,
  PieChart,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  User,
} from "lucide-react";

import { authorizedFetch, readApiJson } from "../../config";

type AnalysisTab = "Charts" | "AI" | "Chat" | "Ideas" | "Profit" | "Forecast" | "Budget";
type Confidence = "High" | "Medium" | "Low";

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

interface DataAsset {
  label: string;
  active: boolean;
  columns?: string[];
}

interface KpiOpportunity {
  id: string;
  title: string;
  confidence: Confidence;
  columns_used: string[];
  questions: string[];
  target_tab: AnalysisTab;
  score?: number;
}

interface BusinessQuestion {
  label: string;
  active: boolean;
  prompt: string;
}

interface SuggestedFocus {
  label: string;
  signal: string;
}

interface KpiDiscoveryPayload {
  success: boolean;
  source: "metadata" | "local";
  dataset: {
    id?: number;
    name: string;
    uploaded_at?: string;
    rows_detected: number;
    columns_detected: number;
    quality_score: number;
  };
  data_assets: DataAsset[];
  opportunities: KpiOpportunity[];
  suggested_focus: SuggestedFocus[];
  recommended_starting_point: {
    opportunity_id: string;
    title: string;
    reason: string;
  };
  business_questions: BusinessQuestion[];
}

interface DatasetIntelligencePageProps {
  fileName: string;
  rowsDetected: number;
  columnsDetected: number;
  qualityScore: number;
  columns: string[];
  profiles: ColumnProfile[];
  numericColumns: string[];
  categoryColumns: string[];
  insight?: InsightResult;
  loading: boolean;
  backendWorkspaceId: number | null;
  backendDatasetId: number | null;
  onRefresh: () => void;
  onExploreAnalysis: (tab: AnalysisTab) => void;
  onPreviewKpis: (question: string) => void;
}

const BUSINESS_QUESTIONS = [
  "Revenue Forecasting",
  "Profit Drivers",
  "Pricing Optimization",
  "Product Performance",
  "Regional Analysis",
  "Customer Segmentation",
  "Risk Detection",
  "Anomaly Detection",
  "Trend Analysis",
];

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatDate(value?: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function findColumns(columns: string[], patterns: RegExp[], limit = 4) {
  return columns
    .filter((column) => patterns.some((pattern) => pattern.test(column.toLowerCase())))
    .slice(0, limit);
}

function confidence(found: number, expected: number): Confidence {
  const ratio = expected ? found / expected : 0;
  if (ratio >= 0.65) return "High";
  if (ratio >= 0.25) return "Medium";
  return "Low";
}

function confidenceClass(value: Confidence) {
  if (value === "High") return "text-emerald-700";
  if (value === "Medium") return "text-amber-700";
  return "ap-muted";
}

function buildLocalPayload(
  fileName: string,
  rowsDetected: number,
  columnsDetected: number,
  qualityScore: number,
  columns: string[],
  numericColumns: string[],
  categoryColumns: string[],
): KpiDiscoveryPayload {
  const dateColumns = findColumns(columns, [/date/, /time/, /created/, /month/, /year/, /period/], 3);
  const revenueColumns = findColumns(columns, [/revenue/, /sales/, /amount/, /price/, /gmv/, /income/, /value/, /total/], 4);
  const costColumns = findColumns(columns, [/cost/, /expense/, /spend/, /margin/, /profit/, /cogs/], 4);
  const productColumns = findColumns(columns, [/product/, /sku/, /item/, /category/, /brand/, /title/, /name/], 4);
  const regionColumns = findColumns(columns, [/country/, /city/, /state/, /region/, /zone/, /location/, /geo/], 4);
  const customerColumns = findColumns(columns, [/customer/, /client/, /user/, /account/, /buyer/, /segment/, /email/], 4);
  const fallbackNumeric = numericColumns.slice(0, 2);
  const fallbackCategory = categoryColumns.slice(0, 2);

  const revenueScore = revenueColumns.length + productColumns.length + dateColumns.length + regionColumns.length;
  const profitabilityScore = revenueColumns.length + costColumns.length + productColumns.length;
  const customerScore = customerColumns.length + revenueColumns.length + dateColumns.length;
  const geographicScore = regionColumns.length + revenueColumns.length + productColumns.length;

  const opportunities: KpiOpportunity[] = [
    {
      id: "revenue-performance",
      title: "Revenue Performance",
      confidence: confidence(revenueScore, 4),
      columns_used: [...revenueColumns, ...dateColumns, ...productColumns, ...regionColumns, ...fallbackNumeric].slice(0, 5),
      questions: [
        "What drives revenue growth?",
        "Which products generate most revenue?",
        "How is revenue changing over time?",
      ],
      target_tab: "Charts",
      score: revenueScore,
    },
    {
      id: "profitability-analysis",
      title: "Profitability Analysis",
      confidence: confidence(profitabilityScore, 3),
      columns_used: [...revenueColumns, ...costColumns, ...productColumns, ...fallbackNumeric].slice(0, 5),
      questions: [
        "Which products have low margins?",
        "Where are profits leaking?",
        "Which segments are most profitable?",
      ],
      target_tab: "Profit",
      score: profitabilityScore,
    },
    {
      id: "customer-analytics",
      title: "Customer Analytics",
      confidence: confidence(customerScore, 3),
      columns_used: [...customerColumns, ...revenueColumns, ...dateColumns, ...fallbackCategory].slice(0, 5),
      questions: [
        "Who are high value customers?",
        "Which customers are declining?",
        "What segmentation opportunities exist?",
      ],
      target_tab: "AI",
      score: customerScore,
    },
    {
      id: "geographic-performance",
      title: "Geographic Performance",
      confidence: confidence(geographicScore, 3),
      columns_used: [...regionColumns, ...revenueColumns, ...productColumns, ...fallbackCategory].slice(0, 5),
      questions: [
        "Which regions outperform?",
        "What are the regional trends?",
        "Where are expansion opportunities?",
      ],
      target_tab: "Charts",
      score: geographicScore,
    },
  ];

  const ranked = [...opportunities].sort((a, b) => (b.score || 0) - (a.score || 0));
  const recommended = ranked[0];

  return {
    success: true,
    source: "local",
    dataset: {
      name: fileName || "Uploaded dataset",
      rows_detected: rowsDetected,
      columns_detected: columnsDetected,
      quality_score: qualityScore,
    },
    data_assets: [
      { label: "Time Series Data", active: dateColumns.length > 0, columns: dateColumns },
      { label: "Revenue Information", active: revenueColumns.length > 0 || numericColumns.length > 0, columns: revenueColumns },
      { label: "Product Catalog", active: productColumns.length > 0, columns: productColumns },
      { label: "Geographic Information", active: regionColumns.length > 0, columns: regionColumns },
      { label: "Customer Identifiers", active: customerColumns.length > 0, columns: customerColumns },
    ],
    opportunities,
    suggested_focus: [
      { label: revenueColumns.length ? "Revenue Growth" : "Data Completeness", signal: revenueColumns.length ? "High Business Impact" : "Needs Context" },
      { label: costColumns.length ? "Margin Optimization" : "Pricing Structure", signal: revenueColumns.length && costColumns.length ? "High Confidence" : "Medium Confidence" },
      { label: customerColumns.length ? "Customer Retention" : "Segment Discovery", signal: "Medium Confidence" },
    ],
    recommended_starting_point: {
      opportunity_id: recommended.id,
      title: recommended.title,
      reason: `Based on your data structure, ${recommended.title} is the most complete analysis path available.`,
    },
    business_questions: BUSINESS_QUESTIONS.map((label) => ({
      label,
      active: true,
      prompt: `Can this dataset support ${label}? Explain the columns available and the first practical analysis path.`,
    })),
  };
}

function opportunityIcon(id: string) {
  if (id.includes("profit")) return <PieChart className="h-5 w-5" />;
  if (id.includes("customer")) return <User className="h-5 w-5" />;
  if (id.includes("geo")) return <Building2 className="h-5 w-5" />;
  return <TrendingUp className="h-5 w-5" />;
}

function assetColumnText(asset: DataAsset) {
  if (!asset.columns?.length) return "";
  return asset.columns.slice(0, 3).map(titleCase).join(", ");
}

export default function DatasetIntelligencePage({
  fileName,
  rowsDetected,
  columnsDetected,
  qualityScore,
  columns,
  profiles,
  numericColumns,
  categoryColumns,
  insight,
  loading,
  backendWorkspaceId,
  backendDatasetId,
  onRefresh,
  onExploreAnalysis,
  onPreviewKpis,
}: DatasetIntelligencePageProps) {
  const localPayload = useMemo(
    () => buildLocalPayload(fileName, rowsDetected, columnsDetected, qualityScore, columns, numericColumns, categoryColumns),
    [fileName, rowsDetected, columnsDetected, qualityScore, columns, numericColumns, categoryColumns],
  );
  const [payload, setPayload] = useState<KpiDiscoveryPayload | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [fetching, setFetching] = useState(false);
  const [apiError, setApiError] = useState("");

  const effectivePayload = payload || localPayload;
  const selectedOpportunity =
    effectivePayload.opportunities.find((item) => item.id === selectedId) || effectivePayload.opportunities[0];
  const recommendedId = effectivePayload.recommended_starting_point.opportunity_id;
  const backendReady = Boolean(backendWorkspaceId && backendDatasetId);

  const fetchDiscovery = useCallback(async () => {
    if (!backendWorkspaceId || !backendDatasetId) {
      onRefresh();
      return;
    }

    setFetching(true);
    setApiError("");
    try {
      const response = await authorizedFetch(`/api/workspaces/${backendWorkspaceId}/datasets/${backendDatasetId}/kpi-discovery`);
      const result = await readApiJson<KpiDiscoveryPayload>(response);
      setPayload(result);
      setSelectedId((current) => current || result.recommended_starting_point.opportunity_id || result.opportunities[0]?.id || "");
    } catch (error) {
      const message = error instanceof Error ? error.message : "KPI discovery could not be refreshed.";
      setApiError(message);
      setPayload(null);
    } finally {
      setFetching(false);
    }
  }, [backendWorkspaceId, backendDatasetId, onRefresh]);

  useEffect(() => {
    if (!selectedId && effectivePayload.opportunities[0]) {
      setSelectedId(effectivePayload.recommended_starting_point.opportunity_id || effectivePayload.opportunities[0].id);
    }
  }, [effectivePayload.opportunities, effectivePayload.recommended_starting_point.opportunity_id, selectedId]);

  useEffect(() => {
    if (backendWorkspaceId && backendDatasetId) {
      void fetchDiscovery();
    }
  }, [backendWorkspaceId, backendDatasetId, fetchDiscovery]);

  const handlePreview = (opportunity: KpiOpportunity) => {
    const columnText = opportunity.columns_used.length ? opportunity.columns_used.join(", ") : profiles.slice(0, 4).map((profile) => profile.name).join(", ");
    onPreviewKpis(
      `Preview practical KPIs for ${opportunity.title}. Use only this dataset schema. Relevant columns: ${columnText || "no clear matching columns"}. Keep the response concise and practical.`,
    );
  };

  const handleQuestion = (question: BusinessQuestion) => {
    onPreviewKpis(question.prompt);
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <section className="rounded-xl border bg-[var(--ap-surface)] p-5" style={{ borderColor: "var(--ap-border)" }}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-[var(--ap-accent-soft)] text-[var(--ap-accent)]" style={{ borderColor: "var(--ap-border)" }}>
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black text-[var(--ap-text)]">
                {effectivePayload.dataset.name || fileName || "Uploaded dataset"}
              </h2>
              <p className="mt-1 text-sm ap-muted">
                {formatDate(effectivePayload.dataset.uploaded_at) ? `Uploaded on ${formatDate(effectivePayload.dataset.uploaded_at)}` : "Dataset profile loaded"}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[560px] lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-center">
            <div className="border-l pl-4" style={{ borderColor: "var(--ap-border)" }}>
              <div className="text-xs font-semibold ap-muted">Rows Detected</div>
              <div className="mt-1 text-base font-black">{formatNumber(effectivePayload.dataset.rows_detected)}</div>
            </div>
            <div className="border-l pl-4" style={{ borderColor: "var(--ap-border)" }}>
              <div className="text-xs font-semibold ap-muted">Columns Detected</div>
              <div className="mt-1 text-base font-black">{formatNumber(effectivePayload.dataset.columns_detected)}</div>
            </div>
            <div className="border-l pl-4" style={{ borderColor: "var(--ap-border)" }}>
              <div className="text-xs font-semibold ap-muted">Data Quality Score</div>
              <div className="mt-1 text-base font-black">
                <span className="text-emerald-700">{formatNumber(effectivePayload.dataset.quality_score)}</span>
                <span className="font-semibold ap-muted"> / 100</span>
              </div>
            </div>
            <button
              onClick={fetchDiscovery}
              disabled={fetching || loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-black text-[var(--ap-accent)] transition hover:bg-[var(--ap-accent-soft)] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ borderColor: "var(--ap-accent)" }}
            >
              <RefreshCw className={`h-4 w-4 ${fetching || loading ? "animate-spin" : ""}`} />
              Refresh Intelligence
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 h-6 w-6 text-[var(--ap-accent)]" />
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--ap-text)]">AI KPI Discovery</h1>
            <p className="mt-2 max-w-3xl text-base leading-7 ap-muted">
              We analyzed your dataset and identified business areas, KPIs, and opportunities that can be explored.
            </p>
          </div>
        </div>
        {apiError && backendReady ? (
          <p className="mt-3 text-sm ap-muted">
            Backend discovery is temporarily unavailable, so this view is using the local schema profile. {apiError}
          </p>
        ) : null}
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <main className="min-w-0 space-y-5">
          <section className="rounded-xl border bg-[var(--ap-surface)] p-5" style={{ borderColor: "var(--ap-border)" }}>
            <h2 className="text-base font-black text-[var(--ap-text)]">Detected Data Assets</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {effectivePayload.data_assets.map((asset) => (
                <div
                  key={asset.label}
                  className={`flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm ${asset.active ? "bg-[var(--ap-surface)]" : "bg-[var(--ap-surface-2)] opacity-70"}`}
                  style={{ borderColor: "var(--ap-border)" }}
                >
                  <CheckCircle2 className={`h-4 w-4 ${asset.active ? "text-emerald-700" : "ap-muted"}`} />
                  <div>
                    <div className="font-black text-[var(--ap-text)]">{asset.label}</div>
                    {assetColumnText(asset) ? <div className="mt-0.5 text-xs ap-muted">{assetColumnText(asset)}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border bg-[var(--ap-surface)]" style={{ borderColor: "var(--ap-border)" }}>
            {effectivePayload.opportunities.map((opportunity) => {
              const active = selectedOpportunity?.id === opportunity.id;
              return (
                <article
                  key={opportunity.id}
                  className={`grid gap-4 border-b p-5 transition md:grid-cols-[280px_minmax(0,1fr)_150px] md:items-center ${active ? "bg-[var(--ap-accent-soft)]/40" : "bg-[var(--ap-surface)] hover:bg-[var(--ap-surface-2)]"}`}
                  style={{ borderColor: "var(--ap-border)" }}
                >
                  <button onClick={() => setSelectedId(opportunity.id)} className="flex min-w-0 items-start gap-4 text-left">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-[var(--ap-surface)] text-[var(--ap-accent)]" style={{ borderColor: "var(--ap-border)" }}>
                      {opportunityIcon(opportunity.id)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-lg font-black text-[var(--ap-text)]">{opportunity.title}</span>
                      <span className={`mt-1 block text-sm font-black ${confidenceClass(opportunity.confidence)}`}>
                        Confidence: {opportunity.confidence}
                      </span>
                      <span className="mt-2 block text-sm leading-6 ap-muted">
                        Columns Used: {opportunity.columns_used.length ? opportunity.columns_used.map(titleCase).join(", ") : "Needs more context"}
                      </span>
                    </span>
                  </button>

                  <div>
                    <div className="text-sm font-semibold text-[var(--ap-text)]">Questions you can answer:</div>
                    <ul className="mt-2 space-y-1 text-sm leading-6 ap-muted">
                      {opportunity.questions.map((question) => (
                        <li key={question} className="flex gap-2">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--ap-text)] opacity-60" />
                          <span>{question}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => onExploreAnalysis(opportunity.target_tab)}
                      className="rounded-lg border border-[var(--ap-accent)] bg-[var(--ap-accent)] px-4 py-2 text-sm font-black text-white transition hover:opacity-90"
                    >
                      Explore Analysis
                    </button>
                    <button
                      onClick={() => handlePreview(opportunity)}
                      className="rounded-lg border bg-[var(--ap-surface)] px-4 py-2 text-sm font-black text-[var(--ap-text)] transition hover:bg-[var(--ap-surface-2)]"
                      style={{ borderColor: "var(--ap-border)" }}
                    >
                      Preview KPIs
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="rounded-xl border bg-[var(--ap-surface)] p-5" style={{ borderColor: "var(--ap-border)" }}>
            <h2 className="text-base font-black text-[var(--ap-text)]">Business Questions Available</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {effectivePayload.business_questions.map((question) => (
                <button
                  key={question.label}
                  onClick={() => handleQuestion(question)}
                  className="inline-flex items-center gap-2 rounded-full border bg-[var(--ap-surface)] px-3 py-2 text-sm font-semibold text-[var(--ap-accent)] transition hover:bg-[var(--ap-accent-soft)] disabled:opacity-50"
                  style={{ borderColor: "var(--ap-border)" }}
                  disabled={!question.active}
                >
                  <Target className="h-4 w-4" />
                  {question.label}
                </button>
              ))}
            </div>

            {(loading || insight?.answer) && (
              <div className="mt-5 rounded-lg border bg-[var(--ap-surface-2)] p-4" style={{ borderColor: "var(--ap-border)" }}>
                <div className="text-sm font-black text-[var(--ap-text)]">AI preview</div>
                {loading ? (
                  <div className="mt-3 space-y-2">
                    <div className="h-3 w-4/5 animate-pulse rounded bg-[var(--ap-surface-3)]" />
                    <div className="h-3 w-full animate-pulse rounded bg-[var(--ap-surface-3)]" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--ap-surface-3)]" />
                  </div>
                ) : (
                  <p className="mt-2 max-w-4xl text-sm leading-6 ap-muted">{insight?.answer}</p>
                )}
              </div>
            )}
          </section>
        </main>

        <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <section className="rounded-xl border bg-[var(--ap-surface)] p-5" style={{ borderColor: "var(--ap-border)" }}>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[var(--ap-accent)]" />
              <h2 className="text-base font-black text-[var(--ap-text)]">Suggested Focus Areas</h2>
            </div>
            <div className="mt-5 space-y-5">
              {effectivePayload.suggested_focus.map((focus, index) => (
                <button
                  key={focus.label}
                  onClick={() => setSelectedId(effectivePayload.opportunities[index]?.id || recommendedId)}
                  className="flex w-full items-start gap-3 text-left"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ap-accent)] text-xs font-black text-white">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block font-black text-[var(--ap-text)]">{focus.label}</span>
                    <span className="mt-1 block text-sm ap-muted">{focus.signal}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-[var(--ap-surface)] p-5" style={{ borderColor: "var(--ap-border)" }}>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[var(--ap-accent)]" />
              <h2 className="text-base font-black text-[var(--ap-text)]">Recommended Starting Point</h2>
            </div>
            <div className="mt-4 rounded-lg border bg-[var(--ap-surface-2)] p-4" style={{ borderColor: "var(--ap-border)" }}>
              <p className="text-sm leading-6 ap-muted">{effectivePayload.recommended_starting_point.reason}</p>
              <button
                onClick={() => {
                  const opportunity = effectivePayload.opportunities.find((item) => item.id === recommendedId) || selectedOpportunity;
                  if (opportunity) onExploreAnalysis(opportunity.target_tab);
                }}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--ap-accent)] px-4 py-2 text-sm font-black text-[var(--ap-accent)] transition hover:bg-[var(--ap-accent-soft)]"
              >
                Start with {effectivePayload.recommended_starting_point.title}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>

          <section className="rounded-xl border bg-[var(--ap-surface)] p-5" style={{ borderColor: "var(--ap-border)" }}>
            <h2 className="text-base font-black text-[var(--ap-text)]">What&apos;s Next?</h2>
            <div className="mt-4 space-y-4 text-sm">
              <div className="flex gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 text-[var(--ap-accent)]" />
                <div>
                  <div className="font-black">Explore an analysis path</div>
                  <div className="mt-1 ap-muted">Discover KPIs and key insight questions.</div>
                </div>
              </div>
              <div className="flex gap-3">
                <Building2 className="mt-0.5 h-4 w-4 text-[var(--ap-accent)]" />
                <div>
                  <div className="font-black">Add business context</div>
                  <div className="mt-1 ap-muted">Improve confidence with goals and operating assumptions.</div>
                </div>
              </div>
              <div className="flex gap-3">
                <FileSpreadsheet className="mt-0.5 h-4 w-4 text-[var(--ap-accent)]" />
                <div>
                  <div className="font-black">Ask AI</div>
                  <div className="mt-1 ap-muted">Turn available questions into direct answers.</div>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
