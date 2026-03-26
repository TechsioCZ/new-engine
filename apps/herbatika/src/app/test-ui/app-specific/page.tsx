"use client"
import { AppSpecificShowcase } from "@/components/test-ui/app-specific-showcase";
import { TestUiBackLink, TestUiLayout } from "@/components/test-ui/test-ui-layout";

export default function TestUiAppSpecificPage() {
  return (
    <TestUiLayout
      title="Test UI / App-specific"
      description="Herbatica wrappers a composition patterns, které zatím necháváme mimo shared libs/ui."
      actions={<TestUiBackLink />}
    >
      <AppSpecificShowcase />
    </TestUiLayout>
  );
}
