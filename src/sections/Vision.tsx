import React from "react";
import { motion } from "motion/react";

export default function Vision() {
  return (
    <section id="vision" className="relative overflow-hidden border-t border-brand-border bg-brand-background py-28 text-brand-text-primary">
      <div className="absolute inset-0 subtle-grid opacity-10 pointer-events-none" />
      <div className="absolute left-0 top-10 z-0 hidden h-[86%] w-20 rounded-r-[2.5rem] bg-gradient-to-b from-brand-primary to-[#0B3FCC] shadow-2xl shadow-brand-primary/15 md:block" />
      <div className="absolute right-[-18%] top-[18%] h-[520px] w-[520px] rounded-full bg-brand-primary/10 blur-[150px]" />
      <div className="absolute bottom-[-22%] left-[18%] h-[420px] w-[420px] rounded-full bg-cyan-400/10 blur-[130px]" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center md:px-12 xl:px-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="mb-24"
        >
          <div className="mx-auto mb-6 h-16 w-px rounded-full bg-brand-primary/30" />
          <h2 className="relative mb-12 inline-block text-4xl font-light uppercase tracking-[0.18em] text-brand-text-secondary/35 md:text-5xl">
            Our <span className="text-brand-text-secondary/55">vision</span>
            <span className="absolute left-1/2 -bottom-2 -translate-x-1/2 whitespace-nowrap text-xs font-black uppercase tracking-[0.3em] text-brand-primary">
              Our Vision
            </span>
          </h2>

          <div className="relative mx-auto max-w-3xl">
            <span className="absolute -left-4 -top-10 select-none font-serif text-7xl leading-none text-brand-primary/10">"</span>
            <p className="relative z-10 text-xl font-semibold italic leading-snug text-brand-text-primary md:text-3xl">
              To be the leading technology intelligence partner in the region for fostering operational clarity and facilitating the growth of data-first business ecosystems.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-24"
        >
          <div className="mx-auto mb-6 h-16 w-px rounded-full bg-brand-primary/30" />
          <h3 className="relative mb-12 inline-block text-4xl font-light uppercase tracking-[0.18em] text-brand-text-secondary/35 md:text-5xl">
            Our <span className="text-brand-text-secondary/55">missions</span>
            <span className="absolute left-1/2 -bottom-2 -translate-x-1/2 whitespace-nowrap text-xs font-black uppercase tracking-[0.3em] text-brand-primary">
              Our Missions
            </span>
          </h3>

          <p className="mx-auto mb-16 max-w-2xl text-sm leading-7 text-brand-text-secondary md:text-base">
            We aspire to be the biggest supporters of fast-moving teams! With our advanced AI technology and a strong <strong>can-do</strong> strategic spirit, here are three things to which we are wholeheartedly committed:
          </p>

          <div className="flex flex-col items-center justify-center -space-y-4 md:flex-row md:-space-x-8 md:space-y-0">
            <div className="z-10 flex h-48 w-48 items-center justify-center rounded-full border border-brand-border bg-brand-surface p-6 text-center shadow-[0_0_44px_rgba(20,93,255,0.08)] transition duration-300 hover:scale-105">
              <p className="text-sm font-semibold text-brand-text-primary">
                Getting businesses to <br />
                <span className="font-black text-brand-primary">move faster</span> by
              </p>
            </div>

            <div className="relative z-20 flex h-56 w-56 items-center justify-center rounded-full border border-brand-border bg-brand-surface p-8 text-center shadow-[0_0_54px_rgba(20,93,255,0.12)] transition duration-300 hover:scale-105">
              <p className="text-sm font-semibold tracking-tight text-brand-text-primary">
                Connecting <span className="font-black text-brand-primary">more data, founders, and ecosystems</span> with our technology
              </p>
            </div>

            <div className="z-10 flex h-48 w-48 items-center justify-center rounded-full border border-brand-primary bg-brand-primary p-6 text-center text-white shadow-xl shadow-brand-primary/20 transition duration-300 hover:scale-105">
              <p className="text-sm font-semibold tracking-tight">
                For the growth of the <span className="mt-0.5 block text-base font-black">business ecosystem</span>
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <div className="mx-auto mb-6 h-16 w-px rounded-full bg-brand-primary/30" />
          <h3 className="relative mb-12 inline-block text-4xl font-light uppercase tracking-[0.18em] text-brand-text-secondary/35 md:text-5xl">
            Our <span className="text-brand-text-secondary/55">values</span>
            <span className="absolute left-1/2 -bottom-2 -translate-x-1/2 whitespace-nowrap text-xs font-black uppercase tracking-[0.3em] text-brand-primary">
              Our Values
            </span>
          </h3>

          <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 rounded-[2rem] border border-brand-border bg-brand-surface/80 p-8 text-left shadow-2xl shadow-brand-primary/10 backdrop-blur-xl md:flex-row md:p-12">
            <div className="relative hidden h-32 w-16 flex-shrink-0 overflow-hidden rounded-bl-full rounded-t-full bg-brand-primary md:block">
              <div className="absolute left-4 top-4 h-12 w-12 rounded-full bg-white/20" />
            </div>
            <div>
              <h3 className="mb-4 text-2xl font-black text-brand-text-primary">We work as a team</h3>
              <p className="text-sm leading-7 text-brand-text-secondary">
                Just like in sports or fast scaling startups, exceptional team players strengthen our combined potential. We value transparency, high-velocity iteration, and the humility to learn from complex data systems every single day.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
