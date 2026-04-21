import { useRef } from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import { AlertCircle } from "lucide-react";

export default function UploadForm({
  file,
  setFile,
  error,
}: {
  file: File | null;
  setFile: (f: File | null) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      {file ? (
        <div className="flex items-center justify-between px-4 py-3 rounded-[10px] border border-border/50 bg-muted">
          <div className="flex items-center gap-2.5">
            <FileText size={16} className="text-muted-foreground" />
            <div>
              <p className="text-[13px] font-medium text-foreground leading-none">{file.name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {(file.size / 1024).toFixed(0)} KB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFile(null)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center gap-2 py-7 rounded-[10px] border border-dashed border-border/60 bg-muted/40 hover:bg-muted hover:border-border transition-colors cursor-pointer w-full"
        >
          <UploadCloud size={20} className="text-muted-foreground" />
          <div className="text-center">
            <p className="text-[13px] text-muted-foreground">
              Drop a file here or{" "}
              <span className="text-primary font-medium">browse</span>
            </p>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">
              PDF, DOCX, TXT up to 10 MB
            </p>
          </div>
        </button>
      )}

      {error && (
        <p className="text-[12px] text-destructive flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}