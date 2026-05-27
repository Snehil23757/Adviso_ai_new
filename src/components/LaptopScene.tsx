import { useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform, useSpring, useMotionValueEvent } from "motion/react";
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

const SCENE_THRESHOLDS = [0, 0.13, 0.26, 0.39, 0.51, 0.64, 0.76, 0.9] as const;

function sceneIndexFromProgress(progress: number) {
  let index = 0;
  for (let i = 0; i < SCENE_THRESHOLDS.length; i += 1) {
    if (progress >= SCENE_THRESHOLDS[i]) index = i;
  }
  return Math.min(index, LAPTOP_STORY_COPY.length - 1);
}

export default function LaptopScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  
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
  useMotionValueEvent(smoothProgress, "change", (latest) => {
    // Phase 1: 0 to 0.125
    const calculated = latest / 0.10;
    setBootPercent(Math.min(1, Math.max(0, calculated)));
    const nextScene = sceneIndexFromProgress(latest);
    setActiveScene((current) => (current === nextScene ? current : nextScene));
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
              <span className="h-1.5 w-1.5 rounded-full bg-[#20D7FF] shadow-[0_0_18px_rgba(32,215,255,0.9)]" />
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
                <span className="text-white/20 text-[4px] sm:text-[6px] md:text-[8px] font-sans font-bold tracking-[0.25em]">MACBOOK PRO</span>
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
           style={{ opacity: useTransform(smoothProgress, [0, 0.05], [1, 0]) }}
           className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none"
        >
          <span className="text-zinc-500 text-[10px] font-mono animate-pulse uppercase tracking-[0.2em]">Scroll To Activate</span>
          <div className="w-px h-10 bg-gradient-to-b from-blue-500 to-transparent animate-bounce" />
        </motion.div>

      </div>
    </div>
  );
}
