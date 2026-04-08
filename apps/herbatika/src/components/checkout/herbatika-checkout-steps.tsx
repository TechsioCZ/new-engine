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
  return (
    <Steps count={steps.length} linear size="sm" step={step}>
      <Steps.List className="w-full md:w-fit mx-auto md:justify-start p-300 rounded-xl">
        {steps.map((item, index) => (
          <Steps.Item index={index} key={item.id} className="flex-none min-w-max gap-x-450 sm:gap-x-150">
            <Steps.Trigger className="min-h-750 min-w-750 justify-center" disabled>
              <Steps.Indicator>
                <Tooltip className="inline-flex sm:hidden" content={item.title} placement="bottom">
                <Steps.Status
                complete={<Steps.Number />}
                current={<Steps.Number />}
                incomplete={<Steps.Number />}
                />
                </Tooltip>
              </Steps.Indicator>
              <Steps.ItemText className="hidden sm:inline-flex">
                <Steps.Title>{item.title}</Steps.Title>
              </Steps.ItemText>
              
            </Steps.Trigger>
            {steps.length -1 > index && <Icon icon="token-icon-chevron-right" size="xl" />}
          </Steps.Item>
        ))}
      </Steps.List>
    </Steps>
  );
}
