import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform, useSpring, useMotionValueEvent, type MotionValue } from "motion/react";
import { ArrowLeft, ArrowRight, CheckCircle2, Zap } from "lucide-react";

import aiNetworkOrbit from "../../assets/images/website/ai_network_orbit.webp";
import aiBusinessCards from "../../assets/images/website/ai_business_cards.webp";
import aiRevenueAlert from "../../assets/images/website/ai_revenue_alert.webp";
import { markShowcaseViewed, shouldUseCompactShowcase } from "../../lib/sessionShowcase";

const PROFILE_SHOWCASE_SESSION_KEY = "adviso:profiles-showcase:viewed:v1";

const PROFILE_SCENES = [
  {
    image: aiNetworkOrbit,
    headline: "Connect Every Operational Signal.",
    subtext:
      "Adviso turns scattered data sources into one connected operating picture, helping growing teams understand what is changing and where attention is needed.",
    insights: ["Connected operating context", "Live data relationships", "Cleaner decision paths", "Less manual coordination"],
    labels: ["CONNECTED DATA", "LIVE CONTEXT", "OPERATIONS READY"],
    mediaAlt: "Connected AI intelligence network",
    overlayColor: "from-[#02040a] via-[#02040a]/72 to-[#02040a]",
    ambientColor: "bg-blue-500/10",
  },
  {
    image: aiBusinessCards,
    headline: "Turn Business Activity Into Momentum.",
    subtext:
      "Track commercial signals, customer behavior, product movement, and financial levers through a workspace that stays aligned with how your team operates.",
    insights: ["Revenue and margin visibility", "Customer and product context", "Role-aware workspaces", "Growth opportunity tracking"],
    labels: ["BUSINESS SIGNALS", "GROWTH CONTEXT", "AI WORKSPACE"],
    mediaAlt: "Business intelligence cards connected by a blue signal path",
    overlayColor: "from-[#02040a] via-[#02040a]/78 to-[#02040a]",
    ambientColor: "bg-indigo-500/10",
  },
  {
    image: aiRevenueAlert,
    headline: "See Risk Before It Reaches The Dashboard.",
    subtext:
      "Adviso highlights anomalies, revenue pressure, and operational drift early, so founders and operators can correct issues before they become expensive.",
    insights: ["Early warning signals", "Explainable recommendations", "Impact-aware prioritization", "Faster operational correction"],
    labels: ["RISK DETECTED", "ACTION READY", "FORECAST CONTEXT"],
    mediaAlt: "Revenue alert prediction card on a deep blue interface",
    overlayColor: "from-[#02040a] via-[#02040a]/82 to-[#02040a]",
    ambientColor: "bg-[#145DFF]/10",
  },
  {
    image: aiNetworkOrbit,
    headline: "Built For Teams That Need Clear Answers.",
    subtext:
      "From MSMEs to startup founders and analysts, Adviso gives every decision-maker the context, confidence, and next steps they need in one workspace.",
    insights: ["Team-ready intelligence", "Reusable reports", "Workspace memory", "Secure business context"],
    labels: ["TEAM INTELLIGENCE", "CLEAR ANSWERS", "SECURE CONTEXT"],
    mediaAlt: "AI intelligence core connected to business data systems",
    overlayColor: "from-[#02040a] via-[#02040a]/76 to-[#02040a]",
    ambientColor: "bg-blue-500/10",
  },
];

