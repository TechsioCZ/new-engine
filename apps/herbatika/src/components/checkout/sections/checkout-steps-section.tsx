import {
  type HerbatikaCheckoutStepItem,
  HerbatikaCheckoutSteps,
} from "@/components/checkout/herbatika-checkout-steps"

type CheckoutStepsSectionProps = {
  checkoutStepIndex: number
  steps: readonly HerbatikaCheckoutStepItem[]
}

export function CheckoutStepsSection({
  checkoutStepIndex,
  steps,
}: CheckoutStepsSectionProps) {
  return (
    <section className="mx-auto flex w-full max-w-checkout-step justify-center">
      <div className="flex min-h-850 w-full max-w-auth-content items-center justify-center rounded-xl bg-surface px-300 sm:px-400">
        <div className="w-full overflow-x-auto">
          <HerbatikaCheckoutSteps step={checkoutStepIndex} steps={steps} />
        </div>
      </div>
    </section>
  )
}
