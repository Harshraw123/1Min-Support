import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

type KnowledgeRow = {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  source_url: string | null;
  meta_data: Record<string, unknown> | string | null;
  created_at: string | null;
};

interface SourceDetailsSheetProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedSource: KnowledgeRow | null;
}

const SourceDetailSheet = ({
  isOpen,
  setIsOpen,
  selectedSource,
}: SourceDetailsSheetProps) => {
  if (!selectedSource) return null;

  const statusLower = (selectedSource.status || "").toLowerCase();
  const sourceLabel = (() => {
    const raw = selectedSource.source_url?.trim();
    if (!raw) return "Manual Entry";
    try {
      const u = new URL(raw);
      return u.hostname.replace(/^www\./, "");
    } catch {
      return raw.replace(/^https?:\/\//, "").replace(/^www\./, "");
    }
  })();
  const createdAtLabel = selectedSource.created_at
    ? new Date(selectedSource.created_at).toLocaleString()
    : "—";

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="right" className="sm:max-w-[640px] w-full">
        <SheetHeader className="border-b border-border pb-5 px-6 pt-6">
          <div className="flex items-center gap-3">
            <SheetTitle className="text-xl font-bold truncate">
  
              {sourceLabel}
            </SheetTitle>
            <Badge
  variant="secondary"
  className={[
    "capitalize flex items-center gap-1.5",
    statusLower === "active"
      ? "text-emerald-600 text-sm bg-transparent"
      : "",
  ].join(" ")}
>
  {statusLower === "active" && (
    <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block" />
  )}
  {selectedSource.status}
</Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">
                 {selectedSource.title || "Source Details"}
          </p>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="px-6 py-6 space-y-6">
            <div>
              <h4 className="text-sm font-medium mb-2 uppercase tracking-wider text-muted-foreground">
                Content Preview
              </h4>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedSource.content || "No content available for this source."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Created At</p>
                <p className="text-sm font-medium">
                  {createdAtLabel}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Source Type</p>
                <p className="text-sm font-medium capitalize">
                  {(selectedSource.type || "").toLowerCase() || "—"}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default SourceDetailSheet;
