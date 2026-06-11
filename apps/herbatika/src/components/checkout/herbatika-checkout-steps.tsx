import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Tooltip } from "@techsio/ui-kit/atoms/tooltip"
import { Steps } from "@techsio/ui-kit/molecules/steps"

export type HerbatikaCheckoutStepItem = {
  id: string
  title: string
}

type HerbatikaCheckoutStepsProps = {
  step: number
  steps: readonly HerbatikaCheckoutStepItem[]
}

export function HerbatikaCheckoutSteps({
  step,
  steps,
}: HerbatikaCheckoutStepsProps) {
  const completionStepIndex = steps.length
  const visualStepCount = steps.length + 1

  return (
    <Steps count={visualStepCount} linear size="sm" step={step}>
      <Steps.List className="mx-auto w-full rounded-xl p-300 md:w-fit md:justify-start">
        {steps.map((item, index) => (
          <Steps.Item
            className="min-w-max flex-none gap-x-450 sm:gap-x-150"
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
              <Steps.ItemText className="hidden uppercase sm:inline-flex">
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
          className="min-w-max flex-none"
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
  )
}
