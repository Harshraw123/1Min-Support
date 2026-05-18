type FAQ = {
    q: string;
    a: string;
  };
  
  type Group = {
    title: string;
    faqs: FAQ[];
  };
  
  export const groups: Group[] = [
    {
      title: "OneMinute basics",
      faqs: [
        {
          q: "Why should I choose OneMinute?",
          a: "Because you'll go from zero to a working AI agent in minutes — not weeks. We handle the scraping, training, and embedding so your team can focus on the conversations that actually need a human.",
        },
        {
          q: "What is OneMinute?",
          a: "OneMinute is an AI customer support platform. Point it at your website or docs, and it builds a chatbot trained on your content that answers questions 24/7 — and gracefully hands off to a human when needed.",
        },
        {
          q: "How long until it's actually working?",
          a: "Most teams paste their URL, watch us train it, drop in the script, and see the first real reply go out in under 5 minutes.",
        },
      ],
    },
    {
      title: "Billing questions",
      faqs: [
        {
          q: "What's the cancellation policy?",
          a: "Cancel anytime from your dashboard — no calls, no forms, no friction. You'll keep access through the end of your billing period.",
        },
        {
          q: "Do you offer yearly price plans?",
          a: "Yes. Annual plans come with two months free compared to monthly billing.",
        },
        {
          q: "What payment methods do you support?",
          a: "All major credit and debit cards, Apple Pay, Google Pay, and ACH for annual Enterprise plans.",
        },
        {
          q: "Do you offer free trials?",
          a: "Yes — every plan starts with a 14-day free trial. No credit card required to get started.",
        },
        {
          q: "Do you offer Enterprise plans?",
          a: "Absolutely. Custom volume, SSO, dedicated support, and security review — reach out and we'll tailor a plan for your team.",
        },
      ],
    },
    {
      title: "Product questions",
      faqs: [
        {
          q: "What if the AI doesn't know an answer?",
          a: "It won't make things up. When something is out of scope, it gracefully hands the conversation to a human or captures the customer's email so nobody is left waiting.",
        },
        {
          q: "Will it work with my stack?",
          a: "If your site runs JavaScript, you're good. React, Next.js, Vue, WordPress, Shopify, Webflow, plain HTML — paste a single tag and you're live.",
        },
        {
          q: "What does OneMinute do with my data?",
          a: "Your private content is encrypted in transit and at rest, never used to train shared models, and stays yours. You can delete it permanently anytime.",
        },
      ],
    },
  ];