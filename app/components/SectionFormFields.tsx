import {
  BasicsSection,

  AIConfigSection,
  type SectionFormFieldsSharedProps,
} from "@/lib/section_MetaData";
import DataSourcesSection from "@/lib/section_MetaData/DataSourceSection";


const SectionFormFields = (props: SectionFormFieldsSharedProps) => {
  return (
    <div className="space-y-8">
      <BasicsSection {...props} />
      <DataSourcesSection {...props} />
      <AIConfigSection {...props} />
    </div>
  );
};

export default SectionFormFields;