import { Button } from "@ui/atoms/button"
import { TestComponentsSection } from "./section"

export function ButtonsSection() {
  return (
    <TestComponentsSection
      title="Button Varianty"
      description="Používané kombinace z podkladů: `solid/primary`, `solid/secondary`, `outlined/secondary`, `unstyled/current`."
    >
      <div className="flex flex-wrap items-center gap-200">
        <Button size="lg" theme="solid" variant="primary">
          Do košíku
        </Button>
        <Button size="md" theme="solid" variant="secondary">
          Zpět
        </Button>
        <Button size="lg" theme="outlined" variant="secondary">
          Do oblíbených
        </Button>
        <Button icon="token-icon-heart" size="current" theme="unstyled" />
      </div>
    </TestComponentsSection>
  )
}
