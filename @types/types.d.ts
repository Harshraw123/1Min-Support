type SourceType = "website" | "docs" | "upload" | "text";
type SourceStatus = "active" | "training" | "error" | "excluded";

interface KnowledgeSource {
  id: string;
  user_email: string;
  type: string;
  name: string;
  status: string;
  source_url: string | null;
  content: string | null;
  meta_data: string | null;
  created_at: string | null;
}
export type KnowledgeType = "website" | "text" | "upload";

export interface KnowledgeSubmitPayload {
  type: KnowledgeType;
  websiteUrl?: string;
  textTitle?: string;
  textContent?: string;
  file?: File | null;
}