import { Steps } from "@ui/molecules/steps"
import { checkoutSteps } from "./data"
import { TestComponentsSection } from "./section"

export function CheckoutStepsSection() {
  return (
    <TestComponentsSection
      title="Checkout Steps"
      description="Krokový checkout progress (`orientation=horizontal`, `showControls=false`)."
    >
      <Steps
        completeText="Objednávka dokončena"
        currentStep={1}
        items={checkoutSteps}
        orientation="horizontal"
        showControls={false}
      />
    </TestComponentsSection>
  )
}
