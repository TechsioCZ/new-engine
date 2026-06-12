"use client"

import { Icon } from "@techsio/ui-kit/atoms/icon"
import type { ProductOfferState } from "@/components/product-detail/product-detail.types"
import { SupportingText } from "@/components/text/supporting-text"

type ProductDetailDeliveryInfoProps = {
  freeShippingThresholdLabel: string | null
  offerState: ProductOfferState
}

const DELIVERY_DATE_LABEL_PATTERN = /^u vás do\s+(.+)$/i

export function ProductDetailDeliveryInfo({
  freeShippingThresholdLabel,
  offerState,
}: ProductDetailDeliveryInfoProps) {
  const availabilityToneClass = offerState.isInStock
    ? "text-primary"
    : "text-warning"
  const deliveryDateMatch = DELIVERY_DATE_LABEL_PATTERN.exec(
    offerState.deliveryLabel
  )

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
            {deliveryDateMatch && (
              <>
                <span className="font-normal text-fg-secondary">
                  , u vás do{" "}
                </span>
                <span className="font-semibold text-fg-primary">
                  {deliveryDateMatch[1]}
                </span>
              </>
            )}
          </SupportingText>
        </div>

        {freeShippingThresholdLabel ? (
          <div className="flex items-center gap-200">
            <Icon
              className="self-start text-primary"
              icon="token-icon-truck-delivery text-icon-delivery-size"
            />
            <SupportingText className="text-fg-secondary text-md leading-snug">
              Doručenie zdarma nad{" "}
              <span className="font-semibold text-primary">
                {freeShippingThresholdLabel}
              </span>
            </SupportingText>
          </div>
        ) : null}
      </div>
    </div>
  )
}
