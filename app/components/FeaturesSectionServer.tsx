import { features } from "@/lib/features";
import FeatureCardClient from "./FeatureCardClient";


const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Features</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-foreground">
            Everything You Need for Exceptional Support
          </h2>
          <p className="mt-4 text-muted-foreground">
            Powerful features designed to automate, analyze, and improve your customer experience.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCardClient key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
