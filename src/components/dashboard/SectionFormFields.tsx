import {
  BasicsSection,

  AIConfigSection,
  type SectionFormFieldsSharedProps,
} from "@/lib/sections";
import DataSourcesSection from "@/lib/sections/DataSourceSection";


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