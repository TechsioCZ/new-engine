import {
  type HerbatikaCheckoutStepItem,
  HerbatikaCheckoutSteps,
} from "@/components/checkout/herbatika-checkout-steps";

type CheckoutStepsSectionProps = {
  checkoutStepIndex: number;
  steps: ReadonlyArray<HerbatikaCheckoutStepItem>;
};

export function CheckoutStepsSection({
  checkoutStepIndex,
  steps,
}: CheckoutStepsSectionProps) {
  return (
    <section className="flex w-full justify-center max-w-checkout-step mx-auto">
      <div className="flex min-h-850 w-full max-w-auth-content items-center justify-center rounded-xl bg-surface px-300 sm:px-400">
        <div className="w-full overflow-x-auto">
          <HerbatikaCheckoutSteps step={checkoutStepIndex} steps={steps} />
        </div>
      </div>
    </section>
  );
}
