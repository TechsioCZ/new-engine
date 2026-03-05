import { CartTable } from "./cart-table"
import { TestComponentsSection } from "./section"

export function TableSection() {
  return (
    <TestComponentsSection
      title="Table (PDP / Košík)"
      description="`Table variant=line` ve velikostech `md` a `sm` s quantity patternem a CTA tlačítky."
    >
      <div className="flex flex-col gap-400">
        <CartTable size="md" />
        <CartTable size="sm" />
      </div>
    </TestComponentsSection>
  )
}
