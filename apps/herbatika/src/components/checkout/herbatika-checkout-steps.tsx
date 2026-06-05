import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Tooltip } from "@techsio/ui-kit/atoms/tooltip";
import { Steps } from "@techsio/ui-kit/molecules/steps";

export type HerbatikaCheckoutStepItem = {
  id: string;
  title: string;
};

type HerbatikaCheckoutStepsProps = {
  step: number;
  steps: ReadonlyArray<HerbatikaCheckoutStepItem>;
};

export function HerbatikaCheckoutSteps({
  step,
  steps,
}: HerbatikaCheckoutStepsProps) {
  const completionStepIndex = steps.length;
  const visualStepCount = steps.length + 1;

  return (
    <Steps count={visualStepCount} linear size="sm" step={step}>
      <Steps.List className="w-full md:w-fit mx-auto md:justify-start p-300 rounded-xl">
        {steps.map((item, index) => (
          <Steps.Item
            className="flex-none min-w-max gap-x-450 sm:gap-x-150"
            index={index}
            key={item.id}
          >
            <Steps.Trigger
              className="min-h-750 min-w-750 justify-center"
              disabled
            >
              <Steps.Indicator>
                <Tooltip
                  className="inline-flex sm:hidden"
                  content={item.title}
                  placement="bottom"
                >
                  <Steps.Status
                    complete={<Steps.Number />}
                    current={<Steps.Number />}
                    incomplete={<Steps.Number />}
                  />
                </Tooltip>
              </Steps.Indicator>
              <Steps.ItemText className="hidden sm:inline-flex uppercase">
                <Steps.Title>{item.title}</Steps.Title>
              </Steps.ItemText>
            </Steps.Trigger>
            {steps.length > index ? (
              <Icon
                className="text-steps-chevron"
                icon="token-icon-chevron-right"
                size="xl"
              />
            ) : null}
          </Steps.Item>
        ))}
        <Steps.Item
          className="flex-none min-w-max"
          index={completionStepIndex}
          key="completed"
        >
          <Steps.Trigger
            aria-label="Dokončené"
            className="min-h-750 min-w-750 justify-center"
            disabled
          >
            <Steps.Indicator>
              <Steps.Status
                complete={<Icon icon="token-icon-steps-check" size="lg" />}
                current={<Icon icon="token-icon-steps-check" size="lg" />}
                incomplete={<Icon icon="token-icon-steps-check" size="lg" />}
              />
            </Steps.Indicator>
          </Steps.Trigger>
        </Steps.Item>
      </Steps.List>
    </Steps>
  );
}
