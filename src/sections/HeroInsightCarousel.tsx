import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  Cpu,
  Lock,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

type CarouselCardKind = "kpi" | "predictive" | "forecast" | "security" | "insight";

interface CarouselCard {
  id: CarouselCardKind;
  eyebrow: string;
  title: string;
  subtitle: string;
  badge: string;
  tone: "blue" | "purple" | "green" | "amber";
}

const CARDS: CarouselCard[] = [
  {
    id: "kpi",
    eyebrow: "KPI Overview",
    title: "Track What Drives Growth",
    subtitle: "Real-time KPI monitoring across every business unit.",
    badge: "Live",
    tone: "blue",
  },
  {
    id: "predictive",
    eyebrow: "Predictive Engine",
    title: "Predict Outcomes With Confidence",
    subtitle: "Multi-factor confidence scoring across scenarios.",
    badge: "AI Powered",
    tone: "purple",
  },
  {
    id: "forecast",
    eyebrow: "Forecast Engine",
    title: "Model Decisions Before You Move",
    subtitle: "Scenario simulation with uncertainty bands.",
    badge: "+27%",
    tone: "green",
  },
  {
    id: "security",
    eyebrow: "Data Security",
    title: "Secure. Scalable. Enterprise Ready.",
    subtitle: "Workspace isolation with encrypted processing paths.",
    badge: "Verified",
    tone: "blue",
  },
  {
    id: "insight",
    eyebrow: "AI Insight",
    title: "Explain The Story Behind The Numbers",
    subtitle: "Neural analysis across your operating context.",
    badge: "High Impact",
    tone: "amber",
  },
];

const TONE_CLASSES: Record<CarouselCard["tone"], { dot: string; text: string; badge: string; glow: string }> = {
  blue: {
    dot: "bg-blue-300 shadow-[0_0_10px_rgba(96,165,250,0.9)]",
    text: "text-blue-200",
    badge: "border-blue-300/25 bg-blue-500/15 text-blue-200",
    glow: "from-blue-500/20",
  },
  purple: {
    dot: "bg-violet-300 shadow-[0_0_10px_rgba(167,139,250,0.9)]",
    text: "text-violet-200",
    badge: "border-violet-300/25 bg-violet-500/15 text-violet-200",
    glow: "from-violet-500/20",
  },
  green: {
    dot: "bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.9)]",
    text: "text-emerald-200",
    badge: "border-emerald-300/25 bg-emerald-500/15 text-emerald-200",
    glow: "from-emerald-500/20",
  },
  amber: {
    dot: "bg-amber-200 shadow-[0_0_10px_rgba(252,211,77,0.85)]",
    text: "text-amber-100",
    badge: "border-amber-300/25 bg-amber-500/15 text-amber-100",
    glow: "from-amber-500/20",
  },
};

function cardStateClass(index: number, activeIndex: number) {
  const offset = (index - activeIndex + CARDS.length) % CARDS.length;
  if (offset === 0) return "hero-card-front hero-card-floating";
  if (offset === 1) return "hero-card-mid";
  if (offset === 2) return "hero-card-back";
  return "hero-card-hidden";
}

function MetricCell({
  label,
  value,
  change,
  direction,
}: {
  label: string;
  value: string;
  change: string;
  direction: "up" | "down";
}) {
  const Icon = TrendingUp;
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-black tracking-tight text-white">{value}</div>
      <div className={`mt-1 inline-flex items-center gap-1 text-[10px] font-bold ${direction === "up" ? "text-emerald-300" : "text-rose-300"}`}>
        <Icon className={`h-3 w-3 ${direction === "down" ? "rotate-180" : ""}`} />
        {change}
      </div>
    </div>
  );
}

function KpiCardBody() {
  return (
    <>
      <div className="grid grid-cols-3 gap-2.5">
        <MetricCell label="Revenue" value="$4.2M" change="12.5%" direction="up" />
        <MetricCell label="Profit" value="$1.2M" change="8.3%" direction="up" />
        <MetricCell label="Churn" value="2.1%" change="4.6%" direction="down" />
      </div>
      <svg className="mt-5 h-20 w-full" viewBox="0 0 320 78" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="kpiHeroArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M4 61 L38 54 L72 57 L106 40 L140 45 L174 27 L208 32 L242 17 L276 21 L316 9" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" />
        <path d="M4 61 L38 54 L72 57 L106 40 L140 45 L174 27 L208 32 L242 17 L276 21 L316 9 L316 78 L4 78Z" fill="url(#kpiHeroArea)" />
        <circle cx="316" cy="9" r="5" fill="#60A5FA" className="drop-shadow-[0_0_10px_rgba(96,165,250,0.9)]" />
      </svg>
    </>
  );
}

