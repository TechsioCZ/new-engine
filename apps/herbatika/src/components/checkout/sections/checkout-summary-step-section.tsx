import type { ComponentProps } from "react";
import { CheckoutCompleteSection } from "./checkout-complete-section";

type CheckoutSummaryStepSectionProps = {
  completeProps: ComponentProps<typeof CheckoutCompleteSection>;
};

export function CheckoutSummaryStepSection({
  completeProps,
}: CheckoutSummaryStepSectionProps) {
  return <CheckoutCompleteSection {...completeProps} />;
}
