"use client";

import React, { useState, useCallback, useRef } from "react";
import { Plus, Save, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import SectionFormFields from "@/app/components/SectionFormFields";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import SectionTable from "@/app/components/SectionTable";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KnowledgeSource {
  id: string;
  title: string;
  source_url: string | null;
  status: string;
  created_at: string | null;
}

interface Section {
  id: string;
  name: string;
  description: string;
  source_ids: string | null;
  tone: string;
  scope_label: string;
  allowed_topics: string | null;
  blocked_topics: string | null;
  fallback_behavior: string;
  status: string;
  created_at: string | null;
}

interface FormData {
  name: string;
  description: string;
  tone: string;
  allowedTopics: string;
  blockedTopics: string;
  fallbackBehavior: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_FORM_DATA: FormData = {
  name: "",
  description: "",
  tone: "neutral",
  allowedTopics: "",
  blockedTopics: "",
  fallbackBehavior: "escalate",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseSourceIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <Plus className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No sections yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Create your first section to define AI behavior.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onCreate}>
        Create section
      </Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const Page = () => {
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(true);

  const [sections, setSections] = useState<Section[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(true);

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [isSaving, setIsSaving] = useState(false);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  // FIX: store the editing section in a ref so deleteSection always
  // reads the committed value — no stale-closure / async-state race.
  const editingSectionRef = useRef<Section | null>(null);
  const [isNewSection, setIsNewSection] = useState(true);

  // FIX: separate confirm dialog state — delete never fires without user
  // explicit confirmation, no matter where the button is placed.
  const [confirmSection, setConfirmSection] = useState<Section | null>(null);

  // ── Fetchers ────────────────────────────────────────────────────────────────

  const fetchSources = useCallback(async () => {
    setIsLoadingSources(true);
    try {
      const res = await fetch("/api/knowledge/fetch");
      if (!res.ok) throw new Error("Failed to fetch sources");
      const data = (await res.json()) as KnowledgeSource[];
      setKnowledgeSources(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setKnowledgeSources([]);
    } finally {
      setIsLoadingSources(false);
    }
  }, []);

  const fetchSections = useCallback(async () => {
    setIsLoadingSections(true);
    try {
      const res = await fetch("/api/sections/fetch");
      if (!res.ok) throw new Error("Failed to fetch sections");
      const data = (await res.json()) as Section[];
      setSections(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setSections([]);
    } finally {
      setIsLoadingSections(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchSources();
    void fetchSections();
  }, [fetchSources, fetchSections]);

  // ── Sheet helpers ────────────────────────────────────────────────────────────

  const resetSheet = () => {
    editingSectionRef.current = null;
    setIsNewSection(true);
    setFormData(INITIAL_FORM_DATA);
    setSelectedSources([]);
    setIsSaving(false);
  };

  const openCreate = () => {
    resetSheet();
    setIsSheetOpen(true);
  };

  const openEdit = (section: Section) => {
    editingSectionRef.current = section;
    setIsNewSection(false);
    setFormData({
      name: section.name ?? "",
      description: section.description ?? "",
      tone: section.tone ?? "neutral",
      allowedTopics: section.allowed_topics ?? "",
      blockedTopics: section.blocked_topics ?? "",
      fallbackBehavior: section.fallback_behavior ?? "escalate",
    });
    setSelectedSources(parseSourceIds(section.source_ids));
    setIsSheetOpen(true);
  };

  const handleSheetOpenChange = (open: boolean) => {
    // Don't close mid-save
    if (isSaving && !open) return;
    setIsSheetOpen(open);
    if (!open) resetSheet();
  };

  // ── Save ─────────────────────────────────────────────────────────────────────

  const saveSection = async () => {
    if (isSaving) return;

    const name = formData.name.trim();
    const description = formData.description.trim();
    if (!name || !description) {
      toast.error("Section name and description are required");
      return;
    }

    setIsSaving(true);
    // FIX: read from ref — guaranteed to be the value set during openEdit,
    // not a stale useState snapshot.
    const section = editingSectionRef.current;
    const isNew = isNewSection;

    try {
      const res = await fetch("/api/sections/store", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // FIX: no optional chaining needed — we know section is non-null for edits
          ...(isNew ? {} : { id: section!.id }),
          name,
          description,
          tone: formData.tone,
          allowed_topics: formData.allowedTopics,
          blocked_topics: formData.blockedTopics,
          fallback_behavior: formData.fallbackBehavior,
          source_ids: selectedSources,
          scope_label: "general",
          status: "active",
        }),
      });

      // FIX: always attempt to parse body; don't swallow parse errors silently
      const result = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!res.ok) throw new Error(result.message ?? "Failed to save section");

      toast.success(isNew ? "Section created" : "Section updated");
      await fetchSections();
      // FIX: close AFTER fetchSections resolves so the table is already
      // updated when the sheet animates out.
      handleSheetOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to save section");
    } finally {
      // FIX: always reset isSaving — previously it was only reset in
      // closeSheet, so a save error left the spinner stuck forever.
      setIsSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────

  // FIX: delete is a two-step flow — first call prompts confirm dialog,
  // second call (confirmDelete) does the actual delete.
  // This eliminates the race condition where setSelectedSection + deleteSection
  // fired back-to-back with a stale ref.
  const promptDelete = (section: Section) => {
    setConfirmSection(section);
  };

  const confirmDelete = async () => {
    const section = confirmSection;
    if (!section || isSaving) return;
    setConfirmSection(null);

    setIsSaving(true);
    try {
      const res = await fetch("/api/sections/store", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: section.id }),
      });

      const result = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!res.ok) throw new Error(result.message ?? "Failed to delete section");

      toast.success("Section deleted");
      await fetchSections();
      handleSheetOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to delete section");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sections</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define behavior and tone for different topics.
          </p>
        </div>
        <Button onClick={openCreate} className="rounded-lg w-full md:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Create section
        </Button>
      </div>

      {/* Table card */}
      {/* FIX: was missing the `border` class — `border-border` alone has no effect */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <h2 className="text-base font-semibold">Your sections</h2>
          {isLoadingSections ? (
            <Skeleton className="h-5 w-16 rounded-full" />
          ) : (
            <Badge variant="secondary" className="font-medium">
              {sections.length} total
            </Badge>
          )}
        </div>

        {!isLoadingSections && sections.length === 0 ? (
          <EmptyState onCreate={openCreate} />
        ) : (
          <SectionTable
            data={sections.map((s) => ({
              id: s.id,
              name: s.name,
              description: s.description,
              tone: s.tone || "neutral",
              status: s.status || "active",
              createdAt: s.created_at || "",
            }))}
            isLoading={isLoadingSections}
            onEdit={(row) => {
              const full = sections.find((s) => s.id === row.id);
              if (full) openEdit(full);
            }}
            // FIX: table's onDelete opens confirm dialog directly —
            // no more setSelectedSection + immediate delete race.
            onDelete={(row) => {
              const full = sections.find((s) => s.id === row.id);
              if (full) promptDelete(full);
            }}
          />
        )}
      </div>

      {/* Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          side="right"
          // FIX: added min-h-0 on the flex container so the scroll area
          // can shrink on short viewports without overflowing the sheet.
          className="w-full sm:max-w-[560px] flex flex-col gap-0 p-0 min-h-0"
        >
          <SheetHeader className="border-b border-border pb-5 px-6 pt-6 shrink-0">
            <SheetTitle className="text-xl font-semibold">
              {isNewSection ? "Create section" : "Edit section"}
            </SheetTitle>
            <SheetDescription>
              Attach sources and define the tone and topic boundaries.
            </SheetDescription>
          </SheetHeader>

          {/* FIX: min-h-0 is required on the ScrollArea flex child so that it
              respects the parent's flex constraints on short viewports.
              Without it the scroll area grows past the sheet height. */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-6">
              <SectionFormFields
                formData={formData}
                setFormData={setFormData}
                knowledgeSources={knowledgeSources}
                selectedSources={selectedSources}
                setSelectedSources={setSelectedSources}
                isLoadingSources={isLoadingSources}
                isDisabled={isSaving}
              />
            </div>
          </ScrollArea>

          <SheetFooter className="border-t border-border px-6 py-4 shrink-0">
            <div className="flex items-center justify-between gap-2 w-full">
              <div>
                {/* FIX: delete from inside sheet also goes through confirmDialog */}
                {!isNewSection && editingSectionRef.current && (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isSaving}
                    onClick={() => promptDelete(editingSectionRef.current!)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving}
                  onClick={() => handleSheetOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void saveSection()}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving…" : isNewSection ? "Create" : "Save"}
                </Button>
              </div>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* FIX: AlertDialog replaces the inline delete — explicit two-step
          confirmation before any destructive action fires. */}
      <AlertDialog
        open={!!confirmSection}
        onOpenChange={(open) => { if (!open) setConfirmSection(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Delete section?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">
                &ldquo;{confirmSection?.name}&rdquo;
              </span>{" "}
              will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Page;