import type { HttpTypes } from "@medusajs/types"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { useTranslations } from "next-intl"
import NextImage from "next/image"

import { FALLBACK_IMAGE_SRC } from "@/components/fallback-image.constants"
import { SupportingText } from "@/components/text/supporting-text"
import {
  resolveCartItemName,
  resolveLineItemTotalAmount,
} from "@/lib/storefront/cart-calculations"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"

import { resolveAvailabilityText } from "../utils/resolve-availability-text"

interface CheckoutOrderSummaryItemProps {
  currencyCode: string
  hasDivider: boolean
  item: HttpTypes.StoreCartLineItem
}

export const CheckoutOrderSummaryItem = ({
  currencyCode,
  hasDivider,
  item,
}: CheckoutOrderSummaryItemProps) => {
  const tCheckout = useTranslations("checkout")
  const itemName = resolveCartItemName(item)
  const itemQuantity = item.quantity ?? 0
  const itemPrice = formatCurrencyAmount(
    resolveLineItemTotalAmount(item),
    currencyCode,
  )
  const itemThumbnail =
    typeof item.thumbnail === "string" && item.thumbnail.length > 0
      ? item.thumbnail
      : FALLBACK_IMAGE_SRC
  const availabilityText = resolveAvailabilityText(item)

  return (
    <article
      className={`space-y-150 pb-250 ${
        hasDivider ? "border-border-secondary border-b" : ""
      }`}
    >
      <div className="flex items-start gap-300">
        <NextImage
          alt={itemName}
          className="size-checkout-image shrink-0 rounded-sm border border-border-secondary object-cover"
          height={150}
          quality={50}
          src={itemThumbnail}
          width={150}
        />
        <div className="flex h-checkout-image min-w-0 flex-col justify-between space-y-100">
          <p className="line-clamp font-medium text-fg-primary text-md">
            {itemName}
          </p>
          <p className="2xs:inline-flex hidden h-full w-full items-end font-medium text-success-fg text-xs leading-normal">
            <span className="flex h-fit items-center gap-150">
              <Icon className="shrink-0" icon="token-icon-check" size="sm" />
              <span className="min-w-0">{availabilityText}</span>
            </span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-100">
          <p className="shrink-0 font-semibold text-fg-primary text-lg">
            {itemPrice}
          </p>
          <SupportingText className="text-fg-secondary">
            {tCheckout("item_quantity", {
              quantity: itemQuantity,
            })}
          </SupportingText>
        </div>
      </div>
      <p className="inline-flex 2xs:hidden w-full items-start gap-150 font-medium text-success-fg text-xs leading-normal">
        <Icon className="shrink-0" icon="token-icon-check" size="sm" />
        <span className="min-w-0 break-words">{availabilityText}</span>
      </p>
    </article>
  )
}
