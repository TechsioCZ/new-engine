"use client"

import { Icon } from "@techsio/ui-kit/atoms/icon"
import { useTranslations } from "next-intl"

import type { ProductDetailPurchasePanelProps } from "@/components/product-detail/sections/product-detail-purchase-panel.types"

interface PurchasePanelPricingProps {
  currentAmountLabel: ProductDetailPurchasePanelProps["currentAmountLabel"]
  displayOriginalLabel: ProductDetailPurchasePanelProps["displayOriginalLabel"]
  unitPriceLabel: ProductDetailPurchasePanelProps["unitPriceLabel"]
  vipCreditLabel: ProductDetailPurchasePanelProps["vipCreditLabel"]
}

export const ProductDetailPurchasePanelPricing = ({
  currentAmountLabel,
  displayOriginalLabel,
  unitPriceLabel,
  vipCreditLabel,
}: PurchasePanelPricingProps) => {
  const tCatalog = useTranslations("catalog")

  return (
    <div className="flex flex-wrap items-end justify-between gap-250">
      <div className="space-y-200">
        <div className="flex flex-wrap items-end gap-150">
          <p className="font-medium text-fg-primary text-xl leading-tight md:text-3xl">
            {currentAmountLabel}
          </p>
          {displayOriginalLabel !== null && displayOriginalLabel !== "" ? (
            <span className="pb-50 font-normal text-fg-secondary text-md leading-normal line-through md:text-lg">
              {displayOriginalLabel}
            </span>
          ) : null}
        </div>
        {unitPriceLabel !== null && unitPriceLabel !== "" ? (
          <p className="text-fg-secondary text-sm leading-tight md:text-md">
            {unitPriceLabel}
          </p>
        ) : null}
      </div>

      {vipCreditLabel !== null && vipCreditLabel !== "" ? (
        <div className="flex w-full min-w-0 items-center gap-400 rounded-sm bg-highlight px-400 py-200 sm:w-auto">
          <Icon
            className="text-primary"
            icon="token-icon-save-money"
            size="lg"
          />
          <div className="min-w-0 space-y-50">
            <p className="font-semibold text-fg-primary text-md leading-tight">
              {tCatalog("product_detail.vip_credit.title")}
            </p>
            <p className="break-words text-fg-secondary text-sm leading-tight">
              {tCatalog("product_detail.vip_credit.earned", {
                credit: vipCreditLabel,
              })}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
