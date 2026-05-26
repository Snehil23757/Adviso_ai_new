import React from "react";
import {
  ChartDonut,
  Compass,
  Database,
  FileText,
  Lock,
  MessageSquare,
  Sparkles,
  Target,
  TrendingUp,
  UploadCloud,
} from "lucide-react";
import { motion } from "motion/react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

import type { PlanDefinition, PlanId } from "../../subscriptions/permissions";

interface FirstRunDashboardProps {
  displayName: string;
  greeting: string;
  subscription: { plan: PlanDefinition; planId: PlanId; creditsRemaining: number | null };
  nextUpgradePlan: PlanDefinition | null;
  onViewPlans: () => void;
  isDragging: boolean;
  onDragOver: React.DragEventHandler<HTMLDivElement>;
  onDragLeave: React.DragEventHandler<HTMLDivElement>;
  onDrop: React.DragEventHandler<HTMLDivElement>;
  onFile: (file: File) => void;
}

const CHART_COLOR = "#145DFF";

export default function FirstRunDashboard({
  displayName,
  greeting,
  subscription,
  nextUpgradePlan,
  onViewPlans,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFile,
}: FirstRunDashboardProps) {
  const nextSteps = [
    { icon: <UploadCloud className="w-4 h-4" />, title: "Upload a sales or operational CSV", detail: "Import your first dataset to get started" },
    { icon: <Target className="w-4 h-4" />, title: "Review your auto-generated KPIs", detail: "See key metrics visualized instantly" },
    { icon: <Sparkles className="w-4 h-4" />, title: "Ask Adviso AI for insights", detail: "Get explanations behind the numbers" },
    { icon: <TrendingUp className="w-4 h-4" />, title: "Run a what-if scenario", detail: "Simulate changes and compare outcomes" },
    { icon: <FileText className="w-4 h-4" />, title: "Generate your first report", detail: "Create a decision brief for your team" },
  ];

  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--ap-text)]">
            {greeting}, {displayName}
          </h1>
          <p className="mt-1 text-sm ap-muted">Turn your business data into decisions.</p>
        </div>
        <button className="ap-btn rounded-xl px-4 py-2.5 text-xs font-black inline-flex items-center gap-2 self-start">
          <Compass className="w-4 h-4" />
          Customize dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div
          className={`ap-action-card rounded-2xl border p-6 text-center transition ${isDragging ? "ring-4 ring-blue-200" : ""}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div className="ap-soft-orb ap-tone-blue mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full">
            <UploadCloud className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-black">Upload your first dataset</h2>
          <p className="mx-auto mt-2 max-w-[230px] text-sm leading-6 ap-muted">
            Import a CSV to unlock instant KPIs, charts, and AI insights.
          </p>
          <label className="ap-btn-primary mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-3 text-sm font-black">
            <UploadCloud className="w-4 h-4" />
            Import CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) onFile(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        <ActionCard icon={<MessageSquare className="h-8 w-8" />} title="Ask Adviso AI" detail="Get answers and explanations about your business data." cta="Why did profit decrease?" tone="blue" />
        <ActionCard icon={<FileText className="h-8 w-8" />} title="Build a decision brief" detail="Generate executive-ready summaries in minutes." cta="Create brief" tone="green" />
        <ActionCard icon={<TrendingUp className="h-8 w-8" />} title="Run a what-if simulation" detail="Model scenarios and see their impact on your metrics." cta="Start simulation" tone="orange" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(380px,0.9fr)]">
        <section className="ap-card border rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-black">Recommended next steps</h2>
            <span className="text-xs font-bold ap-muted">0 / 5 completed</span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--ap-border)" }}>
            {nextSteps.map((step, index) => (
              <div key={step.title} className="grid grid-cols-[36px_28px_minmax(0,1fr)_80px] items-center gap-2 py-3">
                <span className="grid h-7 w-7 place-items-center rounded-full border text-xs font-black text-[#145DFF]" style={{ borderColor: "var(--ap-border)" }}>
                  {index + 1}
                </span>
                <span className="ap-accent">{step.icon}</span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-black">{step.title}</div>
                  <div className="truncate text-xs ap-muted">{step.detail}</div>
                </div>
                <button className="ap-soft-pill rounded-full px-3 py-1.5 text-xs font-black">Start</button>
              </div>
            ))}
          </div>
        </section>

        <section className="ap-card border rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-black">{subscription.plan.name === "Free" ? "Trial usage" : "Workspace usage"}</h2>
            <button className="text-xs font-black text-[#145DFF]">View all usage</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <UsageTile label="Dataset uploads" value="0 / 2" detail="uploads used" icon={<Database className="w-7 h-7" />} tone="blue" />
            <UsageTile label="AI reports" value="0 / 3" detail="reports used" icon={<FileText className="w-7 h-7" />} tone="blue" />
            <UsageTile label="Workspace" value="1 / 1" detail="active workspace" icon={<Database className="w-7 h-7" />} tone="green" />
            <UsageTile label={subscription.planId === "free" ? "Days left in trial" : "Plan status"} value={subscription.planId === "free" ? "14" : "Active"} detail={subscription.planId === "free" ? "days remaining" : subscription.plan.monthlyPriceLabel} icon={<ChartDonut className="w-7 h-7" />} tone="orange" />
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_360px_360px]">
        <section className="ap-card border rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-black">KPI snapshot <span className="font-medium ap-muted">(Last 30 days)</span></h2>
            <button className="text-xs font-black text-[#145DFF]">View full dashboard</button>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MiniMetricCard label="Revenue" value="0 -" />
            <MiniMetricCard label="Profit Margin" value="0% -" />
            <MiniMetricCard label="Churn Rate" value="0% -" />
            <MiniMetricCard label="Burn Rate" value="0 -" />
          </div>
          <div className="ap-kpi-chart-panel mt-5 h-44 rounded-2xl border p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[0, 1, 2, 3, 4, 5].map((item) => ({ name: item, value: 0 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--ap-chart-grid)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--ap-muted)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--ap-muted)" />
                <Line dataKey="value" stroke={CHART_COLOR} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="-mt-24 flex justify-center">
            <div className="ap-floating-label rounded-xl px-5 py-3 text-sm font-bold shadow-sm backdrop-blur">
              Upload a dataset to see your trends
            </div>
          </div>
        </section>

        <section className="ap-card border rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#145DFF]" />
            <h2 className="font-black">AI insight</h2>
            <span className="ap-soft-badge rounded-full px-2 py-0.5 text-[10px] font-black">Beta</span>
          </div>
          <div className="ap-ai-callout rounded-2xl border p-4">
            <div className="text-sm font-black text-[var(--ap-text)]">Revenue signals are waiting for your first dataset.</div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="ap-muted">Confidence</span>
              <span className="font-black text-emerald-600">Ready after upload</span>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="font-black">What you can do</div>
            <ul className="space-y-2 text-xs leading-5 ap-muted">
              <li>Upload a CSV to generate KPI summaries.</li>
              <li>Ask follow-up questions in Data Chat.</li>
              <li>Build a decision brief for your team.</li>
            </ul>
          </div>
          <button className="mt-5 w-full rounded-xl border px-4 py-3 text-sm font-black text-[#145DFF]" style={{ borderColor: "var(--ap-border)" }}>
            Ask for more insights
          </button>
        </section>

        <section className="ap-card border rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-black">Market Benchmarks</h2>
            <span className="ap-soft-badge rounded-md px-2 py-1 text-[10px] font-black">Premium</span>
          </div>
          <div className="ap-locked-panel grid min-h-52 place-items-center rounded-2xl text-center">
            <div>
              <div className="ap-lock-orb mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full text-[#145DFF] shadow-sm">
                <Lock className="h-7 w-7" />
              </div>
              <p className="mx-auto max-w-[220px] text-sm leading-6 ap-muted">Compare your performance against industry peers and benchmarks.</p>
            </div>
          </div>
          {nextUpgradePlan && (
            <button onClick={onViewPlans} className="mt-5 w-full rounded-2xl bg-[#145DFF] px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20">
              Available on paid plans
            </button>
          )}
        </section>
      </div>
    </motion.div>
  );
}

function ActionCard({
  icon,
  title,
  detail,
  cta,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  cta: string;
  tone: "blue" | "green" | "orange";
}) {
  const toneClasses = {
    blue: "ap-tone-blue",
    green: "ap-tone-green",
    orange: "ap-tone-orange",
  }[tone];

  return (
    <div className="ap-action-card rounded-2xl border p-6 text-center">
      <div className={`mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full ${toneClasses}`}>
        {icon}
      </div>
      <h2 className="text-lg font-black">{title}</h2>
      <p className="mx-auto mt-2 max-w-[230px] text-sm leading-6 ap-muted">{detail}</p>
      <button className={`ap-soft-action mt-5 w-full rounded-xl px-4 py-3 text-sm font-black ${toneClasses}`}>{cta}</button>
    </div>
  );
}

function UsageTile({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone: "blue" | "green" | "orange";
}) {
  const color = tone === "green" ? "#059669" : tone === "orange" ? "#f97316" : "#145DFF";
  return (
    <div className="ap-usage-tile rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black" style={{ color }}>{label}</div>
          <div className="mt-2 text-2xl font-black text-[var(--ap-text)]">{value}</div>
          <div className="mt-1 text-xs ap-muted">{detail}</div>
        </div>
        <div style={{ color }}>{icon}</div>
      </div>
    </div>
  );
}

function MiniMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="ap-card border rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-[0.16em] ap-muted">{label}</div>
      <div className="text-2xl font-black mt-1 truncate text-[var(--ap-text)]" title={value}>
        {value}
      </div>
    </div>
  );
}
