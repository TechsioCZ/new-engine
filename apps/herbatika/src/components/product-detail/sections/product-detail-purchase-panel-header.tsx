"use client"

import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Link } from "@techsio/ui-kit/atoms/link"
import { useTranslations } from "next-intl"

import NextLink from "@/components/app-link"
import { resolveFlags } from "@/components/product-card/product-card.flags"
import type { ProductDetailPurchasePanelProps } from "@/components/product-detail/sections/product-detail-purchase-panel.types"
import { resolveProductInfoLink } from "@/components/product-detail/sections/product-detail-purchase-panel.utils"
import { ProductListPickerPopover } from "@/components/product-lists/product-list-picker-popover"
import { appHref } from "@/lib/routing"

interface PurchasePanelHeaderProps {
  displayOriginalLabel: ProductDetailPurchasePanelProps["displayOriginalLabel"]
  offerState: ProductDetailPurchasePanelProps["offerState"]
  product: ProductDetailPurchasePanelProps["product"]
  productCategories: ProductDetailPurchasePanelProps["productCategories"]
  quantity: ProductDetailPurchasePanelProps["quantity"]
  selectedVariantId: ProductDetailPurchasePanelProps["selectedVariantId"]
}

export const ProductDetailPurchasePanelHeader = ({
  displayOriginalLabel,
  offerState,
  product,
  productCategories,
  quantity,
  selectedVariantId,
}: PurchasePanelHeaderProps) => {
  const tCatalog = useTranslations("catalog")
  const [primaryCategory] = productCategories
  const productInfoLink = resolveProductInfoLink(product, primaryCategory)
  const flags = resolveFlags(product, Boolean(displayOriginalLabel), {
    action: tCatalog("filters.status.action"),
    new: tCatalog("filters.status.new"),
    tip: tCatalog("filters.status.tip"),
  })

  return (
    <div className="flex min-h-600 min-w-0 flex-wrap items-start gap-200 pb-500">
      {flags.map((flag) => (
        <Badge
          className="font-bold leading-tight"
          key={`${product.id}-${flag.label}`}
          variant={flag.variant}
        >
          {flag.label}
        </Badge>
      ))}

      <div className="flex w-full min-w-0 items-center justify-between gap-300 sm:ml-auto sm:w-auto sm:gap-500">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-100 gap-y-50">
          <span className="text-fg-placeholder text-sm leading-tight">
            ID: {offerState.code ?? product.handle}
          </span>
          {productInfoLink === null ? null : (
            <>
              <span className="text-fg-placeholder text-sm leading-tight">
                •
              </span>
              {productInfoLink.href === null || productInfoLink.href === "" ? (
                <span className="min-w-0 break-words text-primary text-sm leading-tight">
                  {productInfoLink.label}
                </span>
              ) : (
                <Link
                  as={NextLink}
                  className="min-w-0 break-words font-normal text-primary text-sm leading-tight underline hover:text-primary-strong"
                  href={appHref(productInfoLink.href)}
                >
                  {productInfoLink.label}
                </Link>
              )}
            </>
          )}
        </div>

        <ProductListPickerPopover
          product={product}
          quantity={quantity}
          selectedVariantId={selectedVariantId}
        />
      </div>
    </div>
  )
}
