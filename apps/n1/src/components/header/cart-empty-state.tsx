import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon } from "@techsio/ui-kit/atoms/icon"

interface CartEmptyStateProps {
  onContinueShopping?: () => void
}

export const CartEmptyState = ({ onContinueShopping }: CartEmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-700 text-center">
    <Icon
      className="mb-400 text-3xl text-fg-secondary"
      icon="icon-[mdi--cart-outline]"
    />

    <h3 className="mb-200 font-semibold text-lg">Váš košík je prázdný</h3>
    <p className="mb-600 text-fg-secondary text-sm">
      Přidejte si něco hezkého z naší nabídky
    </p>

    <Button
      onClick={onContinueShopping}
      size="md"
      theme="solid"
      variant="primary"
    >
      Pokračovat v nákupu
    </Button>
  </div>
)
