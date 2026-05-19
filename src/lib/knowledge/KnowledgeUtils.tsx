import { KnowledgeSubmitPayload } from "@/types";
import type { KnowledgeType } from "@/types";

// 🎨 UI config
export const colorMap = {
  indigo: { bg: "bg-primary", text: "text-primary-foreground" },
  emerald: { bg: "bg-emerald-600 dark:bg-emerald-500", text: "text-white" },
  amber: { bg: "bg-brand-orange", text: "text-primary-foreground" },
} as const;

export type KnowledgeTabColor = keyof typeof colorMap;

export const tabColorMap: Record<KnowledgeType, KnowledgeTabColor> = {
  website: "indigo",
  upload: "emerald",
  text: "amber",
} as const;

// 🌐 URL helpers (moved here)
export const validateUrl = (url: string) => {
  // URL valid hai ya nahi check karta hai before API submit.
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const normalizeUrl = (url: string) => {
  // Duplicate checks stable rahe isliye URL ka trailing slash normalize hota hai.
  try {
    const u = new URL(url);
    return u.origin + u.pathname.replace(/\/$/, "");
  } catch {
    return url;
  }
};

// 🔁 duplicate check
export const isDuplicateSource = (
  url: string,
  existingSources: { source_url: string }[]
) => {
  // Same website source dobara add na ho isliye normalized URL compare hota hai.
  const normalized = normalizeUrl(url);

  return existingSources.some(
    (s) => normalizeUrl(s.source_url) === normalized
  );
};

// ❌ error handler
export const getErrorMessage = (e: unknown) => {
  // Unknown catch value ko user-friendly error text me convert karta hai.
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Failed to import source";
};

// 🚀 API handler
export const importKnowledgeSource = async (
  data: KnowledgeSubmitPayload
) => {
  // Website/text/upload payload ko correct knowledge API request me map karta hai.
  let response: Response | undefined;

  if (data.type === "website") {
    response = await fetch("/api/knowledge/store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "website",
        websiteUrl: data.websiteUrl,
      }),
    });
  }

  if (data.type === "text") {
    response = await fetch("/api/knowledge/store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "text",
        title: data.textTitle,
        content: data.textContent,
      }),
    });
  }

  if (data.type === "upload" && data.file) {
    const formData = new FormData();
    formData.append("file", data.file);

    response = await fetch("/api/knowledge/store", {
      method: "POST",
      body: formData,
    });
  }

  if (!response) throw new Error("Unsupported knowledge type");

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.message || "Something went wrong");
  }

  return result;
};
