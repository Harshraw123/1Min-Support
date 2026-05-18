'use client'

import { useState } from "react";
import { ArrowLeft, ArrowRight, Quote } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { testimonials } from "@/lib/content/testimonialData";


const TestimonialsSection = () => {
  const { ref, isVisible } = useScrollReveal();
  const [index, setIndex] = useState(0);
  const t = testimonials[index];

  const prev = () => setIndex((i) => (i - 1 + testimonials.length) % testimonials.length);
  const next = () => setIndex((i) => (i + 1) % testimonials.length);

  return (
    <section className="py-24 sm:py-32 relative overflow-hidden">
      <div className="container mx-auto px-6 max-w-7xl">
        <div
          ref={ref}
          className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div>
            <span className="hero-badge mb-6">Testimonials</span>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground tracking-tight leading-[1.05]">
              From our
              <br />
              <span className="text-gradient">community.</span>
            </h2>
            <p className="mt-6 text-base text-muted-foreground max-w-md leading-relaxed">
              Here&apos;s what other teams had to say about using OneMinute to run their customer support.
            </p>

            {/* Avatar strip */}
            <div className="mt-8 flex items-center gap-2">
              {testimonials.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Go to testimonial by ${t.name}`}
                  className={cn(
                    "rounded-full transition-all duration-300 shrink-0 overflow-hidden border-2",
                    i === index
                      ? "w-12 h-12 border-primary scale-110 shadow-md"
                      : "w-9 h-9 border-transparent opacity-50 hover:opacity-80"
                  )}
                >
                  <Image
                    src={t.image}
                    alt={t.name}
                    width={96}
                    height={96}
                    sizes="48px"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={prev}
                aria-label="Previous testimonial"
                className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <button
                onClick={next}
                aria-label="Next testimonial"
                className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <ArrowRight size={18} />
              </button>
              <span className="ml-4 text-sm text-muted-foreground tabular-nums">
                {index + 1} / {testimonials.length}
              </span>
            </div>
          </div>

          <div key={index} className="relative animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="glass rounded-2xl p-8">
              <Quote
                size={48}
                className="text-primary fill-primary mb-6"
                strokeWidth={0}
              />
              <p className="text-2xl sm:text-3xl md:text-[2rem] font-semibold text-foreground leading-tight tracking-tight">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-10 flex items-center gap-4">
                <Image
                  src={t.image}
                  alt={t.name}
                  width={56}
                  height={56}
                  sizes="56px"
                  className="h-14 w-14 rounded-full object-cover shrink-0 ring-2 ring-primary/20"
                />
                <div>
                  <p className="text-base font-bold text-foreground">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;