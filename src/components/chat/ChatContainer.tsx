"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface ChatContainerProps {
  token: string;
  initialMessage?: string;
  color?: string;
  sections?: ChatSection[];
  activeSectionId?: string | null;
  widgetId?: string | null;
}

type ChatMessage = {
  id?: string;
  role: "user" | "assistant" | "agent" | "system";
  content: string;
  senderName?: string | null;
};

type ChatSection = { id: string; name: string };

function normalizeColor(value?: string) {
  const color = value?.trim();
  return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#2563eb";
}

function storageKey(widgetId: string | null | undefined, suffix: string) {
  return `oms_${widgetId || "default"}_${suffix}`;
}

function readStored(widgetId: string | null | undefined, suffix: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(storageKey(widgetId, suffix));
  } catch {
    return null;
  }
}

function writeStored(widgetId: string | null | undefined, suffix: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(widgetId, suffix), value);
  } catch {
    // Ignore quota / private mode failures — chat still works without persistence.
  }
}

function ensureVisitorId(widgetId: string | null | undefined) {
  const existing = readStored(widgetId, "visitor_id");
  if (existing) return existing;
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `vis_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  writeStored(widgetId, "visitor_id", id);
  return id;
}

function newClientMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cmsg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/** Client-side safety net for escalate markers + offline-queue suffix leaks. */
function sanitizeAssistantContent(content: string) {
  return content
    .replace(/\[\[\s*ESCALATE\b[\s\S]*?\]\]\s*/gi, "")
    .replace(
      /\s*Our support team isn't always online immediately, but your conversation has been saved and an agent will respond as soon as they're available\.?/gi,
      ""
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const ChatContainer = ({
  token,
  initialMessage,
  color,
  sections = [],
  activeSectionId,
  widgetId,
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
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [handlingMode, setHandlingMode] = useState<"AI" | "HUMAN">("AI");
  const [waitingForAgent, setWaitingForAgent] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [inFlight, setInFlight] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const visitorIdRef = useRef<string>("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const hydrate = useCallback(async () => {
    if (!token.trim()) {
      setHydrated(true);
      return;
    }

    visitorIdRef.current = ensureVisitorId(widgetId);
    const storedConversationId = readStored(widgetId, "conversation_id");

    try {
      const params = new URLSearchParams();
      if (storedConversationId) params.set("conversationId", storedConversationId);
      params.set("visitorId", visitorIdRef.current);

      const response = await fetch(`/api/widget/conversation?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token.trim()}` },
      });

      if (response.ok) {
        const data = (await response.json()) as {
          conversation?: {
            id: string;
            handlingMode?: string;
            escalated?: boolean;
          } | null;
          messages?: Array<{
            id: string;
            role: ChatMessage["role"];
            content: string;
            senderName?: string | null;
          }>;
        };

        if (data.conversation?.id) {
          setConversationId(data.conversation.id);
          writeStored(widgetId, "conversation_id", data.conversation.id);
          setHandlingMode(data.conversation.handlingMode === "HUMAN" ? "HUMAN" : "AI");
          setWaitingForAgent(Boolean(data.conversation.escalated));
        }

        const history = Array.isArray(data.messages) ? data.messages : [];
        if (history.length > 0) {
          setMessages(
            history.map((m) => ({
              id: m.id,
              role: m.role,
              content:
                m.role === "assistant" ? sanitizeAssistantContent(m.content) : m.content,
              senderName: m.senderName,
            }))
          );
        } else {
          setMessages([{ role: "assistant", content: resolvedInitialMessage }]);
        }
      }
    } catch (error) {
      console.error("[embed hydrate]", error);
    } finally {
      setHydrated(true);
    }
  }, [token, widgetId, resolvedInitialMessage]);

  useEffect(() => {
    setHydrated(false);
    void hydrate();
  }, [hydrate]);

  // While waiting for a human, poll so agent replies appear without refresh.
  useEffect(() => {
    if (!hydrated || !token.trim() || !conversationId) return;
    if (handlingMode !== "HUMAN" && !waitingForAgent) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const params = new URLSearchParams({
          conversationId,
          visitorId: visitorIdRef.current || ensureVisitorId(widgetId),
        });
        const response = await fetch(`/api/widget/conversation?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token.trim()}` },
        });
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as {
          conversation?: { handlingMode?: string; escalated?: boolean } | null;
          messages?: Array<{
            id: string;
            role: ChatMessage["role"];
            content: string;
            senderName?: string | null;
          }>;
        };
        const history = Array.isArray(data.messages) ? data.messages : [];
        if (history.length > 0 && !cancelled) {
          setMessages(
            history.map((m) => ({
              id: m.id,
              role: m.role,
              content:
                m.role === "assistant" ? sanitizeAssistantContent(m.content) : m.content,
              senderName: m.senderName,
            }))
          );
        }
        if (data.conversation) {
          const nextMode = data.conversation.handlingMode === "HUMAN" ? "HUMAN" : "AI";
          setHandlingMode(nextMode);
          setWaitingForAgent(Boolean(data.conversation.escalated));
        }
      } catch {
        // Ignore transient poll errors.
      }
    };

    const interval = window.setInterval(() => {
      void poll();
    }, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [hydrated, token, conversationId, handlingMode, waitingForAgent, widgetId]);

  // Section switch only resets local preview when there is no persisted conversation yet.
  useEffect(() => {
    if (!hydrated || conversationId) return;
    setMessages([{ role: "assistant", content: resolvedInitialMessage }]);
    setInput("");
    setIsTyping(false);
  }, [activeSectionId, resolvedInitialMessage, hydrated, conversationId]);

  const handleSend = async () => {
    if (
      !token.trim() ||
      !input.trim() ||
      isTyping ||
      inFlight ||
      (hasSections && !activeSectionId)
    ) {
      return;
    }

    const text = input.trim();
    const clientMessageId = newClientMessageId();
    const userMessage: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);
    setInFlight(true);

    try {
      if (!visitorIdRef.current) {
        visitorIdRef.current = ensureVisitorId(widgetId);
      }

      const response = await fetch("/api/widget/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.trim()}`,
        },
        body: JSON.stringify({
          message: text,
          clientMessageId,
          conversationId,
          visitorId: visitorIdRef.current,
          section_id: activeSectionId,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        message?: string | null;
        error?: string;
        conversationId?: string;
        handlingMode?: string;
        waitingForAgent?: boolean;
        aiResponded?: boolean;
        escalated?: boolean;
        messageRole?: ChatMessage["role"];
      };

      if (!response.ok) {
        const errText =
          typeof data?.error === "string" && data.error.trim()
            ? data.error.trim()
            : `Request failed (${response.status})`;
        throw new Error(errText);
      }

      if (typeof data.conversationId === "string" && data.conversationId) {
        setConversationId(data.conversationId);
        writeStored(widgetId, "conversation_id", data.conversationId);
      }

      const nextMode = data.handlingMode === "HUMAN" ? "HUMAN" : "AI";
      setHandlingMode(nextMode);
      setWaitingForAgent(Boolean(data.waitingForAgent || data.escalated));

      if (typeof data.message === "string" && data.message.trim()) {
        const messageRole =
          data.messageRole === "system" ||
          data.messageRole === "agent" ||
          data.messageRole === "user"
            ? data.messageRole
            : "assistant";
        setMessages((prev) => [
          ...prev,
          {
            role: messageRole,
            content:
              messageRole === "assistant"
                ? sanitizeAssistantContent(data.message!.trim())
                : data.message!.trim(),
          },
        ]);
      }
    } catch (e) {
      console.error("[embed chat]", e);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsTyping(false);
      setInFlight(false);
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
      {waitingForAgent || handlingMode === "HUMAN" ? (
        <div className="shrink-0 border-b border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
          Connected with support queue — a human agent will continue this conversation.
        </div>
      ) : null}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => {
          if (message.role === "system") {
            return (
              <div
                key={message.id || index}
                className="mx-auto max-w-[90%] rounded-md border border-dashed border-border px-3 py-1.5 text-center text-[11px] text-muted-foreground"
              >
                {message.content}
              </div>
            );
          }

          const isUser = message.role === "user";
          const isAgent = message.role === "agent";
          return (
            <div
              key={message.id || index}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  isUser
                    ? "text-white"
                    : isAgent
                      ? "border border-sky-500/30 bg-sky-500/10 text-foreground"
                      : "bg-muted text-foreground"
                }`}
                style={isUser ? { backgroundColor: accentColor } : undefined}
              >
                {isAgent && message.senderName ? (
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                    {message.senderName}
                  </div>
                ) : null}
                {message.content}
              </div>
            </div>
          );
        })}
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
        <div ref={bottomRef} />
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
            placeholder={
              handlingMode === "HUMAN"
                ? "Message support…"
                : "Type your message..."
            }
            className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none"
            disabled={isTyping || inFlight || (hasSections && !activeSectionId) || !hydrated}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={
              isTyping ||
              inFlight ||
              !token.trim() ||
              !input.trim() ||
              (hasSections && !activeSectionId) ||
              !hydrated
            }
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
