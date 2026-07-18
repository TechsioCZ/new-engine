"use client"
import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import Image from "next/image"
import Link from "next/link"

import { SkeletonLoader } from "@/components/atoms/skeleton-loader"
import { useCart } from "@/hooks/use-cart"
import { getVariantInventory, isQuantityAvailable } from "@/lib/inventory"
import { formatPrice } from "@/utils/price-utils"
import { getProductPath } from "@/utils/product-utils"

export function CartPreview() {
  const { cart, removeItem, isLoading } = useCart()
  const items = cart?.items || []
  const total = cart?.total || 0

  if (isLoading) {
    return (
      <div className="w-cart-preview-max max-w-cart-preview-max">
        <div className="space-y-4 p-4">
          <SkeletonLoader size="md" variant="box" />
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="max-w-cart-preview-max">
        <div className="flex flex-col gap-4 py-cart-preview-empty-padding text-center">
          <p className="font-semibold text-cart-preview-empty-size text-cart-preview-fg">
            Košík je prázdný
          </p>

          <LinkButton
            as={Link}
            block
            href="/products"
            size="sm"
            variant="primary"
          >
            Prohlédnout Produkty
          </LinkButton>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-cart-preview-max">
      <div className="pb-cart-preview">
        <h3 className="font-cart-preview-title text-cart-preview-fg text-cart-preview-title-size">
          Váš košík:
        </h3>
      </div>

      <div className="max-h-cart-preview-height overflow-y-auto">
        {items.map((item) => {
          const price = item.unit_price || 0
          const imageUrl = item.thumbnail || "/placeholder.png"
          const inventory = item.variant
            ? getVariantInventory(item.variant)
            : null
          const hasStockIssue =
            inventory && !isQuantityAvailable(item.variant, item.quantity)

          return (
            <div
              className="flex gap-cart-preview border-cart-preview-item-border border-b last:border-b-0"
              key={item.id}
            >
              <div className="h-cart-preview-item-image w-cart-preview-item-image rounded-cart-preview bg-cart-preview-item-image-bg">
                <Image
                  alt={item.title}
                  className="h-full w-full object-cover p-1"
                  height={60}
                  src={imageUrl}
                  width={60}
                />
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  className="block font-cart-preview-item text-cart-preview-fg text-cart-preview-item-size hover:text-cart-preview-fg-secondary"
                  href={getProductPath(item.variant?.product?.handle || "")}
                >
                  <span className="line-clamp-cart-item-name">
                    {item.title}
                  </span>
                </Link>
                {item.variant?.title && item.variant.title !== item.title && (
                  <p className="text-cart-preview-detail-size text-cart-preview-fg-secondary">
                    {item.variant.title}
                  </p>
                )}
                <p className="text-cart-preview-detail-size text-cart-preview-fg-secondary">
                  Množství: {item.quantity}
                </p>
                {hasStockIssue && (
                  <p className="mt-cart-preview-error-margin-top text-cart-preview-error-fg text-cart-preview-error-size">
                    ⚠ Nízká zásoba
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end justify-between">
                <Button
                  aria-label="Odebrat z košíku"
                  className="px-0 py-0 text-cart-preview-fg-secondary hover:text-cart-preview-fg"
                  icon="token-icon-close"
                  onClick={() => removeItem(item.id)}
                  theme="borderless"
                  type="button"
                />
                <p className="font-cart-preview-item text-cart-preview-fg text-cart-preview-item-size">
                  {formatPrice(
                    price * item.quantity,
                    cart?.region?.currency_code
                  )}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-cart-preview-footer-border border-t pt-cart-preview">
        <div className="mb-cart-preview flex items-center justify-between">
          <span className="font-cart-preview-subtotal-label text-cart-preview-fg-secondary text-cart-preview-subtotal-label-size">
            Celkem
          </span>
          <span className="font-cart-preview-subtotal-amount text-cart-preview-fg text-cart-preview-subtotal-size">
            {formatPrice(total, cart?.region?.currency_code)}
          </span>
        </div>
        <div className="flex flex-col gap-cart-preview-actions-gap">
          <LinkButton
            as={Link}
            block
            href="/cart"
            prefetch={true}
            size="md"
            variant="primary"
          >
            Do Košíku
          </LinkButton>
        </div>
      </div>
    </div>
  )
}
