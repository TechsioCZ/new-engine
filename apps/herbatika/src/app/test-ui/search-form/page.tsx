import { SearchFormShowcase } from "@/components/test-ui/search-form-showcase";
import { TestUiBackLink, TestUiLayout } from "@/components/test-ui/test-ui-layout";

export default function TestUiSearchFormPage() {
  return (
    <TestUiLayout
      title="Test UI / Search Form"
      description="Desktop header search z Figma node 94:1614."
      actions={<TestUiBackLink />}
    >
      <SearchFormShowcase />
    </TestUiLayout>
  );
}
