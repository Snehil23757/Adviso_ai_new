import React from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart,
  Legend, Line, ResponsiveContainer, Scatter, ScatterChart,
  Tooltip, Treemap, XAxis, YAxis,
} from "recharts";
import type { ColumnProfile, InsightResult, ThemeMode } from "./types";
import { CHART_COLOR, CHART_GOOD, CHART_WARN } from "./types";
import { aggregateByCategory, average, axisColor, chartTooltip, formatNumber, sumColumn } from "./analytics";
import { InsightBox, MetricCard, RunButton, SectionHeader, Select } from "./ui";

// ─── Ideas Tab ─────────────────────────────────────────────────────────────────

export function IdeasTab({ theme, categoryAggregate, categoryColumn, valueColumn, insight, loading, onRun }: {
  theme: ThemeMode; categoryAggregate: { name: string; value: number }[]; categoryColumn: string; valueColumn: string;
  insight?: InsightResult; loading: boolean; onRun: () => void;
}) {
  const top = categoryAggregate.slice(0, 6);
  const total = categoryAggregate.reduce((s, i) => s + i.value, 0) || 1;
  const hints = ["Prioritize retention, premium bundles, supply reliability.", "Test pricing, targeted campaigns, cross-sell paths.", "Use as a controlled experiment or cost-rationalization lane."];

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_340px] gap-3">
      <div className="space-y-3">
        <div className="ap-card border rounded p-4">
          <SectionHeader title="Opportunity builder" sub={`${categoryColumn || "segment"} by ${valueColumn || "measure"}`} tab="Ideas" />
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
          {top.map((item, i) => (
            <div key={item.name} className="ap-card border rounded p-3">
              <span className="text-[10px] font-mono ap-muted">opportunity {i + 1}</span>
              <p className="font-mono text-xs font-black mt-1 truncate" title={item.name}>{item.name}</p>
              <p className="text-2xl font-black font-mono tabular-nums mt-2" style={{ color: "var(--ap-accent)" }}>{formatNumber((item.value / total) * 100, 1)}%</p>
              <p className="ap-muted text-[10px] font-mono mt-2 leading-4">{hints[Math.min(i < 2 ? 0 : i < 4 ? 1 : 2, 2)]}</p>
            </div>
          ))}
        </div>
        <div className="ap-card border rounded p-3 h-[360px]">
          <p className="text-[10px] font-black font-mono uppercase tracking-[0.1em] mb-3">Concentration</p>
          <ResponsiveContainer width="100%" height="90%">
            <ComposedChart data={categoryAggregate.slice(0, 14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
              <XAxis dataKey="name" stroke={axisColor(theme)} tick={{ fontSize: 9 }} minTickGap={20} />
              <YAxis stroke={axisColor(theme)} tick={{ fontSize: 9 }} />
              <Tooltip contentStyle={chartTooltip(theme)} />
              <Bar dataKey="value" fill={CHART_COLOR} fillOpacity={0.35} />
              <Line dataKey="value" stroke={CHART_GOOD} strokeWidth={1.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <aside className="space-y-3">
        <RunButton onClick={onRun} loading={loading} label="Generate opportunity report" />
        <InsightBox insight={insight} loading={loading} />
      </aside>
    </div>
  );
}

// ─── Budget Tab ────────────────────────────────────────────────────────────────

export function BudgetTab({ theme, profiles, numericColumns, categoryColumns, categoryColumn, setCategoryColumn, incomeColumn, setIncomeColumn, expenseColumn, setExpenseColumn, data, insight, loading, onRun }: {
  theme: ThemeMode; profiles: ColumnProfile[]; numericColumns: string[]; categoryColumns: string[];
  categoryColumn: string; setCategoryColumn: (v: string) => void; incomeColumn: string; setIncomeColumn: (v: string) => void;
  expenseColumn: string; setExpenseColumn: (v: string) => void; data: Record<string, unknown>[];
  insight?: InsightResult; loading: boolean; onRun: () => void;
}) {
  const income = sumColumn(data, incomeColumn);
  const expense = sumColumn(data, expenseColumn);
  const balance = income - expense;
  const expByCat = aggregateByCategory(data, categoryColumn || categoryColumns[0] || "", expenseColumn || numericColumns[0] || "");
  const trendRows = data.slice(0, 120).map((r, i) => ({ period: i + 1, income: parseFloat(String(r[incomeColumn])) || 0, expense: parseFloat(String(r[expenseColumn])) || 0 }));

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-[260px_minmax(0,1fr)_320px] gap-3">
      <div className="ap-card border rounded p-4 space-y-3">
        <SectionHeader title="Budget" tab="Budget" />
        <Select label="Income / value" value={incomeColumn} onChange={setIncomeColumn} options={numericColumns} />
        <Select label="Expense / cost" value={expenseColumn} onChange={setExpenseColumn} options={numericColumns} />
        <Select label="Segment" value={categoryColumn} onChange={setCategoryColumn} options={categoryColumns} />
        <MetricCard label="Income total" value={formatNumber(income)} small />
        <MetricCard label="Expense total" value={formatNumber(expense)} small />
        <MetricCard label="Surplus / gap" value={formatNumber(balance)} tone={balance >= 0 ? "good" : "warn"} small />
        <RunButton onClick={onRun} loading={loading} label="Budget advice" />
      </div>
      <div className="space-y-3">
        <div className="ap-card border rounded p-3 h-[320px]">
          <p className="text-[10px] font-black font-mono uppercase tracking-[0.1em] mb-2">Income vs expense</p>
          <ResponsiveContainer width="100%" height="90%">
            <AreaChart data={trendRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
              <XAxis dataKey="period" stroke={axisColor(theme)} tick={{ fontSize: 9 }} /><YAxis stroke={axisColor(theme)} tick={{ fontSize: 9 }} />
              <Tooltip contentStyle={chartTooltip(theme)} /><Legend wrapperStyle={{ fontSize: 10 }} />
              <Area dataKey="income" stroke={CHART_GOOD} fill={CHART_GOOD} fillOpacity={0.14} />
              <Area dataKey="expense" stroke={CHART_WARN} fill={CHART_WARN} fillOpacity={0.12} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="ap-card border rounded p-3 h-[300px]">
          <p className="text-[10px] font-black font-mono uppercase tracking-[0.1em] mb-2">Expense concentration</p>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={expByCat.slice(0, 12)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
              <XAxis type="number" stroke={axisColor(theme)} tick={{ fontSize: 9 }} /><YAxis type="category" dataKey="name" width={130} stroke={axisColor(theme)} tick={{ fontSize: 9 }} />
              <Tooltip contentStyle={chartTooltip(theme)} />
              <Bar dataKey="value" fill={CHART_WARN} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <InsightBox insight={insight} loading={loading} />
    </div>
  );
}

// ─── Sustainability Tab ────────────────────────────────────────────────────────

export function SustainabilityTab({ theme, data, numericColumns, categoryColumns, categoryColumn, setCategoryColumn, impactColumn, setImpactColumn, costColumn, setCostColumn, insight, loading, onRun }: {
  theme: ThemeMode; data: Record<string, unknown>[]; numericColumns: string[]; categoryColumns: string[];
  categoryColumn: string; setCategoryColumn: (v: string) => void; impactColumn: string; setImpactColumn: (v: string) => void;
  costColumn: string; setCostColumn: (v: string) => void; insight?: InsightResult; loading: boolean; onRun: () => void;
}) {
  const impactTotal = sumColumn(data, impactColumn);
  const costTotal = sumColumn(data, costColumn);
  const intensity = impactTotal ? costTotal / impactTotal : 0;
  const byCat = aggregateByCategory(data, categoryColumn || categoryColumns[0] || "", impactColumn || numericColumns[0] || "");
  const scatterRows = data.slice(0, 500).map((r, i) => ({ name: String(r[categoryColumn] ?? i + 1), impact: parseFloat(String(r[impactColumn])) || 0, cost: parseFloat(String(r[costColumn])) || 0 }));

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-[260px_minmax(0,1fr)_320px] gap-3">
      <div className="ap-card border rounded p-4 space-y-3">
        <SectionHeader title="ESG lens" tab="Sustainability" />
        <Select label="Impact / usage" value={impactColumn} onChange={setImpactColumn} options={numericColumns} />
        <Select label="Cost / value" value={costColumn} onChange={setCostColumn} options={numericColumns} />
        <Select label="Supplier / segment" value={categoryColumn} onChange={setCategoryColumn} options={categoryColumns} />
        <MetricCard label="Impact total" value={formatNumber(impactTotal)} small />
        <MetricCard label="Cost per unit" value={formatNumber(intensity)} tone={intensity > 1 ? "warn" : "good"} small />
        <RunButton onClick={onRun} loading={loading} label="ESG recommendations" />
      </div>
      <div className="space-y-3">
        <div className="ap-card border rounded p-3 h-[320px]">
          <p className="text-[10px] font-black font-mono uppercase tracking-[0.1em] mb-2">Impact hotspots</p>
          <ResponsiveContainer width="100%" height="90%">
            <Treemap data={byCat.slice(0, 18)} dataKey="value" nameKey="name" stroke="var(--ap-bg)" fill={CHART_GOOD} />
          </ResponsiveContainer>
        </div>
        <div className="ap-card border rounded p-3 h-[300px]">
          <p className="text-[10px] font-black font-mono uppercase tracking-[0.1em] mb-2">Cost vs impact</p>
          <ResponsiveContainer width="100%" height="90%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
              <XAxis dataKey="cost" name={costColumn} stroke={axisColor(theme)} tick={{ fontSize: 9 }} />
              <YAxis dataKey="impact" name={impactColumn} stroke={axisColor(theme)} tick={{ fontSize: 9 }} />
              <Tooltip contentStyle={chartTooltip(theme)} />
              <Scatter data={scatterRows} fill={CHART_GOOD} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
      <InsightBox insight={insight} loading={loading} />
    </div>
  );
}

// ─── Competitor Tab ────────────────────────────────────────────────────────────

export function CompetitorTab({ theme, data, numericColumns, categoryColumns, segmentColumn, setSegmentColumn, metricColumn, setMetricColumn, insight, loading, onRun }: {
  theme: ThemeMode; data: Record<string, unknown>[]; numericColumns: string[]; categoryColumns: string[];
  segmentColumn: string; setSegmentColumn: (v: string) => void; metricColumn: string; setMetricColumn: (v: string) => void;
  insight?: InsightResult; loading: boolean; onRun: () => void;
}) {
  const rows = aggregateByCategory(data, segmentColumn || categoryColumns[0] || "", metricColumn || numericColumns[0] || "");
  const benchmark = average(rows.map((r) => r.value));
  const compRows = rows.slice(0, 12).map((r) => ({ ...r, benchmark: Number(benchmark.toFixed(2)), gap: Number((r.value - benchmark).toFixed(2)) }));

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-[260px_minmax(0,1fr)_320px] gap-3">
      <div className="ap-card border rounded p-4 space-y-3">
        <SectionHeader title="Competitive" tab="Competitor" />
        <Select label="Segment / product" value={segmentColumn} onChange={setSegmentColumn} options={categoryColumns} />
        <Select label="Metric" value={metricColumn} onChange={setMetricColumn} options={numericColumns} />
        <MetricCard label="Benchmark avg" value={formatNumber(benchmark)} small />
        <MetricCard label="Leader" value={rows[0]?.name || "NA"} small />
        <RunButton onClick={onRun} loading={loading} label="Positioning report" />
      </div>
      <div className="space-y-3">
        <div className="ap-card border rounded p-3 h-[360px]">
          <p className="text-[10px] font-black font-mono uppercase tracking-[0.1em] mb-2">Performance vs benchmark</p>
          <ResponsiveContainer width="100%" height="90%">
            <ComposedChart data={compRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
              <XAxis dataKey="name" stroke={axisColor(theme)} tick={{ fontSize: 9 }} minTickGap={20} />
              <YAxis stroke={axisColor(theme)} tick={{ fontSize: 9 }} />
              <Tooltip contentStyle={chartTooltip(theme)} /><Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="value" fill={CHART_COLOR} />
              <Line dataKey="benchmark" stroke={CHART_WARN} strokeWidth={1.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {/* gap table as compact grid */}
        <div className="ap-panel border rounded p-3">
          <p className="text-[10px] font-black font-mono uppercase tracking-[0.1em] mb-2">Gap table</p>
          <div className="overflow-auto max-h-48">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="ap-muted border-b" style={{ borderColor: "var(--ap-border)" }}>
                  <th className="text-left py-1 px-1">Segment</th>
                  <th className="text-right py-1 px-1">Value</th>
                  <th className="text-right py-1 px-1">Benchmark</th>
                  <th className="text-right py-1 px-1">Gap</th>
                </tr>
              </thead>
              <tbody>
                {compRows.map((r) => (
                  <tr key={r.name} className="border-t" style={{ borderColor: "var(--ap-border)" }}>
                    <td className="py-1 px-1 truncate max-w-[120px]" title={r.name}>{r.name}</td>
                    <td className="py-1 px-1 text-right tabular-nums">{formatNumber(r.value)}</td>
                    <td className="py-1 px-1 text-right tabular-nums ap-muted">{formatNumber(r.benchmark)}</td>
                    <td className="py-1 px-1 text-right tabular-nums" style={{ color: r.gap >= 0 ? "var(--ap-good)" : "var(--ap-warn)" }}>{r.gap >= 0 ? "+" : ""}{formatNumber(r.gap)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <InsightBox insight={insight} loading={loading} />
    </div>
  );
}
