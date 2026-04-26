"use client";

import React, { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import SectionFormFields from "@/app/components/SectionFormFields";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import SectionSkeletonCard from "@/app/components/SectionSkeletonCard";

// --- Interfaces ---
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

const INITIAL_FORM_DATA: FormData = {
  name: "",
  description: "",
  tone: "neutral",
  allowedTopics: "",
  blockedTopics: "",
  fallbackBehavior: "escalate",
};

// --- Skeleton Card ---


const Page = () => {
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(true);

  const [sections, setSections] = useState<Section[]>([]);
  const [isLoadingSections, setIsLoadingSections] = useState(true);

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [isSaving, setIsSaving] = useState(false);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<Section | "new" | null>(null);

  const fetchSources = async () => {
    setIsLoadingSources(true);
    try {
      const res = await fetch("/api/knowledge/fetch", { method: "GET" });
      if (!res.ok) throw new Error("Failed to fetch sources");
      const data = (await res.json()) as KnowledgeSource[];
      setKnowledgeSources(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setKnowledgeSources([]);
    } finally {
      setIsLoadingSources(false);
    }
  };

  const fetchSections = async () => {
    setIsLoadingSections(true);
    try {
      const res = await fetch("/api/sections/fetch", { method: "GET" });
      if (!res.ok) throw new Error("Failed to fetch sections");
      const data = (await res.json()) as Section[];
      setSections(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setSections([]);
    } finally {
      setIsLoadingSections(false);
    }
  };

  React.useEffect(() => {
    void fetchSources();
    void fetchSections();
  }, []);

  const parseSourceIds = (raw: string | null): string[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((v) => typeof v === "string") as string[];
    } catch {
      return [];
    }
  };

  const openCreate = () => {
    setSelectedSection("new");
    setFormData(INITIAL_FORM_DATA);
    setSelectedSources([]);
    setIsSheetOpen(true);
  };

  const openEdit = (section: Section) => {
    setSelectedSection(section);
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

  const closeSheet = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setSelectedSection(null);
      setFormData(INITIAL_FORM_DATA);
      setSelectedSources([]);
      setIsSaving(false);
    }
  };

  const saveSection = async () => {
    if (isSaving) return;
    const name = formData.name.trim();
    const description = formData.description.trim();
    if (!name || !description) {
      toast.error("Section name and description are required");
      return;
    }

    setIsSaving(true);
    try {
      const isNew = selectedSection === "new";
      const res = await fetch("/api/sections/store", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: isNew ? undefined : selectedSection?.id,
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

      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result?.message || "Failed to save section");

      toast.success(isNew ? "Section created" : "Section updated");
      await fetchSections();
      closeSheet(false);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to save section");
      setIsSaving(false);
    }
  };

  const deleteSection = async () => {
    if (!selectedSection || selectedSection === "new") return;
    if (isSaving) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/sections/store", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedSection.id }),
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result?.message || "Failed to delete section");

      toast.success("Section deleted");
      await fetchSections();
      closeSheet(false);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to delete section");
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sections</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define behavior and tone for different topics.
          </p>
        </div>
        <Button onClick={openCreate} className="rounded-lg">
          <Plus className="w-4 h-4 mr-2" />
          Create section
        </Button>
      </div>

      <Card className="rounded-2xl border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold">Your sections</CardTitle>
            {isLoadingSections ? (
              <Skeleton className="h-5 w-16 rounded-full" />
            ) : (
              <Badge variant="secondary" className="font-medium">
                {sections.length} total
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingSections ? (
            <div className="grid gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SectionSkeletonCard key={i} />
              ))}
            </div>
          ) : sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                <Plus className="text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium">No sections yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Create your first section to control how your chatbot responds.
              </p>
              <Button onClick={openCreate} className="mt-5 rounded-lg">
                Create section
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {sections.map((s) => {
                const attached = parseSourceIds(s.source_ids);
                return (
                  <button
                    key={s.id}
                    onClick={() => openEdit(s)}
                    className="text-left rounded-xl border border-border bg-background/40 hover:bg-muted/40 transition-colors p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{s.name}</p>
                          <Badge variant="secondary" className="capitalize">
                            {s.tone || "neutral"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {s.description}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-muted-foreground">
                          {attached.length} sources
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 capitalize">
                          {s.status}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={closeSheet}>
      <SheetContent
        side="right"
       className="w-full sm:max-w-[560px] flex flex-col gap-0 p-0"  // flex flex-col add kiya
        >

          <SheetHeader className="border-b border-border pb-5 px-6 pt-6 shrink-0"> 
            <SheetTitle className="text-xl font-semibold">
              {selectedSection === "new" ? "Create section" : "Edit section"}
            </SheetTitle>
            <SheetDescription>
              Attach sources and define the tone and topic boundaries.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 overflow-y-auto"> 
            <div className="px-6 py-6">
              <SectionFormFields
                formData={formData}
                setFormData={setFormData}
                knowledgeSources={knowledgeSources}
                selectedSources={selectedSources}
                setSelectedSources={setSelectedSources}
                isLoadingSources={isLoadingSources}
                isDisabled={false}
              />
            </div>
          </ScrollArea>


          <SheetFooter className="border-t border-border px-6 py-4 shrink-0"> 
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-2">
                {selectedSection !== "new" && selectedSection && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={deleteSection}
                    disabled={isSaving}
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
                  onClick={() => closeSheet(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={saveSection} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving
                    ? "Saving…"
                    : selectedSection === "new"
                      ? "Create"
                      : "Save"}
                </Button>
              </div>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Page;