"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

import KnowledgeTabs from "./KnowledgeTabs";
import WebsiteForm from "@/components/forms/WebsiteForm";
import TextForm from "@/components/forms/TextForm";
import UploadForm from "@/components/forms/UploadForm";

import { KnowledgeSubmitPayload, KnowledgeType } from "@/types";
import { toast } from "sonner";

import {
  colorMap,
  tabColorMap,
  getErrorMessage,
  importKnowledgeSource,
  validateUrl,
  normalizeUrl,
  isDuplicateSource,
} from "@/lib/knowledge";

type ExistingSource = { source_url: string };

interface AddKnowledgeModalProps {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  onSubmit: (data: any) => void | Promise<void>;
  existingSources?: ExistingSource[];
  defaultTab?: KnowledgeType;
}

export default function AddKnowledgeModal({
  isOpen,
  setIsOpen,
  onSubmit,
  existingSources = [],
  defaultTab = "website",
}: AddKnowledgeModalProps) {
  // Modal website/text/upload input ko ek common knowledge import flow me convert karta hai.
  const [type, setType] = useState<KnowledgeType>(defaultTab);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeColors = colorMap[tabColorMap[type]];

  const isWebsiteValid = useMemo(() => {
    if (type !== "website") return false;
    if (!url.trim()) return false;
    if (!validateUrl(url)) return false;
    if (isDuplicateSource(url, existingSources)) return false;
    return true;
  }, [type, url, existingSources]);

  const isTextValid = useMemo(() => {
    if (type !== "text") return false;
    return Boolean(title.trim() && content.trim());
  }, [type, title, content]);

  const isUploadValid = useMemo(() => {
    if (type !== "upload") return false;
    return Boolean(file);
  }, [type, file]);

  const isFormValid = useMemo(() => {
    if (type === "website") return isWebsiteValid;
    if (type === "text") return isTextValid;
    if (type === "upload") return isUploadValid;
    return false;
  }, [type, isWebsiteValid, isTextValid, isUploadValid]);

  useEffect(() => {
    if (isOpen) {
      setType(defaultTab);
      resetForm();
    }
  }, [isOpen, defaultTab]);

  const resetForm = () => {
    setUrl("");
    setTitle("");
    setContent("");
    setFile(null);
    setError("");
    setIsSubmitting(false);
  };

  const handleTabChange = (nextType: KnowledgeType) => {
    if (isSubmitting) return;
    setType(nextType);
    setError("");
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    setIsOpen(false);
  };

  const buildPayload = (): KnowledgeSubmitPayload | null => {
    // Active tab ke hisaab se payload banta hai aur invalid input yahin block hota hai.
    if (type === "website") {
      if (!url.trim()) {
        setError("Please enter a URL");
        return null;
      }

      if (!validateUrl(url)) {
        setError("Please enter a valid URL");
        return null;
      }

      if (isDuplicateSource(url, existingSources)) {
        setError("This source has already been added");
        return null;
      }

      return {
        type,
        websiteUrl: normalizeUrl(url),
      };
    }

    if (type === "text") {
      if (!title.trim() || !content.trim()) {
        setError("Title and content are both required");
        return null;
      }

      return {
        type,
        textTitle: title.trim(),
        textContent: content.trim(),
      };
    }

    if (type === "upload") {
      if (!file) {
        setError("Please select a file to upload");
        return null;
      }

      return {
        type,
        file,
      };
    }

    setError("Invalid source type");
    return null;
  };

  const getSuccessMessage = () => {
    if (type === "website") return "Source added successfully";
    if (type === "text") return "Text source added";
    return "File uploaded successfully";
  };

  const getLoadingLabel = () => {
    if (type === "website") return "Adding website...";
    if (type === "text") return "Adding text...";
    return "Uploading file...";
  };

  const handleSubmit = async () => {
    // Final payload ko knowledge API tak bhejkar parent table refresh karwate hain.
    if (isSubmitting) return;

    const payload = buildPayload();
    if (!payload) return;

    setIsSubmitting(true);
    setError("");

    try {
      const result = await importKnowledgeSource(payload);
      await onSubmit(result);

      resetForm();
      setIsOpen(false);
      toast.success(getSuccessMessage());
    } catch (e: unknown) {
      const msg = getErrorMessage(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          if (isSubmitting) return;
          handleClose();
          return;
        }

        setIsOpen(true);
      }}
    >
      <DialogContent
        className="p-0 gap-0 border-0 shadow-2xl rounded-[18px] max-w-[460px] w-full"
        showCloseButton={false}
        onEscapeKeyDown={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
      >
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
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            className="w-7 h-7 rounded-lg border border-border/40 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0 mt-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-7 pb-7 flex flex-col gap-5">
          <div className={isSubmitting ? "pointer-events-none opacity-70" : ""}>
            <KnowledgeTabs
              selected={type}
              onChange={handleTabChange}
            />
          </div>

          {type === "website" && (
            <WebsiteForm
              value={url}
              onChange={(v) => {
                if (isSubmitting) return;
                setUrl(v);
                setError("");
              }}
              error={error}
              disabled={isSubmitting}
            />
          )}

          {type === "text" && (
            <TextForm
              title={title}
              content={content}
              setTitle={(v) => {
                if (isSubmitting) return;
                setTitle(v);
                setError("");
              }}
              setContent={(v) => {
                if (isSubmitting) return;
                setContent(v);
                setError("");
              }}
              error={error}
              disabled={isSubmitting}
            />
          )}

          {type === "upload" && (
            <UploadForm
              file={file}
              setFile={(f) => {
                if (isSubmitting) return;
                setFile(f);
                setError("");
              }}
              error={error}
              disabled={isSubmitting}
            />
          )}

          <div className="border-t border-border/30" />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-9 px-4 rounded-lg border border-border/50 text-[13px] font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !isFormValid}
              aria-busy={isSubmitting}
              className={`h-9 px-5 rounded-lg inline-flex items-center gap-2 ${activeColors.bg} hover:opacity-90 text-[13px] font-medium ${activeColors.text} transition-colors disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {getLoadingLabel()}
                </>
              ) : (
                "Add source"
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
