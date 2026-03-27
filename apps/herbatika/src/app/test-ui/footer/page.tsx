"use client"
import { FooterShowcase } from "@/components/test-ui/footer-showcase";
import { TestUiBackLink, TestUiLayout } from "@/components/test-ui/test-ui-layout";

export default function TestUiFooterPage() {
  return (
    <TestUiLayout
      title="Test UI / Footer"
      description="Parity surface pro Herbatika footer composition nad organisms/footer, určená pro skill-driven kontrolu proti Figmě."
      actions={<TestUiBackLink />}
    >
      <FooterShowcase />
    </TestUiLayout>
  );
}
