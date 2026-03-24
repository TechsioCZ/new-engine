import { CheckoutShowcase } from "@/components/test-ui/checkout-showcase";
import { TestUiBackLink, TestUiLayout } from "@/components/test-ui/test-ui-layout";

export default function TestUiCheckoutPage() {
  return (
    <TestUiLayout
      title="Test UI / Checkout"
      description="Plánovaná surface pro checkout rows, summary a form family."
      actions={<TestUiBackLink />}
    >
      <CheckoutShowcase />
    </TestUiLayout>
  );
}
