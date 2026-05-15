"use client";

import React from "react";
import { Globe, FileText, Type } from "lucide-react";
import { KnowledgeType } from "@/@types/types";

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
    indigo: { bg: "bg-primary/10", text: "text-primary" },
    emerald: { bg: "bg-emerald-500/12", text: "text-emerald-600 dark:text-emerald-400" },
    amber: { bg: "bg-brand-orange/12", text: "text-brand-orange" },
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-1">
      {actions.map((action) => {
        const colors = colorMap[action.colorClass];

        return (
          <button
            key={action.id}
            onClick={() => onOpenModal(action.id)}
            className="flex flex-col items-center gap-3.5 rounded-xl border border-border bg-card p-6 text-center shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-muted/45 hover:shadow-md active:scale-[0.98]"
          >
            {/* Icon */}
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center ${colors.bg} ${colors.text}`}
            >
              {action.icon}
            </div>

            {/* Text */}
            <div>
              <p className="mb-1 text-sm font-semibold text-foreground">
                {action.title}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
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
