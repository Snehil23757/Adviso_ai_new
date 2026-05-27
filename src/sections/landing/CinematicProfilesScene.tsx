import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring, type MotionValue } from "motion/react";
import { CheckCircle2, Zap } from "lucide-react";

import aiNetworkOrbit from "../../assets/images/website/ai_network_orbit.webp";
import aiBusinessCards from "../../assets/images/website/ai_business_cards.webp";
import aiRevenueAlert from "../../assets/images/website/ai_revenue_alert.webp";

export default function CinematicProfilesScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 30,
    damping: 20,
    restDelta: 0.001,
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
