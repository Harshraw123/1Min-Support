"use client";

import { STEPS } from "@/lib/InitialFormData/constant";
import { useInitialForm } from "@/hooks/useInitialForm";
import StepInput from "./StepInput";

export default function InitialForm({ onSubmit }: any) {
  const {
    step,
    formData,
    errors,
    next,
    back,
    update,
    isSubmitting,
  } = useInitialForm(onSubmit);

  const current = STEPS[step - 1];

  const value =
    step === 1
      ? formData.businessName
      : step === 2
      ? formData.websiteUrl
      : formData.externalLinks;

  return (
    <div className="p-10">
      <h1>{current.title}</h1>
      <p>{current.subtitle}</p>

      <StepInput
        step={step}
        value={value}
        error={errors}
        placeholder={current.placeholder}
        onChange={(val: string) => {
          const field =
            step === 1
              ? "businessName"
              : step === 2
              ? "websiteUrl"
              : "externalLinks";

          update(field, val);
        }}
        onEnter={next}
      />

      <div className="flex gap-4 mt-10">
        <button onClick={back}>Back</button>
        <button onClick={next} disabled={isSubmitting}>
          {step === 3 ? "Submit" : "Next"}
        </button>
      </div>
    </div>
  );
}