import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import type { CartLineItem } from "@/types/cart"
import { formatToTaxIncluded } from "@/utils/format/format-product"

type CartItemProps = {
  item: CartLineItem
  onUpdateQuantity: (quantity: number) => void
  onRemove: () => void
  isPending?: boolean
  isOptimistic?: boolean
}

export const CartItem = ({
  item,
  onUpdateQuantity,
  onRemove,
  isPending = false,
  isOptimistic = false,
}: CartItemProps) => {
  const [localQuantity, setLocalQuantity] = useState(item.quantity)
  const title = item.product_title || item.title || "Unknown Product"
  const variantTitle = item.variant_title
  const thumbnail = item.thumbnail
  const effectiveMax =
    (item.metadata?.inventory_quantity as number | undefined) ?? 10

  useEffect(() => {
    setLocalQuantity(item.quantity)
  }, [item.quantity])

  const debouncedUpdate = useDebounce((quantity: number) => {
    onUpdateQuantity(quantity)
  }, 300)

  const handleQuantityChange = (newQuantity: number) => {
    if (Number.isNaN(newQuantity) || !Number.isFinite(newQuantity)) {
      return
    }

    const validValue = Math.min(newQuantity, effectiveMax)
    setLocalQuantity(newQuantity)
    debouncedUpdate(validValue)
  }

  const formattedPrice = formatToTaxIncluded({ amount: item.unit_price })

  return (
    <div
      className={`flex gap-300 py-300 first:pt-0 last:pb-0 ${isOptimistic ? "opacity-60" : ""}
        ${isPending ? "pointer-events-none" : ""}
      `}
    >
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md">
        {thumbnail ? (
          <Image
            alt={title}
            className="h-full w-full object-cover"
            height={64}
            loading="lazy"
            quality={40}
            src={thumbnail}
            width={64}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon className="text-2xl" icon="icon-[mdi--image-outline]" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <Link
          href={`/produkt/${item.product_handle}?variant=${item.variant_title}`}
        >
          <h4 className="truncate font-medium text-sm underline hover:no-underline">
            {title}
          </h4>
        </Link>

        {variantTitle && variantTitle !== "Default" && (
          <p className="truncate text-fg-secondary text-xs">{variantTitle}</p>
        )}

        <p className="font-medium text-sm">{formattedPrice}</p>

        {effectiveMax < 3 && effectiveMax > 0 && (
          <p className="text-2xs text-danger">Zbývá pouze {effectiveMax} ks</p>
        )}
      </div>

      <div className="flex items-center">
        <NumericInput
          allowOverflow={false}
          className="h-8 border-collapse gap-0"
          max={effectiveMax}
          min={1}
          onChange={handleQuantityChange}
          value={localQuantity}
        >
          <NumericInput.DecrementTrigger
            className="bg-base"
            disabled={localQuantity === 1}
            theme="outlined"
          />
          <NumericInput.Control className="aspect-square border-border-secondary border-x-0 focus-within:border-x-1">
            <NumericInput.Input className="justify-center px-0 text-center" />
          </NumericInput.Control>
          <NumericInput.IncrementTrigger
            className="bg-base"
            disabled={localQuantity >= effectiveMax}
            theme="outlined"
          />
        </NumericInput>
      </div>

      <Button
        aria-label={`Odstranit ${title} z košíku`}
        className="h-7 w-7 p-0 text-fg-5 transition-colors hover:text-fg-secondary"
        disabled={isPending}
        icon="icon-[mdi--trash-can-outline]"
        onClick={onRemove}
        size="sm"
        theme="unstyled"
        variant="tertiary"
      />
    </div>
  )
}
