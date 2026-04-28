export type KnowledgeSource = {
  id: string;
  title: string;
  source_url?: string | null;
  url?: string;
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

