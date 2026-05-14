"use client";
import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import ChatContainer from "@/components/chat/ChatContainer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface WidgetConfig {
  color: string;
  businessName?: string;
  welcomeMessage: string;
  avatarSrc?: string;
  defaultSectionId?: string;
}

interface WidgetConfigPayload {
  welcomeMessage?: unknown;
  primaryColor?: unknown;
  color?: unknown;
  businessName?: unknown;
  name?: unknown;
  botImage?: unknown;
  avatarSrc?: unknown;
  defaultSectionId?: unknown;
}

type WidgetSection = { id: string; name: string };
type UiTheme = "light" | "dark" | "system";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BUBBLE_SIZE = { width: "65px", height: "65px" };
const CHAT_SIZE = { width: "400px", height: "600px" };
const DEFAULT_CONFIG: WidgetConfig = {
  color: "#2563eb",
  businessName: "Support Assistant",
  welcomeMessage: "Hi there! How can I help you today?",
};

// SECURITY: Replace "*" with  actual host origin in production.
// e.g. "https://your-customer-site.com"
const POST_MESSAGE_TARGET = "*";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sendResize(width: string, height: string) {
  if (typeof window === "undefined") return;
  const instanceId = readString(new URLSearchParams(window.location.search).get("instanceId"));
  window.parent.postMessage({ type: "resize", width, height, instanceId }, POST_MESSAGE_TARGET);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseUiTheme(value: unknown): UiTheme | undefined {
  if (value === "light" || value === "dark" || value === "system") return value;
  return undefined;
}

function normalizeColor(value: unknown) {
  const color = readString(value);
  return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : undefined;
}

function normalizeConfig(payload?: WidgetConfigPayload | null): WidgetConfig {
  return {
    color:
      normalizeColor(payload?.primaryColor) ??
      normalizeColor(payload?.color) ??
      DEFAULT_CONFIG.color,
    businessName:
      readString(payload?.businessName) ??
      readString(payload?.name) ??
      DEFAULT_CONFIG.businessName,
    welcomeMessage:
      readString(payload?.welcomeMessage) ??
      DEFAULT_CONFIG.welcomeMessage,
    avatarSrc: readString(payload?.botImage) ?? readString(payload?.avatarSrc),
    defaultSectionId: readString(payload?.defaultSectionId),
  };
}

function normalizeSections(value: unknown): WidgetSection[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (section): section is { id: string; name: string } =>
        typeof section?.id === "string" &&
        section.id.trim().length > 0 &&
        typeof section?.name === "string" &&
        section.name.trim().length > 0
    )
    .map((section) => ({ id: section.id.trim(), name: section.name.trim() }));
}

