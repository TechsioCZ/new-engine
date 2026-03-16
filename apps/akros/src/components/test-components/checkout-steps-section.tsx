import { Steps } from "@ui/molecules/steps"
import { TestComponentsSection } from "./section"

const checkoutStepItems = [
  {
    placeholder: "Placeholder obsahu košíku.",
    title: "Nákupní košík",
  },
  {
    placeholder: "Placeholder výběru dopravy a platby.",
    title: "Doprava a platba",
  },
  {
    placeholder: "Placeholder dodacích údajů.",
    title: "Dodací údaje",
  },
  {
    placeholder: "Placeholder souhrnu objednávky.",
    title: "Shrnutí objednávky",
  },
]

export function CheckoutStepsSection() {
  return (
    <TestComponentsSection title="Checkout Steps">
      <div className="mx-auto w-full max-w-[1228px] bg-base px-550 pt-550 pb-550">
        <Steps
          count={checkoutStepItems.length}
          defaultStep={0}
          linear
          orientation="horizontal"
          size="md"
          variant="subtle"
        >
          <Steps.List>
            {checkoutStepItems.map((item, index) => (
              <Steps.Item
                className="data-[orientation=horizontal]:flex-1 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:items-stretch"
                index={index}
                key={item.title}
              >
                <div className="flex w-full items-center">
                  <Steps.Trigger
                    aria-label={item.title}
                    className="data-[orientation=horizontal]:justify-center"
                    disabled
                  >
                    <Steps.Indicator />
                  </Steps.Trigger>
                  <Steps.Separator />
                </div>
                <Steps.Title className="text-center">{item.title}</Steps.Title>
              </Steps.Item>
            ))}
          </Steps.List>

          <Steps.Panels>
            {checkoutStepItems.map((item, index) => (
              <Steps.Content index={index} key={item.title}>
                <div className="flex min-h-[360px] flex-col gap-300">
                  <h3 className="text-2xl font-medium">Obsah košíku</h3>
                  <p className="text-md text-fg-secondary">{item.placeholder}</p>
                </div>
              </Steps.Content>
            ))}

            <Steps.Navigation className="justify-between">
              <Steps.PrevTrigger
                className="h-[60px] w-[320px]"
                size="lg"
                theme="solid"
                uppercase
                variant="secondary"
              >
                Zpět
              </Steps.PrevTrigger>
              <Steps.NextTrigger className="h-[60px] w-[344px]" size="lg" uppercase>
                Vybrat dopravu a platbu
              </Steps.NextTrigger>
            </Steps.Navigation>
          </Steps.Panels>
        </Steps>
      </div>
    </TestComponentsSection>
  )
}
