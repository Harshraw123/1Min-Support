"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Globe, Type, UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type KnowledgeType = "website" | "text" | "upload";

export interface KnowledgeSubmitPayload {
  type: KnowledgeType;
  websiteUrl?: string;
  textTitle?: string;
  textContent?: string;
  file?: File | null;
}

interface Props {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  defaultTab: KnowledgeType;
  onSubmit?: (payload: KnowledgeSubmitPayload) => void;
  /** Pass your existing sources so the modal can check for duplicates */
  existingSources?: Array<{ type: string; source_url?: string }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/$/, "");
}

// ── Tab metadata ──────────────────────────────────────────────────────────────

const tabMeta: Record<
  KnowledgeType,
  {
    title: string;
    description: string;
    icon: React.ReactNode;
    accent: string;
    iconBg: string;
    activeRing: string;
  }
> = {
  website: {
    title: "Website URL",
    description: "Crawl a public URL and use its content as knowledge.",
    icon: <Globe className="h-4 w-4" />,
    accent: "text-indigo-600",
    iconBg: "bg-indigo-50 text-indigo-600",
    activeRing: "border-indigo-500 bg-indigo-50/60 text-indigo-700",
  },
  text: {
    title: "Text Content",
    description: "Paste FAQs, policies, or notes directly.",
    icon: <Type className="h-4 w-4" />,
    accent: "text-amber-600",
    iconBg: "bg-amber-50 text-amber-600",
    activeRing: "border-amber-500 bg-amber-50/60 text-amber-700",
  },
  upload: {
    title: "File Upload",
    description: "Upload a PDF, DOCX, or text file.",
    icon: <UploadCloud className="h-4 w-4" />,
    accent: "text-emerald-600",
    iconBg: "bg-emerald-50 text-emerald-600",
    activeRing: "border-emerald-500 bg-emerald-50/60 text-emerald-700",
  },
};

const SOURCE_TYPES: KnowledgeType[] = ["website", "text", "upload"];

// ── Component ─────────────────────────────────────────────────────────────────

