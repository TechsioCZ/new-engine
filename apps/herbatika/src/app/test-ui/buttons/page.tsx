import { ButtonShowcase } from "@/components/test-ui/button-showcase";
import { TestUiBackLink, TestUiLayout } from "@/components/test-ui/test-ui-layout";

export default function TestUiButtonsPage() {
  return (
    <TestUiLayout
      title="Test UI / Buttons"
      description="Referenční mapping button family z Figma předlohy na current libs/ui contract a tokens-2."
      actions={<TestUiBackLink />}
    >
      <ButtonShowcase />
    </TestUiLayout>
  );
}
