import {
  type HerbatikaCheckoutStepItem,
  HerbatikaCheckoutSteps,
} from "@/components/checkout/herbatika-checkout-steps"

type CheckoutStepsSectionProps = {
  checkoutStepIndex: number
  completedAriaLabel: string
  onStepChange: (step: number) => void
  steps: readonly HerbatikaCheckoutStepItem[]
}

export function CheckoutStepsSection({
  checkoutStepIndex,
  completedAriaLabel,
  onStepChange,
  steps,
}: CheckoutStepsSectionProps) {
  return (
    <section className="mx-auto flex w-full max-w-checkout-step justify-center">
      <div className="flex min-h-850 w-full max-w-auth-content items-center justify-center rounded-xl bg-surface px-300 sm:px-400">
        <div className="w-full overflow-x-auto">
          <HerbatikaCheckoutSteps
            completedAriaLabel={completedAriaLabel}
            onStepChange={onStepChange}
            step={checkoutStepIndex}
            steps={steps}
          />
        </div>
      </div>
    </section>
  )
}
