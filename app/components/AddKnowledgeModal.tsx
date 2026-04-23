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
import { normalizeUrl, validateUrl } from "@/lib/helpers";
import { KnowledgeSubmitPayload, KnowledgeType } from "@/@types/types";
import { toast } from "sonner";

const colorMap: Record<string, { bg: string; text: string }> = {
  indigo: { bg: "bg-[#534AB7]", text: "text-white" },
  emerald: { bg: "bg-[#0F6E56]", text: "text-white" },
  amber: { bg: "bg-[#854F0B]", text: "text-white" },
};

const tabColorMap: Record<KnowledgeType, string> = {
  website: "indigo",
  upload: "emerald",
  text: "amber",
};

export default function AddKnowledgeModal({
  isOpen,
  setIsOpen,
  onSubmit,
  existingSources = [],
  defaultTab = "website",
}: {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  onSubmit: (data: any) => void | Promise<void>; // updated to accept result
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
  }, [isOpen]); // ✅ fixed dependency

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

  const getErrorMessage = (e: unknown) => {
    if (e instanceof Error) return e.message;
    if (typeof e === "string") return e;
    return "Failed to import source";
  };

  const handleImportSource = async (data: KnowledgeSubmitPayload) => {
    let response: Response | undefined;

    if (data.type === "website") {
      response = await fetch("/api/knowledge/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "website",
          websiteUrl: data.websiteUrl,
        }),
      });
    } else if (data.type === "text") {
      response = await fetch("/api/knowledge/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "text",
          title: data.textTitle,
          content: data.textContent,
        }),
      });
    } else if (data.type === "upload" && data.file) {
      const formData = new FormData();
      formData.append("file", data.file);

      response = await fetch("/api/knowledge/store", {
        method: "POST",
        body: formData,
      });
    }

    if (!response) {
      throw new Error("Unsupported knowledge type");
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result?.message || "Something went wrong");
    }

    return result;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (type === "website") {
      if (!validateUrl(url)) {
        setError("Please enter a valid URL");
        return;
      }

      const normalized = normalizeUrl(url);
      const exists = existingSources.some(
        (s) => normalizeUrl(s.source_url) === normalized
      );

      if (exists) {
        setError("This source has already been added");
        return;
      }

      const payload: KnowledgeSubmitPayload = {
        type,
        websiteUrl: normalized,
      };

      setIsSubmitting(true);
      setError("");

      try {
        const result = await handleImportSource(payload);
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
    } else if (type === "text") {
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
        const result = await handleImportSource(payload);
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
    } else if (type === "upload") {
      if (!file) {
        setError("Please select a file to upload");
        return;
      }

      const payload: KnowledgeSubmitPayload = { type, file };

      setIsSubmitting(true);
      setError("");

      try {
        const result = await handleImportSource(payload);
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
            disabled={isSubmitting} // ✅ prevent close while submitting
            className="w-7 h-7 rounded-lg border border-border/40 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0 mt-0.5 disabled:opacity-50"
          >
            <X size={14} />
          </button>
        </div>

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

          <div className="flex justify-end gap-2">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-9 px-4 rounded-lg border border-border/50 text-[13px] hover:cursor-pointer font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`h-9 px-5 rounded-lg ${
                colorMap[tabColorMap[type]].bg
              } hover:opacity-90 text-[13px] hover:cursor-pointer font-medium ${
                colorMap[tabColorMap[type]].text
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