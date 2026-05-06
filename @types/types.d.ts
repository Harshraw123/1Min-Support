type SourceType = "website" | "docs" | "upload" | "text";
type SourceStatus = "active" | "training" | "error" | "excluded";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface Section {
  id: string;
  name: string;
}

interface KnowledgeSource {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  source_url: string | null;
  meta_data: Record<string, unknown> | string | null;
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

export interface ChatSimulatorProps {
  messages: Message[];
  primaryColor: string;
  avatarSrc: string;
  input: string;
  setInput: (val: string) => void;
  handleSend: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  isTyping: boolean;
  handleReset: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  welcomeMessage: string;
  activeSection: string | null;
  sections: Section[];
  handleSectionClick: (id: string) => void;
}
