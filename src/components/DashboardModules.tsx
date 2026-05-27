import { motion } from "motion/react";
import type { CSSProperties } from "react";

import Logo from "./Logo.tsx";
import platformWorkspacePage from "../assets/images/website/platform_workspace_page.webp";
import platformInsightsPage from "../assets/images/website/platform_insights_page.webp";
import platformIdeasPage from "../assets/images/website/platform_ideas_page.webp";
import platformForecastPage from "../assets/images/website/platform_forecast_page.webp";
import platformBudgetPage from "../assets/images/website/platform_budget_page.webp";
import platformEsgPage from "../assets/images/website/platform_esg_page.webp";
import platformKpiPage from "../assets/images/website/platform_kpi_page.webp";

export interface LaptopStoryCopy {
  eyebrow: string;
  title: string;
  body: string;
}

export const LAPTOP_STORY_COPY: LaptopStoryCopy[] = [
  {
    eyebrow: "Workspace Intelligence",
    title: "One workspace. All your business data.",
    body: "Bring datasets, KPIs, reports, and AI recommendations into one place built for decision work.",
  },
  {
    eyebrow: "Data Workspace",
    title: "Your uploads become structured intelligence.",
    body: "Adviso organizes columns, quality signals, schema profiles, and previews so teams can trust what they analyze.",
  },
  {
    eyebrow: "AI Insights",
    title: "Ask why the numbers moved.",
    body: "Generate narrative reports, key findings, risks, and next actions from the metadata your workspace already understands.",
  },
  {
    eyebrow: "Opportunity Builder",
    title: "Spot ideas before they become obvious.",
    body: "Find high-impact opportunities across product, pricing, retention, and operational levers with confidence scoring.",
  },
  {
    eyebrow: "Forecasting",
    title: "Model what happens next.",
    body: "Turn historical signals into forecast ranges, scenario previews, and recommendations your team can act on.",
  },
  {
    eyebrow: "Budget Planning",
    title: "Control spend before it drifts.",
    body: "See variance, budget efficiency, and what-if scenarios in one planning surface instead of scattered spreadsheets.",
  },
  {
    eyebrow: "Impact Intelligence",
    title: "Compare risk, impact, and market position.",
    body: "Use ESG and competitive intelligence views to understand where to focus and what to improve next.",
  },
  {
    eyebrow: "KPI Monitor",
    title: "Keep every metric under watch.",
    body: "Track movement, anomalies, recommendations, and data quality signals with one clean KPI command center.",
  },
];

function PlatformScreenImage({
  src,
  alt,
  priority = false,
  maskSeed = 0,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  maskSeed?: number;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#f8fbff]">
      <motion.img
        src={src}
        alt={alt}
        className="h-full w-full object-cover object-top opacity-[0.82] saturate-[0.92] contrast-[0.96]"
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        initial={{ opacity: 0, scale: 1.015 }}
        whileInView={{ opacity: 0.82, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />
      <ScreenshotPrivacyMasks seed={maskSeed} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(20,93,255,0.12),transparent_42%),radial-gradient(circle_at_72%_72%,rgba(32,215,255,0.08),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(2,4,10,0.22)_100%)]" />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/35" />
    </div>
  );
}

const maskSets: Array<Array<CSSProperties>> = [
  [
    { top: "1.2%", right: "1.2%", width: "22%", height: "5.8%" },
    { top: "17%", left: "18%", width: "18%", height: "8%" },
    { top: "52%", left: "60%", width: "25%", height: "10%" },
    { bottom: "9%", right: "9%", width: "28%", height: "12%" },
  ],
  [
    { top: "1.2%", right: "1.2%", width: "23%", height: "5.8%" },
    { top: "28%", left: "37%", width: "23%", height: "9%" },
    { top: "56%", left: "13%", width: "34%", height: "10%" },
    { bottom: "13%", right: "6%", width: "18%", height: "14%" },
  ],
  [
    { top: "1.2%", right: "1.2%", width: "24%", height: "5.8%" },
    { top: "18%", right: "18%", width: "27%", height: "8%" },
    { top: "42%", left: "27%", width: "31%", height: "10%" },
    { bottom: "10%", left: "52%", width: "26%", height: "12%" },
  ],
];

function ScreenshotPrivacyMasks({ seed }: { seed: number }) {
  const masks = maskSets[seed % maskSets.length];

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {masks.map((style, index) => (
        <div
          key={`${seed}-${index}`}
          style={style}
          className="absolute rounded-2xl border border-white/55 bg-white/54 shadow-[0_14px_36px_rgba(20,93,255,0.08)] backdrop-blur-[9px]"
        />
      ))}
      <div className="absolute inset-x-0 top-0 h-[7%] bg-white/18 backdrop-blur-[1px]" />
    </div>
  );
}

// Scene 1
export function SystemBootScreen({ progress }: { progress: number }) {
  const percent = Math.min(100, Math.floor(progress * 100));

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#02040a]">
      <PlatformScreenImage
        src={platformWorkspacePage}
        alt="Adviso AI workspace overview shown inside the laptop"
        priority
        maskSeed={0}
      />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#02040a]/52 to-transparent" />
      <div className="absolute bottom-5 left-5 flex items-center gap-4 rounded-2xl border border-white/20 bg-[#020817]/70 px-4 py-3 text-white shadow-[0_18px_50px_rgba(2,8,23,0.35)] backdrop-blur-xl">
        <Logo size="sm" className="text-white" />
        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#145DFF] to-[#20D7FF] transition-all duration-100"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Scene 2
export function ConnectedDataModule() {
  return (
    <PlatformScreenImage
      src={platformWorkspacePage}
      alt="Adviso AI data workspace page"
      maskSeed={1}
    />
  );
}

// Scene 3
export function AdaptiveWorkspaceModule() {
  return (
    <PlatformScreenImage
      src={platformInsightsPage}
      alt="Adviso AI insights and narrative report page"
      maskSeed={2}
    />
  );
}

// Scene 4
export function AnomalyDetectionModule() {
  return (
    <PlatformScreenImage
      src={platformIdeasPage}
      alt="Adviso AI opportunity builder page"
      maskSeed={0}
    />
  );
}

// Scene 5
export function DeepDiveAnalyticsModule() {
  return (
    <PlatformScreenImage
      src={platformForecastPage}
      alt="Adviso AI forecasting simulator page"
      maskSeed={1}
    />
  );
}

// Scene 6
export function ExplainableAIModule() {
  return (
    <PlatformScreenImage
      src={platformBudgetPage}
      alt="Adviso AI budget planner page"
      maskSeed={2}
    />
  );
}

// Scene 7
export function SecureWorkspaceModule() {
  return (
    <PlatformScreenImage
      src={platformEsgPage}
      alt="Adviso AI ESG lens page"
      maskSeed={0}
    />
  );
}

// Scene 8
export function FinalRevealModule() {
  return (
    <PlatformScreenImage
      src={platformKpiPage}
      alt="Adviso AI KPI monitor page"
      maskSeed={1}
    />
  );
}
