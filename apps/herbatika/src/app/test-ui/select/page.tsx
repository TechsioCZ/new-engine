"use client"
import { SelectShowcase } from "@/components/test-ui/select-showcase";
import { TestUiBackLink, TestUiLayout } from "@/components/test-ui/test-ui-layout";

export default function TestUiSelectPage() {
  return (
    <TestUiLayout
      title="Test UI / Select"
      description="Plánovaná surface pro checkout a PDP selecty."
      actions={<TestUiBackLink />}
    >
      <SelectShowcase />
    </TestUiLayout>
  );
}
