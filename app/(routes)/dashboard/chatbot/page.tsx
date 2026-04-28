"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Palette, Save, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import ChatSimulator from "@/app/components/ChatSimulator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmbedCodeConfig from "@/app/components/embedCodeConfig";

import { COLOR_PRESETS } from "@/lib/ChatBotmetaData/chatbotMetaData";
import { AVATAR_PRESETS, AvatarPickerProps } from "@/lib/ChatBotmetaData/chatbotMetaData";
import Image from "next/image";
import AvatarSelector from "@/app/components/AvatarSelector";

type Section = { id: string; name: string };
type Message = { role: "user" | "assistant"; content: string };

const ChatbotPage = () => {
  const [primaryColor, setPrimaryColor] = useState("#10b981");
  const [avatarSrc, setAvatarSrc] = useState(AVATAR_PRESETS[0].src);
  const [welcomeMessage, setWelcomeMessage] = useState("Hi there, How can I help you today?");
  const [isSaving, setIsSaving] = useState(false);

  const widgetId = "a6afa329-a3c5-4104-b71b-e23717929846";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [sections] = useState<Section[]>([
    { id: "faq", name: "FAQ" },
    { id: "billing", name: "Billing" },
    { id: "support", name: "Support" },
  ]);

  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const responseTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    scrollViewportRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  useEffect(() => {
    return () => {
      if (responseTimeoutRef.current) window.clearTimeout(responseTimeoutRef.current);
    };
  }, []);

  const handleSend = () => {
    if (!activeSection) return;
    if (isTyping) return;
    if (!input.trim()) return;
    if (responseTimeoutRef.current) {
      window.clearTimeout(responseTimeoutRef.current);
      responseTimeoutRef.current = null;
    }
    setMessages((prev) => [...prev, { role: "user", content: input }]);
    setInput("");
    setIsTyping(true);
    responseTimeoutRef.current = window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "This is a simulated response based on your knowledge base." },
      ]);
      setIsTyping(false);
    }, 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSectionClick = (id: string) => {
    setActiveSection(id);
    toast.info(`Switched to ${id} context`);
  };

  const handleReset = () => {
    if (responseTimeoutRef.current) {
      window.clearTimeout(responseTimeoutRef.current);
      responseTimeoutRef.current = null;
    }
    setMessages([]);
    setActiveSection(null);
    setIsTyping(false);
    toast.success("Chat reset");
  };

  const handleUpdateConfig = () => {
    setIsSaving(true);
    setTimeout(() => {
      toast.success("Chatbot configuration updated!");
      setIsSaving(false);
    }, 800);
  };

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <div className="relative mx-auto flex h-full w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
        {/* ── Page header ── */}
        <div className="mb-3 shrink-0 flex items-center justify-between gap-4">
          {/* Left: title + subtitle */}
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Chatbot Playground
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Test your assistant, customize appearance, and deploy it.
            </p>
          </div>

          {/* Right: AvatarSelector component */}
          <AvatarSelector
            avatars={AVATAR_PRESETS}
            avatarSrc={avatarSrc}
            setAvatarSrc={setAvatarSrc}
            primaryColor={primaryColor}
          />
        </div>

        {/* ── Main grid ── */}
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-5">
          {/* Left: Chat simulator */}
          <Card className="glass-strong flex min-h-0 flex-col overflow-hidden rounded-2xl border-white/40 p-0">
            <ChatSimulator
              messages={messages}
              primaryColor={primaryColor}
              avatarSrc={avatarSrc}
              sections={sections}
              input={input}
              setInput={setInput}
              handleSend={handleSend}
              handleKeyDown={handleKeyDown}
              handleSectionClick={handleSectionClick}
              activeSection={activeSection}
              isTyping={isTyping}
              handleReset={handleReset}
              scrollRef={scrollViewportRef}
              welcomeMessage={welcomeMessage}
            />
          </Card>

          {/* Right column: Appearance + Embed */}
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
            <Card className="glass flex shrink-0 flex-col overflow-hidden rounded-2xl border-white/40 p-0">
              {/* Card header */}
              <div className="shrink-0 border-b border-white/30 bg-linear-to-br from-primary/5 to-accent/5 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
                    Appearance
                  </h2>
                </div>
              </div>

              {/* Scrollable settings */}
              <div className="px-4 py-4">
                <div className="flex flex-col gap-4">
                  {/* Primary color */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">Primary Color</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      {COLOR_PRESETS.map((c) => {
                        const active = primaryColor.toLowerCase() === c.value.toLowerCase();
                        return (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setPrimaryColor(c.value)}
                            aria-label={`Choose ${c.name}`}
                            aria-pressed={active}
                            className={cn(
                              "relative h-7 w-7 rounded-full ring-offset-2 ring-offset-background transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-foreground/30",
                              active && "ring-2 ring-foreground"
                            )}
                            style={{ backgroundColor: c.value }}
                          >
                            {active && (
                              <Check className="absolute inset-0 m-auto h-3 w-3 text-white drop-shadow" />
                            )}
                          </button>
                        );
                      })}
                      <label
                        className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-dashed border-border/80 bg-background/60 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                        title="Custom color"
                      >
                        <Palette className="h-3 w-3" />
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          aria-label="Custom primary color"
                        />
                      </label>
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {primaryColor}
                    </p>
                  </div>

                  {/* Welcome message */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">Welcome Message</Label>
                    <Textarea
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                      className="min-h-[72px] resize-none rounded-xl border-border/60 bg-background/60 text-sm backdrop-blur"
                      placeholder="Say hello to the user…"
                    />
                  </div>
                </div>
              </div>

              {/* Save button */}
              <div className="shrink-0 border-t border-white/20 px-4 py-3">
                <Button
                  onClick={handleUpdateConfig}
                  disabled={isSaving}
                  className="h-9 w-full gap-2 rounded-xl text-primary-foreground shadow-md transition-all hover:shadow-lg active:scale-[0.99]"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </Card>

            {/* Embed code */}
            <div className="shrink-0">
              <EmbedCodeConfig widgetId={widgetId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbotPage;