"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import KnowledgeTabs from "./KnowledgeTabs";
import WebsiteForm from "./forms/WebsiteForm";
import TextForm from "./forms/TextForm";
import UploadForm from "./forms/UploadForm";
import { normalizeUrl, validateUrl } from "@/lib/helpers";
import { KnowledgeType } from "@/@types/types";

export default function AddKnowledgeModal({
  isOpen,
  setIsOpen,
  onSubmit,
  existingSources = [],
}: {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  onSubmit: (data: any) => void;
  existingSources?: { source_url: string }[];
}) {
  const [type, setType] = useState<KnowledgeType>("website");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const resetForm = () => {
    setUrl("");
    setTitle("");
    setContent("");
    setFile(null);
    setError("");
  };

  const handleTabChange = (t: KnowledgeType) => {
    setType(t);
    setError(""); // ✅ Fix: clear error on tab switch
  };

  const handleClose = () => {
    resetForm();
    setIsOpen(false);
  };

  const handleSubmit = () => {
    if (type === "website") {
      if (!validateUrl(url)) {
        setError("Please enter a valid URL");
        return; // ✅ Fix: explicit return, not return setError(...)
      }
      const normalized = normalizeUrl(url);
      const exists = existingSources.some(
        (s) => normalizeUrl(s.source_url) === normalized
      );
      if (exists) {
        setError("This source has already been added");
        return;
      }
      onSubmit({ type, websiteUrl: normalized });
    } else if (type === "text") {
      // ✅ Fix: validate text fields
      if (!title.trim() || !content.trim()) {
        setError("Title and content are both required");
        return;
      }
      onSubmit({ type, textTitle: title.trim(), textContent: content.trim() });
    } else if (type === "upload") {
      // ✅ Fix: validate file
      if (!file) {
        setError("Please select a file to upload");
        return;
      }
      onSubmit({ type, file });
    }

    resetForm(); 
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="p-0 gap-0 border-0 shadow-2xl rounded-[18px] max-w-[460px] w-full">
        {/* Header */}
        <div className="flex items-start justify-between px-7 pt-7 pb-5">
          <div>
            <h2 className="text-[17px] font-medium text-foreground leading-snug">
              Add knowledge source
            </h2>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Connect a website, paste text, or upload a file
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg border border-border/40 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0 mt-0.5"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-7 pb-7 flex flex-col gap-5">
          {/* Tabs */}
          <KnowledgeTabs selected={type} onChange={handleTabChange} />

          {/* Forms */}
          {type === "website" && (
            <WebsiteForm
              value={url}
              onChange={(v) => { setUrl(v); setError(""); }}
              error={error}
            />
          )}
          {type === "text" && (
            <TextForm
              title={title}
              content={content}
              setTitle={(v) => { setTitle(v); setError(""); }}
              setContent={(v) => { setContent(v); setError(""); }}
              error={error}
            />
          )}
          {type === "upload" && (
            <UploadForm
              file={file}
              setFile={(f) => { setFile(f); setError(""); }}
              error={error}
            />
          )}

          {/* Divider */}
          <div className="border-t border-border/30" />

          {/* Footer */}
          <div className="flex justify-end gap-2">
            <button
              onClick={handleClose}
              className="h-9 px-4 rounded-lg border border-border/50 text-[13px] font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="h-9 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-[13px] font-medium text-white transition-colors"
            >
              Add source
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}