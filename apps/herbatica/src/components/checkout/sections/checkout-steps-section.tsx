import {
  type HerbaticaCheckoutStepItem,
  HerbaticaCheckoutSteps,
} from "@/components/checkout/herbatica-checkout-steps"

type CheckoutStepsSectionProps = {
  checkoutStepIndex: number
  completedAriaLabel: string
  onStepChange: (step: number) => void
  steps: readonly HerbaticaCheckoutStepItem[]
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
          <HerbaticaCheckoutSteps
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
