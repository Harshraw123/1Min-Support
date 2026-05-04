type Step = {
    phase: "Setup" | "Deploy" | "Live";
    title: string;
    desc: string;
    highlight: string;
    image: string;
    span: string;
  };


export const steps: Step[] = [
    {
      phase: "Setup",
      title: "Add Your Knowledge",
      desc: "Upload websites, documents, or paste text. Your content is processed into structured, AI-ready knowledge for accurate responses.",
      highlight: "One-time processing • Clean & optimized",
      image: '',
      span: "lg:col-span-2 lg:row-span-2",
    },
    {
      phase: "Setup",
      title: "Define Behavior with Sections",
      desc: "Create sections to control tone, allowed topics, restrictions, and fallback responses.",
      highlight: "Smart rules engine",
      image: '',
      span: "lg:col-span-2",
    },
    {
      phase: "Setup",
      title: "Customize Your Chatbot",
      desc: "Personalize with brand colors, avatar, welcome message, and identity.",
      highlight: "Fully customizable",
      image: '',
      span: "lg:col-span-1",
    },
    {
      phase: "Deploy",
      title: "Embed on Any Website",
      desc: "Copy a single script and add your chatbot anywhere. No backend or complex integration required.",
      highlight: "One-line integration",
      image: '',
      span: "lg:col-span-1",
    },
    {
      phase: "Live",
      title: "Smart Conversations, Real Results",
      desc: "Your AI understands context, follows rules, and replies using your knowledge—on-brand, in real time.",
      highlight: "Context-aware • Reliable answers",
      image: '',
      span: "lg:col-span-2",
    },
  ];
  