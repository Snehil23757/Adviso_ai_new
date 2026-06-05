import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform, useSpring, useMotionValueEvent } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { 
  SystemBootScreen, 
  ConnectedDataModule,
  AdaptiveWorkspaceModule,
  AnomalyDetectionModule,
  DeepDiveAnalyticsModule,
  ExplainableAIModule,
  SecureWorkspaceModule,
  FinalRevealModule,
  LAPTOP_STORY_COPY
} from "./DashboardModules";
import NetworkBackground from "./NetworkBackground";
import { markShowcaseViewed, shouldUseCompactShowcase } from "../lib/sessionShowcase";

const SCENE_THRESHOLDS = [0, 0.13, 0.26, 0.39, 0.51, 0.64, 0.76, 0.9] as const;
const LAPTOP_SHOWCASE_SESSION_KEY = "adviso:laptop-showcase:viewed:v1";

const LAPTOP_COMPACT_SCENES = [
  { copy: LAPTOP_STORY_COPY[0], render: () => <SystemBootScreen progress={1} /> },
  { copy: LAPTOP_STORY_COPY[1], render: () => <ConnectedDataModule /> },
  { copy: LAPTOP_STORY_COPY[2], render: () => <AdaptiveWorkspaceModule /> },
  { copy: LAPTOP_STORY_COPY[3], render: () => <AnomalyDetectionModule /> },
  { copy: LAPTOP_STORY_COPY[4], render: () => <DeepDiveAnalyticsModule /> },
  { copy: LAPTOP_STORY_COPY[5], render: () => <ExplainableAIModule /> },
  { copy: LAPTOP_STORY_COPY[6], render: () => <SecureWorkspaceModule /> },
  { copy: LAPTOP_STORY_COPY[7], render: () => <FinalRevealModule /> },
];

function sceneIndexFromProgress(progress: number) {
  let index = 0;
  for (let i = 0; i < SCENE_THRESHOLDS.length; i += 1) {
    if (progress >= SCENE_THRESHOLDS[i]) index = i;
  }
  return Math.min(index, LAPTOP_STORY_COPY.length - 1);
}