// ---------------------------------------------------------------------------
// Main content (needs Suspense because it calls useSearchParams)
// ---------------------------------------------------------------------------
const EmbedContent = () => {
  const searchParams = useSearchParams();
  const { setTheme } = useTheme();
  const widgetId = readString(searchParams.get("widgetId")) ?? readString(searchParams.get("token"));
  const sessionToken = readString(searchParams.get("sessionToken"));
  const themeFromUrl = parseUiTheme(readString(searchParams.get("theme")));

  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<WidgetConfig>(DEFAULT_CONFIG);
  const [sections, setSections] = useState<WidgetSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [chatToken, setChatToken] = useState(sessionToken ?? widgetId ?? "");
  const [loading, setLoading] = useState(!widgetId && !sessionToken);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (themeFromUrl) setTheme(themeFromUrl);
  }, [themeFromUrl, setTheme]);

  // -------------------------------------------------------------------------
  // 1. Fetch widget config
  //    • Guard against missing token before fetching
  //    • Always send the initial bubble resize, even on failure
  // -------------------------------------------------------------------------
  useEffect(() => {
    setChatToken(sessionToken ?? widgetId ?? "");

    const handleInitMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      if (event.data?.type !== "INIT") return;

      const nextToken = readString(event.data.token);
      const nextConfig = normalizeConfig(event.data.config);
      const nextTheme = parseUiTheme(event.data.theme);

      if (nextToken) setChatToken(nextToken);
      setConfig(nextConfig);
      if (nextTheme) setTheme(nextTheme);
      setError(false);
      setLoading(false);
      sendResize(BUBBLE_SIZE.width, BUBBLE_SIZE.height);
    };

    window.addEventListener("message", handleInitMessage);

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (cancelled || widgetId || sessionToken) return;
      setLoading(false);
      setError(true);
      sendResize(BUBBLE_SIZE.width, BUBBLE_SIZE.height);
    }, 4000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      window.removeEventListener("message", handleInitMessage);
    };
  }, [sessionToken, widgetId, setTheme]);

  useEffect(() => {
    if (!widgetId) {
      if (sessionToken) {
        setLoading(false);
        sendResize(BUBBLE_SIZE.width, BUBBLE_SIZE.height);
      }
      return;
    }

    let cancelled = false;

    const fetchWidgetData = async () => {
      try {
        const response = await fetch(`/api/widget/config?widgetId=${encodeURIComponent(widgetId)}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const nextConfig = normalizeConfig(data?.config ?? data);
        const nextSections = normalizeSections(data?.sections);

        if (!cancelled) {
          setConfig(nextConfig);
          setSections(nextSections);
          setActiveSectionId((current) => {
            if (nextSections.length === 0) return null;
            if (current && nextSections.some((section) => section.id === current)) return current;
            if (
              nextConfig.defaultSectionId &&
              nextSections.some((section) => section.id === nextConfig.defaultSectionId)
            ) {
              return nextConfig.defaultSectionId;
            }
            return nextSections[0].id;
          });
          setError(false);
        }
      } catch (err) {
        console.error("Error loading widget:", err);
        if (!cancelled && !sessionToken) setError(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
          sendResize(BUBBLE_SIZE.width, BUBBLE_SIZE.height);
        }
      }
    };

    fetchWidgetData();
    return () => {
      cancelled = true;
    };
  }, [sessionToken, widgetId]);

  // -------------------------------------------------------------------------
  // 2. Resize iframe whenever open/closed state changes
  // -------------------------------------------------------------------------
  const handleToggle = useCallback((nextOpen: boolean) => {
    setIsOpen(nextOpen);
    sendResize(
      nextOpen ? CHAT_SIZE.width : BUBBLE_SIZE.width,
      nextOpen ? CHAT_SIZE.height : BUBBLE_SIZE.height
    );
  }, []);

  if (loading) return null;

  if (error || !chatToken) return null;

  const primaryColor = config.color;

  return (
    <div className="h-full w-full flex items-end justify-end p-2 bg-transparent overflow-hidden text-foreground">
      {isOpen ? (
        <div
          className="w-full h-full flex flex-col rounded-xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden ring-1 ring-black/6 dark:ring-white/10"
          style={{ animation: "embedZoomIn 200ms ease-out both" }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0 z-20 shadow-sm border-b border-white/15"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                {config.avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={config.avatarSrc}
                    alt={config.businessName || "Assistant"}
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-white/25"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.nextElementSibling?.setAttribute("style", "display: flex");
                    }}
                  />
                ) : null}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-white/20"
                  style={{ display: config.avatarSrc ? "none" : "flex" }}
                  aria-hidden="true"
                >
                  {(config.businessName || "S").charAt(0).toUpperCase()}
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 ring-2 ring-white/30"
                  style={{ animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }}
                />
              </div>

              <div className="flex flex-col leading-tight">
                <span className="font-semibold text-sm text-white truncate max-w-[180px] drop-shadow-sm">
                  {config?.businessName || "Support Assistant"}
                </span>
                <span className="text-[10px] text-white/75">Online</span>
              </div>
            </div>

            <button
              onClick={() => handleToggle(false)}
              aria-label="Close chat"
              className="text-white/80 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden bg-background">
            <ChatContainer
              token={chatToken}
              initialMessage={config.welcomeMessage}
              color={primaryColor}
              sections={sections}
              activeSectionId={activeSectionId}
            />
          </div>
        </div>
      ) : (
        <div className="relative">
          <button
            onClick={() => handleToggle(true)}
            aria-label="Open chat"
            type="button"
            className="relative w-[55px] h-[55px] rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background overflow-hidden"
            style={{ backgroundColor: primaryColor }}
          >
            {config.avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.avatarSrc}
                alt={config.businessName || "Chat"}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextElementSibling?.setAttribute("style", "display: block");
                }}
              />
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" aria-hidden="true">
                <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
              </svg>
            )}
            {config.avatarSrc ? (
              <svg className="hidden" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" aria-hidden="true">
                <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
              </svg>
            ) : null}
          </button>

          <span
            className="pointer-events-none absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-green-400 ring-2 ring-white dark:ring-zinc-900"
            style={{ animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }}
            aria-hidden="true"
          />
        </div>
      )}

      <style>{`
        @keyframes embedZoomIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

const EmbedPage = () => (
  <Suspense fallback={null}>
    <EmbedContent />
  </Suspense>
);

export default EmbedPage;
