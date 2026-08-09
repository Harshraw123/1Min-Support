"use client";

import React, { useEffect, useRef, useState } from "react";

type MetaState =
  | { status: "loading" }
  | { status: "need_login" }
  | { status: "no_chatbot" }
  | { status: "ready"; widgetId: string }
  | { status: "error"; message: string };

/**
 * /test — same flow as production embed:
 * 1) authenticated metadata → real widgetId
 * 2) inject /widget.js with data-id (plain script, not next/script)
 */
export default function TestPage() {
  const [meta, setMeta] = useState<MetaState>({ status: "loading" });
  const injectedWidgetId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/chatbot/metadata/fetch", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });

        if (cancelled) return;

        if (res.status === 401) {
          setMeta({ status: "need_login" });
          return;
        }

        if (!res.ok) {
          setMeta({
            status: "error",
            message: `Metadata request failed (${res.status})`,
          });
          return;
        }

        const payload = (await res.json()) as {
          exists?: boolean;
          data?: { widgetId?: string | null };
        };

        if (cancelled) return;

        const widgetId =
          typeof payload?.data?.widgetId === "string" && payload.data.widgetId.trim()
            ? payload.data.widgetId.trim()
            : null;

        if (!payload?.exists || !widgetId) {
          setMeta({ status: "no_chatbot" });
          return;
        }

        setMeta({ status: "ready", widgetId });
      } catch (err) {
        if (cancelled) return;
        setMeta({
          status: "error",
          message: err instanceof Error ? err.message : "Failed to load metadata",
        });
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (meta.status !== "ready") return;

    const widgetId = meta.widgetId;
    if (injectedWidgetId.current === widgetId) return;

    const globalKey = `__OMS_WIDGET__${widgetId}`;
    const existing = (
      window as unknown as Record<string, { iframe?: HTMLIFrameElement } | undefined>
    )[globalKey];

    if (existing?.iframe?.isConnected) {
      injectedWidgetId.current = widgetId;
      return;
    }

    // Avoid duplicate tags if React remounts; cache-bust so the browser re-runs the IIFE.
    document
      .querySelectorAll(`script[data-oms-test-widget="1"]`)
      .forEach((node) => node.remove());

    const script = document.createElement("script");
    script.src = `/widget.js?oms=${encodeURIComponent(widgetId)}`;
    script.async = true;
    script.setAttribute("data-id", widgetId);
    script.setAttribute("data-theme", "light");
    script.setAttribute("data-oms-test-widget", "1");
    document.body.appendChild(script);
    injectedWidgetId.current = widgetId;
  }, [meta]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-2xl font-bold">Chatbot Test Environment</h1>
        <p className="text-zinc-600 text-sm">
          Loads your real widget ID from chatbot metadata, then injects the same script customers use.
        </p>

        {meta.status === "loading" && (
          <p className="text-zinc-600 text-sm">Loading chatbot metadata…</p>
        )}

        {meta.status === "need_login" && (
          <p className="text-amber-700 text-sm">
            Sign in first, then reload this page. The test page needs your session to read widget
            metadata.
          </p>
        )}

        {meta.status === "no_chatbot" && (
          <p className="text-zinc-600 text-sm">
            No chatbot metadata found. Open Dashboard → Chatbot once to create settings, then reload.
          </p>
        )}

        {meta.status === "error" && (
          <p className="text-red-600 text-sm">{meta.message}</p>
        )}

        {meta.status === "ready" && (
          <p className="text-zinc-500 text-xs break-all">
            Widget ID: {meta.widgetId}
            <br />
            Chat bubble should appear in the bottom-right corner.
          </p>
        )}
      </div>
    </div>
  );
}
