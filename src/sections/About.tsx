import React, { useState } from "react";
import { ArrowLeft, Linkedin } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { companyProfiles, type CompanyProfile } from "./companyProfiles";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

function LinkedinAction({ member, compact = false }: { member: CompanyProfile; compact?: boolean }) {
  const className = compact
    ? "mt-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-border bg-brand-surface/80 text-brand-text-secondary shadow-sm transition group-hover:border-brand-primary/40 group-hover:text-brand-primary"
    : "inline-flex items-center gap-2 rounded-full border border-brand-border bg-brand-surface/80 px-4 py-2.5 text-sm font-black text-brand-text-secondary transition hover:-translate-y-0.5 hover:border-brand-primary/40 hover:text-brand-primary";

  if (!member.linkedin) {
    return (
      <span className={`${className} opacity-75`} title="LinkedIn profile">
        <Linkedin className="h-4 w-4" />
        {!compact && <span>LinkedIn</span>}
      </span>
    );
  }

  return (
    <a
      href={member.linkedin}
      target="_blank"
      rel="noreferrer"
      className={className}
      onClick={(event) => event.stopPropagation()}
      aria-label={`${member.name} on LinkedIn`}
    >
      <Linkedin className="h-4 w-4" />
      {!compact && <span>LinkedIn</span>}
    </a>
  );
}

function FounderPhoto({ member, large = false }: { member: CompanyProfile; large?: boolean }) {
  const sizeClass = large ? "h-60 w-60 md:h-80 md:w-80 lg:h-[23rem] lg:w-[23rem]" : "h-48 w-48";

  return (
    <motion.div
      layoutId={`founder-photo-${member.name}`}
      className={`${sizeClass} relative mx-auto overflow-hidden rounded-full border border-brand-primary/25 bg-brand-surface shadow-2xl shadow-brand-primary/15 ring-8 ring-brand-primary/5 transition duration-500 group-hover:border-brand-primary/55 group-hover:ring-brand-primary/10`}
      transition={{ duration: 0.8, ease: EASE_OUT }}
    >
      <img
        src={member.image}
        alt={member.name}
        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        style={{ objectPosition: member.imagePosition || "center" }}
        loading="lazy"
      />
      <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_18%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(180deg,transparent,rgba(5,12,28,0.18))]" />
    </motion.div>
  );
}

function FounderCard({
  member,
  index,
  onSelect,
}: {
  member: CompanyProfile;
  index: number;
  onSelect: () => void;
}) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <motion.article
      layout
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: 28, scale: 0.92, filter: "blur(8px)" }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: EASE_OUT }}
      className="group flex w-full max-w-sm cursor-pointer flex-col items-center text-center outline-none focus-visible:rounded-[2rem] focus-visible:ring-2 focus-visible:ring-brand-primary/70"
      aria-label={`Open ${member.name} profile`}
    >
      <FounderPhoto member={member} />
      <motion.h2
        layoutId={`founder-name-${member.name}`}
        className="mt-7 text-2xl font-black tracking-tight text-brand-text-primary transition-colors group-hover:text-brand-primary"
        transition={{ duration: 0.8, ease: EASE_OUT }}
      >
        {member.name}
      </motion.h2>
      <motion.p
        layoutId={`founder-role-${member.name}`}
        className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-brand-primary"
        transition={{ duration: 0.8, ease: EASE_OUT }}
      >
        {member.role}
      </motion.p>
      <p className="mx-auto mt-4 max-w-xs text-sm leading-6 text-brand-text-secondary">{member.bio}</p>
      <LinkedinAction member={member} compact />
    </motion.article>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55, ease: EASE_OUT }}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-brand-primary">{title}</p>
      <div className="mt-3 text-sm leading-7 text-brand-text-secondary md:text-base md:leading-8">{children}</div>
    </motion.div>
  );
}

