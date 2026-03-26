"use client"
import { FooterShowcase } from "@/components/test-ui/footer-showcase";
import { TestUiBackLink, TestUiLayout } from "@/components/test-ui/test-ui-layout";

export default function TestUiFooterPage() {
  return (
    <TestUiLayout
      title="Test UI / Footer"
      description="Plánovaná surface pro Herbatika footer composition nad organisms/footer."
      actions={<TestUiBackLink />}
    >
      <FooterShowcase />
    </TestUiLayout>
  );
}
