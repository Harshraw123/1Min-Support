import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// ─── Constants ────────────────────────────────────────────────────────────────

const CHAR_LIMITS = {
  name: 80,
  description: 500,
  allowedTopics: 400,
  blockedTopics: 400,
} as const;

const TONE_OPTIONS = [
  { value: "neutral", label: "Neutral" },
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "strict", label: "Strict" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionFormFieldsProps {
  formData: {
    name: string;
    description: string;
    tone: string;
    allowedTopics: string;
    blockedTopics: string;
    fallbackBehavior: string;
  };
  setFormData: (data: SectionFormFieldsProps["formData"]) => void;
  knowledgeSources: Array<{
    id: string;
    title: string;
    source_url?: string | null;
    url?: string;
  }>;
  selectedSources: string[];
  setSelectedSources: (sources: string[]) => void;
  isLoadingSources: boolean;
  isDisabled?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * FIX: was using `truncate` + `break-all` which conflict.
 * Now falls back gracefully: prefer title, then URL (truncated in UI via CSS).
 */
const getSourceLabel = (
  source: SectionFormFieldsProps["knowledgeSources"][number]
) => source.title || source.source_url || source.url || "Untitled";

/**
 * Character counter colour cue — neutral → amber warning at 80% → red at limit.
 */
function CharCount({ value, max }: { value: string; max: number }) {
  const len = value.length;
  const pct = len / max;
  const color =
    pct >= 1
      ? "text-destructive"
      : pct >= 0.8
      ? "text-amber-500"
      : "text-muted-foreground";
  return (
    <p className={`text-right text-[11px] mt-0.5 ${color}`}>
      {len} / {max}
    </p>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const SectionFormFields = ({
  formData,
  setFormData,
  knowledgeSources,
  selectedSources,
  setSelectedSources,
  isLoadingSources,
  isDisabled = false,
}: SectionFormFieldsProps) => {
  const toggleSource = (sourceId: string) => {
    setSelectedSources(
      selectedSources.includes(sourceId)
        ? selectedSources.filter((id) => id !== sourceId)
        : [...selectedSources, sourceId]
    );
  };

  return (
    <div className="space-y-8">

      {/* ── Basics ── */}
      <section className="space-y-4">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Basics
        </p>

        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name">Section name</Label>
          <Input
            id="name"
            placeholder="e.g. FAQ Section"
            disabled={isDisabled}
            maxLength={CHAR_LIMITS.name}
            value={formData.name}
          
            className="truncate"
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
          />
          <CharCount value={formData.name} max={CHAR_LIMITS.name} />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="When should the AI use this section?"
            disabled={isDisabled}
            maxLength={CHAR_LIMITS.description}
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            /*
             * FIX: min-h for comfort, max-h so it never blows out the form,
             * overflow-y-auto keeps scroll inside the field itself.
             * resize-none prevents user from breaking the layout.
             */
            className="min-h-[90px] max-h-[200px] resize-none overflow-y-auto"
          />
          <CharCount value={formData.description} max={CHAR_LIMITS.description} />
        </div>
      </section>

      {/* ── Data Sources ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Data Sources
          </p>
          {selectedSources.length > 0 && (
            <Badge variant="secondary" className="text-xs shrink-0 ml-2">
              {selectedSources.length} attached
            </Badge>
          )}
        </div>

        {/*
         * FIX: max-h + overflow-y-auto so a large list scrolls inside the box
         * instead of pushing the whole form down.
         */}
        <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
          {isLoadingSources ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded shrink-0" />
                  <Skeleton className="h-4 flex-1 min-w-0" />
                </div>
              ))}
            </div>
          ) : knowledgeSources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <p className="text-sm text-muted-foreground">
                No knowledge sources found.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Add sources from the Knowledge page first.
              </p>
            </div>
          ) : (
            /*
             * FIX: max-h + overflow-y-auto on the list itself — many sources
             * scroll inside the box, not the page.
             */
            <div className="divide-y divide-border max-h-[220px] overflow-y-auto">
              {knowledgeSources.map((source) => {
                const isChecked = selectedSources.includes(source.id);
                const label = getSourceLabel(source);
                return (
                  <label
                    key={source.id}
                    htmlFor={`src-${source.id}`}
                    /*
                     * FIX: min-w-0 on the row prevents flex children from
                     * breaking out of the container.
                     */
                    className={[
                      "flex items-center gap-3 px-3 py-3 sm:px-4 min-w-0",
                      "cursor-pointer transition-colors hover:bg-muted/40",
                      isDisabled ? "opacity-50 cursor-not-allowed" : "",
                      isChecked ? "bg-muted/30" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <Checkbox
                      id={`src-${source.id}`}
                      disabled={isDisabled}
                      checked={isChecked}
                      onCheckedChange={() => toggleSource(source.id)}
                      className="shrink-0"
                    />
                    {/*
                     * FIX: dropped conflicting `break-all` — `truncate` alone
                     * is correct here. We add `title` so the full text is
                     * accessible on hover without breaking layout.
                     */}
                    <span
                      className="text-sm min-w-0 flex-1 truncate select-none"
                      title={label}
                    >
                      {label}
                    </span>
                    {/*
                     * FIX: was using non-standard `xs:` breakpoint (Tailwind
                     * has no xs by default). Use `hidden sm:inline-flex` instead.
                     */}
                    {isChecked && (
                      <Badge
                        variant="secondary"
                        className="text-xs shrink-0 hidden sm:inline-flex"
                      >
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

      {/* ── AI Configuration ── */}
      <section className="space-y-4">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          AI Configuration
        </p>

        <div className="space-y-2">
          <Label>Conversation tone</Label>
          <Select
            disabled={isDisabled}
            value={formData.tone}
            onValueChange={(value) => setFormData({ ...formData, tone: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tone" />
            </SelectTrigger>
            <SelectContent>
              {TONE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Fallback behavior</Label>
          <Select
            disabled={isDisabled}
            value={formData.fallbackBehavior}
            onValueChange={(value) =>
              setFormData({ ...formData, fallbackBehavior: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select fallback" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="escalate">
                Escalate — ask user to rephrase or handoff
              </SelectItem>
              <SelectItem value="refuse">
                Refuse — say it&apos;s out of scope
              </SelectItem>
              <SelectItem value="general_answer">
                General answer — best-effort response
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/*
         * FIX: each column gets min-w-0 so the grid children can't overflow
         * their track. Without this, a long word in the textarea breaks the
         * two-column layout on narrow viewports.
         */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(
            [
              {
                id: "allowed-topics",
                field: "allowedTopics",
                label: "Allowed topics",
                placeholder: "What to talk about?",
              },
              {
                id: "blocked-topics",
                field: "blockedTopics",
                label: "Blocked topics",
                placeholder: "What to avoid?",
              },
            ] as const
          ).map(({ id, field, label, placeholder }) => (
            <div key={id} className="space-y-1.5 min-w-0">
              <Label htmlFor={id}>{label}</Label>
              <Textarea
                id={id}
                placeholder={placeholder}
                disabled={isDisabled}
                maxLength={CHAR_LIMITS[field]}
                value={formData[field]}
                onChange={(e) =>
                  setFormData({ ...formData, [field]: e.target.value })
                }
                /*
                 * FIX: same pattern as description — bounded height, internal
                 * scroll, no resize to protect layout.
                 */
                className="text-sm min-h-[80px] max-h-[160px] resize-none overflow-y-auto"
              />
              <CharCount value={formData[field]} max={CHAR_LIMITS[field]} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default SectionFormFields;