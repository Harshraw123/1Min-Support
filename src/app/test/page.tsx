"use client";

import React, { useEffect, useState } from "react";
import Script from "next/script";

type MetaState =
  | { status: "loading" }
  | { status: "need_login" }
  | { status: "no_chatbot" }
  | { status: "ready"; widgetId: string };

const Page = () => {
  const [meta, setMeta] = useState<MetaState>({ status: "loading" });

  useEffect(() => {
    const ac = new AbortController();

    const run = async () => {
      try {
        const res = await fetch("/api/chatbot/metadata/fetch", {
          method: "GET",
          signal: ac.signal,
        });

        if (res.status === 401) {
          setMeta({ status: "need_login" });
          return;
        }

        if (!res.ok) {
          setMeta({ status: "no_chatbot" });
          return;
        }

        const payload = (await res.json()) as {
          exists?: boolean;
          data?: { widgetId?: string | null };
        };

        const wid =
          typeof payload?.data?.widgetId === "string" && payload.data.widgetId.trim()
            ? payload.data.widgetId.trim()
            : null;

        if (!payload?.exists || !wid) {
          setMeta({ status: "no_chatbot" });
          return;
        }

        setMeta({ status: "ready", widgetId: wid });
      } catch {
        if (!ac.signal.aborted) {
          setMeta({ status: "no_chatbot" });
        }
      }
    };

    void run();
    return () => ac.abort();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-foreground text-2xl font-bold">Chatbot Test Environment</h1>
        <p className="text-muted-foreground text-sm">
          Loads your real widget ID from chatbot metadata, then injects the same script customers use.
        </p>

        {meta.status === "loading" && (
          <p className="text-muted-foreground text-sm">Loading chatbot metadata…</p>
        )}

        {meta.status === "need_login" && (
          <p className="text-amber-600 dark:text-amber-400 text-sm">
            Sign in and complete onboarding so a chatbot exists, then reload this page.
          </p>
        )}

        {meta.status === "no_chatbot" && (
          <p className="text-muted-foreground text-sm">
            No chatbot metadata found. Open the dashboard chatbot page once to create settings, then try
            again.
          </p>
        )}

        {meta.status === "ready" && (
          <>
            <p className="text-muted-foreground text-xs break-all">Widget ID: {meta.widgetId}</p>
            <Script src="/widget.js" data-id={meta.widgetId} strategy="lazyOnload" />
          </>
        )}
      </div>
    </div>
  );
};

export default Page;
