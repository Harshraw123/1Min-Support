export type KnowledgeSource = {
  id: string;
  user_email: string;
  workspace_id: string;
  title: string;
  content: string;
  type: string;
  status: string;
  source_url: string | null;
  meta_data: string | null;
  created_at: string | null;
};

export type SectionFormData = {
  name: string;
  description: string;
  tone: string;
  allowedTopics: string;
  blockedTopics: string;
  fallbackBehavior: string;
};

export type SectionFormFieldsSharedProps = {
  formData: SectionFormData;
  setFormData: (data: SectionFormData) => void;

  knowledgeSources: KnowledgeSource[];
  selectedSources: string[];
  setSelectedSources: (sources: string[]) => void;
  isLoadingSources: boolean;

  isDisabled?: boolean;
};
