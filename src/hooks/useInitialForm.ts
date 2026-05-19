import { useState } from "react";
import { submitMetadata, type InitialFormData } from "@/lib/onboarding/api";

type FormData = InitialFormData;

type FormErrors = Partial<Record<keyof FormData, string>>;

function validateStep(step: number, formData: FormData): FormErrors {
  // Current onboarding step ke input ko validate karke field-wise errors return karta hai.
  const errors: FormErrors = {};

  if (step === 1) {
    if (!formData.businessName?.trim()) errors.businessName = "Business name is required";
  }

  if (step === 2) {
    const url = formData.websiteUrl?.trim();
    if (!url) {
      errors.websiteUrl = "Website URL is required";
    } else {
      try {
        // eslint-disable-next-line no-new
        new URL(url);
      } catch {
        errors.websiteUrl = "Enter a valid URL";
      }
    }
  }

  if (step === 3) {
    // externalLinks optional; if provided validate each line
    const raw = formData.externalLinks?.trim();
    if (raw) {
      const lines = raw
        .split(/\r?\n|,/g)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const line of lines) {
        try {
          // eslint-disable-next-line no-new
          new URL(line);
        } catch {
          errors.externalLinks = "One or more links are invalid";
          break;
        }
      }
    }
  }

  return errors;
}

export const useInitialForm = (onSubmit?: (data: FormData) => void) => {
  // Onboarding wizard ka step, form state aur submit flow yahin manage hota hai.
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    businessName: "",
    websiteUrl: "",
    externalLinks: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const next = async () => {
    // Valid step par aage badhta hai, final step par metadata save karta hai.
    const validationErrors = validateStep(step, formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (step < 3) {
      setStep((s) => s + 1);
      return;
    }

    setIsSubmitting(true);
    try {
      await submitMetadata(formData);
      await onSubmit?.(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const back = () => {
    // User ko previous step par le jata hai without losing form data.
    if (step > 1) setStep((s) => s - 1);
  };

  const update = (field: keyof FormData, value: string) => {
    // Field update ke saath us field ka validation error clear hota hai.
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return {
    step,
    formData,
    errors,
    isSubmitting,
    next,
    back,
    update,
  };
};
