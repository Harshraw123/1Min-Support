
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
import { Button } from "@/components/ui/button";

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

const TONE_OPTIONS = [
  { value: "neutral", label: "Neutral" },
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "strict", label: "Strict" },
];

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
    if (selectedSources.includes(sourceId)) {
      setSelectedSources(selectedSources.filter((id) => id !== sourceId));
    } else {
      setSelectedSources([...selectedSources, sourceId]);
    }
  };

  const getSourceLabel = (
    source: SectionFormFieldsProps["knowledgeSources"][number]
  ) => source.title || source.source_url || source.url || "Untitled";

  return (
    <div className="space-y-8">

      {/* --- Basics --- */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Basics
        </p>

        <div className="space-y-2">
          <Label htmlFor="name">Section name</Label>
          <Input
            id="name"
            placeholder="e.g. FAQ Section"
            disabled={isDisabled}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="When should the AI use this section?"
            disabled={isDisabled}
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            // FIX 1: min-h kept but now uses sm: breakpoint to grow on larger screens
            className="min-h-[90px] sm:min-h-[110px] resize-none"
          />
        </div>
      </div>

      {/* --- Data Sources --- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Data Sources
          </p>
          {selectedSources.length > 0 && (
            <Badge variant="secondary" className="text-xs shrink-0 ml-2">
              {selectedSources.length} attached
            </Badge>
          )}
        </div>

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
            <div className="divide-y divide-border">
              {knowledgeSources.map((source) => {
                const isChecked = selectedSources.includes(source.id);
                return (
                  <label
                    key={source.id}
                    htmlFor={`src-${source.id}`}
                    className={`flex items-center gap-3 px-3 py-3 sm:px-4 cursor-pointer transition-colors hover:bg-muted/40 ${
                      isDisabled ? "opacity-50 cursor-not-allowed" : ""
                    } ${isChecked ? "bg-muted/30" : ""}`}
                  >
                    <Checkbox
                      id={`src-${source.id}`}
                      disabled={isDisabled}
                      checked={isChecked}
                      onCheckedChange={() => toggleSource(source.id)}
                      // FIX 2: prevent checkbox from shrinking on narrow screens
                      className="shrink-0"
                    />
                    {/* FIX 3: min-w-0 + overflow-hidden + break-all allow long URLs to wrap/truncate correctly */}
                    <span className="text-sm min-w-0 flex-1 truncate break-all select-none">
                      {getSourceLabel(source)}
                    </span>
                    {isChecked && (
                      <Badge
                        variant="secondary"
                        // FIX 4: hidden on very small screens to avoid crowding
                        className="text-xs shrink-0 hidden xs:inline-flex"
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
      </div>

      {/* --- AI Configuration --- */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          AI Configuration
        </p>

        <div className="space-y-2">
          <Label>Conversation tone</Label>
          <Select
            disabled={isDisabled}
            value={formData.tone}
            onValueChange={(value) =>
              setFormData({ ...formData, tone: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tone" />
            </SelectTrigger>
            <SelectContent>
              {TONE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <div className="flex flex-col py-0.5">
                    <span>{t.label}</span>
                  </div>
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

        {/* FIX 5: grid-cols-1 on mobile, grid-cols-2 only on sm+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="allowed-topics">Allowed topics</Label>
            <Textarea
              id="allowed-topics"
              placeholder="What to talk about?"
              disabled={isDisabled}
              value={formData.allowedTopics}
              onChange={(e) =>
                setFormData({ ...formData, allowedTopics: e.target.value })
              }
              // FIX 6: replaced fixed h-[80px] with min-h so content isn't clipped
              className="text-sm min-h-[80px] resize-none overflow-y-auto"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="blocked-topics">Blocked topics</Label>
            <Textarea
              id="blocked-topics"
              placeholder="What to avoid?"
              disabled={isDisabled}
              value={formData.blockedTopics}
              onChange={(e) =>
                setFormData({ ...formData, blockedTopics: e.target.value })
              }
              // FIX 6: same fix applied here
              className="text-sm min-h-[80px] resize-none overflow-y-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionFormFields;