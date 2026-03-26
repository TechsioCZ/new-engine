"use client"
import { HeaderShowcase } from "@/components/test-ui/header-showcase";
import { TestUiBackLink, TestUiLayout } from "@/components/test-ui/test-ui-layout";

export default function TestUiHeaderPage() {
  return (
    <TestUiLayout
      title="Test UI / Header"
      description="Plánovaná surface pro Herbatika header composition nad organisms/header a molecules/search-form."
      actions={<TestUiBackLink />}
    >
      <HeaderShowcase />
    </TestUiLayout>
  );
}
