import { Button } from "@techsio/ui-kit/atoms/button"
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input"
import { Select, type SelectItem } from "@techsio/ui-kit/molecules/select"

export function ProductDetailPurchaseControls({
  canAddToCart,
  isAdding,
  maxQuantity,
  onAddToCart,
  onQuantityChange,
  onVariantChange,
  quantity,
  selectedVariantId,
  variantItems,
}: {
  canAddToCart: boolean
  isAdding: boolean
  maxQuantity: number
  onAddToCart: () => void
  onQuantityChange: (quantity: number) => void
  onVariantChange: (variantId: string | null) => void
  quantity: number
  selectedVariantId: string | null
  variantItems: SelectItem[]
}) {
  return (
    <>
      {variantItems.length > 1 ? (
        <Select
          className="w-full sm:max-w-product-variant"
          items={variantItems}
          onValueChange={(details) => onVariantChange(details.value[0] ?? null)}
          size="lg"
          value={selectedVariantId ? [selectedVariantId] : []}
        >
          <Select.Label>Varianta</Select.Label>
          <Select.Control>
            <Select.Trigger className="rounded-select-lg">
              <Select.ValueText placeholder="Vyberte variantu" />
            </Select.Trigger>
          </Select.Control>
          <Select.Positioner>
            <Select.Content>
              {variantItems.map((item) => (
                <Select.Item item={item} key={item.value}>
                  <Select.ItemText />
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Select>
      ) : null}
      <div className="grid min-h-purchase-panel-footer min-w-0 items-center gap-350 sm:grid-cols-4">
        <NumericInput
          className="w-full min-w-0 px-0 xl:px-300"
          id="product-quantity"
          max={maxQuantity}
          min={1}
          onChange={(value) => {
            onQuantityChange(
              Number.isFinite(value) && value >= 1
                ? Math.min(Math.floor(value), maxQuantity)
                : 1
            )
          }}
          value={quantity}
        >
          <NumericInput.Control className="grid h-full grid-cols-3 place-items-center">
            <NumericInput.DecrementTrigger className="min-h-750 w-auto" />
            <NumericInput.Input className="min-h-750 px-0 py-0 text-center" />
            <NumericInput.IncrementTrigger className="min-h-750 w-auto" />
          </NumericInput.Control>
        </NumericInput>
        <Button
          block
          className="h-full min-w-0 text-md sm:col-span-3"
          disabled={!canAddToCart}
          icon="token-icon-cart"
          iconSize="xl"
          isLoading={isAdding}
          loadingText="Pridávam..."
          onClick={onAddToCart}
          variant="primary"
        >
          Pridať do košíka
        </Button>
      </div>
    </>
  )
}
