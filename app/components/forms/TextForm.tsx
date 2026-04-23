import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";

export default function TextForm({
  title,
  content,
  setTitle,
  setContent,
  error,
}: {
  title: string;
  content: string;
  setTitle: (v: string) => void;
  setContent: (v: string) => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-4 min-h-0">
      <div className="flex flex-col gap-1.5">
        <Label className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground">
          Title
        </Label>
        <Input
          placeholder="e.g. Product FAQ"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5 min-h-0 flex-1">
        <Label className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground">
          Content
        </Label>
        <Textarea
          placeholder="Paste your text here…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="resize-none flex-1 min-h-[96px] max-h-[300px] overflow-y-auto"
          required
        />
      </div>
      {error && (
        <p className="text-[12px] text-destructive flex items-center gap-1 flex-shrink-0">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}