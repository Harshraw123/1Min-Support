"use client";

import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Star, Zap, BarChart3 } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Button } from "@/components/ui/button";
import Image from "next/image";


const checklist = [
  "AI agents trained on your website, docs, and FAQs in under a minute — no engineering required.",
  "Smart escalation hands off to a human the moment the AI isn't 100% sure, so customers never feel stuck.",
];

const FeaturesSection = () => {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="features" className="relative overflow-hidden bg-background/55 py-24 backdrop-blur-sm sm:py-32">


      <div className="container mx-auto px-6 max-w-7xl">
        <div
          ref={ref}
          className={`grid lg:grid-cols-2 gap-16 lg:gap-20 items-center transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* LEFT — copy */}
          <div>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-background/60 backdrop-blur text-xs font-semibold text-foreground">
              <Sparkles size={14} className="text-primary" />
              Built for modern support
            </span>

            <h2 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-bold text-foreground tracking-tight leading-[1.05]">
              Leading the way with
              <br />
              <span className="text-gradient">intelligent support.</span>
            </h2>

            <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-lg leading-relaxed">
              OneMinute Support turns your website, documents, and FAQs into a custom AI agent
              that resolves customer queries instantly — and gracefully escalates the rest to your team.
            </p>

            <div className="mt-8">
              <Button size="lg" className="rounded-full px-7 h-12 text-sm font-semibold shadow-lg shadow-primary/20">
                Get Started
                <ArrowRight size={16} />
              </Button>
            </div>

            <div className="mt-10 pt-10 border-t border-border space-y-5 max-w-lg">
              {checklist.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-primary shrink-0 mt-0.5" />
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — visual collage (static, no float) */}
          <div className="relative w-full max-w-[560px] mx-auto aspect-square">
            {/* soft circular backdrop */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[88%] aspect-square rounded-full bg-linear-to-br from-secondary via-muted to-background" />
            </div>

            {/* glow behind robot */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] aspect-square rounded-full bg-primary/20 blur-3xl" />

            {/* central robot image */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[68%] sm:w-[64%] aspect-square flex items-center justify-center">
              <Image
                src="/logo.avif"
                alt="OneMinute Support AI assistant robot mascot"
                fill
                sizes="(min-width: 640px) 360px, 280px"
                className="object-contain drop-shadow-2xl"
                priority={false}
              />
            </div>

            {/* top-left card — reviews */}
            <div className="absolute top-2 left-0 sm:-left-4 glass-strong rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 rounded-full bg-linear-to-br from-accent to-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                4.9
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">12k+ reviews</p>
                <div className="flex gap-0.5 mt-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={11} className="text-accent fill-amber-300" />
                  ))}
                </div>
              </div>
            </div>

            {/* top-right card — security badge */}
            <div className="absolute top-0 right-0 sm:-right-4 glass-strong rounded-2xl p-3 sm:p-4 w-[150px] sm:w-[180px] text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                <ShieldCheck size={18} className="text-primary" />
              </div>
              <p className="mt-2 text-xs font-semibold text-foreground">Enterprise security</p>
              <p className="text-[11px] text-muted-foreground leading-snug">SOC 2 · End-to-end encrypted</p>
            </div>

            {/* bottom-left chat bubble */}
            <div className="absolute bottom-6 sm:bottom-10 left-0 sm:-left-4 glass-strong rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2.5 max-w-[200px]">
              <div className="w-9 h-9 rounded-xl bg-linear-to-br from-primary to-accent flex items-center justify-center text-primary-foreground shrink-0">
                <Zap size={16} />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Resolved in 1.2s</p>
                <p className="text-[11px] text-muted-foreground">Trained on 248 sources</p>
              </div>
            </div>

            {/* bottom-right card — analytics */}
            <div className="absolute bottom-0 right-0 sm:-right-4 rounded-2xl bg-linear-to-br from-accent/90 to-accent p-3 sm:p-4 w-[150px] sm:w-[180px] text-accent-foreground shadow-xl">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">Resolution rate</p>
                <BarChart3 size={14} />
              </div>
              <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums">92%</p>
              <div className="mt-2 flex items-end gap-1 h-8">
                {[40, 65, 50, 80, 95].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className="flex-1 rounded-sm bg-accent-foreground/80"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
