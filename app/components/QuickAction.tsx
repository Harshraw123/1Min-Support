"use client";

import React from "react";
import { Globe, FileText, Type } from "lucide-react";
import { KnowledgeType } from "./AddKnowledgeModal";

interface Props {
  onOpenModal: (tab: KnowledgeType) => void;
}

//ye 3 card hai jo display ho rhe'


const QuickActions = ({ onOpenModal }: Props) => {
  const actions: Array<{
    id: KnowledgeType;
    title: string;
    description: string;
    icon: React.ReactNode;
    colorClass: string;
  }> = [
    {
      id: "website",
      title: "Add Website",
      description: "Crawl pages to keep your knowledge base automatically in sync.",
      icon: <Globe className="w-5 h-5" />,
      colorClass: "indigo",
    },
    {
      id: "upload",
      title: "Add Files",
      description: "Upload PDFs, CSVs, or text files as custom context for your chatbot.",
      icon: <FileText className="w-5 h-5" />,
      colorClass: "emerald",
    },
    {
      id: "text",
      title: "Add Text",
      description: "Paste documentation or notes directly into your knowledge layer.",
      icon: <Type className="w-5 h-5" />,
      colorClass: "amber",
    },
  ];

  const colorMap: Record<string, { bg: string; text: string }> = {
    indigo: { bg: "bg-[#EEEDFE]", text: "text-[#534AB7]" },
    emerald: { bg: "bg-[#E1F5EE]", text: "text-[#0F6E56]" },
    amber: { bg: "bg-[#FAEEDA]", text: "text-[#854F0B]" },
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-1">
      {actions.map((action) => {
        const colors = colorMap[action.colorClass];

        return (
          <button
            key={action.id}
            onClick={() => onOpenModal(action.id)}
            className="flex flex-col items-center gap-3.5 text-center p-6 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 cursor-pointer shadow-sm"
          >
            {/* Icon */}
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center ${colors.bg} ${colors.text}`}
            >
              {action.icon}
            </div>

            {/* Text */}
            <div>
              <p className="text-sm font-semibold text-black mb-1">
                {action.title}
              </p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {action.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default QuickActions;