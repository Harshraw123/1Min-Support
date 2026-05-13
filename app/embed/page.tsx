"use client";
import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ChatContainer from "@/components/chat/ChatContainer";
import Image from "next/image";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface WidgetConfig {
  color?: string;
  businessName?: string;
  welcomeMessage?: string;
  avatarSrc?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BUBBLE_SIZE = { width: "65px", height: "65px" };
const CHAT_SIZE  = { width: "400px", height: "600px" };

// SECURITY: Replace "*" with your actual host origin in production.
// e.g. "https://your-customer-site.com"
const POST_MESSAGE_TARGET = "*";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sendResize(width: string, height: string) {
  window.parent.postMessage({ type: "resize", width, height }, POST_MESSAGE_TARGET);
}

// ---------------------------------------------------------------------------
// Main content (needs Suspense because it calls useSearchParams)
// ---------------------------------------------------------------------------
const EmbedContent = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get("token"); // Unique identifier for the chatbot

  const [isOpen, setIsOpen]   = useState(false);
  const [config, setConfig]   = useState<WidgetConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  // -------------------------------------------------------------------------
  // 1. Fetch widget config
  //    • Guard against missing token before fetching
  //    • Always send the initial bubble resize, even on failure
  // -------------------------------------------------------------------------
  useEffect(() => {
    // No token → show nothing; still size the iframe so the host isn't stuck
    if (!token) {
      sendResize(BUBBLE_SIZE.width, BUBBLE_SIZE.height);
      setLoading(false);
      setError(true);
      return;
    }

    let cancelled = false; // prevent state updates after unmount

    const fetchWidgetData = async () => {
      try {
        const response = await fetch(`/api/widget?token=${token}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data: WidgetConfig = await response.json();

        if (!cancelled) {
          setConfig(data);
          setError(false);
        }
      } catch (err) {
        console.error("Error loading widget:", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
          // Always resize to bubble once we know whether we have a config or not
          sendResize(BUBBLE_SIZE.width, BUBBLE_SIZE.height);
        }
      }
    };

    fetchWidgetData();
    return () => { cancelled = true; };
  }, [token]);

  // -------------------------------------------------------------------------
  // 2. Resize iframe whenever open/closed state changes
  //    • Only runs after loading is complete (guard inside handler)
  //    • Stable callback reference via useCallback
  // -------------------------------------------------------------------------
  const handleToggle = useCallback((nextOpen: boolean) => {
    setIsOpen(nextOpen);
    sendResize(
      nextOpen ? CHAT_SIZE.width  : BUBBLE_SIZE.width,
      nextOpen ? CHAT_SIZE.height : BUBBLE_SIZE.height
    );
  }, []);

  // -------------------------------------------------------------------------
  // Render states
  // -------------------------------------------------------------------------
  if (loading) return null;

  // Silent failure: token missing or fetch failed → render nothing visible.
  // The iframe is already sized to 65×65 so the host layout is not broken.
  if (error || !token) return null;

  const primaryColor = config?.color || "#2563eb";

  return (
    <div className="h-full w-full flex items-end justify-end p-2 bg-transparent overflow-hidden">
      {isOpen ? (
        /* ------------------------------------------------------------------ */
        /* Chat Window                                                         */
        /* ------------------------------------------------------------------ */
        <div
          className="w-full h-full flex flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
          // Use a CSS animation that works without tailwindcss-animate plugin
          style={{ animation: "embedZoomIn 200ms ease-out both" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0 z-20 shadow-sm border-b border-border"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center gap-2.5">
              {/* Avatar — shows image if provided, else initials fallback */}
              <div className="relative shrink-0">
                {config?.avatarSrc ? (
                <Image
                src={config.avatarSrc}
                alt={config?.businessName || "Assistant"}
                fill
                className="rounded-full object-cover ring-2 ring-white/20"
                onError={(e) => {
                  // Hide image and show fallback
                  (e.currentTarget as HTMLImageElement).style.display = "none";
            
                  (
                    e.currentTarget.nextElementSibling as HTMLElement | null
                  )?.style.setProperty("display", "flex");
                }}
              />
                ) : null}
                {/* Initials fallback — always rendered, hidden when image is present */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-white/20"
                  style={{ display: config?.avatarSrc ? "none" : "flex" }}
                  aria-hidden="true"
                >
                  {(config?.businessName || "S").charAt(0).toUpperCase()}
                </div>
                {/* Online indicator dot */}
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 ring-2 ring-white/10"
                  style={{ animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }}
                />
              </div>

              <div className="flex flex-col leading-tight">
                <span className="font-semibold text-sm text-primary-foreground truncate max-w-[180px]">
                  {config?.businessName || "Support Assistant"}
                </span>
                <span className="text-[10px] text-primary-foreground/60">Online</span>
              </div>
            </div>

            <button
              onClick={() => handleToggle(false)}
              aria-label="Close chat"
              className="text-primary-foreground/70 hover:text-primary-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/50 rounded"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Chat body */}
          <div className="flex-1 overflow-hidden bg-background">
            {/* token is guaranteed non-null here (error branch above catches it) */}
            <ChatContainer
              token={token}
              initialMessage={config?.welcomeMessage}
              color={primaryColor}
            />
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------------ */
        /* Floating Bubble                                                     */
        /* ------------------------------------------------------------------ */
        <div className="relative">
          <button
            onClick={() => handleToggle(true)}
            aria-label="Open chat"
            className="w-[55px] h-[55px] rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 overflow-hidden"
            style={{ backgroundColor: primaryColor }}
          >
            {config?.avatarSrc ? (
           <Image
             src={config.avatarSrc}
             alt={config?.businessName || "Chat"}
             fill
             className="object-cover"
             onError={(e) => {
               const btn = (e.currentTarget as HTMLImageElement).parentElement;
               if (btn) {
                 btn.innerHTML = `
                   <svg 
                     width="28" 
                     height="28" 
                     viewBox="0 0 24 24" 
                     fill="none" 
                     stroke="white" 
                     stroke-width="2.5" 
                     aria-hidden="true"
                   >
                     <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/>
                   </svg>
                 `;
               }
             }}
           />
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" aria-hidden="true">
                <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
              </svg>
            )}
          </button>

          {/* Live green dot — always shown on bubble for "online" feel */}
          <span
            className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-green-400 ring-2 ring-white"
            style={{ animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }}
            aria-hidden="true"
          />
        </div>
      )}

      {/* Inline keyframes — no plugin dependency */}
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

// ---------------------------------------------------------------------------
// Shell with required Suspense boundary for useSearchParams
// ---------------------------------------------------------------------------
const EmbedPage = () => (
  <Suspense fallback={null}>
    <EmbedContent />
  </Suspense>
);

export default EmbedPage;