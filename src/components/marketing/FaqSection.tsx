'use client'

import { useState } from "react";
import { Plus } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";
import { groups } from "@/lib/content/faqDetails";


const FAQSection = () => {
  const { ref, isVisible } = useScrollReveal();
  const [open, setOpen] = useState<string | null>("0-0");

  return (
    <section id="faq" className="py-24 sm:py-32 relative">
      <div className="container mx-auto px-6 max-w-6xl">
        <div
          ref={ref}
          className={`max-w-2xl mb-16 sm:mb-20 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="hero-badge mb-6">FAQ</span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground tracking-tight leading-[1.05]">
            Frequently
            <br />
            asked questions
          </h2>
          <p className="mt-5 text-sm text-muted-foreground max-w-md leading-relaxed">
            We're here to help with any questions you have about plans, pricing, and supported features.
          </p>
        </div>

        <div className="space-y-16 sm:space-y-20">
          {groups.map((group, gi) => (
            <div key={group.title} className="grid lg:grid-cols-[260px_1fr] gap-8 lg:gap-16">
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
                {group.title.split(" ").map((w, i) => (
                  <span key={i}>
                    {w}
                    {i === 0 && <br />}
                    {i !== 0 && " "}
                  </span>
                ))}
              </h3>

              <div>
                {group.faqs.map((f, fi) => {
                  const id = `${gi}-${fi}`;
                  const isOpen = open === id;
                  return (
                    <div key={id} className="border-b border-border">
                      <button
                        onClick={() => setOpen(isOpen ? null : id)}
                        className="w-full flex items-center justify-between gap-6 py-5 text-left group hover:bg-primary/5 px-4 -mx-4 rounded-lg transition-colors"
                        aria-expanded={isOpen}
                      >
                        <span className="text-base sm:text-[17px] font-medium text-foreground group-hover:text-primary transition-colors">
                          {f.q}
                        </span>
                        <Plus
                          size={20}
                          className={cn(
                            "shrink-0 text-muted-foreground transition-transform duration-300",
                            isOpen && "rotate-45 text-primary"
                          )}
                        />
                      </button>
                      <div
                        className={cn(
                          "grid transition-all duration-300 ease-out",
                          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                        )}
                      >
                        <div className="overflow-hidden">
                          <div className="pb-5 pr-10 pl-4 -ml-4">
                            <div className="glass rounded-lg p-4">
                              <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed">
                                {f.a}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-24 sm:mt-32 text-center">
          <div className="glass rounded-2xl p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Have additional questions?
            </h3>
            <div className="mt-8 flex flex-wrap justify-center gap-x-12 gap-y-6">
              {[
                { label: "Help Articles", action: "Knowledge Base", href: "#" },
                { label: "Customer support", action: "Email hey@oneminute.ai", href: "mailto:hey@oneminute.ai" },
                { label: "Learn more", action: "Get a Demo", href: "#contact" },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                  <a
                    href={item.href}
                    className="text-sm font-semibold text-foreground underline underline-offset-4 decoration-foreground/40 hover:decoration-primary hover:text-primary transition-colors"
                  >
                    {item.action}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;