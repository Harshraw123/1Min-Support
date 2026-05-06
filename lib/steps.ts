type Variant = "knowledge" | "sections" | "settings" | "team" | "webhook" | "simulator";
type Phase = "Setup" | "Deploy" | "Live";


interface Step {
  phase: Phase;
  title: string;
  desc: string;
  highlight: string;
  variant: Variant;
}

export const steps: Step[] = [
  { phase: "Setup", title: "Add Your Knowledge", desc: "Upload websites, documents, or paste text. Your content is processed into structured, AI-ready knowledge for accurate responses.", highlight: "One-time processing • Clean & optimized", variant: "knowledge" },
  { phase: "Setup", title: "Define Behavior with Sections", desc: "Create sections to control tone, allowed topics, restrictions, and fallback responses. Fine-tune how your AI behaves in different scenarios.", highlight: "Full control • Smart rules engine", variant: "sections" },
  { phase: "Setup", title: "Configure Settings", desc: "Set chatbot appearance, welcome message, and workspace-level defaults in one place before going live.", highlight: "Centralized controls • Ready-to-launch", variant: "settings" },
  { phase: "Setup", title: "Invite Team Members", desc: "Add teammates to collaborate on knowledge and chatbot updates with shared workspace visibility.", highlight: "Team access • Smooth collaboration", variant: "team" },
  { phase: "Deploy", title: "Connect API Webhook", desc: "Enable webhook flow so membership events sync team status changes automatically and keep access up to date.", highlight: "Automated sync • Real-time status", variant: "webhook" },
  { phase: "Live", title: "Smart Conversations, Real Results", desc: "Your AI understands context, follows rules, and responds using your knowledge—delivering accurate, on-brand conversations in real time.", highlight: "Context-aware • Reliable answers", variant: "simulator" },
];
