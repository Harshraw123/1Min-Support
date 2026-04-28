import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import type { KnowledgeSource, SectionFormFieldsSharedProps } from "./types";

const getSourceLabel = (source: KnowledgeSource) =>
  source.title || source.source_url || source.url || "Untitled";

export function DataSourcesSection({
  knowledgeSources,
  selectedSources,
  setSelectedSources,
  isLoadingSources,
  isDisabled,
}: Pick<
  SectionFormFieldsSharedProps,
  | "knowledgeSources"
  | "selectedSources"
  | "setSelectedSources"
  | "isLoadingSources"
  | "isDisabled"
>) {
  const toggleSource = (id: string) => {
    setSelectedSources(
      selectedSources.includes(id)
        ? selectedSources.filter((x) => x !== id)
        : [...selectedSources, id]
    );
  };

  return (
    <section className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase">
          Data Sources
        </p>

        {selectedSources.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {selectedSources.length} attached
          </Badge>
        )}
      </div>

      <div className="rounded-xl border bg-muted/20 overflow-hidden">
        {isLoadingSources ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : (
          <div className="divide-y max-h-[220px] overflow-y-auto">
            {knowledgeSources.map((source) => {
              const checked = selectedSources.includes(source.id);
              const label = getSourceLabel(source);

              return (
                <label
                  key={source.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                >
                  <Checkbox
                    checked={checked}
                    disabled={isDisabled}
                    onCheckedChange={() => toggleSource(source.id)}
                  />

                  <span className="truncate flex-1 text-sm" title={label}>
                    {label}
                  </span>

                  {checked && (
                    <Badge className="hidden sm:inline-flex text-xs">
                      Attached
                    </Badge>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}