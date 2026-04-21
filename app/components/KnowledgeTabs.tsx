import { Globe, Type, UploadCloud } from "lucide-react";
import { KnowledgeType } from "@/@types/types"; // ✅ Fix: correct import path
import { cn } from "@/lib/utils";

const tabMeta: Record<KnowledgeType, { title: string; icon: React.ReactNode }> = {
  website: { title: "Website", icon: <Globe size={15} /> },
  text:    { title: "Text",    icon: <Type size={15} /> },
  upload:  { title: "Upload",  icon: <UploadCloud size={15} /> },
};

export default function KnowledgeTabs({
  selected,
  onChange,
}: {
  selected: KnowledgeType;
  onChange: (t: KnowledgeType) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {(Object.entries(tabMeta) as [KnowledgeType, typeof tabMeta[KnowledgeType]][]).map(
        ([key, meta]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={cn(
              "flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-[10px] border text-sm transition-all",
              "border-border/40 text-muted-foreground hover:bg-muted hover:border-border/60",
              selected === key &&
                "border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700"
            )}
          >
            {meta.icon}
            <span className="text-[12px] font-medium">{meta.title}</span>
          </button>
        )
      )}
    </div>
  );
}