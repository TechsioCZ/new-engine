import { BadgesShowcase } from "@/components/test-ui/badges-showcase";
import { TestUiBackLink, TestUiLayout } from "@/components/test-ui/test-ui-layout";

export default function TestUiBadgesPage() {
  return (
    <TestUiLayout
      title="Test UI / Badges"
      description="Referenční mapping badge family z Figmy na current libs/ui contract a Herbatica app styling."
      actions={<TestUiBackLink />}
    >
      <BadgesShowcase />
    </TestUiLayout>
  );
}
