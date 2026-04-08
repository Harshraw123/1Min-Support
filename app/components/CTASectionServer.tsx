import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import CTASectionClient from "./CTASectionClient";

const CTASection = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        <CTASectionClient />
      </div>
    </section>
  );
};

export default CTASection;
