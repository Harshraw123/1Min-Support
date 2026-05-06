"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Palette, Save, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import ChatSimulator from "@/components/ChatSimulator";
import EmbedCodeConfig from "@/components/EmbedCodeConfig";

import { COLOR_PRESETS } from "@/lib/ChatBotmetaData/chatbotMetaData";
import { AVATAR_PRESETS } from "@/lib/ChatBotmetaData/chatbotMetaData";
import AvatarSelector from "@/components/AvatarSelector";

type Section = { id: string; name: string };
type Message = { role: "user" | "assistant"; content: string };
type SectionRecord = {
  id: string;
  name: string;
  description: string | null;
  source_ids: string | null;
  tone: string | null;
  allowed_topics: string | null;
  blocked_topics: string | null;
  fallback_behavior: string | null;
};

const ChatbotPage = () => {
  const [primaryColor, setPrimaryColor] = useState("#111827");
  const [avatarSrc, setAvatarSrc] = useState(AVATAR_PRESETS[0].src);
  const [welcomeMessage, setWelcomeMessage] = useState("Hi there, How can I help you today?");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);

  const [widgetId, setWidgetId] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionRecords, setSectionRecords] = useState<SectionRecord[]>([]);

  const scrollViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollViewportRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchMetadata = async () => {
      try {
        setIsLoadingMeta(true);
        const response = await fetch("/api/chatbot/metadata/fetch", {
          method: "GET",
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status !== 401) {
            toast.error("Could not load chatbot settings");
          }
          return;
        }

        const payload = await response.json();
        const data = payload?.data ?? payload;

        const safeColor =
          typeof data?.primaryColor === "string" && data.primaryColor.trim()
            ? data.primaryColor.trim()
            : "#111827";
        const safeWelcome =
          typeof data?.welcomeMessage === "string" && data.welcomeMessage.trim()
            ? data.welcomeMessage
            : "Hi there, How can I help you today?";
        const safeAvatar =
          typeof data?.avatarSrc === "string" && data.avatarSrc.trim()
            ? data.avatarSrc
            : AVATAR_PRESETS[0].src;

        setPrimaryColor(safeColor);
        setWelcomeMessage(safeWelcome);
        setAvatarSrc(safeAvatar);
        if (typeof data?.widgetId === "string" && data.widgetId.trim()) {
          setWidgetId(data.widgetId);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Error loading chatbot metadata:", error);
          toast.error("Failed to load chatbot configuration");
        }
      } finally {
        setIsLoadingMeta(false);
      }
    };

    fetchMetadata();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchSections = async () => {
      try {
        const response = await fetch("/api/sections/fetch", {
          method: "GET",
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status !== 401) {
            toast.error("Could not load chatbot sections");
          }
          return;
        }

        const rows = (await response.json()) as SectionRecord[];
        const normalized = Array.isArray(rows)
          ? rows.filter((row) => typeof row?.id === "string" && typeof row?.name === "string")
          : [];

        setSectionRecords(normalized);
        setSections(normalized.map((row) => ({ id: row.id, name: row.name })));

        setActiveSection((prev) => {
          if (normalized.length === 0) return null;
          if (prev && normalized.some((row) => row.id === prev)) return prev;
          return normalized[0].id;
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Error loading sections:", error);
          toast.error("Failed to load sections");
        }
      }
    };

    fetchSections();

    return () => controller.abort();
  }, []);

  const handleSend = async () => {
    if (!activeSection || isTyping) return;
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const userMsg: Message = { role: "user", content: trimmedInput };
    const nextMessages = [...messages, userMsg];
    const selectedSection = sectionRecords.find((section) => section.id === activeSection);

    let sourceIds: string[] = [];
    if (selectedSection?.source_ids) {
      try {
        const parsed = JSON.parse(selectedSection.source_ids) as unknown;
        if (Array.isArray(parsed)) {
          sourceIds = parsed.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
        }
      } catch {
        sourceIds = [];
      }
    }

    setMessages(nextMessages);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages,
          section_id: activeSection,
          knowledge_source_ids: sourceIds,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage =
        typeof data?.message === "string" && data.message.trim()
          ? data.message.trim()
          : "Sorry, I could not generate a response.";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantMessage },
      ]);
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setIsTyping(false); // Remove the typing indicator
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSectionClick = (id: string) => {
    setActiveSection(id);
    const sectionName = sections.find((section) => section.id === id)?.name ?? id;
    toast.info(`Switched to ${sectionName} context`);
    // Reset chat messages when switching context to avoid confusion
    setMessages([]);
    setIsTyping(false);
  };

  const handleReset = () => {
    setMessages([]);
    setIsTyping(false);
    toast.success("Chat reset");
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const res = await fetch("/api/chatbot/metadata/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          primaryColor: primaryColor.trim() || "#111827",
          welcomeMessage: welcomeMessage.trim() || "Hi there, How can I help you today?",
          avatarSrc,
        }),
      });

      if (!res.ok) {
        toast.error("Failed to save changes. Please try again.");
        return;
      }

      const updatedData = await res.json();
      const data = updatedData?.data ?? updatedData;
      if (data?.primaryColor) setPrimaryColor(data.primaryColor);
      if (data?.welcomeMessage) setWelcomeMessage(data.welcomeMessage);
      if (data?.avatarSrc) setAvatarSrc(data.avatarSrc);
      if (data?.widgetId) setWidgetId(data.widgetId);
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error("Error in handleSave:", error);
      toast.error("A network error occurred.");
    } finally {
      setIsSaving(false);
    }
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
                  onClick={handleSave}
                  disabled={isSaving || isLoadingMeta}
                  className="h-9 w-full gap-2 rounded-xl text-primary-foreground shadow-md transition-all hover:shadow-lg active:scale-[0.99]"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving…" : isLoadingMeta ? "Loading…" : "Save Changes"}
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