const AddKnowledgeModal = ({
  isOpen,
  setIsOpen,
  defaultTab,
  onSubmit,
  existingSources = [],
}: Props) => {
  const [selectedType, setSelectedType] = useState<KnowledgeType>(defaultTab);
  const [websiteUrl, setWebsiteUrl]     = useState("");
  const [textTitle, setTextTitle]       = useState("");
  const [textContent, setTextContent]   = useState("");
  const [file, setFile]                 = useState<File | null>(null);
  const [error, setError]               = useState<string | null>(null);

  // Reset to defaultTab whenever the modal opens
  useEffect(() => {
    if (isOpen) setSelectedType(defaultTab);
  }, [defaultTab, isOpen]);

  // Clear errors on any input/tab change
  useEffect(() => {
    setError(null);
  }, [selectedType, websiteUrl, textTitle, textContent, file]);

  const canSubmit = useMemo(() => {
    if (selectedType === "website") return websiteUrl.trim().length > 0;
    if (selectedType === "text")
      return textTitle.trim().length > 0 && textContent.trim().length > 0;
    return Boolean(file);
  }, [file, selectedType, textContent, textTitle, websiteUrl]);

  const resetState = () => {
    setWebsiteUrl("");
    setTextTitle("");
    setTextContent("");
    setFile(null);
    setError(null);
  };

  const handleClose = (open: boolean) => {
    setIsOpen(open);
    if (!open) resetState();
  };

  const handleTabChange = (type: KnowledgeType) => {
    setSelectedType(type);
    setError(null);
  };

  const handleSubmit = () => {
    // ── Website-specific security checks ─────────────────────────────────────
    if (selectedType === "website") {
      // 1. URL validation
      if (!validateUrl(websiteUrl)) {
        setError("Please enter a valid URL (must start with http:// or https://).");
        return;
      }

      // 2. Normalisation — strip trailing slash
      const normalizedInput = normalizeUrl(websiteUrl);

      // 3. Duplicate check
      const exists = existingSources.some((source) => {
        if (source.type !== "website" || !source.source_url) return false;
        return normalizeUrl(source.source_url) === normalizedInput;
      });

      if (exists) {
        setError("This website is already in your knowledge base.");
        return;
      }

      // 4. Proceed with normalised URL
      onSubmit?.({ type: "website", websiteUrl: normalizedInput });
      handleClose(false);
      return;
    }

    // ── Generic submit for text / upload ──────────────────────────────────────
    onSubmit?.({
      type: selectedType,
      textTitle:   selectedType === "text"   ? textTitle.trim()   : undefined,
      textContent: selectedType === "text"   ? textContent.trim() : undefined,
      file:        selectedType === "upload" ? file                : undefined,
    });
    handleClose(false);
  };

  const active = tabMeta[selectedType];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          // Mobile: near full-width, capped at 560 px on larger screens
          "flex w-[95vw] max-w-[560px] flex-col gap-0 overflow-hidden rounded-2xl border border-border/60 p-0 shadow-xl",
          // On very small screens let the modal scroll internally
          "max-h-[90dvh]"
        )}
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <DialogHeader className="shrink-0 border-b border-border/50 bg-muted/20 px-4 py-4 sm:px-6 sm:py-5">
          <DialogTitle className="text-[14px] font-semibold tracking-tight sm:text-[15px]">
            Add knowledge source
          </DialogTitle>
          <DialogDescription className="mt-0.5 text-[12px] text-muted-foreground sm:text-[13px]">
            Connect a URL, paste text, or upload a file to expand your agent's knowledge.
          </DialogDescription>
        </DialogHeader>

        {/* ── Scrollable body ───────────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-6">

            {/* Source type selector */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {SOURCE_TYPES.map((type) => {
                const meta     = tabMeta[type];
                const isActive = selectedType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTabChange(type)}
                    className={cn(
                      "group relative bg-white text-black flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center transition-all duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "sm:gap-2.5 sm:px-3 sm:py-4",
                      isActive
                        ? cn("shadow-sm", meta.activeRing)
                        : "border-border/60 bg-background text-muted-foreground hover:border-border hover:bg-muted/30 hover:shadow-sm"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors sm:h-9 sm:w-9",
                        isActive
                          ? meta.iconBg
                          : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                      )}
                    >
                      {meta.icon}
                    </span>
                    <span className="text-[11px] font-medium leading-tight sm:text-[12.5px]">
                      {meta.title}
                    </span>
                    {isActive && (
                      <span className="absolute right-1.5 top-1.5 sm:right-2 sm:top-2">
                        <CheckCircle2 className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5", meta.accent)} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab description */}
            <p className="text-[11.5px] text-muted-foreground sm:text-[12.5px]">
              {active.description}
            </p>

            {/* ── Form panel ────────────────────────────────────────────────── */}
            <div className="w-full rounded-xl border border-border/50 bg-muted/10 px-4 py-4 sm:px-5 sm:py-5">

              {/* Website URL */}
              {selectedType === "website" && (
                <div className="space-y-1.5">
                  <Label htmlFor="website-url" className="text-[12px] font-medium sm:text-[13px]">
                    Website URL
                  </Label>
                  <Input
                    id="website-url"
                    placeholder="https://example.com/docs"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className={cn(
                      "h-9 w-full bg-background text-[13px] placeholder:text-muted-foreground/60 sm:h-10",
                      error && "border-red-400 focus-visible:ring-red-400"
                    )}
                  />
                  {error ? (
                    <div className="flex items-center gap-1.5 pt-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                      <p className="text-[11.5px] text-red-500">{error}</p>
                    </div>
                  ) : (
                    <p className="pt-0.5 text-[11px] text-muted-foreground sm:text-[11.5px]">
                      Use the root docs or support URL — the crawler expands from there.
                    </p>
                  )}
                </div>
              )}

              {/* Text Content */}
              {selectedType === "text" && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="text-title" className="text-[12px] font-medium sm:text-[13px]">
                      Title
                    </Label>
                    <Input
                      id="text-title"
                      placeholder="e.g. Refund Policy"
                      value={textTitle}
                      onChange={(e) => setTextTitle(e.target.value)}
                      className="h-9 w-full bg-background text-[13px] placeholder:text-muted-foreground/60 sm:h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="text-content" className="text-[12px] font-medium sm:text-[13px]">
                      Content
                    </Label>
                    <Textarea
                      id="text-content"
                      placeholder="Paste your content here…"
                      rows={6}
                      className="min-h-[140px] w-full resize-y bg-background text-[13px] placeholder:text-muted-foreground/60 sm:min-h-[160px]"
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* File Upload */}
              {selectedType === "upload" && (
                <div className="space-y-3">
                  <Label htmlFor="knowledge-file" className="text-[12px] font-medium sm:text-[13px]">
                    Upload file
                  </Label>
                  <div
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors sm:gap-3 sm:px-6 sm:py-8",
                      file
                        ? "border-emerald-300 bg-emerald-50/40"
                        : "border-border/50 bg-background hover:border-border hover:bg-muted/20"
                    )}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted sm:h-10 sm:w-10">
                      <UploadCloud className="h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" />
                    </div>
                    {file ? (
                      <div className="space-y-0.5 px-2">
                        <p className="break-all text-[12.5px] font-medium text-emerald-700 sm:text-[13px]">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground sm:text-[11.5px]">
                          {(file.size / 1024).toFixed(1)} KB · Tap to replace
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <p className="text-[12.5px] font-medium text-foreground sm:text-[13px]">
                          Tap to choose a file
                        </p>
                        <p className="text-[11px] text-muted-foreground sm:text-[11.5px]">
                          PDF, DOC, DOCX, TXT, CSV supported
                        </p>
                      </div>
                    )}
                    {/* Invisible native input covers the entire drop zone */}
                    <Input
                      id="knowledge-file"
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.csv"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <DialogFooter className="shrink-0 flex-row items-center justify-between border-t border-border/50 bg-muted/10 px-4 py-3 sm:px-6 sm:py-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleClose(false)}
            className="text-[12px] text-muted-foreground hover:text-foreground sm:text-[13px]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-8 min-w-[100px] text-[12px] font-medium sm:h-9 sm:min-w-[110px] sm:text-[13px]"
          >
            Save source
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
};

export default AddKnowledgeModal;