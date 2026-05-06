"use client";

import Image from "next/image";
import { Sparkles, ArrowRight } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { steps } from "@/lib/steps";

type Step = {
  phase: "Setup" | "Deploy" | "Live";
  title: string;
  desc: string;
  highlight: string;
  variant: "knowledge" | "sections" | "settings" | "team" | "webhook" | "simulator";
};

const StepCard = ({ step, index }: { step: Step; index: number }) => {
  const { ref, isVisible } = useScrollReveal(0.1);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${index * 70}ms` }}
      className={`group relative overflow-hidden rounded-2xl
      p-6 sm:p-7 min-h-[260px] sm:min-h-[300px]
      border border-border
      shadow-sm hover:shadow-md hover:border-foreground/20
      hover:-translate-y-1 transition-all duration-300
      ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
    >
      <div className="relative z-10 flex flex-col h-full">
        {/* Top Row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-[10px] font-semibold tracking-[0.15em] px-2.5 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary">
            {step.phase.toUpperCase()}
          </span>

          <span className="text-[10px] font-medium text-muted-foreground tracking-wider">
            STEP {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight leading-snug max-w-[20ch]">
          {step.title}
        </h3>

        {/* Description */}
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-[42ch]">
          {step.desc}
        </p>

        {/* Highlight */}
        <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-foreground/80">
          <Sparkles size={12} />
          {step.highlight}
        </div>
      </div>

          </div>
  );
};

const Steps = () => {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="journey" className="py-24 sm:py-32 ">
      <div className="container mx-auto px-6">
        {/* Heading */}
        <div
          ref={ref}
          className={`text-center max-w-2xl mx-auto mb-14 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="hero-badge">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            The Journey
          </span>

          <h2 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground tracking-tight">
            From raw content to{" "}
            <span className="text-gradient">live conversations</span>
          </h2>

          <p className="mt-4 text-muted-foreground text-base sm:text-lg">
            Five steps, three phases, zero engineering required.
          </p>

          {/* Phase Flow */}
          <div className="mt-6 inline-flex items-center gap-2 flex-wrap justify-center">
            {(["Setup", "Deploy", "Live"] as const).map((p, i) => (
              <span key={p} className="inline-flex items-center gap-2">
                <span className="text-[10px] font-medium tracking-[0.15em] px-2.5 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary">
                  {p.toUpperCase()}
                </span>
                {i < 2 && (
                  <ArrowRight size={12} className="text-muted-foreground" />
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-[minmax(180px,auto)] gap-5">
          {steps.map((s, i) => (
            <StepCard key={s.title} step={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Steps;