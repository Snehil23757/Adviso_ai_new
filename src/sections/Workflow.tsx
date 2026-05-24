import React from "react";
import { motion } from "motion/react";
import landscapeImage from "../assets/images/strategic_landscape_1779613874044.png";

export default function Workflow() {
  return (
    <section id="workflow" className="relative h-[600px] md:h-[800px] overflow-hidden bg-brand-background">
      {/* Immersive Panoramic Image */}
      <img 
        src={landscapeImage}
        alt="Panoramic Enterprise Landscape"
        className="absolute inset-0 w-full h-full object-cover opacity-80"
        referrerPolicy="no-referrer"
      />
      
      {/* Cinematic Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-brand-background via-brand-background/40 to-brand-background/10"></div>
      <div className="absolute inset-0 bg-brand-primary/10 mix-blend-color"></div>

      <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-6 md:px-12 z-20">
        <motion.div 
          className="max-w-4xl space-y-8"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400 drop-shadow-md">
            The New Infrastructure
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-7xl font-black tracking-tight text-white leading-[1.05] drop-shadow-xl">
            Vast scale. <br/> Infinite coherence.
          </h2>
          <p className="text-lg md:text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto drop-shadow-md font-medium">
            Forget manual pipelines. Watch as the intelligence layer breathes life into static data, mapping your entire operational footprint in real-time.
          </p>
        </motion.div>
      </div>

      {/* Decorative base fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-brand-background to-transparent z-20 pointer-events-none"></div>
    </section>
  );
}