export default function LaptopScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const compactContentRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);
  const scrollSnapshotRef = useRef<{ sectionTop: number; bottomViewportY: number } | null>(null);
  const lastScrollYRef = useRef(typeof window === "undefined" ? 0 : window.scrollY);
  const [compactMode, setCompactMode] = useState(() => shouldUseCompactShowcase(LAPTOP_SHOWCASE_SESSION_KEY));
  const [preservedHeight, setPreservedHeight] = useState<number | null>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 45,
    damping: 24,
    restDelta: 0.001
  });

  // Calculate Boot Progress for Scene 1 (0 to 0.10)
  const [bootPercent, setBootPercent] = useState(0);
  const [activeScene, setActiveScene] = useState(0);

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
          markShowcaseViewed(LAPTOP_SHOWCASE_SESSION_KEY);
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
      markShowcaseViewed(LAPTOP_SHOWCASE_SESSION_KEY);
    }
  });

  useMotionValueEvent(smoothProgress, "change", (latest) => {
    // Phase 1: 0 to 0.125
    const calculated = latest / 0.10;
    setBootPercent(Math.min(1, Math.max(0, calculated)));
    const nextScene = sceneIndexFromProgress(latest);
    setActiveScene((current) => (current === nextScene ? current : nextScene));

    if (latest >= 0.985 && !completedRef.current) {
      completedRef.current = true;
      markShowcaseViewed(LAPTOP_SHOWCASE_SESSION_KEY);
    }
  });

  // STEP BY STEP ZOOM SEQUENCE (16-stage domain mapped logically to 8 sections)
  // Each section gets roughly 0.125 progress.
  const scrollDomain = [
    0, 0.08,    // 1. Boot (0 - 0.125)
    0.13, 0.22, // 2. Connected Data
    0.26, 0.35, // 3. Adaptive
    0.39, 0.47, // 4. Anomaly
    0.51, 0.60, // 5. Deep Dive
    0.64, 0.72, // 6. Explainable
    0.76, 0.84, // 7. Secure
    0.90, 1.0   // 8. Final Reveal
  ];

  // Scale laptop smoothly up to 100vw at the end.
  const laptopScale = useTransform(
    smoothProgress,
    scrollDomain,
    [0.58, 0.58, 
     0.62, 0.62, 
     0.66, 0.66, 
     0.70, 0.70, 
     0.74, 0.74, 
     0.78, 0.78, 
     0.82, 0.82, 
     0.86, 0.86]
  );

  // 8 views => track height is 800%. Each view is 12.5% step.
  const trackY = useTransform(
    smoothProgress,
    scrollDomain,
    [
      '0%', '0%', 
      '-12.5%', '-12.5%', 
      '-25%', '-25%', 
      '-37.5%', '-37.5%', 
      '-50%', '-50%', 
      '-62.5%', '-62.5%', 
      '-75%', '-75%', 
      '-87.5%', '-87.5%'
    ]
  );

  const frameOpacity = useTransform(smoothProgress, [0, 1], [1, 1]);
  const scrollHelperOpacity = useTransform(smoothProgress, [0, 0.05], [1, 0]);

  if (compactMode) {
    return (
      <div
        ref={containerRef}
        className="relative w-full bg-brand-background"
        style={preservedHeight ? { minHeight: preservedHeight } : undefined}
      >
        <div ref={compactContentRef}>
          <CompactLaptopShowcase />
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="relative w-full bg-brand-background"
      style={{ height: "880vh" }}
    >
      <div 
        className="adviso-laptop-stage sticky left-0 top-0 flex h-screen w-full select-none items-center justify-center overflow-hidden transform-gpu"
      >
        
        <NetworkBackground active={true} />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeScene}
            initial={{ opacity: 0, x: -28, filter: "blur(10px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: 24, filter: "blur(10px)" }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="adviso-laptop-copy pointer-events-none absolute left-6 top-[13%] z-40 w-[min(19rem,calc(100vw-3rem))] text-left sm:left-10 md:top-[18%] lg:left-[4vw] lg:top-[24%] xl:left-[6vw] 2xl:left-[8vw]"
          >
            <div className="adviso-laptop-copy-eyebrow mb-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#145DFF] shadow-[0_0_18px_rgba(20,93,255,0.72)]" />
              {LAPTOP_STORY_COPY[activeScene].eyebrow}
            </div>
            <h2 className="adviso-laptop-copy-title max-w-[16rem] text-3xl font-black leading-[1.02] tracking-tight sm:text-4xl lg:text-[2.9rem]">
              {LAPTOP_STORY_COPY[activeScene].title}
            </h2>
            <p className="adviso-laptop-copy-body mt-5 max-w-[17.5rem] text-sm font-semibold leading-7 sm:text-base">
              {LAPTOP_STORY_COPY[activeScene].body}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* ENTRANCE ANIMATION WRAPPER */}
        <motion.div
           initial={{ opacity: 0, y: 150 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ type: "spring", stiffness: 45, damping: 20, mass: 1.2, delay: 0.1 }}
           className="w-full h-full absolute inset-0 flex items-center justify-center"
        >
          {/* HIGH QUALITY CSS MACBOOK PRO (Fluidly Scaled without maxWidth to allow edge-to-edge) */}
          <motion.div 
            style={{ 
              scale: laptopScale
            }} 
            className="relative z-10 mx-auto aspect-[1.60] w-[min(92vw,1080px)] flex-none origin-center will-change-transform lg:ml-[26vw] lg:mr-[5vw] lg:w-[min(70vw,1320px)] xl:ml-[28vw] xl:w-[min(68vw,1420px)]" 
          >
             {/* 1. The Screen Lid (Aluminum Frame) - Fades out at the end */}
             <motion.div style={{ opacity: frameOpacity }} className="adviso-laptop-frame pointer-events-none absolute inset-0 z-20 rounded-[3%] p-[1.5%]" />
                
             {/* Embedded Camera Notch - Fades out */}
             <motion.div style={{ opacity: frameOpacity }} className="absolute top-[2%] left-1/2 -translate-x-1/2 w-[1.5%] min-w-[8px] max-w-[20px] aspect-square rounded-full bg-black z-50 flex items-center justify-center border border-white/5 shadow-inner pointer-events-none">
                <div className="w-[35%] h-[35%] rounded-full bg-blue-500/40 shadow-[0_0_4px_rgba(59,130,246,0.6)]" />
             </motion.div>

             {/* Logo Engraving Margin - Fades out */}
             <motion.div style={{ opacity: frameOpacity }} className="absolute top-[96%] left-0 w-full h-[3%] min-h-[10px] flex items-end justify-center pb-[0.5%] z-20 pointer-events-none">
                <span className="adviso-laptop-engraving text-[4px] sm:text-[6px] md:text-[8px] font-sans font-bold tracking-[0.25em]">MACBOOK PRO</span>
             </motion.div>

             {/* The Laptop Base Unit (protruding downwards) - Fades out */}
             <motion.div style={{ opacity: frameOpacity }} className="adviso-laptop-base pointer-events-none absolute left-[-2%] right-[-2%] top-[99%] z-10 flex h-[2.5%] min-h-[8px] max-h-[30px] justify-center rounded-b-[20px]">
                <div className="h-[60%] w-[12%] rounded-b-md bg-[#2d3545] shadow-[inset_0_4px_8px_rgba(0,0,0,0.4)]" />
             </motion.div>

             {/* 2. The Actual Screen Surface */}
             {/* The container uses absolute with 1.5% padding to match the frame, but when frame fades, it stays centered */}
             <div className="adviso-laptop-screen absolute bottom-[4%] left-[1.5%] right-[1.5%] top-[1.5%] z-30 overflow-hidden rounded-[1.5%]">
                    
                  {/* The Seamless Vertical Sliding Track that holds all 8 logical sub-views */}
                  <motion.div 
                      style={{ y: trackY }} 
                      className="w-full h-[800%] absolute top-0 left-0 flex flex-col will-change-transform"
                  >
                      {/* VIEW 1: System Boot */}
                      <div className="w-full h-[12.5%] relative overflow-hidden bg-[#02040a]">
                          <SystemBootScreen progress={bootPercent} />
                      </div>
                      
                      {/* VIEW 2: One Workspace. All Your Business Data. */}
                      <div className="w-full h-[12.5%] relative overflow-hidden bg-[#02040a]">
                          <ConnectedDataModule />
                      </div>
                      
                      {/* VIEW 3: Your Workspace Adapts To You. */}
                      <div className="w-full h-[12.5%] relative overflow-hidden bg-[#02040a]">
                          <AdaptiveWorkspaceModule />
                      </div>
                      
                      {/* VIEW 4: AI Finds What Humans Miss. */}
                      <div className="w-full h-[12.5%] relative overflow-hidden bg-[#02040a]">
                          <AnomalyDetectionModule />
                      </div>

                      {/* VIEW 5: Deep Dive Analytics. */}
                      <div className="w-full h-[12.5%] relative overflow-hidden bg-[#02040a]">
                          <DeepDiveAnalyticsModule />
                      </div>

                      {/* VIEW 6: Decisions Backed By Explainable AI. */}
                      <div className="w-full h-[12.5%] relative overflow-hidden bg-[#02040a]">
                          <ExplainableAIModule />
                      </div>

                      {/* VIEW 7: Secure Personal Intelligence Workspace. */}
                      <div className="w-full h-[12.5%] relative overflow-hidden bg-[#02040a]">
                          <SecureWorkspaceModule />
                      </div>

                      {/* VIEW 8: Final Takeover & Launch */}
                      <div className="w-full h-[12.5%] relative overflow-hidden bg-[#02040a]">
                          <FinalRevealModule />
                      </div>
                  </motion.div>
                  
                  {/* Ambient subtle screen grid overlapping all elements */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none mix-blend-overlay" />
                  
                  {/* Front angled glare overlay */}
                  <motion.div style={{ opacity: frameOpacity }} className="absolute -inset-[150%] bg-gradient-to-br from-white/[0.04] to-transparent rotate-[-20deg] pointer-events-none -translate-y-[45%] mix-blend-screen" />
             </div>
          </motion.div>
        
        </motion.div>

        {/* Global Scroll Direction Helper */}
        <motion.div 
           style={{ opacity: scrollHelperOpacity }}
           className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none"
        >
          <span className="text-zinc-500 text-[10px] font-mono animate-pulse uppercase tracking-[0.2em]">Scroll To Activate</span>
          <div className="w-px h-10 bg-gradient-to-b from-blue-500 to-transparent animate-bounce" />
        </motion.div>

      </div>
    </div>
  );
}

function CompactLaptopShowcase() {
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const activeScene = LAPTOP_COMPACT_SCENES[active];

  const goTo = useCallback((next: number) => {
    setActive((next + LAPTOP_COMPACT_SCENES.length) % LAPTOP_COMPACT_SCENES.length);
  }, []);

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const previous = useCallback(() => goTo(active - 1), [active, goTo]);

  useEffect(() => {
    if (isPaused) return undefined;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % LAPTOP_COMPACT_SCENES.length);
    }, 4400);
    return () => window.clearInterval(timer);
  }, [isPaused]);

  return (
    <section
      className="adviso-laptop-stage relative isolate flex min-h-[92vh] items-center overflow-hidden px-6 py-24 md:px-12 lg:px-16"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <NetworkBackground active />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_62%_36%,rgba(20,93,255,0.18),transparent_34%),linear-gradient(180deg,transparent_0%,rgba(2,4,10,0.18)_100%)]" />

      <div className="relative z-10 mx-auto grid w-full max-w-[82rem] items-center gap-10 lg:grid-cols-[0.82fr_1.18fr]">
        <motion.div
          initial={{ opacity: 0, y: 22, filter: "blur(12px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl"
        >
          <div className="adviso-laptop-copy-eyebrow mb-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#145DFF] shadow-[0_0_18px_rgba(20,93,255,0.72)]" />
            Product Walkthrough
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeScene.copy.title}
              initial={{ opacity: 0, y: 18, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -14, filter: "blur(10px)" }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="adviso-laptop-copy-eyebrow mb-4 text-[10px] font-black uppercase tracking-[0.22em]">
                {activeScene.copy.eyebrow}
              </p>
              <h2 className="adviso-laptop-copy-title text-4xl font-black leading-[1.03] tracking-tight md:text-5xl">
                {activeScene.copy.title}
              </h2>
              <p className="adviso-laptop-copy-body mt-5 text-base font-semibold leading-7 md:text-lg">
                {activeScene.copy.body}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={previous}
              className="grid h-11 w-11 place-items-center rounded-full border border-brand-border bg-brand-surface/80 text-brand-text-primary shadow-sm transition hover:border-brand-primary/35 hover:text-brand-primary"
              aria-label="Previous laptop showcase screen"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={next}
              className="grid h-11 w-11 place-items-center rounded-full border border-brand-border bg-brand-surface/80 text-brand-text-primary shadow-sm transition hover:border-brand-primary/35 hover:text-brand-primary"
              aria-label="Next laptop showcase screen"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
            <div className="ml-2 flex items-center gap-2">
              {LAPTOP_COMPACT_SCENES.map((scene, index) => (
                <button
                  key={scene.copy.title}
                  type="button"
                  onClick={() => goTo(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    index === active ? "w-9 bg-[#145DFF] shadow-[0_0_18px_rgba(20,93,255,0.42)]" : "w-2.5 bg-brand-text-secondary/35 hover:bg-brand-primary/55"
                  }`}
                  aria-label={`Show ${scene.copy.eyebrow}`}
                />
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 24 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="absolute inset-8 rounded-[2.5rem] bg-brand-primary/20 blur-[80px]" />
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.x < -45) next();
              if (info.offset.x > 45) previous();
            }}
            className="relative mx-auto aspect-[1.6] w-full max-w-[760px] cursor-grab active:cursor-grabbing"
          >
            <div className="adviso-laptop-frame pointer-events-none absolute inset-0 z-20 rounded-[3%]" />
            <div className="absolute left-[1.5%] right-[1.5%] top-[1.5%] bottom-[4%] z-30 overflow-hidden rounded-[1.5%]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  className="adviso-laptop-screen absolute inset-0 overflow-hidden"
                  initial={{ opacity: 0, x: 42, scale: 1.015 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -42, scale: 0.985 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  {activeScene.render()}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="adviso-laptop-base pointer-events-none absolute left-[-2%] right-[-2%] top-[99%] z-10 flex h-[2.5%] min-h-[8px] max-h-[24px] justify-center rounded-b-[20px]">
              <div className="h-[60%] w-[12%] rounded-b-md bg-[#2d3545] shadow-[inset_0_4px_8px_rgba(0,0,0,0.4)]" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
