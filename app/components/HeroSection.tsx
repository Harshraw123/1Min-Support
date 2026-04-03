import { Bot, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image */}
      <img
        src={heroBg}
        alt=""
        width={1920}
        height={1080}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/20 to-background" />

      <div className="container mx-auto px-6 pt-24 pb-16 relative z-10">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 items-center">
          {/* Left */}
          <div className="max-w-xl mx-auto lg:mx-0 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6 text-xs font-medium text-primary">
              <Sparkles size={14} />
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
              <Button size="lg" className="text-base px-8">Get Started Free</Button>
              <Button size="lg" variant="outline" className="text-base px-8 glass border-primary/20 hover:bg-primary/5">
                Learn More
              </Button>
            </div>

            {/* Trust logos placeholder */}
            <div className="mt-12 flex items-center gap-6 opacity-50 justify-center lg:justify-start">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Trusted by</span>
              {["TechCorp", "StartupX", "CloudBase"].map((name) => (
                <span key={name} className="text-sm font-semibold text-foreground/40">{name}</span>
              ))}
            </div>
          </div>

          {/* Right - Chat Widget Preview (square) */}
          <div className="hidden lg:flex justify-end">
            <div className="glass-strong rounded-2xl p-6 w-[400px] h-[400px] flex flex-col animate-fade-in">
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
                <div className="glass rounded-xl px-4 py-3 text-sm text-foreground/80 max-w-[80%]">
                  Hi! 👋 How can I help you today?
                </div>
                <div className="bg-primary text-primary-foreground rounded-xl px-4 py-3 text-sm max-w-[80%] ml-auto">
                  I need help with my subscription
                </div>
                <div className="glass rounded-xl px-4 py-3 text-sm text-foreground/80 max-w-[85%]">
                  Sure! I can see your account. Let me pull up your subscription details right away.
                </div>
              </div>

              <div className="flex items-center gap-2 glass rounded-xl px-4 py-3 mt-3">
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
