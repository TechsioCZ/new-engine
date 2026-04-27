import { Button } from "@techsio/ui-kit/atoms/button"
import NextLink from "next/link"
import type { ProductDetail, ProductVariantDetail } from "@/types/product"
import { formatCalculatedVariantPrice } from "@/utils/format/format-product"
import { ProductPrice } from "../product-price"
import { AddToCartSection } from "./product-info-panel/add-to-cart-section"
import { DeliveryDate } from "./product-info-panel/delivery-date"
import { ProductActions } from "./product-info-panel/product-action"
import { ProductMetadata } from "./product-info-panel/product-metadata"
import { ProductVariantSelect } from "./product-info-panel/product-variant-select"
import { SectionBasicInfo } from "./product-info-panel/section-basic-info"
import { StoreStatus } from "./product-info-panel/store-status"

type ProductInfoPanelProps = {
  detail: ProductDetail
  selectedVariant: ProductVariantDetail | null
  handle: string
}

export const ProductInfoPanel = ({
  detail,
  selectedVariant,
  handle,
}: ProductInfoPanelProps) => {
  const calculatedPrice = selectedVariant?.calculated_price
  const hasCalculatedPriceWithTax =
    typeof calculatedPrice?.calculated_amount_with_tax === "number" &&
    Number.isFinite(calculatedPrice.calculated_amount_with_tax)
  const hasCalculatedPriceWithoutTax =
    typeof calculatedPrice?.calculated_amount_without_tax === "number" &&
    Number.isFinite(calculatedPrice.calculated_amount_without_tax)
  const priceWithTax = hasCalculatedPriceWithTax
    ? formatCalculatedVariantPrice(calculatedPrice, true)
    : detail.price
  const priceWithoutTax = hasCalculatedPriceWithoutTax
    ? formatCalculatedVariantPrice(calculatedPrice, false)
    : detail.withoutTax

  return (
    <div className="flex flex-col gap-300">
      <SectionBasicInfo>
        <ProductMetadata
          rows={[
            { label: "Výrobce", value: detail.producer?.title },
            {
              label: "Kód produktu",
              value: selectedVariant?.metadata?.user_code,
            },
          ]}
        />
        <div className="flex flex-col gap-500 pb-400">
          <div className="flex flex-col gap-200">
            <span className="font-bold">Zvolte variantu:</span>
            {detail.variants && (
              <ProductVariantSelect
                detail={detail}
                handle={handle}
                selectedVariant={selectedVariant}
              />
            )}
          </div>
          {selectedVariant && (
            <div>
              <StoreStatus variant={selectedVariant} />
            </div>
          )}
        </div>
      </SectionBasicInfo>

      <SectionBasicInfo>
        <div className="flex justify-between">
          <div className="flex items-center gap-100">
            <span className="font-bold">Zvolená varianta:</span>
            {selectedVariant?.title}
          </div>
          <NextLink className="underline" href="/doprava">
            Možnosti dopravy
          </NextLink>
        </div>

        {priceWithTax && (
          <ProductPrice
            priceWithoutTax={priceWithoutTax}
            priceWithTax={priceWithTax}
            size="lg"
          />
        )}

        <div className="flex gap-200">
          {selectedVariant ? (
            <AddToCartSection
              detail={detail}
              selectedVariant={selectedVariant}
            />
          ) : (
            <Button disabled>vyberte variantu</Button>
          )}
        </div>
      </SectionBasicInfo>

      <SectionBasicInfo divider={false}>
        <DeliveryDate />
        <ProductActions />
      </SectionBasicInfo>

      {detail.badges && detail.badges.length > 0 && (
        <div className="flex gap-200">
          {detail.badges.map((badge) => (
            <span
              className="rounded bg-surface-light px-300 py-100 text-2xs"
              key={badge.id}
            >
              {badge.children}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
