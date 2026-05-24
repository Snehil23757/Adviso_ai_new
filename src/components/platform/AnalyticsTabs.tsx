import React from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart,
  Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { ColumnProfile, DemandRecommendation, ForecastPoint, InsightResult, ThemeMode } from "./types";
import { CHART_COLOR, CHART_GOOD, CHART_WARN } from "./types";
import { axisColor, chartTooltip, formatNumber } from "./analytics";
import { CorrelationHeatmap, InsightBox, MetricCard, RunButton, SectionHeader, Select } from "./ui";

// ─── AI Report Tab ─────────────────────────────────────────────────────────────

interface ReportTabProps {
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
}

export function ReportTab({ theme, profiles, data, columns, categoryAggregate, correlationData, ignoredColumns, fileName, insight, loading, onRun }: ReportTabProps) {
  const qualityRows = profiles.map((p) => ({ name: p.name, missing: p.missing, unique: p.unique }));
  const numProfiles = profiles.filter((p) => p.numeric).slice(0, 8);
  const axis = axisColor(theme);
  const tip = chartTooltip(theme);

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_380px] gap-3">
      <div className="space-y-3">
        <div className="ap-card border rounded p-4">
          <SectionHeader title="Comprehensive BI report" sub={`${fileName || "Dataset"} — ${formatNumber(data.length, 0)} rows, ${formatNumber(columns.length, 0)} active columns`} tab="AI">
            <RunButton onClick={onRun} loading={loading} label="Generate report" />
          </SectionHeader>
          <div className="grid grid-cols-3 gap-2">
            <MetricCard label="Rows analyzed" value={formatNumber(data.length, 0)} />
            <MetricCard label="Columns used" value={formatNumber(columns.length, 0)} />
            <MetricCard label="Ignored fields" value={formatNumber(ignoredColumns.length, 0)} tone={ignoredColumns.length ? "warn" : "good"} />
          </div>
        </div>

        <div className="grid xl:grid-cols-2 gap-3">
          <div className="ap-card border rounded p-3 h-[320px]">
            <p className="text-[10px] font-black font-mono uppercase tracking-[0.1em] mb-3">Column quality</p>
            <ResponsiveContainer width="100%" height="88%">
              <BarChart data={qualityRows.slice(0, 18)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
                <XAxis dataKey="name" stroke={axis} tick={{ fontSize: 9 }} minTickGap={20} /><YAxis stroke={axis} tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={tip} /><Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="missing" fill={CHART_WARN} name="Missing" />
                <Bar dataKey="unique" fill={CHART_COLOR} name="Unique" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="ap-card border rounded p-3 h-[320px]">
            <p className="text-[10px] font-black font-mono uppercase tracking-[0.1em] mb-3">Top segment contribution</p>
            <ResponsiveContainer width="100%" height="88%">
              <BarChart data={categoryAggregate.slice(0, 12)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
                <XAxis type="number" stroke={axis} tick={{ fontSize: 9 }} /><YAxis type="category" dataKey="name" width={130} stroke={axis} tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={tip} />
                <Bar dataKey="value" fill={CHART_COLOR} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="ap-card border rounded p-3">
          <p className="text-[10px] font-black font-mono uppercase tracking-[0.1em] mb-3">Numeric summary</p>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-2">
            {numProfiles.map((p) => (
              <div key={p.name} className="ap-panel border rounded p-2.5">
                <p className="font-mono text-[10px] font-black truncate" title={p.name}>{p.name}</p>
                <div className="grid grid-cols-2 gap-x-2 text-[10px] font-mono mt-2">
                  <span className="ap-muted">sum</span><span className="text-right">{formatNumber(p.numeric?.sum)}</span>
                  <span className="ap-muted">mean</span><span className="text-right">{formatNumber(p.numeric?.mean)}</span>
                  <span className="ap-muted">median</span><span className="text-right">{formatNumber(p.numeric?.median)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {correlationData.length > 0 && (
          <div className="ap-card border rounded p-3">
            <CorrelationHeatmap data={correlationData} />
          </div>
        )}
      </div>

      <aside className="ap-card border rounded p-4 h-fit 2xl:sticky 2xl:top-20">
        <p className="text-[10px] font-black font-mono uppercase tracking-[0.1em] mb-3">LLM narrative</p>
        <InsightBox insight={insight} loading={loading} />
      </aside>
    </div>
  );
}

// ─── Forecast Tab ──────────────────────────────────────────────────────────────

interface ForecastTabProps {
  theme: ThemeMode;
  numericColumns: string[];
  forecastColumns: string[];
  forecastCol: string;
  setForecastCol: (v: string) => void;
  forecastPeriods: number;
  setForecastPeriods: (v: number) => void;
  forecastRows: ForecastPoint[];
  demandRecommendations: DemandRecommendation[];
  insight?: InsightResult;
  loading: boolean;
  onRun: () => void;
}

export function ForecastTab({ theme, numericColumns, forecastColumns, forecastCol, setForecastCol, forecastPeriods, setForecastPeriods, forecastRows, demandRecommendations, insight, loading, onRun }: ForecastTabProps) {
  const opts = forecastColumns.length ? forecastColumns : numericColumns;
  const lastActual = [...forecastRows].reverse().find((r) => r.actual !== null)?.actual ?? null;
  const finalForecast = forecastRows.filter((r) => r.forecast !== null).at(-1)?.forecast ?? null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)] gap-3">
      <div className="space-y-3">
        <div className="ap-card border rounded p-4">
          <SectionHeader title="Forecast" tab="Forecast" />
          <div className="space-y-3">
            <Select label="Series" value={forecastCol || opts[0] || ""} onChange={setForecastCol} options={opts} />
            <label className="block">
              <span className="block text-[10px] uppercase tracking-[0.14em] ap-muted font-mono mb-1">Future periods</span>
              <input className="ap-input border rounded px-2 py-1.5 text-xs font-mono w-full" type="number" min={1} max={24} value={forecastPeriods} onChange={(e) => setForecastPeriods(Number(e.target.value))} />
            </label>
            <div className="space-y-1.5">
              <MetricCard label="Last actual" value={formatNumber(lastActual)} small />
              <MetricCard label="Final forecast" value={formatNumber(finalForecast)} tone={(finalForecast || 0) >= (lastActual || 0) ? "good" : "warn"} small />
              <MetricCard label="Eligible fields" value={formatNumber(opts.length, 0)} small />
            </div>
            <RunButton onClick={onRun} loading={loading} label="Explain trend" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="ap-card border rounded p-3 h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={forecastRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
              <XAxis dataKey="period" stroke={axisColor(theme)} tick={{ fontSize: 10 }} />
              <YAxis stroke={axisColor(theme)} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltip(theme)} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Area dataKey="upper" name="Upper" stroke="none" fill={CHART_COLOR} fillOpacity={0.07} />
              <Area dataKey="lower" name="Lower" stroke="none" fill={CHART_COLOR} fillOpacity={0.03} />
              <Line dataKey="actual" name="Actual" stroke={CHART_COLOR} strokeWidth={1.5} dot={false} />
              <Line dataKey="forecast" name="Forecast" stroke={CHART_GOOD} strokeWidth={1.5} strokeDasharray="5 4" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <InsightBox insight={insight} loading={loading} />
      </div>
    </div>
  );
}

