import React, { useMemo } from "react";
import { Table, UploadCloud } from "lucide-react";
import type { ColumnProfile, InsightResult } from "./types";
import { defaultAnalysisColumns, formatNumber, isIdLikeColumn, profileColumns } from "./analytics";
import { DataTable, InsightBox, MetricCard, ProfileCard, RunButton, SectionHeader } from "./ui";

interface OverviewTabProps {
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
  onColumnsChange: (cols: string[]) => void;
  onFile: (file: File) => void;
}

export function OverviewTab({
  profiles, data, allColumns, columns, ignoredColumns, fileName,
  missingCount, numericCount, categoryCount, insight, loading, onRefresh, onColumnsChange, onFile,
}: OverviewTabProps) {
  const allProfiles = useMemo(() => profileColumns(data, allColumns), [data, allColumns]);

  const toggleColumn = (col: string) => {
    const next = columns.includes(col) ? columns.filter((c) => c !== col) : [...columns, col];
    onColumnsChange(next);
  };

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.4fr)_300px] gap-3">
      {/* main column */}
      <div className="space-y-3">
        {/* workspace header */}
        <div className="ap-card border rounded p-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <SectionHeader
              title="Workspace"
              sub={`${fileName || "No file"} — ${formatNumber(data.length, 0)} rows loaded`}
              tab="Overview"
            >
              <label className="ap-btn-primary cursor-pointer text-xs font-mono font-bold px-3 py-1.5 rounded flex items-center gap-1.5">
                <UploadCloud className="w-3 h-3" />
                Load CSV
                <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              </label>
            </SectionHeader>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <MetricCard label="Rows" value={formatNumber(data.length, 0)} />
            <MetricCard label="Active cols" value={formatNumber(columns.length, 0)} />
            <MetricCard label="Numeric" value={formatNumber(numericCount, 0)} />
            <MetricCard label="Segments" value={formatNumber(categoryCount, 0)} />
            <MetricCard label="Missing cells" value={formatNumber(missingCount, 0)} tone={missingCount ? "warn" : "good"} />
          </div>
        </div>

        {/* column selection */}
        <div className="ap-card border rounded p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-xs font-black font-mono uppercase tracking-[0.1em]">Column selection</h3>
              <p className="ap-muted text-[10px] font-mono mt-0.5">Active columns drive all charts, reports, and LLM context.</p>
            </div>
            <div className="flex gap-1.5">
              <button className="ap-btn text-[10px] font-mono font-bold px-2 py-1 rounded" onClick={() => onColumnsChange(defaultAnalysisColumns(data, allColumns))}>Exclude IDs</button>
              <button className="ap-btn text-[10px] font-mono font-bold px-2 py-1 rounded" onClick={() => onColumnsChange(allColumns)}>All</button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-1.5">
            {allColumns.map((col) => {
              const active = columns.includes(col);
              const profile = allProfiles.find((p) => p.name === col);
              const idLike = isIdLikeColumn(col, profile, data.length);
              return (
                <label
                  key={col}
                  className="ap-panel border rounded p-2.5 flex gap-2.5 cursor-pointer transition-opacity"
                  style={{ opacity: active ? 1 : 0.45 }}
                >
                  <input type="checkbox" checked={active} onChange={() => toggleColumn(col)} className="mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold truncate" title={col}>{col}</span>
                      {idLike && <span className="text-[9px] uppercase font-black font-mono px-1 py-0.5 rounded opacity-60" style={{ background: "var(--ap-surface-3)", color: "var(--ap-muted)" }}>id</span>}
                    </div>
                    <div className="text-[10px] ap-muted font-mono mt-0.5">
                      {profile ? `${profile.type} · ${formatNumber(profile.unique, 0)} uniq · ${formatNumber(profile.missingPercent, 1)}% null` : "raw"}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          {ignoredColumns.length > 0 && (
            <p className="mt-3 text-[10px] ap-muted font-mono">
              Ignored: {ignoredColumns.slice(0, 8).join(", ")}{ignoredColumns.length > 8 ? ` +${ignoredColumns.length - 8} more` : ""}
            </p>
          )}
        </div>

        {/* data preview */}
        <div className="ap-card border rounded p-4">
          <div className="flex items-center gap-2 mb-3">
            <Table className="w-3.5 h-3.5 ap-accent" />
            <span className="text-xs font-black font-mono uppercase tracking-[0.1em]">Data preview</span>
            <span className="ap-muted text-[10px] font-mono ml-1">— first 80 rows, active columns</span>
          </div>
          <DataTable rows={data.slice(0, 80)} columns={columns} />
        </div>
      </div>

      {/* schema sidebar */}
      <aside className="space-y-3">
        <div className="ap-card border rounded p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-black font-mono uppercase tracking-[0.1em]">Schema</span>
            <span className="text-[10px] ap-muted font-mono">{profiles.length} fields</span>
          </div>
          <div className="space-y-1.5 max-h-[400px] overflow-auto pr-0.5">
            {profiles.map((p) => (
              <React.Fragment key={p.name}>
                <ProfileCard profile={p} />
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="ap-card border rounded p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-black font-mono uppercase tracking-[0.1em]">Backend insight</span>
            <RunButton onClick={onRefresh} loading={loading} label="Refresh" />
          </div>
          <InsightBox insight={insight} loading={loading} />
        </div>
      </aside>
    </div>
  );
}
