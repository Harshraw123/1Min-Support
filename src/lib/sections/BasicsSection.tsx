import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "./FormField";
import { CharCount } from "./charCount";
import type { SectionFormFieldsSharedProps } from "./types";

const CHAR_LIMITS = {
  name: 80,
  description: 500,
};

export function BasicsSection({
  formData,
  setFormData,
  isDisabled,
}: Pick<SectionFormFieldsSharedProps, "formData" | "setFormData" | "isDisabled">) {
  // Section ka naam aur purpose collect karne wala basic info block hai.
  return (
    <section className="space-y-4">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        Basics
      </p>

      <FormField id="name" label="Section name">
        <Input
          id="name"
          value={formData.name}
          disabled={isDisabled}
          maxLength={CHAR_LIMITS.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
        />
        <CharCount value={formData.name} max={CHAR_LIMITS.name} />
      </FormField>

      <FormField id="description" label="Description">
        <Textarea
          id="description"
          value={formData.description}
          disabled={isDisabled}
          maxLength={CHAR_LIMITS.description}
          className="min-h-[90px] max-h-[200px] resize-none overflow-y-auto"
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
        <CharCount value={formData.description} max={CHAR_LIMITS.description} />
      </FormField>
    </section>
  );
}