// ─── KPI Tab ───────────────────────────────────────────────────────────────────

interface KpiTabProps {
  profiles: ColumnProfile[];
  numericColumns: string[];
  selectedColumn: string;
  setSelectedColumn: (v: string) => void;
  forecastRows: ForecastPoint[];
  theme: ThemeMode;
  insight?: InsightResult;
  loading: boolean;
  onRun: () => void;
}

export function KpiTab({ profiles, numericColumns, selectedColumn, setSelectedColumn, forecastRows, theme, insight, loading, onRun }: KpiTabProps) {
  const profile = profiles.find((p) => p.name === selectedColumn);
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)] gap-3">
      <div className="space-y-3">
        <div className="ap-card border rounded p-4">
          <SectionHeader title="KPI monitor" tab="KPI" />
          <div className="space-y-3">
            <Select label="KPI field" value={selectedColumn} onChange={setSelectedColumn} options={numericColumns} />
            <div className="grid grid-cols-2 gap-1.5">
              <MetricCard label="Average" value={formatNumber(profile?.numeric?.mean)} small />
              <MetricCard label="Median" value={formatNumber(profile?.numeric?.median)} small />
              <MetricCard label="Min" value={formatNumber(profile?.numeric?.min)} small />
              <MetricCard label="Max" value={formatNumber(profile?.numeric?.max)} small />
            </div>
            <RunButton onClick={onRun} loading={loading} label="Generate insight" />
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="ap-card border rounded p-3 h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecastRows.filter((r) => r.actual !== null)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
              <XAxis dataKey="period" stroke={axisColor(theme)} tick={{ fontSize: 10 }} />
              <YAxis stroke={axisColor(theme)} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltip(theme)} />
              <Line dataKey="actual" name={selectedColumn} stroke={CHART_COLOR} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <InsightBox insight={insight} loading={loading} />
      </div>
    </div>
  );
}

// ─── Profit Tab ────────────────────────────────────────────────────────────────

interface ProfitTabProps {
  profiles: ColumnProfile[];
  numericColumns: string[];
  revenueColumn: string;
  costColumn: string;
  setRevenueColumn: (v: string) => void;
  setCostColumn: (v: string) => void;
  manualRevenue: number;
  setManualRevenue: (v: number) => void;
  manualCost: number;
  setManualCost: (v: number) => void;
  revenueValue: number;
  costValue: number;
  profitValue: number;
  insight?: InsightResult;
  loading: boolean;
  onRun: () => void;
}

export function ProfitTab({ profiles, numericColumns, revenueColumn, costColumn, setRevenueColumn, setCostColumn, manualRevenue, setManualRevenue, manualCost, setManualCost, revenueValue, costValue, profitValue, insight, loading, onRun }: ProfitTabProps) {
  const margin = revenueValue ? (profitValue / revenueValue) * 100 : 0;
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)] gap-3">
      <div className="ap-card border rounded p-4">
        <SectionHeader title="Profit" tab="Profit" />
        <div className="space-y-2.5">
          <Select label="Revenue / value column" value={revenueColumn} onChange={setRevenueColumn} options={numericColumns} />
          <Select label="Cost / expense column" value={costColumn} onChange={setCostColumn} options={numericColumns} />
          {!numericColumns.length && (
            <div className="grid grid-cols-2 gap-2">
              <input className="ap-input border rounded px-2 py-1.5 text-xs font-mono" type="number" value={manualRevenue} onChange={(e) => setManualRevenue(Number(e.target.value))} placeholder="Revenue" />
              <input className="ap-input border rounded px-2 py-1.5 text-xs font-mono" type="number" value={manualCost} onChange={(e) => setManualCost(Number(e.target.value))} placeholder="Cost" />
            </div>
          )}
          <RunButton onClick={onRun} loading={loading} label="Generate insight" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <MetricCard label="Revenue" value={formatNumber(revenueValue)} />
          <MetricCard label="Cost" value={formatNumber(costValue)} />
          <MetricCard label="Profit" value={formatNumber(profitValue)} tone={profitValue >= 0 ? "good" : "warn"} />
          <MetricCard label="Margin" value={`${formatNumber(margin, 1)}%`} tone={margin >= 0 ? "good" : "warn"} />
          <MetricCard label="Numeric fields" value={String(profiles.filter((p) => p.type === "number").length)} />
          <MetricCard label="Break-even gap" value={formatNumber(Math.max(0, costValue - revenueValue))} tone={costValue > revenueValue ? "warn" : "good"} />
        </div>
        <InsightBox insight={insight} loading={loading} />
      </div>
    </div>
  );
}
