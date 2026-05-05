import { Globe, Type, UploadCloud } from "lucide-react";
import { KnowledgeType } from "@/@types/types";
import { cn } from "@/lib/utils";

const tabMeta: Record<KnowledgeType, { title: string; icon: React.ReactNode; colorClass: string }> = {
  website: { title: "Website", icon: <Globe size={15} />, colorClass: "indigo" },
  upload:  { title: "Upload",  icon: <UploadCloud size={15} />, colorClass: "emerald" },
  text:    { title: "Text",    icon: <Type size={15} />, colorClass: "amber" },
};

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  indigo:  { bg: "bg-[#EEEDFE]", text: "text-[#534AB7]", border: "border-[#534AB7]" },
  emerald: { bg: "bg-[#E1F5EE]", text: "text-[#0F6E56]", border: "border-[#0F6E56]" },
  amber:   { bg: "bg-[#FAEEDA]", text: "text-[#854F0B]", border: "border-[#854F0B]" },
};

export default function KnowledgeTabs({
  selected,
  onChange,
  disabled = false,
}: {
  selected: KnowledgeType;
  onChange: (t: KnowledgeType) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {(Object.entries(tabMeta) as [KnowledgeType, typeof tabMeta[KnowledgeType]][]).map(
        ([key, meta]) => {
          const colors = colorMap[meta.colorClass];
          const isSelected = selected === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              disabled={disabled}
              aria-pressed={isSelected}
              className={cn(
                "flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-[10px] border text-sm transition-all",
                "border-border/40 text-muted-foreground hover:bg-muted hover:border-border/60",
                isSelected && `${colors.border} ${colors.bg} ${colors.text}`,
                disabled && "opacity-60 cursor-not-allowed pointer-events-none"
              )}
            >
              {meta.icon}
              <span className="text-[12px] font-medium">{meta.title}</span>
            </button>
          );
        }
      )}
    </div>
  );
}