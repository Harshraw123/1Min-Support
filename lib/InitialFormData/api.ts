export type InitialFormData = {
  businessName: string;
  websiteUrl: string;
  externalLinks: string;
};



export const submitMetadata = async (formData: InitialFormData) => {
  const sessionRes = await fetch("/api/auth/session");
  const session = await sessionRes.json();

  if (!session?.user?.email) {
    throw new Error("User not authenticated");
  }

  const res = await fetch("/api/metadata/store", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_email: session.user.email,
      business_name: formData.businessName,
      website_url: formData.websiteUrl,
      external_links: formData.externalLinks,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to save metadata");
  }

  return res.json();
};