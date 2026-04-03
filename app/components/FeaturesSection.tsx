import { Clock, BarChart3, MessageSquare, Shield, Zap, Globe } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const features = [
  {
    icon: Clock,
    title: "24/7 Instant Support",
    desc: "Your AI agent never sleeps. Customers get instant, accurate responses any time of day or night.",
  },
  {
    icon: MessageSquare,
    title: "Smart Query Resolution",
    desc: "AI understands context and resolves complex queries without human intervention.",
  },
  {
    icon: BarChart3,
    title: "Admin Analytics Dashboard",
    desc: "Track resolution rates, customer satisfaction, and agent performance in real-time.",
  },
  {
    icon: Zap,
    title: "One-Minute Setup",
    desc: "Add a single script tag to your website and your AI agent is live. No coding required.",
  },
  {
    icon: Globe,
    title: "Multi-Language Support",
    desc: "Serve customers worldwide with automatic language detection and response.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    desc: "SOC 2 compliant with end-to-end encryption for all customer conversations.",
  },
];

const FeaturesSection = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal();

  return (
    <section id="features" className="py-24 relative">
      <div className="container mx-auto px-6">
        <div
          ref={headerRef}
          className={`text-center max-w-2xl mx-auto mb-16 transition-all duration-700 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Features</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-foreground">
            Everything You Need for Exceptional Support
          </h2>
          <p className="mt-4 text-muted-foreground">
            Powerful features designed to automate, analyze, and improve your customer experience.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

const FeatureCard = ({ feature: f, index }: { feature: typeof features[number]; index: number }) => {
  const { ref, isVisible } = useScrollReveal(0.1);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${index * 100}ms` }}
      className={`group glass rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-500 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
        <f.icon size={22} className="text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
    </div>
  );
};

export default FeaturesSection;
