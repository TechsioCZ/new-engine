"use client"

import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import type { ProductOfferState } from "@/components/product-detail/product-detail.types"
import { SupportingText } from "@/components/text/supporting-text"
import {
  formatLocationAvailability,
  type ProductLocationAvailabilityState,
} from "@/lib/storefront/product-location-availability"

type ProductDetailDeliveryInfoProps = {
  freeShippingThresholdLabel: string | null
  locationAvailabilityState: ProductLocationAvailabilityState
  offerState: ProductOfferState
}

const DELIVERY_DATE_LABEL_PATTERN = /^u vás do\s+(.+)$/i

export function ProductDetailDeliveryInfo({
  freeShippingThresholdLabel,
  locationAvailabilityState,
  offerState,
}: ProductDetailDeliveryInfoProps) {
  const { error, isInventoryManaged, isLoading, items } =
    locationAvailabilityState
  const showLocationAvailability =
    !isLoading && !error && Boolean(items?.length)
  const showLocationAvailabilityError = !isLoading && Boolean(error)
  const availabilityToneClass = offerState.isInStock
    ? "text-primary"
    : "text-warning"
  const deliveryDateMatch = DELIVERY_DATE_LABEL_PATTERN.exec(
    offerState.deliveryLabel
  )

  return (
    <div className="space-y-400 rounded-lg bg-surface p-550">
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

      {isLoading ? (
        <Skeleton aria-label="Načítavam dostupnosť podľa skladov">
          <div className="grid gap-250 border-border-secondary border-t pt-400 sm:grid-cols-2">
            <Skeleton.Rectangle className="h-500 rounded-sm" />
            <Skeleton.Rectangle className="h-500 rounded-sm" />
          </div>
        </Skeleton>
      ) : null}

      {showLocationAvailability && items ? (
        <dl className="grid gap-250 border-border-secondary border-t pt-400">
          {items.map((location) => {
            const isAvailable =
              !isInventoryManaged || location.available_quantity > 0

            return (
              <div
                className="flex min-w-0 items-center justify-between gap-250"
                key={location.location_id}
              >
                <dt className="min-w-0 text-fg-secondary text-sm leading-snug">
                  {location.location_name}
                </dt>
                <dd
                  className={`shrink-0 text-right font-semibold text-sm ${isAvailable ? "text-primary" : "text-warning"}`}
                >
                  {formatLocationAvailability(location.available_quantity, {
                    isInventoryManaged,
                  })}
                </dd>
              </div>
            )
          })}
        </dl>
      ) : null}

      {showLocationAvailabilityError ? (
        <StatusText showIcon size="sm" status="warning">
          Dostupnosť podľa skladov sa nepodarilo načítať.
        </StatusText>
      ) : null}
    </div>
  )
}
