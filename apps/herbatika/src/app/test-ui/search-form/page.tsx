import { SearchFormShowcase } from "@/components/test-ui/search-form-showcase";
import { TestUiBackLink, TestUiLayout } from "@/components/test-ui/test-ui-layout";

export default function TestUiSearchFormPage() {
  return (
    <TestUiLayout
      title="Test UI / Search Form"
      description="Plánovaná surface pro header search a jeho states."
      actions={<TestUiBackLink />}
    >
      <SearchFormShowcase />
    </TestUiLayout>
  );
}
