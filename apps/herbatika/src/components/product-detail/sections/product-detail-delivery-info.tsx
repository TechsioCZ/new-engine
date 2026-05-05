"use client";

import { Icon } from "@techsio/ui-kit/atoms/icon";
import type { ProductOfferState } from "@/components/product-detail/product-detail.types";
import { SupportingText } from "@/components/text/supporting-text";

type ProductDetailDeliveryInfoProps = {
  freeShippingThresholdLabel: string | null;
  offerState: ProductOfferState;
};

export function ProductDetailDeliveryInfo({
  freeShippingThresholdLabel,
  offerState,
}: ProductDetailDeliveryInfoProps) {
  const availabilityToneClass = offerState.isInStock ? "text-primary" : "text-warning";
  const deliveryDateMatch = /^u vás do\s+(.+)$/i.exec(offerState.deliveryLabel);

  return (
    <div className="rounded-lg bg-surface p-550">
      <div className="flex flex-wrap items-center gap-650 md:flex-nowrap">
        <div className="flex gap-200 items-start">
          <Icon
            className={`text-icon-delivery-size leading-none self-start ${offerState.isInStock ? "text-primary" : "text-warning"}`}
            icon={offerState.isInStock ? "token-icon-check" : "token-icon-alert"}
          />
          <SupportingText className="text-md leading-snug text-fg-primary">
            <span className={`font-semibold ${availabilityToneClass}`}>
              {offerState.availabilityLabel}
            </span>
            {deliveryDateMatch ? (
              <>
                <span className="font-normal text-fg-secondary">, u vás do </span>
                <span className="font-semibold text-fg-primary">{deliveryDateMatch[1]}</span>
              </>
            ) : (
              <span className="font-normal text-fg-secondary">{`, ${offerState.deliveryLabel}`}</span>
            )}
          </SupportingText>
        </div>

        {freeShippingThresholdLabel ? (
          <div className="flex items-center gap-200">
            <Icon className="text-primary self-start" icon="token-icon-truck-delivery text-icon-delivery-size" />
            <SupportingText className="text-md leading-snug text-fg-secondary">
              Doručenie zdarma nad <span className="font-semibold text-primary">{freeShippingThresholdLabel}</span>
            </SupportingText>
          </div>
        ) : null}
      </div>
    </div>
  );
}
