import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import type { CheckoutController } from "@/components/checkout/use-checkout-controller";

type CheckoutStepsSectionProps = {
  checkoutStepIndex: number;
  steps: CheckoutController["checkoutSteps"];
};

export function CheckoutStepsSection({
  checkoutStepIndex,
  steps,
}: CheckoutStepsSectionProps) {
  return (
    <section className="grid gap-200 sm:grid-cols-2 xl:grid-cols-4">
      {steps.map((step, index) => {
        const isComplete = index < checkoutStepIndex;
        const isCurrent = index === checkoutStepIndex;
        const stateLabel = isComplete ? "Hotovo" : isCurrent ? "Aktuálne" : "Čaká";

        return (
          <div
            className={`flex items-center gap-200 rounded-lg border p-250 ${
              isComplete || isCurrent
                ? "border-primary bg-highlight"
                : "border-border-secondary bg-surface"
            }`}
            key={step.id}
          >
            <span
              className={`flex size-500 items-center justify-center rounded-full border text-sm font-semibold ${
                isComplete
                  ? "border-primary bg-primary text-fg-reverse"
                  : isCurrent
                    ? "border-primary text-primary"
                    : "border-border-primary text-fg-tertiary"
              }`}
            >
              {isComplete ? <Icon icon="token-icon-check" /> : index + 1}
            </span>
            <div className="space-y-50">
              <p className="text-sm font-semibold text-fg-primary">{step.title}</p>
              <ExtraText className="text-fg-tertiary">{stateLabel}</ExtraText>
            </div>
          </div>
        );
      })}
    </section>
  );
}
