import { Icon } from "@techsio/ui-kit/atoms/icon";
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
      <Steps.List className="w-fit mx-auto justify-start bg-base p-300 rounded-xl">
        {steps.map((item, index) => (
          <Steps.Item index={index} key={item.id} className="flex-none min-w-max">
            <Steps.Trigger disabled>
              <Steps.Indicator className="leading-none">
                <Steps.Status
                complete={<Steps.Number />}
                current={<Steps.Number />}
                incomplete={<Steps.Number />}
                />
              </Steps.Indicator>
              <Steps.ItemText>
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
