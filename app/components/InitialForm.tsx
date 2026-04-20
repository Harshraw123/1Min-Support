'use client'

import React, { useCallback, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, Link2 } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

// Form ke teen fields ka structure
interface FormData {
  businessName: string;
  websiteUrl: string;
  externalLinks: string;
}

// Sirf step 1 aur 2 mein validation errors ho sakte hain
interface FormErrors {
  businessName?: string;
  websiteUrl?: string;
}

// Parent component se onSubmit callback milta hai
interface InitialFormProps {
  onSubmit?: (data: FormData) => void | Promise<void>;
}

// ─── Step Config ─────────────────────────────────────────────────────────────

// Har step ka title, subtitle aur placeholder yahan define hai
// Step number = array index + 1
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

// ─── Main Component ───────────────────────────────────────────────────────────

const InitialForm: React.FC<InitialFormProps> = ({ onSubmit }) => {

  // Current step track karta hai (1, 2, ya 3)
  const [step, setStep] = useState(1);


  const [formData, setFormData] = useState<FormData>({
    businessName: "",
    websiteUrl: "",
    externalLinks: "",
  });

  // Validation errors store karta hai
  const [errors, setErrors] = useState<FormErrors>({});

  // Final submit ke waqt button disable karne ke liye
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Validation ─────────────────────────────────────────────────────────────

  // Current step ke hisaab se validate karta hai
  // Step 1: businessName required
  // Step 2: websiteUrl required + valid URL format
  // Step 3: koi validation nahi (optional field)
  const validateStep = useCallback(
    (currentStep: number): boolean => {
      const newErrors: FormErrors = {};

      if (currentStep === 1 && !formData.businessName.trim()) {
        newErrors.businessName = "Business name is required";
      }

      if (currentStep === 2) {
        if (!formData.websiteUrl.trim()) {
          newErrors.websiteUrl = "Website URL is required";
        } else {
          try {
            new URL(formData.websiteUrl); // browser API se URL validate karta hai
          } catch {
            newErrors.websiteUrl = "Please enter a valid URL (e.g. https://example.com)";
          }
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0; // true = no errors
    },
    [formData],
  );

  // ─── Navigation Handlers ─────────────────────────────────────────────────────

  // Back button click - previous step pe le jaata hai
  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep((prev) => prev - 1);
      setErrors({});
    }
  }, [step]);

  // "Continue" / "Submit" button click
  // - Pehle validate karta hai
  // - Step 3 se pehle: next step pe le jaata hai
  // - Step 3 pe: onSubmit call karta hai
  const handleNext = useCallback(async () => {
    if (!validateStep(step)) return;
  
    if (step < 3) {
      setStep((prev) => prev + 1);
      return;
    }
  
    // ── FINAL SUBMIT LOGIC ──
    setIsSubmitting(true);
  
    try {
      await handleSubmitForm(formData); // 👈 custom function
      await onSubmit?.(formData); // optional external callback
    } catch (error) {
      console.error("Submission failed:", error);
      // optional: show toast / error state
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit, step, validateStep]);

  // ─── Field Update ────────────────────────────────────────────────────────────

  // Koi bhi field type karne par formData update hota hai
  // Saath mein uss field ka error bhi clear ho jaata hai
  const updateFormData = useCallback(
    (field: keyof FormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors],
  );

  //handle final submit

  const handleSubmitForm = async (data: FormData) => {
    try {
      // Get current user session to get user_email
      console.log('submit clicked')
      const sessionResponse = await fetch("/api/auth/session");
      const session = await sessionResponse.json();

      
      if (!session?.user?.email) {
        throw new Error("User not authenticated");
      }

      const response = await fetch("/api/metadata/store", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_email: session.user.email,
          business_name: formData.businessName,
          website_url: formData.websiteUrl,
          external_links: formData.externalLinks,
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Metadata saved successfully:", result);
      
      // Redirect to dashboard instead of reload
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Error saving metadata:", error);
      throw error; // Re-throw to handle in handleNext
    }
  };

  // ─── Derived Values ──────────────────────────────────────────────────────────

  // Progress bar width: step/3 * 100 (33%, 66%, 100%)
  const progress = useMemo(() => (step / 3) * 100, [step]);

  // Current step ka config (title, subtitle, placeholder)
  const current = STEPS[step - 1];

  // Current step ke hisaab se input ka value, field name aur error
  const currentValue =
    step === 1 ? formData.businessName : step === 2 ? formData.websiteUrl : formData.externalLinks;

  const currentField: keyof FormData =
    step === 1 ? "businessName" : step === 2 ? "websiteUrl" : "externalLinks";

  const currentError =
    step === 1 ? errors.businessName : step === 2 ? errors.websiteUrl : undefined;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      suppressHydrationWarning // server/client HTML mismatch warning suppress karta hai
    >
      {/* ── Top Progress Bar ── */}
      {/* Step ke saath smoothly grow karta hai (CSS transition) */}
      <div className="h-1 w-full bg-muted">
        <div
          className="h-full bg-gradient-to-r from-primary to-brand-orange transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Header: Back Button + Step Badge ── */}
      <div className="flex items-center justify-between px-6 py-5 md:px-10">

        {/* Back button — step 1 par invisible (disabled + invisible CSS) */}
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:invisible"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {/* "Step X of 3" badge — center mein */}
        <div className="hero-badge">
          <Sparkles className="h-3.5 w-3.5" />
          Step {step} of 3
        </div>

        {/* Right side spacer — badge ko center rakhne ke liye back button ke opposite */}
        <div className="h-9 w-9" />
      </div>

      {/* ── Main Content Area ── */}
      {/* key={step} dene se React pura block re-mount karta hai → animate-fade-in trigger hoti hai */}
      <div className="flex flex-1 items-center justify-center px-6 pb-20">
        <div key={step} className="w-full max-w-2xl animate-fade-in">

          {/* Step ka title aur description */}
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            {current.title}
          </h1>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">
            {current.subtitle}
          </p>

          {/* ── Input Field ── */}
          <div className="relative mt-12">

            {/* Step 3 = textarea (multiple links), baaki = single line input */}
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
                type={step === 2 ? "url" : "text"} // step 2 par URL keyboard mobile par
                placeholder={current.placeholder}
                value={currentValue}
                onChange={(e) => updateFormData(currentField, e.target.value)}
                onKeyDown={(e) => {
                  // Enter daba ke bhi next step ja sakte ho
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleNext();
                  }
                }}
                autoFocus
                maxLength={step === 1 ? 100 : 255}
                className={`w-full border-0 border-b-2 bg-transparent px-0 py-3 text-xl text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors md:text-2xl ${
                  // Error ho to red border, warna normal/focus blue
                  currentError
                    ? "border-destructive focus:border-destructive"
                    : "border-border focus:border-primary"
                }`}
              />
            )}

            {/* Step 3 par link icon — sirf decorative, pointer-events-none */}
            {step === 3 && (
              <Link2 className="pointer-events-none absolute right-2 top-3 h-5 w-5 text-muted-foreground" />
            )}
          </div>

          {/* Validation error message — role="alert" screen readers ke liye */}
          {currentError && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {currentError}
            </p>
          )}
        </div>
      </div>

      {/* ── Footer: Keyboard Hint + Continue/Submit Button ── */}
      <div className="flex items-center justify-between gap-4 border-t border-border bg-background/80 px-6 py-5 backdrop-blur md:px-10">

        {/* "Press Enter to continue" — small screens par hidden */}
        <p className="hidden text-xs text-muted-foreground sm:block">
          Press{" "}
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground">
            Enter
          </kbd>{" "}
          to continue
        </p>

        {/* Continue / Submit button — submitting ho to disabled */}
        <button
          type="button"
          onClick={handleNext}
          disabled={isSubmitting}
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Setting up..." : step === 3 ? "Submit" : "Continue"}
          {/* Submitting ke waqt icon nahi dikhta */}
          {!isSubmitting && (step === 3 ? <Sparkles className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />)}
        </button>
      </div>
    </div>
  );
};

export default InitialForm;