import React, { useState } from "react";
import { ArrowRight, Database, X } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { ColumnProfile, MultiValueCandidate, MultiValueSplitConfig, ThemeMode } from "./types";
import { MULTI_VALUE_DELIMITERS } from "./types";
import { axisColor, chartTooltip, defaultAnalysisColumns, formatNumber, histogram, isIdLikeColumn, sanitizeColumnName } from "./analytics";
import { CHART_COLOR } from "./types";
import { DataTable } from "./ui";

interface Props {
  rows: Record<string, unknown>[];
  columns: string[];
  rawRows: Record<string, unknown>[];
  rawColumns: string[];
  profiles: ColumnProfile[];
  previewColumn: string | null;
  setPreviewColumn: (v: string | null) => void;
  onCancel: () => void;
  onConfirm: () => void;
  theme: ThemeMode;
  selectedColumns: string[];
  setSelectedColumns: (v: string[]) => void;
  multiValueCandidates: MultiValueCandidate[];
  splitConfigs: Record<string, MultiValueSplitConfig>;
  setSplitConfigs: (v: Record<string, MultiValueSplitConfig>) => void;
}

export function DatasetValidationModal({
  rows, columns, rawRows, rawColumns, profiles, previewColumn, setPreviewColumn,
  onCancel, onConfirm, theme, selectedColumns, setSelectedColumns,
  multiValueCandidates, splitConfigs, setSplitConfigs,
}: Props) {
  const sel = new Set(selectedColumns);
  const toggle = (col: string) => setSelectedColumns(sel.has(col) ? selectedColumns.filter((c) => c !== col) : [...selectedColumns, col]);
  const histData = previewColumn ? histogram(rows, previewColumn, 16) : [];
  const previewProfile = profiles.find((p) => p.name === previewColumn);

  const updateSplit = (col: string, patch: Partial<MultiValueSplitConfig>) => {
    const cand = multiValueCandidates.find((c) => c.column === col);
    const cur = splitConfigs[col] || { enabled: false, delimiter: cand?.delimiter || "|", prefix: sanitizeColumnName(col), keepOriginal: false, maxParts: Math.min(cand?.maxParts || 3, 8) };
    setSplitConfigs({ ...splitConfigs, [col]: { ...cur, ...patch } });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <div className="ap-modal relative w-[97vw] h-[92vh] border rounded flex flex-col overflow-hidden shadow-2xl">
        {/* header */}
        <header className="border-b p-4 flex justify-between items-center shrink-0" style={{ borderColor: "var(--ap-border)" }}>
          <div className="flex items-center gap-3">
            <Database className="w-4 h-4 ap-accent" />
            <div>
              <h3 className="text-sm font-black font-mono">Validate import</h3>
              <p className="ap-muted text-[10px] font-mono">{formatNumber(rows.length, 0)} rows · {formatNumber(columns.length, 0)} columns · {formatNumber(selectedColumns.length, 0)} selected</p>
            </div>
          </div>
          <button onClick={onCancel} className="ap-btn rounded p-1.5"><X className="w-3.5 h-3.5" /></button>
        </header>

        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)]">
          {/* schema list */}
          <aside className="border-r overflow-y-auto p-3 space-y-1.5" style={{ borderColor: "var(--ap-border)" }}>
            <div className="flex items-center justify-between gap-2 pb-2 sticky top-0" style={{ background: "var(--ap-modal-bg)" }}>
              <span className="text-[10px] ap-muted font-mono uppercase">Schema</span>
              <div className="flex gap-1">
                <button className="ap-btn rounded px-2 py-0.5 text-[9px] font-mono" onClick={() => setSelectedColumns(defaultAnalysisColumns(rows, columns))}>No IDs</button>
                <button className="ap-btn rounded px-2 py-0.5 text-[9px] font-mono" onClick={() => setSelectedColumns(columns)}>All</button>
              </div>
            </div>
            {profiles.map((p) => (
              <div key={p.name} className="ap-panel border rounded p-2.5" style={{ borderColor: sel.has(p.name) ? "var(--ap-accent)" : "var(--ap-border)", opacity: sel.has(p.name) ? 1 : 0.45 }}>
                <div className="flex items-start justify-between gap-2">
                  <label className="flex gap-2 cursor-pointer min-w-0 flex-1">
                    <input type="checkbox" checked={sel.has(p.name)} onChange={() => toggle(p.name)} className="mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold truncate">{p.name}</span>
                        {isIdLikeColumn(p.name, p, rows.length) && <span className="text-[9px] font-mono font-black ap-muted">id</span>}
                      </div>
                      <span className="text-[9px] ap-muted font-mono">{p.unique} unique · {formatNumber(p.missingPercent, 1)}% null</span>
                    </div>
                  </label>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[9px] uppercase font-black font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--ap-accent-soft)", color: "var(--ap-accent)" }}>{p.type}</span>
                    {p.type === "number" && (
                      <button className="ap-btn rounded px-1.5 py-0.5 text-[9px] font-mono" onClick={() => setPreviewColumn(previewColumn === p.name ? null : p.name)}>
                        {previewColumn === p.name ? "hide" : "hist"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </aside>

          {/* right panel */}
          <section className="min-w-0 overflow-y-auto p-3 flex flex-col gap-3">
            {/* multi-value candidates */}
            {multiValueCandidates.length > 0 && (
              <div className="ap-panel border rounded p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-black font-mono uppercase tracking-[0.1em]">Multi-value cells</span>
                  <span className="text-[10px] ap-muted font-mono">optional cleanup</span>
                </div>
                <div className="grid xl:grid-cols-2 gap-2 max-h-56 overflow-auto">
                  {multiValueCandidates.map((cand) => {
                    const cfg = splitConfigs[cand.column] || { enabled: false, delimiter: cand.delimiter, prefix: sanitizeColumnName(cand.column), keepOriginal: false, maxParts: Math.min(cand.maxParts, 8) };
                    return (
                      <div key={`${cand.column}-${cand.delimiter}`} className="border rounded p-2.5" style={{ borderColor: "var(--ap-border)", background: "var(--ap-surface)" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                            <input type="checkbox" checked={cfg.enabled} onChange={(e) => updateSplit(cand.column, { enabled: e.target.checked })} className="shrink-0" />
                            <div className="min-w-0">
                              <span className="font-mono text-[10px] font-black truncate block">{cand.column}</span>
                              <span className="text-[9px] ap-muted font-mono">{cand.label} · {formatNumber(cand.affectedPercent, 1)}% affected · max {cand.maxParts}</span>
                            </div>
                          </label>
                        </div>
                        {cfg.enabled && (
                          <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                            <label className="block">
                              <span className="text-[9px] ap-muted font-mono">Delimiter</span>
                              <select className="ap-input border rounded px-1.5 py-1 text-[9px] font-mono w-full mt-0.5" value={cfg.delimiter} onChange={(e) => updateSplit(cand.column, { delimiter: e.target.value })}>
                                {MULTI_VALUE_DELIMITERS.map((d) => <option key={d.delimiter} value={d.delimiter}>{d.label}</option>)}
                              </select>
                            </label>
                            <label className="block">
                              <span className="text-[9px] ap-muted font-mono">Prefix</span>
                              <input className="ap-input border rounded px-1.5 py-1 text-[9px] font-mono w-full mt-0.5" value={cfg.prefix} onChange={(e) => updateSplit(cand.column, { prefix: e.target.value })} />
                            </label>
                            <label className="block">
                              <span className="text-[9px] ap-muted font-mono">Max parts</span>
                              <input className="ap-input border rounded px-1.5 py-1 text-[9px] font-mono w-full mt-0.5" type="number" min={2} max={12} value={cfg.maxParts} onChange={(e) => updateSplit(cand.column, { maxParts: Number(e.target.value) })} />
                            </label>
                            <label className="flex items-center gap-1.5 text-[9px] ap-muted font-mono mt-3">
                              <input type="checkbox" checked={cfg.keepOriginal} onChange={(e) => updateSplit(cand.column, { keepOriginal: e.target.checked })} />
                              Keep original
                            </label>
                          </div>
                        )}
                        <p className="text-[9px] ap-muted font-mono mt-1.5 truncate" title={cand.sampleValues[0]}>{cand.sampleValues[0]}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* histogram preview */}
            {previewProfile && histData.length > 0 && (
              <div className="ap-panel border rounded p-3 h-48 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black font-mono">Distribution: {previewProfile.name}</span>
                  <button className="ap-btn rounded px-2 py-0.5 text-[9px] font-mono" onClick={() => setPreviewColumn(null)}>hide</button>
                </div>
                <ResponsiveContainer width="100%" height="82%">
                  <BarChart data={histData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
                    <XAxis dataKey="bucket" stroke={axisColor(theme)} tick={{ fontSize: 9 }} minTickGap={18} />
                    <YAxis stroke={axisColor(theme)} tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={chartTooltip(theme)} />
                    <Bar dataKey="count" fill={CHART_COLOR} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* data preview table */}
            <div className="flex-1">
              <p className="text-[10px] ap-muted font-mono mb-2">Preview — first 80 rows</p>
              <DataTable rows={rows.slice(0, 80)} columns={selectedColumns.length ? selectedColumns : columns} />
            </div>
          </section>
        </div>

        {/* footer */}
        <footer className="border-t p-3 flex justify-end gap-2 shrink-0" style={{ borderColor: "var(--ap-border)" }}>
          <button onClick={onCancel} className="ap-btn px-4 py-2 rounded text-xs font-mono">Cancel</button>
          <button onClick={onConfirm} disabled={!selectedColumns.length} className="ap-btn-primary px-4 py-2 rounded text-xs font-mono font-bold flex items-center gap-2 disabled:opacity-40">
            Import {formatNumber(selectedColumns.length, 0)} columns
            <ArrowRight className="w-3 h-3" />
          </button>
        </footer>
      </div>
    </div>
  );
}
