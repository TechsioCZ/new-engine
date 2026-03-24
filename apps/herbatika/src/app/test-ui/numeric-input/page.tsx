import { NumericInputShowcase } from "@/components/test-ui/numeric-input-showcase";
import { TestUiBackLink, TestUiLayout } from "@/components/test-ui/test-ui-layout";

export default function TestUiNumericInputPage() {
  return (
    <TestUiLayout
      title="Test UI / Numeric Input"
      description="Plánovaná surface pro quantity control na PDP a v košíku."
      actions={<TestUiBackLink />}
    >
      <NumericInputShowcase />
    </TestUiLayout>
  );
}
