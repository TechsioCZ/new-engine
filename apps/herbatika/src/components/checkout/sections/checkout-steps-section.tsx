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
    <section className="flex w-full justify-center">
      <div className="flex min-h-850 w-full max-w-auth-content items-center justify-center rounded-xl bg-surface px-400">
        <ol className="flex w-full items-center justify-center gap-100 overflow-x-auto" role="list">
          {steps.map((step, index) => {
            const isComplete = index < checkoutStepIndex;
            const isCurrent = index === checkoutStepIndex;
            const isActive = isComplete || isCurrent;

            return (
              <li className="contents" key={step.id}>
                <div className="inline-flex items-center gap-150 whitespace-nowrap">
                  <span
                    className={`flex size-700 items-center justify-center rounded-full text-sm font-medium ${
                      isActive
                        ? "bg-primary text-fg-reverse"
                        : "bg-highlight text-fg-primary"
                    }`}
                  >
                    {isComplete ? <Icon className="text-xs" icon="token-icon-check" /> : index + 1}
                  </span>
                  <span
                    className={`text-xs uppercase tracking-wide ${
                      isActive ? "font-medium text-primary" : "font-normal text-fg-primary"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>

                {index < steps.length - 1 ? (
                  <Icon
                    className="text-sm text-fg-placeholder"
                    icon="token-icon-chevron-right"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
