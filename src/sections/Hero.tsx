import React, { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

import HeroInsightCarousel from "./HeroInsightCarousel";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

function TypewriterPhrase() {
  const phrase = "Strategic Decisions";
  const [visibleChars, setVisibleChars] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const isComplete = visibleChars === phrase.length;
    const isEmpty = visibleChars === 0;
    const delay = deleting ? 34 : isComplete ? 1650 : isEmpty ? 260 : 68;

    const timer = window.setTimeout(() => {
      if (!deleting && isComplete) {
        setDeleting(true);
        return;
      }
      if (deleting && isEmpty) {
        setDeleting(false);
        return;
      }
      setVisibleChars((current) => current + (deleting ? -1 : 1));
    }, delay);

    return () => window.clearTimeout(timer);
  }, [deleting, visibleChars]);

  return (
    <span
      className="adviso-hero-typewriter mt-1 block min-h-[1.08em] whitespace-nowrap bg-gradient-to-r from-[#5b7fff] via-[#3b82f6] to-[#2563eb] bg-clip-text text-[clamp(2.65rem,4.7vw,4.65rem)] leading-[1.02] text-transparent xl:text-[4.85rem]"
      aria-label={phrase}
    >
      <span aria-hidden="true">{phrase.slice(0, visibleChars)}</span>
      <span aria-hidden="true" className="ml-1 inline-block h-[0.82em] w-[3px] translate-y-[0.08em] animate-pulse rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.7)]" />
    </span>
  );
}

export default function Hero() {
  const scrollToPortal = () => {
    const portal = document.getElementById("pricing");
    if (!portal) return;
    const offset = 96;
    const pos = portal.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: pos - offset, behavior: "smooth" });
  };

  const scrollToPlatform = () => {
    const platform = document.getElementById("platform-overview") || document.getElementById("core-features");
    if (!platform) return;
    const offset = 96;
    const pos = platform.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: pos - offset, behavior: "smooth" });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.14,
        delayChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 28, filter: "blur(8px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.82, ease: EASE_OUT },
    },
  };

  return (
    <section className="adviso-hero relative flex min-h-screen items-center overflow-hidden px-0 pb-20 pt-36 lg:pt-40">
      <motion.div
        className="adviso-hero-grid absolute inset-0"
        animate={{ backgroundPosition: ["0px 0px", "34px 34px"] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />
      <div className="adviso-hero-glow-one absolute left-[-12%] top-[-18%] h-[620px] w-[620px] rounded-full blur-[140px]" />
      <div className="adviso-hero-glow-two absolute bottom-[-18%] right-[-10%] h-[680px] w-[760px] rounded-full blur-[150px]" />
      <motion.div
        className="adviso-hero-light-ray absolute inset-x-0 top-0 h-[420px]"
        animate={{ x: ["-16%", "12%", "-16%"], opacity: [0.2, 0.34, 0.2] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 mx-auto grid w-full max-w-[2000px] grid-cols-1 items-center gap-10 px-6 md:px-12 lg:grid-cols-12 lg:gap-12 xl:px-24">
        <motion.div
          className="max-w-4xl text-left lg:col-span-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="space-y-6" variants={itemVariants}>
            <h1 className="adviso-hero-heading text-[clamp(2.8rem,6.2vw,5rem)] font-black leading-[0.98] tracking-tight xl:text-[5.15rem]">
              Turn Business Data Into
              <TypewriterPhrase />
            </h1>
            <p className="adviso-hero-copy max-w-xl text-base font-medium leading-8 sm:text-lg">
              Adviso AI helps startups, enterprise founders, and operational analysts transform scattered data into explainable AI-driven recommendations and actionable business intelligence.
            </p>
          </motion.div>

          <motion.div className="mt-10 flex flex-col gap-4 sm:flex-row" variants={itemVariants}>
            <motion.button
              onClick={scrollToPortal}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              className="adviso-hero-primary-cta group inline-flex items-center justify-center gap-2 rounded-xl px-7 py-4 text-sm font-black shadow-[0_22px_50px_rgba(59,130,246,0.26)] transition"
            >
              Request Demo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </motion.button>

            <motion.button
              onClick={scrollToPlatform}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              className="adviso-hero-secondary-cta inline-flex items-center justify-center rounded-xl border px-7 py-4 text-sm font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition"
            >
              Explore Platform
            </motion.button>
          </motion.div>

          <motion.div className="adviso-hero-feature-grid mt-12 grid max-w-2xl grid-cols-2 gap-5 border-t pt-8" variants={itemVariants}>
            {[
              { title: "Explainable AI", desc: "Open, auditable algorithms" },
              { title: "Real-time Insights", desc: "Constant stream analysis" },
              { title: "Decision Intelligence", desc: "Strategic operational modeling" },
              { title: "Scenario Simulation", desc: "Interactive cash runways" },
            ].map((item) => (
              <div key={item.title} className="adviso-hero-feature group flex items-start gap-3">
                <div className="adviso-hero-feature-icon mt-0.5 rounded-lg border p-1.5 transition">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="adviso-hero-feature-title text-sm font-black">{item.title}</h3>
                  <p className="adviso-hero-feature-desc mt-1 text-xs font-medium">{item.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          className="relative lg:col-span-6"
          initial={{ opacity: 0, x: 56, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.95, ease: EASE_OUT, delay: 0.18 }}
        >
          <HeroInsightCarousel />
        </motion.div>
      </div>
    </section>
  );
}
