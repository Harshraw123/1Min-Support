import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const CTASection = () => {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <div
          ref={ref}
          className={`glass-strong rounded-3xl p-10 sm:p-16 text-center relative overflow-hidden transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Ready to Transform Your Support?
            </h2>
            <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
              Join thousands of businesses using 1Min Support to deliver faster, smarter customer experiences.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button size="lg" className="text-base px-8 gap-2">
                Start Free Trial <ArrowRight size={16} />
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8">
                Book a Demo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
