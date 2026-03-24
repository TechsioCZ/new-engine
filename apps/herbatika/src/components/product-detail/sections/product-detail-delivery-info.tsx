"use client";

import { Icon } from "@techsio/ui-kit/atoms/icon";
import type { ProductOfferState } from "@/components/product-detail/product-detail.types";
import { SupportingText } from "@/components/text/supporting-text";

type ProductDetailDeliveryInfoProps = {
  freeShippingThresholdLabel: string;
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
        <div className="flex items-center gap-200">
          <Icon
            className={offerState.isInStock ? "text-xl text-primary" : "text-xl text-warning"}
            icon={offerState.isInStock ? "token-icon-check" : "icon-[mdi--alert-circle-outline]"}
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

        <div className="flex items-center gap-200">
          <Icon className="text-xl text-primary" icon="icon-[mdi--truck-delivery-outline]" />
          <SupportingText className="text-md leading-snug text-fg-secondary">
            Doručenie zdarma nad <span className="font-semibold text-primary">{freeShippingThresholdLabel}</span>
          </SupportingText>
        </div>
      </div>
    </div>
  );
}
