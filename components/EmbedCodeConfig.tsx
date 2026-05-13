"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Terminal } from "lucide-react";
import { toast } from "sonner";

interface EmbedCodeConfigProps {
  /**
   * Back-compat: this was originally named `chatbotId`.
   * We also accept `widgetId` because the embed snippet uses `data-id`.
   */
  chatbotId?: string;
  widgetId?: string;
  /**
   * Optional override for script URL. Defaults to the production widget host.
   */
  scriptSrc?: string;
}

const DEFAULT_WIDGET_SRC = "https://1-min-support.vercel.app/widget.js";

const EmbedCodeConfig = ({ chatbotId, widgetId, scriptSrc }: EmbedCodeConfigProps) => {
  const [copied, setCopied] = useState(false);

  const resolvedId = chatbotId ?? widgetId;
  const resolvedSrc = scriptSrc || DEFAULT_WIDGET_SRC;

  const codeSnippet = resolvedId
    ? `<script src="${resolvedSrc}"\n  data-id="${resolvedId}"\n  data-theme="system"\n  defer>\n</script>`
    : `<script src="${resolvedSrc}"\n  data-id="YOUR_WIDGET_ID"\n  data-theme="system"\n  defer>\n</script>`;

  const handleCopyCode = async () => {
    if (!resolvedId) {
      toast.error("Widget ID is missing");
      return;
    }
    try {
      await navigator.clipboard.writeText(codeSnippet);
      setCopied(true);
      toast.success("Embed code copied!");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy embed code");
    }
  };

  return (
    <Card className="glass overflow-hidden rounded-2xl border-white/40 p-0">
      <CardContent className="p-0">
        {/* Header Area */}
        <div className="flex items-center gap-2 border-b border-white/30 bg-linear-to-br from-primary/5 to-accent/5 px-5 py-3">
          <Terminal className="h-4 w-4 text-primary" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
            Install Chatbot
          </h3>
        </div>

        {/* Code Block Area (From Video Layout) */}
        <div className="group relative bg-muted/20 px-5 py-4">
          <pre className="overflow-x-auto whitespace-pre rounded-xl border border-border/60 bg-background/70 p-4 text-[12px] leading-relaxed text-foreground/80 backdrop-blur">
            {codeSnippet}
          </pre>

          {/* Copy Button - Styled as per video frame at 04:57:45 */}
          <Button
            size="icon"
            variant="secondary"
            className="absolute right-7 top-7 h-7 w-7 rounded-lg border border-border/60 bg-background/80 text-foreground transition-all hover:bg-background"
            onClick={handleCopyCode}
            disabled={!resolvedId}
            aria-label="Copy embed code"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Footer Info */}
        <div className="px-5 py-4">
          <p className="text-[11px] leading-normal text-muted-foreground">
            Paste this script tag into the{" "}
            <code className="text-foreground">&lt;head&gt;</code> or at the end
            of the <code className="text-foreground">&lt;body&gt;</code>{" "}
            section of your HTML.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmbedCodeConfig;
