"use client"

import { Icon } from "@techsio/ui-kit/atoms/icon"
import { useFormatter, useTranslations } from "next-intl"
import type { ProductOfferState } from "@/components/product-detail/product-detail.types"
import { SupportingText } from "@/components/text/supporting-text"

type ProductDetailDeliveryInfoProps = {
  freeShippingThresholdLabel: string | null
  offerState: ProductOfferState
}

export function ProductDetailDeliveryInfo({
  freeShippingThresholdLabel,
  offerState,
}: ProductDetailDeliveryInfoProps) {
  const format = useFormatter()
  const tCatalog = useTranslations("catalog")
  const availabilityToneClass = offerState.isInStock
    ? "text-primary"
    : "text-warning"
  const expectedDeliveryDateLabel = offerState.expectedDeliveryDate
    ? format.dateTime(offerState.expectedDeliveryDate, {
        day: "numeric",
        month: "numeric",
        year: "numeric",
      })
    : null

  return (
    <div className="rounded-lg bg-surface p-550">
      <div className="flex flex-nowrap items-center gap-650 lg:max-lg:flex lg:max-lg:flex-col">
        <div className="flex items-start gap-200">
          <Icon
            className={`self-start text-icon-delivery-size leading-none ${offerState.isInStock ? "text-primary" : "text-warning"}`}
            icon={
              offerState.isInStock ? "token-icon-check" : "token-icon-alert"
            }
          />
          <SupportingText className="text-fg-primary text-md leading-snug">
            <span className={`font-semibold ${availabilityToneClass}`}>
              {offerState.availabilityLabel}
            </span>
            {expectedDeliveryDateLabel ? (
              <span className="font-normal text-fg-secondary">
                {`, ${tCatalog("product_detail.delivery_by", {
                  date: expectedDeliveryDateLabel,
                })}`}
              </span>
            ) : null}
          </SupportingText>
        </div>

        {freeShippingThresholdLabel ? (
          <div className="flex items-center gap-200">
            <Icon
              className="self-start text-primary"
              icon="token-icon-truck-delivery text-icon-delivery-size"
            />
            <SupportingText className="text-fg-secondary text-md leading-snug">
              {tCatalog("product_detail.free_shipping_over", {
                threshold: freeShippingThresholdLabel,
              })}
            </SupportingText>
          </div>
        ) : null}
      </div>
    </div>
  )
}
