"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "./FormField";
import { CharCount } from "./charCount";
import type { SectionFormFieldsSharedProps } from "./types";

const CHAR_LIMITS = {
  allowedTopics: 400,
  blockedTopics: 400,
} as const;

export function AIConfigSection({
  formData,
  setFormData,
  isDisabled,
}: {
  formData: SectionFormFieldsSharedProps["formData"];
  setFormData: SectionFormFieldsSharedProps["setFormData"];
  isDisabled?: SectionFormFieldsSharedProps["isDisabled"];
}) {
  return (
    <section className="space-y-4">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        AI Configuration
      </p>

      <FormField id="tone" label="Conversation tone">
        <Select
          value={formData.tone}
          disabled={isDisabled}
          onValueChange={(v) => setFormData({ ...formData, tone: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select tone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="neutral">Neutral</SelectItem>
            <SelectItem value="friendly">Friendly</SelectItem>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="strict">Strict</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(["allowedTopics", "blockedTopics"] as const).map((field) => (
          <div key={field} className="min-w-0 space-y-1.5">
            <Textarea
              value={formData[field]}
              disabled={isDisabled}
              maxLength={CHAR_LIMITS[field]}
              onChange={(e) =>
                setFormData({ ...formData, [field]: e.target.value })
              }
              className="min-h-[80px] max-h-[160px] resize-none overflow-y-auto text-sm"
              placeholder={field === "allowedTopics" ? "What to talk about?" : "What to avoid?"}
            />
            <CharCount value={formData[field]} max={CHAR_LIMITS[field]} />
          </div>
        ))}
      </div>
    </section>
  );
}

