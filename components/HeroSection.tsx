'use client'

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bot, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthSync } from "@/hooks/useAuthSync";
import type { SessionUser } from "@/lib/getSession";

type HeroSectionProps = {
  isAuthenticated: boolean;
  serverUser?: SessionUser | null;
};

const HeroSection = ({ isAuthenticated, serverUser }: HeroSectionProps) => {
  const router = useRouter();
  const { user, isLoading } = useAuthSync(serverUser || null);

  function handleClick() {
    if (user || isLoading) {
      window.location.href = "/dashboard";
      return;
    }
    window.location.href = "/api/auth/login"
  }


  return (

    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image */}
      
      <video
  autoPlay
  muted
  loop
  playsInline
  preload="auto"
  className="absolute inset-0 h-full w-full object-cover"
>
  <source src="/hero.mp4" type="video/mp4" />
</video>
      <div className="absolute inset-0 bg-linear-to-b from-primary/25 via-background/50 to-background" />

      <div className="container mx-auto px-6 pt-24 pb-16 relative z-10">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 items-center">
          {/* Left */}
          <div className="max-w-xl mx-auto lg:mx-0 text-center lg:text-left">
            <div className="hero-badge mb-6">
              <Sparkles size={14} className="shrink-0" />
              AI-Powered Customer Support
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight text-foreground">
              Resolve Queries in{" "}
              <span className="text-gradient">Under 1 Minute</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-md mx-auto lg:mx-0">
              Deploy an AI support agent on your website that handles customer queries 24/7, reduces wait times, and gives you powerful analytics.
            </p>
            <div className="mt-8 flex flex-wrap gap-4 justify-center lg:justify-start">
 
             <Button onClick={handleClick} size="lg" className="text-base px-8 cursor-pointer hover:bg-primary/90">Get Started Free</Button>
          
              <Button size="lg" variant="secondary" className="text-base px-8 shadow-sm hover:cursor-pointer">
                Learn More
              </Button>
            </div>

            {/* Trust logos placeholder */}
            <div className="mt-12 flex flex-wrap items-center gap-6 justify-center lg:justify-start">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/90">Trusted by</span>
              {["TechCorp", "StartupX", "CloudBase"].map((name) => (
                <span key={name} className="text-sm font-semibold text-muted-foreground/75">
                  {name}
                </span>
              ))}
            </div>
          </div>

          {/* Right - Chat Widget Preview (square) */}
          <div className="hidden lg:flex justify-end">
            <div className="chat-card w-[400px] h-[400px] animate-in fade-in duration-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bot size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">1Min Support</p>
                  <p className="text-xs text-muted-foreground">Online • Avg reply &lt;1 min</p>
                </div>
              </div>

              <div className="space-y-3 flex-1 overflow-hidden">
                <div className="chat-bubble-in max-w-[80%]">
                  Hi! 👋 How can I help you today?
                </div>
                <div className="bg-primary text-primary-foreground rounded-xl px-4 py-3 text-sm max-w-[80%] ml-auto shadow-sm">
                  I need help with my subscription
                </div>
                <div className="chat-bubble-in max-w-[85%]">
                  Sure! I can see your account. Let me pull up your subscription details right away.
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 px-4 py-3 shadow-sm">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                  readOnly
                />
                <Send size={16} className="text-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