function PredictiveCardBody() {
  return (
    <>
      <div className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
        <svg className="h-16 w-16 shrink-0" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r="24"
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="150.8"
            strokeDashoffset="16"
            transform="rotate(-90 32 32)"
          />
          <text x="32" y="37" textAnchor="middle" fill="#EDE9FE" fontSize="14" fontWeight="800">
            94
          </text>
        </svg>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Decision Confidence</div>
          <div className="mt-1 text-3xl font-black tracking-tight text-white">94.8%</div>
          <div className="mt-1 text-xs font-medium text-slate-400">Alpha signal strength</div>
        </div>
      </div>
      <PredictionBar label="Revenue Growth" value="+32.4%" width="82%" />
      <PredictionBar label="Cost Reduction" value="+18.7%" width="65%" />
    </>
  );
}

function PredictionBar({ label, value, width }: { label: string; value: string; width: string }) {
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-300">
        <span>{label}</span>
        <span className="text-emerald-300">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-300 shadow-[0_0_18px_rgba(96,165,250,0.34)]" style={{ width }} />
      </div>
    </div>
  );
}

function ForecastCardBody() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Runway Stability</div>
          <div className="mt-1 text-2xl font-black text-white">
            18.4 <span className="text-sm font-semibold text-slate-400">mo</span>
          </div>
          <div className="mt-2 inline-flex rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black text-emerald-300">+35%</div>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Best Case</div>
          <div className="mt-1 text-2xl font-black text-white">+27%</div>
          <div className="mt-3 h-1.5 rounded-full bg-white/[0.07]">
            <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-blue-500 to-violet-400" />
          </div>
        </div>
      </div>
      <svg className="mt-5 h-20 w-full" viewBox="0 0 320 80" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="forecastHeroArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M4 61 L48 52 L92 57 L136 39 L180 34 L220 26" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" />
        <path d="M220 26 L252 18 L284 12 L316 8" stroke="#10B981" strokeWidth="3" strokeDasharray="7 5" strokeLinecap="round" />
        <path d="M220 26 L252 14 L284 7 L316 3 L316 18 L284 24 L252 26 L220 30Z" fill="url(#forecastHeroArea)" />
        <circle cx="220" cy="26" r="4" fill="#60A5FA" />
        <circle cx="316" cy="8" r="4" fill="#10B981" />
      </svg>
    </>
  );
}

