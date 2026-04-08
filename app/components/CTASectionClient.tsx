'use client'

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useScrollReveal } from '../hooks/useScrollReveal'

const CTASectionClient = () => {
  const { ref, isVisible } = useScrollReveal();

  return (
    <div
      ref={ref}
      className={`text-center transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
        Ready to Transform Your Customer Support?
      </h2>
      <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
        Join thousands of businesses that have reduced response times by 90% and increased customer satisfaction with our AI-powered support solution.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg" className="text-base px-8">
          Start Free Trial
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button size="lg" variant="outline" className="text-base px-8">
          Book a Demo
        </Button>
      </div>
    </div>
  );
};

export default CTASectionClient;
