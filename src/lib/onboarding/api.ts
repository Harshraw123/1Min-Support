export type InitialFormData = {
  businessName: string;
  websiteUrl: string;
  externalLinks: string;
};

// Onboarding form ka data session user ke saath backend me save hota hai.
export const submitMetadata = async (formData: InitialFormData) => {
  // Pehle current logged-in user nikalte hain, phir usi email se metadata store hota hai.
  const sessionRes = await fetch("/api/auth/session");
  if (!sessionRes.ok) {
    throw new Error("Failed to read session");
  }
  const session = await sessionRes.json();
  const email =
    session?.user?.email?.trim?.() || session?.user?.user?.email?.trim?.();

  if (!email) {
    throw new Error("User not authenticated");
  }

  // Business details metadata API ko bhejte hain taaki dashboard setup complete ho sake.
  const res = await fetch("/api/metadata/store", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_email: email,
      business_name: formData.businessName,
      website_url: formData.websiteUrl,
      external_links: formData.externalLinks,
    }),
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new Error(payload.error || payload.message || "Failed to save metadata");
  }

  return res.json();
};
