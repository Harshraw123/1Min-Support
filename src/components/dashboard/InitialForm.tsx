'use client'

import React, { useCallback, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, Link2 } from "lucide-react";
import { toast } from "sonner";

interface FormData {
  businessName: string;
  websiteUrl: string;
  externalLinks: string;
}

interface FormErrors {
  businessName?: string;
  websiteUrl?: string;
}

interface InitialFormProps {
  onSubmit?: (data: FormData) => void | Promise<void>;
}

const STEPS = [
  {
    title: "What's your business name?",
    subtitle: "We'll use this to personalize your AI support agent.",
    placeholder: "e.g. Acme Corp",
  },
  {
    title: "What's your website URL?",
    subtitle: "Your agent will learn from your site to answer customer queries.",
    placeholder: "https://example.com",
  },
  {
    title: "Any other links to add?",
    subtitle: "Add external links like Notion pages or Help docs to improve knowledge.",
    placeholder: "https://notion.so/docs",
  },
];

// Initial setup wizard user se business info step-by-step collect karta hai.
const InitialForm: React.FC<InitialFormProps> = ({ onSubmit }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    businessName: "",
    websiteUrl: "",
    externalLinks: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateStep = useCallback(
    (currentStep: number): boolean => {
      // Current step ki required field validate karke next step allow hota hai.
      const newErrors: FormErrors = {};
      if (currentStep === 1 && !formData.businessName.trim()) {
        newErrors.businessName = "Business name is required";
      }
      if (currentStep === 2) {
        if (!formData.websiteUrl.trim()) {
          newErrors.websiteUrl = "Website URL is required";
        } else {
          try {
            new URL(formData.websiteUrl);
          } catch {
            newErrors.websiteUrl = "Please enter a valid URL (e.g. https://example.com)";
          }
        }
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [formData],
  );

  const handleNext = useCallback(async () => {
    // Valid step ho to wizard aage badhta hai, last step par submit trigger hota hai.
    if (!validateStep(step)) return;
    if (step < 3) {
      setStep((prev) => prev + 1);
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit?.(formData);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit onboarding details"
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit, step, validateStep]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep((prev) => prev - 1);
      setErrors({});
    }
  }, [step]);

  const updateFormData = useCallback(
    (field: keyof FormData, value: string) => {
      // Field update hote hi uska old error clear kar dete hain.
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors],
  );

  const progress = useMemo(() => (step / 3) * 100, [step]);
  const current = STEPS[step - 1];

  const currentValue =
    step === 1 ? formData.businessName : step === 2 ? formData.websiteUrl : formData.externalLinks;
  const currentField: keyof FormData =
    step === 1 ? "businessName" : step === 2 ? "websiteUrl" : "externalLinks";
  const currentError = step === 1 ? errors.businessName : step === 2 ? errors.websiteUrl : undefined;

  return (
    <div 
    className="fixed inset-0 z-50 flex flex-col bg-background"
    suppressHydrationWarning
    >
      {/* Top progress bar */}
      <div className="h-1 w-full bg-muted">
        <div
          className="h-full bg-gradient-to-r from-primary to-brand-orange transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 md:px-10">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:invisible"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="hero-badge">
          <Sparkles className="h-3.5 w-3.5" />
          Step {step} of 3
        </div>
        <div className="h-9 w-9" />
      </div>

      {/* Centered content */}
      <div className="flex flex-1 items-center justify-center px-6 pb-20">
        <div key={step} className="w-full max-w-2xl animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            {current.title}
          </h1>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">{current.subtitle}</p>

          <div className="relative mt-12">
            {step === 3 ? (
              <textarea
                placeholder={current.placeholder}
                value={currentValue}
                onChange={(e) => updateFormData(currentField, e.target.value)}
                rows={3}
                maxLength={1000}
                autoFocus
                className="w-full resize-none border-0 border-b-2 border-border bg-transparent px-0 py-3 text-xl text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus:border-primary md:text-2xl"
              />
            ) : (
              <input
                type={step === 2 ? "url" : "text"}
                placeholder={current.placeholder}
                value={currentValue}
                onChange={(e) => updateFormData(currentField, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleNext();
                  }
                }}
                autoFocus
                maxLength={step === 1 ? 100 : 255}
                className={`w-full border-0 border-b-2 bg-transparent px-0 py-3 text-xl text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors md:text-2xl ${
                  currentError
                    ? "border-destructive focus:border-destructive"
                    : "border-border focus:border-primary"
                }`}
              />
            )}
            {step === 3 && (
              <Link2 className="pointer-events-none absolute right-2 top-3 h-5 w-5 text-muted-foreground" />
            )}
          </div>

          {currentError && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {currentError}
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-4 border-t border-border bg-background/80 px-6 py-5 backdrop-blur md:px-10">
        <p className="hidden text-xs text-muted-foreground sm:block">
          Press{" "}
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
            Enter
          </kbd>{" "}
          to continue
        </p>
        <button
          type="button"
          onClick={handleNext}
          disabled={isSubmitting}
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Setting up..." : step === 3 ? "Submit" : "Continue"}
          {!isSubmitting && (step === 3 ? <Sparkles className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />)}
        </button>
      </div>
    </div>
  );
};

export default InitialForm;
