import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Send } from "lucide-react";
import { cn } from "@/lib/utils";

import { ChatSimulatorProps } from "@/@types/types";
import Image from "next/image";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Section {
  id: string;
  name: string;
}


const Avatar = ({ color, src }: { color: string; src: string }) => (
  <div
    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm transition-colors duration-300"
    style={{ backgroundColor: color }}
  >


<Image
  src={src}
  alt="Bot"
  width={28}
  height={28}
  loading="lazy"
  className="h-7 w-7 object-contain"
/>
  </div>
);

const ChatSimulator = ({
  messages,
  primaryColor,
  avatarSrc,
  input,
  setInput,
  handleSend,
  handleKeyDown,
  isTyping,
  handleReset,
  scrollRef,
  welcomeMessage,
  activeSection,
  sections,
  handleSectionClick,
}: ChatSimulatorProps) => {
  const canSend = !!activeSection && !isTyping && !!input.trim();

  return (
    <div className="flex h-full  w-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/30 bg-linear-to-br from-primary/5 to-accent/5 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" />
            <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-sm font-medium text-foreground">Test Environment</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="h-7 gap-1.5 rounded-full px-2.5 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-3 w-3" />
          Reset
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 bg-linear-to-b from-secondary/30 via-background to-background">
        <div className="flex flex-col gap-3 px-5 py-5">
          {/* Welcome bubble */}
          <div className="flex items-start gap-2.5">
            <Avatar color={primaryColor} src={avatarSrc} />
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white/90 px-4 py-2.5 text-sm text-foreground shadow-sm ring-1 ring-border/40">
              {welcomeMessage || "Hi there, How can I help you today?"}
            </div>
          </div>

          {/* Categories shown as pills under welcome */}
          {!activeSection && sections.length > 0 && (
            <div className="ml-11 flex flex-wrap gap-1.5">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSectionClick(s.id)}
                  className="rounded-full border border-border/60 bg-white/60 px-3 py-1 text-[11px] font-medium text-muted-foreground transition-all hover:border-primary/30 hover:bg-white hover:text-foreground"
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2.5 animate-fade-in",
                m.role === "user" && "flex-row-reverse"
              )}
            >
              {m.role === "assistant" && <Avatar color={primaryColor} src={avatarSrc} />}
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                  m.role === "user"
                    ? "rounded-tr-sm text-white"
                    : "rounded-tl-sm bg-white/90 text-foreground ring-1 ring-border/40"
                )}
                style={m.role === "user" ? { backgroundColor: primaryColor } : undefined}
              >
                {m.content}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-start gap-2.5">
              <Avatar color={primaryColor} src={avatarSrc} />
              <div className="rounded-2xl rounded-tl-sm bg-white/90 px-4 py-3 shadow-sm ring-1 ring-border/40">
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" />
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-white/30 bg-white/60 px-4 py-3 backdrop-blur-xl">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!activeSection || isTyping}
            placeholder={
              activeSection ? "Type a message…" : "Please select a category above to start..."
            }
            className={cn(
              "min-h-[44px] max-h-[100px] resize-none rounded-xl border-border/60 bg-background pr-12 text-sm focus-visible:ring-1 focus-visible:ring-primary/40",
              (!activeSection || isTyping) && "cursor-not-allowed opacity-70"
            )}
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!canSend}
            className="absolute bottom-1.5 right-1.5 h-8 w-8 rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-40"
            style={{
              backgroundColor: canSend ? primaryColor : undefined,
            }}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatSimulator;
