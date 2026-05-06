"use client";

import { KnowledgeType } from "@/@types/types";
import AddKnowledgeModal from "@/app/components/AddKnowledgeModal";
import KnowledgeTable from "@/app/components/KnowledgeTable";
import QuickAction from "@/app/components/QuickAction";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import SourceDetailSheet from "@/app/components/SourceDetailSheet";

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


const Page = () => {
  const [defaultTab, setDefaultTab] = useState<KnowledgeType>("website");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [sources, setSources] = useState<KnowledgeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSourceSheetOpen, setIsSourceSheetOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<KnowledgeRow | null>(null);

  const openModal = (tab: KnowledgeType) => {
    setDefaultTab(tab);
    setIsAddOpen(true);
  };

  const fetchSources = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/knowledge/fetch", { method: "GET" });
      if (!res.ok) throw new Error("Failed to fetch sources");
      const data = (await res.json()) as KnowledgeRow[];
      setSources(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setSources([]);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    void fetchSources();
  }, []);

  const handleKnowledgeSubmit = async () => {
    // Modal already persists; refresh UI after successful submit.
    await fetchSources();
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Knowledge Base
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage your website sources, documents, and uploads here.
          </p>
        </div>
        
        <Button
          onClick={() => openModal("website")}
          className="rounded-lg"
        >
          + Add Knowledge
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Quick Actions Section */}
        <QuickAction onOpenModal={openModal} />
        <KnowledgeTable
          sources={sources}
          isLoading={isLoading}
          onOpenDetails={(source) => {
            setSelectedSource(source as KnowledgeRow);
            setIsSourceSheetOpen(true);
          }}
        />
        
        {/* Knowledge Source List / Content would follow here */}
      </div>

      {/* Modal for adding content */}
      <AddKnowledgeModal
        isOpen={isAddOpen} 
        setIsOpen={setIsAddOpen} 
        defaultTab={defaultTab} 
        onSubmit={handleKnowledgeSubmit}
        existingSources={sources
          .filter((s) => Boolean(s.source_url))
          .map((s) => ({ source_url: s.source_url! }))}
      />
      <SourceDetailSheet
        isOpen={isSourceSheetOpen}
        setIsOpen={(open) => {
          setIsSourceSheetOpen(open);
          if (!open) setSelectedSource(null);
        }}
        selectedSource={selectedSource}
      />
    </div>
  );
};

export default Page;
