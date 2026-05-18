import { 
  Clock, 
  BarChart3, 
  MessageSquare, 
  Shield, 
  Zap, 
  Globe 
} from "lucide-react";

// ✅ Central icon map
export const iconMap = {
  Clock,
  BarChart3,
  MessageSquare,
  Shield,
  Zap,
  Globe,
};

// ✅ Strict type from keys
export type IconName = keyof typeof iconMap;

export type FeatureItem = {
  iconName: IconName; // ✅ FIXED
  title: string;
  desc: string;
};

export const features: FeatureItem[] = [
  {
    iconName: "Clock",
    title: "24/7 Instant Support",
    desc: "Your AI agent never sleeps. Customers get instant, accurate responses any time of day or night.",
  },
  {
    iconName: "MessageSquare",
    title: "Smart Query Resolution",
    desc: "AI understands context and resolves complex queries without human intervention.",
  },
  {
    iconName: "BarChart3",
    title: "Admin Analytics Dashboard",
    desc: "Track resolution rates, customer satisfaction, and agent performance in real-time.",
  },
  {
    iconName: "Zap",
    title: "One-Minute Setup",
    desc: "Add a single script tag to your website and your AI agent is live. No coding required.",
  },
  {
    iconName: "Globe",
    title: "Multi-Language Support",
    desc: "Serve customers worldwide with automatic language detection and response.",
  },
  {
    iconName: "Shield",
    title: "Enterprise Security",
    desc: "SOC 2 compliant with end-to-end encryption for all customer conversations.",
  },
];