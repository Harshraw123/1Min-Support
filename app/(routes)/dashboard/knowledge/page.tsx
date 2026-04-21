"use client";

import { KnowledgeSubmitPayload, KnowledgeType } from "@/@types/types";
import AddKnowledgeModal from "@/app/components/AddKnowledgeModal";




import QuickAction from "@/app/components/QuickAction";
import React, { useState } from "react";


const Page = () => {
  const [defaultTab, setDefaultTab] = useState<KnowledgeType>("website");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const openModal = (tab: KnowledgeType) => {
    setDefaultTab(tab);
    setIsAddOpen(true);
  };

  const handleKnowledgeSubmit = (payload: KnowledgeSubmitPayload) => {
    // Keeping this as a UI flow hook only; persistence can be added later.
    console.log("Knowledge source ready to store:", payload);
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
        
        <button
          onClick={() => openModal("website")}
          className=" text-white bg-black  px-4 py-2 rounded-lg text-sm font-medium hover:cursor-pointer"
        >
          + Add Knowledge
        </button>
      </div>

      <div className="grid gap-6">
        {/* Quick Actions Section */}
        <QuickAction onOpenModal={openModal} />
        
        {/* Knowledge Source List / Content would follow here */}
      </div>

      {/* Modal for adding content */}
      <AddKnowledgeModal
        isOpen={isAddOpen} 
        setIsOpen={setIsAddOpen} 
        defaultTab={defaultTab} 
        onSubmit={handleKnowledgeSubmit}
      />
    </div>
  );
};

export default Page;