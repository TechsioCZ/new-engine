"use client"

import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useFormatter, useTranslations } from "next-intl"

import type { ProductOfferState } from "@/components/product-detail/product-detail.types"
import { SupportingText } from "@/components/text/supporting-text"
import { formatLocationAvailability } from "@/lib/storefront/product-location-availability"
import type { ProductLocationAvailabilityState } from "@/lib/storefront/product-location-availability"

interface ProductDetailDeliveryInfoProps {
  freeShippingThresholdLabel: string | null
  locationAvailabilityState: ProductLocationAvailabilityState
  offerState: ProductOfferState
}

export const ProductDetailDeliveryInfo = ({
  freeShippingThresholdLabel,
  locationAvailabilityState,
  offerState,
}: ProductDetailDeliveryInfoProps) => {
  const { error, isInventoryManaged, isLoading, items } =
    locationAvailabilityState
  const hasLocationError = error !== null && error !== ""
  const showLocationAvailability =
    !(isLoading || hasLocationError) && (items?.length ?? 0) > 0
  const showLocationAvailabilityError = !isLoading && hasLocationError
  const format = useFormatter()
  const tCatalog = useTranslations("catalog")
  const AVAILABLE_TONE_CLASS = "text-primary"
  const UNAVAILABLE_TONE_CLASS = "text-warning"
  const availabilityToneClass = offerState.isInStock
    ? AVAILABLE_TONE_CLASS
    : UNAVAILABLE_TONE_CLASS
  const expectedDeliveryDateLabel = offerState.expectedDeliveryDate
    ? format.dateTime(offerState.expectedDeliveryDate, {
        day: "numeric",
        month: "numeric",
        year: "numeric",
      })
    : null

  return (
    <div className="space-y-400 rounded-lg bg-surface p-550">
      <div className="flex flex-nowrap items-center gap-650 lg:max-lg:flex lg:max-lg:flex-col">
        <div className="flex items-start gap-200">
          <Icon
            className={`self-start text-icon-delivery-size leading-none ${offerState.isInStock ? AVAILABLE_TONE_CLASS : UNAVAILABLE_TONE_CLASS}`}
            icon={
              offerState.isInStock ? "token-icon-check" : "token-icon-alert"
            }
          />
          <SupportingText className="text-fg-primary text-md leading-snug">
            <span className={`font-semibold ${availabilityToneClass}`}>
              {offerState.availabilityLabel}
            </span>
            {expectedDeliveryDateLabel === null ? null : (
              <span className="font-normal text-fg-secondary">
                {`, ${tCatalog("product_detail.delivery_by", {
                  date: expectedDeliveryDateLabel,
                })}`}
              </span>
            )}
          </SupportingText>
        </div>

        {freeShippingThresholdLabel !== null &&
        freeShippingThresholdLabel !== "" ? (
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

      {isLoading ? (
        <Skeleton aria-label="Načítavam dostupnosť podľa skladov">
          <div className="grid gap-250 border-border-secondary border-t pt-400 sm:grid-cols-2">
            <Skeleton.Rectangle className="h-500 rounded-sm" />
            <Skeleton.Rectangle className="h-500 rounded-sm" />
          </div>
        </Skeleton>
      ) : null}

      {showLocationAvailability && items !== null ? (
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
