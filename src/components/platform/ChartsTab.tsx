import React, { useMemo, useState } from "react";
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
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartType, DemandRecommendation, ThemeMode } from "./types";
import { CHART_COLOR, CHART_COLOR_2, CHART_GOOD, CHART_WARN, CHARTS } from "./types";
import { average, buildDemandRecommendations, chartTooltip, axisColor, formatNumber, parseNumber } from "./analytics";
import { CorrelationHeatmap, DataTable, HypothesisPanel, MetricCard, Select, TabInfoButton } from "./ui";

interface ChartsTabProps {
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
  hypothesis: {
    groupA: string;
    groupB: string;
    meanA: number;
    meanB: number;
    difference: number;
    tScore: number;
    effectSize: number;
    verdict: string;
  } | null;
  demandRecommendations: DemandRecommendation[];
}

export function ChartsTab({
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
}: ChartsTabProps) {
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
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
    <section className="ap-card border rounded p-3 space-y-3">
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.1em] font-mono">Visual analytics</h2>
          <p className="ap-muted text-xs font-mono mt-1">Interactive BI charts, drilldown, relationships, and demand recommendations.</p>
        </div>
        <div className="flex items-end gap-2">
          <TabInfoButton tab="Charts" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 min-w-[720px] max-w-full">
            <Select label="Chart" value={chartType} onChange={(value) => setChartType(value as ChartType)} options={CHARTS} />
            <Select label="Dimension" value={xAxisCol} onChange={setXAxisCol} options={categoryColumns.length ? categoryColumns : columns} />
            <Select label="Measure" value={yAxisCol} onChange={setYAxisCol} options={numericColumns.length ? numericColumns : columns} />
            <Select label="Second measure" value={secondaryCol} onChange={setSecondaryCol} options={numericColumns.length ? numericColumns : columns} />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-2">
        {chartRecommendations.map((item) => (
          <button key={item.label} onClick={() => setChartType(item.chart)} className="ap-panel border rounded p-2.5 text-left hover:opacity-80 transition">
            <div className="text-[11px] font-black font-mono">{item.label}</div>
            <div className="text-[10px] ap-muted mt-1 leading-4">{item.reason}</div>
            <div className="text-[9px] uppercase tracking-[0.14em] ap-accent font-mono mt-2">{item.chart}</div>
          </button>
        ))}
      </div>

      <div className="h-[500px] w-full ap-panel border rounded p-3">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "Line" ? (
            <LineChart data={chartRows} onClick={(state: any) => handleDrill(state?.activePayload?.[0]?.payload?.__xLabel)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
              <XAxis dataKey="__xLabel" stroke={axis} tick={{ fontSize: 10 }} minTickGap={30} />
              <YAxis stroke={axis} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltip} />
              <Legend />
              <Line type="monotone" dataKey="__y" name={yAxisCol} stroke={CHART_COLOR} strokeWidth={2} dot={false} />
            </LineChart>
          ) : chartType === "Area" ? (
            <AreaChart data={chartRows} onClick={(state: any) => handleDrill(state?.activePayload?.[0]?.payload?.__xLabel)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
              <XAxis dataKey="__xLabel" stroke={axis} tick={{ fontSize: 10 }} minTickGap={30} />
              <YAxis stroke={axis} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltip} />
              <Area type="monotone" dataKey="__y" name={yAxisCol} stroke={CHART_COLOR} fill={CHART_COLOR} fillOpacity={0.18} />
            </AreaChart>
          ) : chartType === "Horizontal Bar" ? (
            <BarChart data={categoryAggregate.slice(0, 20)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
              <XAxis type="number" stroke={axis} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" stroke={axis} tick={{ fontSize: 10 }} width={180} />
              <Tooltip contentStyle={tooltip} />
              <Bar dataKey="value" fill={CHART_COLOR} radius={[0, 3, 3, 0]} onClick={(payload: any) => handleDrill(payload?.name || payload?.payload?.name)} />
            </BarChart>
          ) : chartType === "Scatter" ? (
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
              <XAxis dataKey="__xNumber" name={xAxisCol} stroke={axis} tick={{ fontSize: 10 }} />
              <YAxis dataKey="__y" name={yAxisCol} stroke={axis} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltip} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={chartRows} fill={CHART_COLOR} onClick={(payload: any) => handleDrill(payload?.payload?.__xLabel)} />
            </ScatterChart>
          ) : chartType === "Histogram" ? (
            <BarChart data={histogramRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
              <XAxis dataKey="bucket" stroke={axis} tick={{ fontSize: 10 }} minTickGap={18} />
              <YAxis stroke={axis} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltip} />
              <Bar dataKey="count" fill={CHART_COLOR} radius={[3, 3, 0, 0]} />
            </BarChart>
          ) : chartType === "KDE Density" ? (
            <AreaChart data={kdeRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
              <XAxis dataKey="x" stroke={axis} tick={{ fontSize: 10 }} />
              <YAxis stroke={axis} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltip} />
              <Area type="monotone" dataKey="density" name={`${yAxisCol} density`} stroke={CHART_COLOR} fill={CHART_COLOR} fillOpacity={0.2} />
            </AreaChart>
          ) : chartType === "Pie" || chartType === "Donut" ? (
            <PieChart>
              <Tooltip contentStyle={tooltip} />
              <Legend />
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={180} innerRadius={chartType === "Donut" ? 100 : 0} label onClick={(payload: any) => handleDrill(payload?.name)}>
                {pieData.map((_, index) => (
                  <Cell key={index} fill={colors[index % colors.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : chartType === "Composed" ? (
            <ComposedChart data={chartRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
              <XAxis dataKey="__xLabel" stroke={axis} tick={{ fontSize: 10 }} minTickGap={30} />
              <YAxis stroke={axis} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltip} />
              <Legend />
              <Bar dataKey="__y" name={yAxisCol} fill={CHART_COLOR} fillOpacity={0.35} onClick={(payload: any) => handleDrill(payload?.payload?.__xLabel)} />
              <Line type="monotone" dataKey="__secondary" name={secondaryCol} stroke={CHART_GOOD} strokeWidth={2} dot={false} />
            </ComposedChart>
          ) : chartType === "Radar" ? (
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--ap-chart-grid)" />
              <PolarAngleAxis dataKey="name" tick={{ fill: axis, fontSize: 10 }} />
              <PolarRadiusAxis tick={{ fill: axis, fontSize: 10 }} />
              <Radar dataKey="value" stroke={CHART_COLOR} fill={CHART_COLOR} fillOpacity={0.25} />
              <Tooltip contentStyle={tooltip} />
            </RadarChart>
          ) : chartType === "Treemap" ? (
            <Treemap data={categoryAggregate.slice(0, 18)} dataKey="value" nameKey="name" stroke="var(--ap-surface)" fill={CHART_COLOR} onClick={(payload: any) => handleDrill(payload?.name)} />
          ) : (
            <BarChart data={categoryAggregate.slice(0, 30)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
              <XAxis dataKey="name" stroke={axis} tick={{ fontSize: 10 }} minTickGap={25} />
              <YAxis stroke={axis} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltip} />
              <Bar dataKey="value" fill={CHART_COLOR} radius={[3, 3, 0, 0]} onClick={(payload: any) => handleDrill(payload?.name || payload?.payload?.name)} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {correlationData.length > 0 && <CorrelationHeatmap data={correlationData} />}
      <DrilldownPanel selectedValue={selectedValue} rows={drillRows} allRows={data} columns={columns} xAxisCol={xAxisCol} yAxisCol={yAxisCol} secondaryCol={secondaryCol} onClear={() => setSelectedValue(null)} />
      <DemandRecommendationPanel recommendations={selectedValue ? scopedDemandRecommendations : demandRecommendations} selectedValue={selectedValue} />
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
    <div className="ap-panel border rounded p-3">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 mb-3">
        <div>
          <h3 className="text-xs font-black font-mono uppercase tracking-[0.1em]">Drilldown</h3>
          <p className="ap-muted text-[10px] font-mono mt-1">{selectedValue ? `${xAxisCol}: ${selectedValue}` : "No value selected"}</p>
        </div>
        {selectedValue && (
          <button className="ap-btn border rounded px-3 py-1.5 text-[10px] font-mono font-bold" onClick={onClear}>
            Clear
          </button>
        )}
      </div>
      <div className="grid md:grid-cols-4 gap-2 mb-3">
        <MetricCard label="Rows" value={formatNumber(scopedRows.length, 0)} />
        <MetricCard label={`${yAxisCol} total`} value={formatNumber(yValues.reduce((sum, value) => sum + value, 0))} />
        <MetricCard label={`${yAxisCol} avg`} value={formatNumber(average(yValues))} />
        <MetricCard label={`${secondaryCol} avg`} value={formatNumber(average(secondaryValues))} />
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
      <div className="ap-panel border rounded p-3">
        <h3 className="text-xs font-black font-mono uppercase tracking-[0.1em]">Demand recommendations</h3>
        <p className="ap-muted text-xs mt-2">Needs product, rating, rating count, and price-like fields to estimate buyer demand and revenue.</p>
      </div>
    );
  }

  return (
    <div className="ap-panel border rounded p-3">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-xs font-black font-mono uppercase tracking-[0.1em]">Demand recommendations</h3>
          <p className="ap-muted text-[10px] font-mono mt-1">
            {selectedValue ? `Scoped to ${selectedValue}` : "Ranked from product values, ratings, review signal, and price."}
          </p>
        </div>
      </div>
      <div className="grid xl:grid-cols-2 gap-2">
        {recommendations.slice(0, 6).map((item) => (
          <div key={item.item} className="ap-card border rounded p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="font-mono text-xs font-black truncate" title={item.item}>{item.item}</h4>
                <p className="ap-muted text-[10px] mt-1">{item.reason}</p>
              </div>
              <span className="text-[9px] uppercase font-black font-mono px-2 py-1 rounded" style={{ background: "var(--ap-accent-soft)", color: "var(--ap-accent)" }}>
                {item.confidence}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
              <MetricCard label="Rating" value={formatNumber(item.rating, 1)} small />
              <MetricCard label="Reviews" value={formatNumber(item.ratingCount, 0)} small />
              <MetricCard label="Buyers" value={formatNumber(item.expectedBuyers, 0)} tone="good" small />
              <MetricCard label="Revenue" value={formatNumber(item.forecastRevenue)} tone="good" small />
            </div>
            <div className="text-[10px] ap-muted font-mono mt-2">
              Conversion: {formatNumber(item.conversionRate * 100, 1)}% at average price {formatNumber(item.price)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