function SecurityCardBody() {
  return (
    <>
      <div className="flex justify-center py-2">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-blue-300/25 bg-blue-500/10 shadow-[0_0_44px_rgba(37,99,235,0.24)]">
          <div className="absolute inset-[-10px] rounded-full border border-blue-300/10" />
          <ShieldCheck className="h-12 w-12 text-blue-200" strokeWidth={1.6} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {["SOC 2", "GDPR", "ISO 27001"].map((item) => (
          <div key={item} className="rounded-lg border border-blue-300/20 bg-blue-500/10 px-2 py-2 text-center text-[11px] font-black text-blue-200">
            {item}
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.035] p-3 text-xs leading-5 text-slate-300">
        Workspace-scoped access, signed uploads, verified payments, and isolated processing paths.
      </div>
    </>
  );
}

function InsightCardBody() {
  return (
    <>
      <svg className="h-28 w-full" viewBox="0 0 320 112" fill="none" aria-hidden="true">
        {[
          ["52", "24", "142", "18"],
          ["52", "24", "142", "46"],
          ["52", "56", "142", "18"],
          ["52", "56", "142", "46"],
          ["52", "88", "142", "74"],
          ["142", "18", "232", "34"],
          ["142", "46", "232", "34"],
          ["142", "46", "232", "72"],
          ["142", "74", "232", "72"],
          ["232", "34", "292", "54"],
          ["232", "72", "292", "54"],
        ].map(([x1, y1, x2, y2]) => (
          <line key={`${x1}-${y1}-${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(96,165,250,0.24)" strokeWidth="1.4" />
        ))}
        {[["52", "24"], ["52", "56"], ["52", "88"], ["142", "18"], ["142", "46"], ["142", "74"], ["232", "34"], ["232", "72"]].map(([cx, cy], index) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={index > 5 ? "7" : "6"} fill={index % 2 ? "#3B82F6" : "#8B5CF6"} />
        ))}
        <circle cx="292" cy="54" r="9" fill="#10B981" />
        <text x="292" y="58" textAnchor="middle" fill="white" fontSize="8" fontWeight="800">
          94
        </text>
      </svg>
      <div className="rounded-xl border border-violet-300/20 bg-gradient-to-br from-violet-500/12 to-blue-500/10 p-4">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-violet-200">
          <Sparkles className="h-3.5 w-3.5" />
          AI Analysis
        </div>
        <p className="text-sm leading-6 text-slate-300">
          Retention is likely to improve by <strong className="font-black text-white">18%</strong> next quarter if the churn-heavy segment receives targeted pricing support.
        </p>
      </div>
    </>
  );
}

function CardBody({ kind }: { kind: CarouselCardKind }) {
  if (kind === "kpi") return <KpiCardBody />;
  if (kind === "predictive") return <PredictiveCardBody />;
  if (kind === "forecast") return <ForecastCardBody />;
  if (kind === "security") return <SecurityCardBody />;
  return <InsightCardBody />;
}

export default function HeroInsightCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lastInteraction, setLastInteraction] = useState(() => Date.now());
  const lockRef = useRef(false);

  const activeTitle = useMemo(() => CARDS[activeIndex]?.title || CARDS[0].title, [activeIndex]);

  const move = useCallback((direction: 1 | -1) => {
    setActiveIndex((current) => (current + direction + CARDS.length) % CARDS.length);
    setLastInteraction(Date.now());
  }, []);

  const goTo = useCallback((index: number) => {
    setActiveIndex((index + CARDS.length) % CARDS.length);
    setLastInteraction(Date.now());
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % CARDS.length);
      setLastInteraction(Date.now());
    }, Math.max(1600, 4400 - (Date.now() - lastInteraction)));
    return () => window.clearTimeout(timer);
  }, [activeIndex, lastInteraction]);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let scrollAccumulator = 0;

    const handleScroll = () => {
      const nextScrollY = window.scrollY;
      const delta = nextScrollY - lastScrollY;
      lastScrollY = nextScrollY;
      scrollAccumulator += delta;

      if (Math.abs(scrollAccumulator) < 190 || lockRef.current) return;
      lockRef.current = true;
      move(scrollAccumulator > 0 ? 1 : -1);
      scrollAccumulator = 0;
      window.setTimeout(() => {
        lockRef.current = false;
      }, 680);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [move]);

  return (
    <div className="relative min-h-[520px] w-full lg:min-h-[660px]" aria-label={`Adviso AI carousel: ${activeTitle}`}>
      <div className="absolute left-[12%] top-[8%] h-[78%] w-[78%] rounded-full bg-blue-500/14 blur-3xl" />
      <div className="absolute right-[4%] top-[20%] h-52 w-52 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="hero-carousel-stage" onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("button")) return;
        move(1);
      }}>
        <div className="hero-carousel-track">
          {CARDS.map((card, index) => {
            const tone = TONE_CLASSES[card.tone];
            return (
              <article key={card.id} className={`hero-carousel-card ${cardStateClass(index, activeIndex)}`}>
                <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${tone.glow} to-transparent opacity-70`} />
                <div className="relative z-10">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]">
                      <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
                      <span className={tone.text}>{card.eyebrow}</span>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${tone.badge}`}>{card.badge}</span>
                  </div>

                  <h3 className="text-xl font-black leading-tight tracking-tight text-white">{card.title}</h3>
                  <p className="mt-2 mb-5 text-sm font-medium leading-6 text-slate-400">{card.subtitle}</p>

                  <CardBody kind={card.id} />

                  <div className="mt-5 flex items-center justify-between border-t border-white/[0.08] pt-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-500">
                    <span>
                      Powered by <span className="text-blue-300">Adviso AI</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-slate-300">
                      {card.id === "security" ? <Lock className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}
                      Live context
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="absolute bottom-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2">
          {CARDS.map((card, index) => (
            <button
              key={card.id}
              type="button"
              onClick={() => goTo(index)}
              className={`h-2.5 rounded-full transition-all duration-300 ${index === activeIndex ? "w-8 bg-blue-300 shadow-[0_0_16px_rgba(96,165,250,0.65)]" : "w-2.5 bg-slate-600 hover:bg-slate-400"}`}
              aria-label={`Show ${card.title}`}
            />
          ))}
        </div>
      </div>

      <div className="hero-carousel-profit-chip pointer-events-none absolute bottom-[10%] right-[7%] hidden rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl md:flex md:items-center md:gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-300">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Profit Squeeze</div>
          <div className="mt-1 text-sm font-black text-white">+14.8% Projected</div>
        </div>
      </div>

      <div className="hero-carousel-floating-icon pointer-events-none absolute left-[7%] top-[14%] hidden rounded-2xl border p-3 shadow-2xl backdrop-blur-xl md:block">
        <BarChart3 className="h-5 w-5" />
      </div>
      <div className="hero-carousel-floating-icon hero-carousel-floating-icon-purple pointer-events-none absolute bottom-[18%] left-[14%] hidden rounded-2xl border p-3 shadow-2xl backdrop-blur-xl lg:block">
        <BrainCircuit className="h-5 w-5" />
      </div>
      <div className="hero-carousel-floating-icon hero-carousel-floating-icon-cyan pointer-events-none absolute right-[12%] top-[12%] hidden rounded-2xl border p-3 shadow-2xl backdrop-blur-xl lg:block">
        <Cpu className="h-5 w-5" />
      </div>
      <div className="sr-only" aria-live="polite">
        Showing {activeTitle}
      </div>
    </div>
  );
}
