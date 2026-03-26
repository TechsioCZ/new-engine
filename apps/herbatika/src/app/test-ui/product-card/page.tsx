"use client"
import { ProductCardShowcase } from "@/components/test-ui/product-card-showcase";
import { TestUiBackLink, TestUiLayout } from "@/components/test-ui/test-ui-layout";

export default function TestUiProductCardPage() {
  return (
    <TestUiLayout
      title="Test UI / Product Card"
      description="Plánovaná surface pro Herbatika wrapper nad molecules/product-card."
      actions={<TestUiBackLink />}
    >
      <ProductCardShowcase />
    </TestUiLayout>
  );
}
