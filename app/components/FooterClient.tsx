'use client'

import { useScrollReveal } from '@/hooks/useScrollReveal'

const FooterClient = () => {
  const { ref, isVisible } = useScrollReveal(0.2);

  return (
    <div
      ref={ref}
      className={`py-12 transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
    >
      <div className="container mx-auto px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-lg font-bold text-primary">1Min Support</span>
          <p className="text-sm text-muted-foreground">© 2026 1Min Support. All rights reserved.</p>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Contact"].map((l) => (
              <a key={l} href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FooterClient;