export default function CinematicProfilesScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const compactContentRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);
  const scrollSnapshotRef = useRef<{ sectionTop: number; bottomViewportY: number } | null>(null);
  const lastScrollYRef = useRef(typeof window === "undefined" ? 0 : window.scrollY);
  const [compactMode, setCompactMode] = useState(() => shouldUseCompactShowcase(PROFILE_SHOWCASE_SESSION_KEY));
  const [preservedHeight, setPreservedHeight] = useState<number | null>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 30,
    damping: 20,
    restDelta: 0.001,
  });

  const activateCompactMode = useCallback(() => {
    if (compactMode || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const sectionTop = rect.top + window.scrollY;
    scrollSnapshotRef.current = {
      sectionTop,
      bottomViewportY: Math.max(80, Math.min(window.innerHeight * 0.9, rect.bottom)),
    };
    setPreservedHeight(rect.height);
    setCompactMode(true);
  }, [compactMode]);

  useLayoutEffect(() => {
    if (!compactMode || !containerRef.current || !scrollSnapshotRef.current) return;

    const { sectionTop, bottomViewportY } = scrollSnapshotRef.current;
    const newHeight = compactContentRef.current?.getBoundingClientRect().height || containerRef.current.getBoundingClientRect().height;
    scrollSnapshotRef.current = null;
    const nextScrollTop = Math.max(0, sectionTop + newHeight - bottomViewportY);
    window.scrollTo({ top: nextScrollTop, left: window.scrollX, behavior: "auto" });
    const frame = window.requestAnimationFrame(() => {
      setPreservedHeight(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [compactMode]);

  useEffect(() => {
    if (compactMode || !containerRef.current) return undefined;

    const section = containerRef.current;
    const checkPassedSection = () => {
      const currentScrollY = window.scrollY;
      const isScrollingUp = currentScrollY < lastScrollYRef.current;
      lastScrollYRef.current = currentScrollY;
      const rect = section.getBoundingClientRect();
      if (rect.bottom <= window.innerHeight * 0.9) {
        if (!completedRef.current) {
          completedRef.current = true;
          markShowcaseViewed(PROFILE_SHOWCASE_SESSION_KEY);
        }
        return;
      }

      if (isScrollingUp && completedRef.current && rect.bottom > 0 && rect.top < window.innerHeight) {
        activateCompactMode();
      }
    };

    window.addEventListener("scroll", checkPassedSection, { passive: true });
    window.addEventListener("resize", checkPassedSection);
    checkPassedSection();

    return () => {
      window.removeEventListener("scroll", checkPassedSection);
      window.removeEventListener("resize", checkPassedSection);
    };
  }, [activateCompactMode, compactMode]);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest >= 0.96 && !completedRef.current) {
      completedRef.current = true;
      markShowcaseViewed(PROFILE_SHOWCASE_SESSION_KEY);
    }
  });

  useMotionValueEvent(smoothProgress, "change", (latest) => {
    if (latest >= 0.985 && !completedRef.current) {
      completedRef.current = true;
      markShowcaseViewed(PROFILE_SHOWCASE_SESSION_KEY);
    }
  });

  const o1 = useTransform(smoothProgress, [0, 0.15, 0.25], [1, 1, 0]);
  const y1 = useTransform(smoothProgress, [0, 0.15, 0.25], [0, 0, -100]);
  const s1 = useTransform(smoothProgress, [0, 0.25], [1, 1.12]);

  const o2 = useTransform(smoothProgress, [0.15, 0.25, 0.35, 0.45], [0, 1, 1, 0]);
  const y2 = useTransform(smoothProgress, [0.15, 0.25, 0.35, 0.45], [100, 0, 0, -100]);
  const s2 = useTransform(smoothProgress, [0.15, 0.45], [1, 1.12]);

  const o3 = useTransform(smoothProgress, [0.35, 0.45, 0.55, 0.65], [0, 1, 1, 0]);
  const y3 = useTransform(smoothProgress, [0.35, 0.45, 0.55, 0.65], [100, 0, 0, -100]);
  const s3 = useTransform(smoothProgress, [0.35, 0.65], [1, 1.12]);

  const o4 = useTransform(smoothProgress, [0.55, 0.68, 1], [0, 1, 1]);
  const y4 = useTransform(smoothProgress, [0.55, 0.68, 1], [100, 0, 0]);
  const s4 = useTransform(smoothProgress, [0.55, 1], [1, 1.1]);

  if (compactMode) {
    return (
      <div
        ref={containerRef}
        className="relative w-full bg-[#02040a]"
        style={preservedHeight ? { minHeight: preservedHeight } : undefined}
      >
        <div ref={compactContentRef}>
          <CompactProfilesShowcase />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full bg-[#02040a]" style={{ height: "460vh" }}>
      <div className="sticky left-0 top-0 h-screen w-full overflow-hidden bg-[#02040a]">
        <motion.div style={{ opacity: o1 }} className="absolute inset-0 origin-center will-change-transform">
          <ProfileBackground
            imageUrl={aiNetworkOrbit}
            overlayColor="from-[#02040a] via-[#02040a]/72 to-[#02040a]"
            scale={s1}
            ambientColor="bg-blue-500/10"
          />
          <ProfileContent
            headline="Connect Every Operational Signal."
            subtext="Adviso turns scattered data sources into one connected operating picture, helping growing teams understand what is changing and where attention is needed."
            insights={[
              "Connected operating context",
              "Live data relationships",
              "Cleaner decision paths",
              "Less manual coordination",
            ]}
            labels={["CONNECTED DATA", "LIVE CONTEXT", "OPERATIONS READY"]}
            mediaImage={aiNetworkOrbit}
            mediaAlt="Connected AI intelligence network"
            y={y1}
          />
        </motion.div>

        <motion.div style={{ opacity: o2 }} className="absolute inset-0 origin-center will-change-transform">
          <ProfileBackground
            imageUrl={aiBusinessCards}
            overlayColor="from-[#02040a] via-[#02040a]/78 to-[#02040a]"
            scale={s2}
            ambientColor="bg-indigo-500/10"
          />
          <ProfileContent
            headline="Turn Business Activity Into Momentum."
            subtext="Track commercial signals, customer behavior, product movement, and financial levers through a workspace that stays aligned with how your team operates."
            insights={[
              "Revenue and margin visibility",
              "Customer and product context",
              "Role-aware workspaces",
              "Growth opportunity tracking",
            ]}
            labels={["BUSINESS SIGNALS", "GROWTH CONTEXT", "AI WORKSPACE"]}
            mediaImage={aiBusinessCards}
            mediaAlt="Business intelligence cards connected by a blue signal path"
            y={y2}
          />
        </motion.div>

        <motion.div style={{ opacity: o3 }} className="absolute inset-0 origin-center will-change-transform">
          <ProfileBackground
            imageUrl={aiRevenueAlert}
            overlayColor="from-[#02040a] via-[#02040a]/82 to-[#02040a]"
            scale={s3}
            ambientColor="bg-[#145DFF]/10"
          />
          <ProfileContent
            headline="See Risk Before It Reaches The Dashboard."
            subtext="Adviso highlights anomalies, revenue pressure, and operational drift early, so founders and operators can correct issues before they become expensive."
            insights={[
              "Early warning signals",
              "Explainable recommendations",
              "Impact-aware prioritization",
              "Faster operational correction",
            ]}
            labels={["RISK DETECTED", "ACTION READY", "FORECAST CONTEXT"]}
            mediaImage={aiRevenueAlert}
            mediaAlt="Revenue alert prediction card on a deep blue interface"
            y={y3}
          />
        </motion.div>

        <motion.div style={{ opacity: o4 }} className="absolute inset-0 origin-center will-change-transform">
          <ProfileBackground
            imageUrl={aiNetworkOrbit}
            overlayColor="from-[#02040a] via-[#02040a]/76 to-[#02040a]"
            scale={s4}
            ambientColor="bg-blue-500/10"
          />
          <ProfileContent
            headline="Built For Teams That Need Clear Answers."
            subtext="From MSMEs to startup founders and analysts, Adviso gives every decision-maker the context, confidence, and next steps they need in one workspace."
            insights={[
              "Team-ready intelligence",
              "Reusable reports",
              "Workspace memory",
              "Secure business context",
            ]}
            labels={["TEAM INTELLIGENCE", "CLEAR ANSWERS", "SECURE CONTEXT"]}
            mediaImage={aiNetworkOrbit}
            mediaAlt="AI intelligence core connected to business data systems"
            y={y4}
          />
        </motion.div>
      </div>
    </div>
  );
}

function CompactProfilesShowcase() {
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const scene = PROFILE_SCENES[active];

  const goTo = useCallback((next: number) => {
    setActive((next + PROFILE_SCENES.length) % PROFILE_SCENES.length);
  }, []);

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const previous = useCallback(() => goTo(active - 1), [active, goTo]);

  useEffect(() => {
    if (isPaused) return undefined;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % PROFILE_SCENES.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [isPaused]);

  return (
    <section
      className="relative isolate overflow-hidden bg-[#02040a] px-6 py-24 md:px-12 lg:px-16"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={scene.headline}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="absolute inset-0 overflow-hidden bg-[#02040a]">
            <img src={scene.image} alt="" className="h-full w-full object-cover opacity-[0.26] blur-[1px] saturate-125" loading="lazy" decoding="async" />
          </div>
          <div className={`absolute inset-0 bg-gradient-to-r ${scene.overlayColor} opacity-95`} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-transparent to-[#02040a] opacity-85" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 mx-auto grid w-full max-w-[82rem] items-center gap-10 lg:grid-cols-[0.92fr_1.08fr]">
        <motion.div
          initial={{ opacity: 0, y: 22, filter: "blur(12px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mb-7 flex flex-wrap gap-2">
            {scene.labels.map((label, idx) => (
              <button
                key={label}
                type="button"
                onClick={() => goTo(idx < PROFILE_SCENES.length ? idx : active)}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-left transition hover:border-[#145DFF]/45"
              >
                {idx === 0 ? <Zap className="h-3 w-3 animate-pulse text-[#7D95FF]" /> : <div className="h-1.5 w-1.5 rounded-full bg-slate-500" />}
                <span className="text-[10px] font-mono tracking-wider text-slate-300">{label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={scene.headline}
              initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -16, filter: "blur(10px)" }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="max-w-2xl text-4xl font-black leading-[1.05] tracking-tight text-white drop-shadow-2xl md:text-5xl lg:text-6xl">
                {scene.headline}
              </h2>
              <p className="mt-7 max-w-2xl text-lg leading-relaxed text-slate-300 drop-shadow-lg md:text-xl">
                {scene.subtext}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-9 flex items-center gap-3">
            <button
              type="button"
              onClick={previous}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white transition hover:border-[#145DFF]/45 hover:text-[#7D95FF]"
              aria-label="Previous feature story"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={next}
              className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white transition hover:border-[#145DFF]/45 hover:text-[#7D95FF]"
              aria-label="Next feature story"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
            <div className="ml-2 flex items-center gap-2">
              {PROFILE_SCENES.map((item, index) => (
                <button
                  key={item.headline}
                  type="button"
                  onClick={() => goTo(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    index === active ? "w-9 bg-[#145DFF] shadow-[0_0_18px_rgba(20,93,255,0.42)]" : "w-2.5 bg-white/25 hover:bg-white/45"
                  }`}
                  aria-label={`Show ${item.headline}`}
                />
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 24 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragEnd={(_, info) => {
            if (info.offset.x < -45) next();
            if (info.offset.x > 45) previous();
          }}
          className="group relative min-h-[420px] cursor-grab active:cursor-grabbing"
        >
          <div className="absolute inset-10 rounded-[2.5rem] bg-[#145DFF]/18 blur-[82px]" />
          <AnimatePresence mode="wait">
            <motion.div
              key={scene.mediaAlt}
              className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-[2rem] border border-[#145DFF]/24 bg-[#020817]/70 p-2 shadow-[0_40px_130px_rgba(0,0,0,0.62),0_0_90px_rgba(20,93,255,0.14)] backdrop-blur-sm"
              initial={{ opacity: 0, x: 44, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -44, scale: 0.98 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <img
                src={scene.image}
                alt={scene.mediaAlt}
                className="relative z-10 h-full min-h-[400px] w-full rounded-[1.45rem] object-cover opacity-95 saturate-125 transition-transform duration-700 group-hover:scale-[1.02]"
                loading="lazy"
                decoding="async"
              />
              <div className="pointer-events-none absolute inset-2 rounded-[1.45rem] ring-1 ring-white/10" />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}

function ProfileBackground({
  imageUrl,
  overlayColor,
  scale,
  ambientColor,
}: {
  imageUrl: string;
  overlayColor: string;
  scale: MotionValue<number>;
  ambientColor: string;
}) {
  return (
    <>
      <div className="absolute inset-0 overflow-hidden bg-[#02040a]">
        <motion.img
          style={{ scale }}
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover opacity-[0.38] blur-[1px] saturate-125"
        />
      </div>
      <div className={`absolute inset-0 bg-gradient-to-r ${overlayColor} opacity-95`} />
      <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-transparent to-[#02040a] opacity-80" />
      <div className={`absolute inset-0 ${ambientColor} mix-blend-screen opacity-55`} />
    </>
  );
}

function ProfileContent({
  headline,
  subtext,
  insights,
  labels,
  mediaImage,
  mediaAlt,
  y,
}: {
  headline: string;
  subtext: string;
  insights: string[];
  labels: string[];
  mediaImage: string;
  mediaAlt: string;
  y: MotionValue<number>;
}) {
  return (
    <div className="absolute inset-0 flex items-center">
      <div className="relative z-10 mx-auto grid h-full w-full max-w-[90rem] grid-cols-1 gap-12 px-6 py-28 md:px-12 lg:grid-cols-12 lg:gap-20">
        <motion.div style={{ y }} className="flex h-full flex-col justify-center lg:col-span-6">
          <div className="mb-8 flex flex-wrap gap-2">
            {labels.map((label, idx) => (
              <div key={label} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                {idx === 0 ? (
                  <Zap className="h-3 w-3 animate-pulse text-[#7D95FF]" />
                ) : (
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                )}
                <span className="text-[10px] font-mono tracking-wider text-slate-300">{label}</span>
              </div>
            ))}
          </div>

          <h2 className="mb-8 text-4xl font-black leading-[1.05] tracking-tight text-white drop-shadow-2xl md:text-5xl lg:text-6xl">
            {headline}
          </h2>

          <p className="mb-12 max-w-2xl text-lg leading-relaxed text-slate-300 drop-shadow-lg md:text-xl">
            {subtext}
          </p>

          <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            {insights.map((insight) => (
              <div key={insight} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#7D95FF]" />
                <span className="text-sm leading-tight text-slate-300">{insight}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div style={{ y }} className="relative flex h-full min-h-[420px] items-center justify-center lg:col-span-6">
          <div className="group relative flex h-[78%] w-full items-center justify-center overflow-hidden rounded-[2rem] border border-[#145DFF]/24 bg-[#020817]/70 p-2 shadow-[0_40px_130px_rgba(0,0,0,0.62),0_0_90px_rgba(20,93,255,0.14)] backdrop-blur-sm">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_25%,rgba(20,93,255,0.12),transparent_42%),linear-gradient(135deg,rgba(11,63,204,0.1),transparent_58%)]" />
            <motion.img
              src={mediaImage}
              alt={mediaAlt}
              className="relative z-10 h-full w-full rounded-[1.45rem] object-cover opacity-95 saturate-125 transition-transform duration-700 group-hover:scale-[1.02]"
              loading="lazy"
              decoding="async"
            />
            <div className="pointer-events-none absolute inset-2 rounded-[1.45rem] ring-1 ring-white/10" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
