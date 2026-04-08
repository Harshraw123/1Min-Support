import {
    Clock,
    BarChart3,
    MessageSquare,
    Shield,
    Zap,
    Globe,
  } from "lucide-react";
  
  export type FeatureItem = {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    title: string;
    desc: string;
  };
  
  export const features: FeatureItem[] = [
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