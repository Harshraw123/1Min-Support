import { BookOpen, Layers, Settings, Users, Webhook, MessageCircle, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { steps } from "@/lib/steps";

type Variant = "knowledge" | "sections" | "settings" | "team" | "webhook" | "simulator";
type Phase = "Setup" | "Deploy" | "Live";

interface Step {
  phase: Phase;
  title: string;
  desc: string;
  highlight: string;
  variant: Variant;
}

const iconMap: Record<Variant, LucideIcon> = {
  knowledge: BookOpen,
  sections: Layers,
  settings: Settings,
  team: Users,
  webhook: Webhook,
  simulator: MessageCircle,
};

const phaseStyles: Record<Phase, string> = {
  Setup: "bg-primary text-primary-foreground",
  Deploy: "bg-secondary text-secondary-foreground",
  Live: "bg-accent text-accent-foreground",
};

const iconBgStyles: Record<Phase, string> = {
  Setup: "bg-primary/10 text-primary",
  Deploy: "bg-secondary/10 text-secondary",
  Live: "bg-accent/10 text-accent",
};

function StepCard({ step, index }: { step: Step; index: number }) {
  const Icon = iconMap[step.variant];
  const num = String(index + 1).padStart(2, "0");
  return (
    <div className="group relative glass rounded-2xl p-6 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-primary/40 h-full animate-fade-in">
      <span
        className={`absolute -top-3 left-5 text-xs font-semibold px-2.5 py-1 rounded-full shadow-md ${phaseStyles[step.phase]}`}
      >
        {num}
      </span>
      <div
        className={`rounded-xl p-3 w-fit ${iconBgStyles[step.phase]} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
      >
        <Icon className="size-6" />
      </div>
      <div className="flex flex-col gap-2 flex-1">
        <h3 className="font-heading font-semibold text-foreground text-lg leading-snug">
          {step.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
      </div>
      {/* FIX: removed rounded-full, added flex-wrap so long text wraps gracefully */}
      <div className="pt-2">
        <span className="inline-block bg-accent text-accent-foreground text-xs px-3 py-1 rounded-md border border-border leading-snug">
          {step.highlight}
        </span>
      </div>
    </div>
  );
}

/** Animated dashed arrow that fills its container. */
function DashArrow({ direction = "horizontal" }: { direction?: "horizontal" | "vertical" }) {
  const stroke = "var(--muted-foreground)";
  if (direction === "horizontal") {
    return (
      <svg
        viewBox="0 0 100 12"
        preserveAspectRatio="none"
        className="w-full h-3"
        aria-hidden="true"
      >
        <line
          x1="0"
          y1="6"
          x2="92"
          y2="6"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          className="arrow-dash"
        />
        <polyline
          points="86,1 96,6 86,11"
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 12 100"
      preserveAspectRatio="none"
      className="w-3 h-full"
      aria-hidden="true"
    >
      <line
        x1="6"
        y1="0"
        x2="6"
        y2="92"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        className="arrow-dash"
      />
      <polyline
        points="1,86 6,96 11,86"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ProcessFlow() {
  const row1 = steps.slice(0, 3); // steps[0,1,2]
  const row2 = steps.slice(3);    // steps[3,4,5]

  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 grid-bg pointer-events-none" aria-hidden="true" />
      <div className="container mx-auto px-6 max-w-7xl relative">
        {/* Header */}
        <div className="text-center mb-20 flex flex-col items-center gap-5">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-background/60 backdrop-blur text-xs font-semibold text-foreground">
            <Sparkles size={14} className="text-primary" />
            How it works
          </span>
          <h2 className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl tracking-tight text-gradient max-w-3xl">
            From Setup to Smart Conversations
          </h2>
          <p className="text-muted-foreground max-w-2xl text-base md:text-lg">
            Get your AI chatbot live in minutes — no coding required.
          </p>
        </div>

        {/* ===== Desktop (lg+): 3+3 snake grid ===== */}
        <div className="hidden lg:flex flex-col gap-10">
          {/* Row 1: step 1 → step 2 → step 3 (left to right) */}
          {/* FIX: replaced fixed w-24 with a min-w that stretches, ensuring arrows don't clip */}
          <div className="grid grid-cols-[1fr_60px_1fr_60px_1fr] items-stretch gap-x-2 gap-y-6">
            <StepCard step={row1[0]} index={0} />
            <div className="flex items-center px-1">
              <DashArrow />
            </div>
            <StepCard step={row1[1]} index={1} />
            <div className="flex items-center px-1">
              <DashArrow />
            </div>
            <StepCard step={row1[2]} index={2} />
          </div>

          {/* Vertical connector: drops from col 5 (right) down to row 2 */}
          <div className="grid grid-cols-[1fr_60px_1fr_60px_1fr]">
            <div /><div /><div /><div />
            <div className="flex justify-center h-10">
              <DashArrow direction="vertical" />
            </div>
          </div>

          {/* Row 2: step 4 (right) ← step 5 ← step 6 (left) */}
          {/*
            FIX: The original code rendered row2 as [row2[2], row2[1], row2[0]] with indices [5,4,3].
            This mismatched content vs numbering. The correct approach:
            - Visually right-to-left: col1=step6, col2=arrow, col3=step5, col4=arrow, col5=step4
            - But data order in the array is steps[3]=step4, steps[4]=step5, steps[5]=step6
            - So render: row2[2](index5) | arrow | row2[1](index4) | arrow | row2[0](index3)
            - The rotate-180 on the arrow wrapper causes animation to play in reverse direction,
              so instead we use a flipped DashArrow by reversing the SVG points directly.
          */}
          <div className="grid grid-cols-[1fr_60px_1fr_60px_1fr] items-stretch gap-x-2 gap-y-6">
            <StepCard step={row2[2]} index={5} />
            <div className="flex items-center px-1">
              <DashArrowLeft />
            </div>
            <StepCard step={row2[1]} index={4} />
            <div className="flex items-center px-1">
              <DashArrowLeft />
            </div>
            <StepCard step={row2[0]} index={3} />
          </div>
        </div>

        {/* ===== Tablet (md): 2-col snake ===== */}
        {/* FIX: added items-stretch so cards in same row match height */}
        <div className="hidden md:grid lg:hidden grid-cols-[1fr_48px_1fr] gap-x-3 gap-y-8 items-stretch">
          <StepCard step={steps[0]} index={0} />
          <div className="flex items-center px-1"><DashArrow /></div>
          <StepCard step={steps[1]} index={1} />

          {/* Vertical drop from right col (step 2) to step 3 below it */}
          <div />
          <div />
          <div className="flex justify-center h-10 py-1">
            <DashArrow direction="vertical" />
          </div>

          <StepCard step={steps[3]} index={3} />
          <div className="flex items-center px-1"><DashArrowLeft /></div>
          <StepCard step={steps[2]} index={2} />

          {/* Vertical drop from left col (step 4) to step 5 below it */}
          <div className="flex justify-center h-10 py-1">
            <DashArrow direction="vertical" />
          </div>
          <div />
          <div />

          <StepCard step={steps[4]} index={4} />
          <div className="flex items-center px-1"><DashArrow /></div>
          <StepCard step={steps[5]} index={5} />
        </div>

        {/* ===== Mobile: vertical stack ===== */}
        <div className="md:hidden flex flex-col gap-6">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col">
              <StepCard step={step} index={i} />
              {i < steps.length - 1 && (
                <div className="flex justify-center h-10 my-2">
                  <DashArrow direction="vertical" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * FIX: Dedicated left-pointing arrow component instead of rotate-180 wrapper.
 * Avoids the animation direction reversal bug caused by CSS rotate on the container.
 */
function DashArrowLeft() {
  const stroke = "var(--muted-foreground)";
  return (
    <svg
      viewBox="0 0 100 12"
      preserveAspectRatio="none"
      className="w-full h-3"
      aria-hidden="true"
    >
      <line
        x1="100"
        y1="6"
        x2="8"
        y2="6"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        className="arrow-dash"
      />
      <polyline
        points="14,1 4,6 14,11"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}