function ExpandedFounder({
  member,
  onBack,
}: {
  member: CompanyProfile;
  onBack: () => void;
}) {
  return (
    <motion.div
      key={member.name}
      className="mx-auto flex min-h-[620px] w-full max-w-6xl flex-col items-center justify-center gap-12 lg:flex-row lg:items-center lg:justify-between"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(8px)" }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
    >
      <motion.div
        className="group flex w-full max-w-md flex-col items-center text-center lg:items-start lg:text-left"
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: EASE_OUT }}
      >
        <FounderPhoto member={member} large />
        <motion.h2
          layoutId={`founder-name-${member.name}`}
          className="mt-8 text-4xl font-black tracking-tight text-brand-text-primary md:text-5xl"
          transition={{ duration: 0.8, ease: EASE_OUT }}
        >
          {member.name}
        </motion.h2>
        <motion.p
          layoutId={`founder-role-${member.name}`}
          className="mt-3 text-xs font-black uppercase tracking-[0.22em] text-brand-primary"
          transition={{ duration: 0.8, ease: EASE_OUT }}
        >
          {member.role}
        </motion.p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
          <LinkedinAction member={member} />
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-transparent px-4 py-2.5 text-sm font-black text-brand-text-secondary transition hover:-translate-y-0.5 hover:border-brand-primary/40 hover:text-brand-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </motion.div>

      <motion.div
        className="w-full max-w-2xl space-y-7"
        initial={{ opacity: 0, x: 56 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 36 }}
        transition={{ duration: 0.7, delay: 0.22, ease: EASE_OUT }}
      >
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.32, ease: EASE_OUT }}
        >
          <p className="text-xs font-black uppercase tracking-[0.28em] text-brand-primary">Founder Story</p>
          <h3 className="mt-4 text-3xl font-light tracking-tight text-brand-text-primary md:text-5xl">
            The work behind <span className="font-black text-brand-primary">Adviso AI</span>
          </h3>
        </motion.div>

        <DetailBlock title="Biography">{member.detailedBio}</DetailBlock>
        <DetailBlock title="Experience">{member.experience}</DetailBlock>
        {member.education && <DetailBlock title="Education">{member.education}</DetailBlock>}
        <DetailBlock title="Areas Of Expertise">
          <div className="flex flex-wrap gap-2">
            {member.expertise.map((item) => (
              <span
                key={item}
                className="rounded-full border border-brand-primary/20 bg-brand-primary/10 px-3 py-1.5 text-xs font-black text-brand-primary"
              >
                {item}
              </span>
            ))}
          </div>
        </DetailBlock>
      </motion.div>
    </motion.div>
  );
}

export default function About() {
  const [selectedMember, setSelectedMember] = useState<CompanyProfile | null>(null);

  return (
    <section id="about" className="relative min-h-screen overflow-hidden border-t border-brand-border bg-brand-background py-28 text-brand-text-primary">
      <div className="absolute inset-0 subtle-grid opacity-15 pointer-events-none" />
      <div className="absolute left-0 top-12 hidden h-[72%] w-8 rounded-r-[2rem] bg-brand-primary/15 md:block" />
      <div className="absolute right-[-18%] top-[-24%] h-[560px] w-[560px] rounded-full bg-brand-primary/10 blur-[150px]" />
      <div className="absolute bottom-[-18%] left-[12%] h-[420px] w-[520px] rounded-full bg-brand-primary/10 blur-[130px]" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 md:px-12 xl:px-0">
        <motion.div
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: selectedMember ? 0.68 : 1, y: 0, scale: selectedMember ? 0.96 : 1 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="mb-16 text-center md:text-left"
        >
          <div className="mx-auto mb-6 h-12 w-0.5 rounded-full bg-brand-primary/30 md:mx-0" />
          <p className="mb-4 text-xs font-black uppercase tracking-[0.28em] text-brand-primary">About Us</p>
          <h1 className="mb-8 text-4xl font-light tracking-tight text-brand-text-primary md:text-6xl">
            Building <span className="font-black text-brand-primary">Adviso AI</span> for sharper business decisions.
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-brand-text-secondary md:text-xl">
            Adviso AI is led by founders across business strategy, AI engineering, and cybersecurity, combining practical operating insight with scalable intelligence systems.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {selectedMember ? (
            <React.Fragment key={`expanded-${selectedMember.name}`}>
              <ExpandedFounder
                member={selectedMember}
                onBack={() => setSelectedMember(null)}
              />
            </React.Fragment>
          ) : (
            <motion.div
              key="founder-list"
              className="flex flex-col items-center justify-center gap-14 md:flex-row md:items-start"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
            >
              {companyProfiles.map((member, index) => (
                <React.Fragment key={member.name}>
                  <FounderCard
                    member={member}
                    index={index}
                    onSelect={() => setSelectedMember(member)}
                  />
                </React.Fragment>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
