"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

import KnowledgeTabs from "./KnowledgeTabs";
import WebsiteForm from "./forms/WebsiteForm";
import TextForm from "./forms/TextForm";
import UploadForm from "./forms/UploadForm";

import { KnowledgeSubmitPayload, KnowledgeType } from "@/@types/types";
import { toast } from "sonner";

// ✅ ALL logic now comes from utils
import {
  colorMap,
  tabColorMap,
  getErrorMessage,
  importKnowledgeSource,
  validateUrl,
  normalizeUrl,
  isDuplicateSource,
} from "@/lib/Knowledge_MetaData";

export default function AddKnowledgeModal({
  isOpen,
  setIsOpen,
  onSubmit,
  existingSources = [],
  defaultTab = "website",
}: {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  onSubmit: (data: any) => void | Promise<void>;
  existingSources?: { source_url: string }[];
  defaultTab?: KnowledgeType;
}) {
  const [type, setType] = useState<KnowledgeType>(defaultTab);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setType(defaultTab);
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setUrl("");
    setTitle("");
    setContent("");
    setFile(null);
    setError("");
  };

  const handleTabChange = (t: KnowledgeType) => {
    setType(t);
    setError("");
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    setIsOpen(false);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    // ================= WEBSITE =================
    if (type === "website") {
      if (!validateUrl(url)) {
        setError("Please enter a valid URL");
        return;
      }

      if (isDuplicateSource(url, existingSources)) {
        setError("This source has already been added");
        return;
      }

      const payload: KnowledgeSubmitPayload = {
        type,
        websiteUrl: normalizeUrl(url),
      };

      setIsSubmitting(true);
      setError("");

      try {
        const result = await importKnowledgeSource(payload);
        await onSubmit(result);

        resetForm();
        setIsOpen(false);
        toast.success("Source added successfully");
      } catch (e: unknown) {
        const msg = getErrorMessage(e);
        setError(msg);
        toast.error(msg);
      } finally {
        setIsSubmitting(false);
      }
    }

    // ================= TEXT =================
    else if (type === "text") {
      if (!title.trim() || !content.trim()) {
        setError("Title and content are both required");
        return;
      }

      const payload: KnowledgeSubmitPayload = {
        type,
        textTitle: title.trim(),
        textContent: content.trim(),
      };

      setIsSubmitting(true);
      setError("");

      try {
        const result = await importKnowledgeSource(payload);
        await onSubmit(result);

        resetForm();
        setIsOpen(false);
        toast.success("Text source added");
      } catch (e: unknown) {
        const msg = getErrorMessage(e);
        setError(msg);
        toast.error(msg);
      } finally {
        setIsSubmitting(false);
      }
    }

    // ================= UPLOAD =================
    else if (type === "upload") {
      if (!file) {
        setError("Please select a file to upload");
        return;
      }

      const payload: KnowledgeSubmitPayload = { type, file };

      setIsSubmitting(true);
      setError("");

      try {
        const result = await importKnowledgeSource(payload);
        await onSubmit(result);

        resetForm();
        setIsOpen(false);
        toast.success("File uploaded successfully");
      } catch (e: unknown) {
        const msg = getErrorMessage(e);
        setError(msg);
        toast.error(msg);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent
        className="p-0 gap-0 border-0 shadow-2xl rounded-[18px] max-w-[460px] w-full"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-7 pt-7 pb-5">
          <div>
            <DialogTitle asChild>
              <h2 className="text-[17px] font-medium text-foreground leading-snug">
                Add knowledge source
              </h2>
            </DialogTitle>
            <DialogDescription asChild>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                Connect a website, paste text, or upload a file
              </p>
            </DialogDescription>
          </div>

          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="w-7 h-7 rounded-lg border border-border/40 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0 mt-0.5 disabled:opacity-50"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-7 pb-7 flex flex-col gap-5">
          <KnowledgeTabs selected={type} onChange={handleTabChange} />

          {type === "website" && (
            <WebsiteForm
              value={url}
              onChange={(v) => {
                setUrl(v);
                setError("");
              }}
              error={error}
            />
          )}

          {type === "text" && (
            <TextForm
              title={title}
              content={content}
              setTitle={(v) => {
                setTitle(v);
                setError("");
              }}
              setContent={(v) => {
                setContent(v);
                setError("");
              }}
              error={error}
            />
          )}

          {type === "upload" && (
            <UploadForm
              file={file}
              setFile={(f) => {
                setFile(f);
                setError("");
              }}
              error={error}
            />
          )}

          <div className="border-t border-border/30" />

          {/* Footer */}
          <div className="flex justify-end gap-2">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-9 px-4 rounded-lg border border-border/50 text-[13px] font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`h-9 px-5 rounded-lg ${colorMap[tabColorMap[type]].bg
                } hover:opacity-90 text-[13px] font-medium ${colorMap[tabColorMap[type]].text
                } transition-colors disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? "Adding..." : "Add source"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}