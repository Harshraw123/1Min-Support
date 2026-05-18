"use client";
import React, { useEffect, useState } from "react";

interface ChatContainerProps {
  token: string;
  initialMessage?: string;
  color?: string;
  sections?: ChatSection[];
  activeSectionId?: string | null;
}

type ChatMessage = { role: "user" | "assistant"; content: string };
type ChatSection = { id: string; name: string };

function normalizeColor(value?: string) {
  const color = value?.trim();
  return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#2563eb";
}

const ChatContainer = ({
  token,
  initialMessage,
  color,
  sections = [],
  activeSectionId,
}: ChatContainerProps) => {
  const accentColor = normalizeColor(color);
  const resolvedInitialMessage = initialMessage || "Hi there! How can I help you today?";
  const hasSections = sections.length > 0;
  const widgetThemeStyle = {
    "--widget-primary": accentColor,
  } as React.CSSProperties;

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: resolvedInitialMessage },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    setMessages([{ role: "assistant", content: resolvedInitialMessage }]);
    setInput("");
    setIsTyping(false);
  }, [activeSectionId, resolvedInitialMessage]);

  const handleSend = async () => {
    if (!token.trim() || !input.trim() || isTyping || (hasSections && !activeSectionId)) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/widget/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.trim()}`,
        },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          section_id: activeSectionId,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { message?: string; error?: string };

      if (!response.ok) {
        const errText =
          typeof data?.error === "string" && data.error.trim()
            ? data.error.trim()
            : `Request failed (${response.status})`;
        throw new Error(errText);
      }

      const assistantMessage =
        typeof data?.message === "string" && data.message.trim()
          ? data.message.trim()
          : "Sorry, I could not generate a response.";

      setMessages((prev) => [...prev, { role: "assistant", content: assistantMessage }]);
    } catch (e) {
      console.error("[embed chat]", e);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please refresh and try again.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="widget-chat-theme flex flex-col h-full min-h-0" style={widgetThemeStyle}>
      <style>
        {`
          .widget-chat-theme ::selection {
            background: color-mix(in srgb, var(--widget-primary) 22%, transparent);
            color: inherit;
          }

          .widget-chat-theme ::-moz-selection {
            background: color-mix(in srgb, var(--widget-primary) 22%, transparent);
            color: inherit;
          }

          .widget-chat-theme input:focus {
            border-color: var(--widget-primary);
            box-shadow: 0 0 0 2px color-mix(in srgb, var(--widget-primary) 28%, transparent);
          }
        `}
      </style>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "text-white"
                  : "bg-muted text-foreground"
              }`}
              style={message.role === "user" ? { backgroundColor: accentColor } : undefined}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted text-foreground rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" />
                <div
                  className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                />
                <div
                  className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border p-4 shrink-0">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none"
            disabled={isTyping || (hasSections && !activeSectionId)}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={isTyping || !token.trim() || !input.trim() || (hasSections && !activeSectionId)}
            className="px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={{ backgroundColor: accentColor }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatContainer;
