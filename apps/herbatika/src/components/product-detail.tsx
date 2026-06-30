"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import NextLink from "next/link"
import { useEffect, useState } from "react"
import { HerbatikaBreadcrumb } from "@/components/herbatika-breadcrumb"
import type { ProductDetailProps } from "@/components/product-detail/product-detail.types"
import { ProductDetailHero } from "@/components/product-detail/sections/product-detail-hero"
import { ProductDetailMetrics } from "@/components/product-detail/sections/product-detail-metrics"
import { ProductDetailOffers } from "@/components/product-detail/sections/product-detail-offers"
import { ProductDetailRelated } from "@/components/product-detail/sections/product-detail-related"
import {
  PRODUCT_DETAIL_REVIEWS_SECTION_ID,
  PRODUCT_DETAIL_REVIEWS_TAB_VALUE,
} from "@/components/product-detail/sections/product-detail-review-utils"
import { ProductDetailSkeleton } from "@/components/product-detail/sections/product-detail-skeleton"
import { ProductDetailTabs } from "@/components/product-detail/sections/product-detail-tabs"
import { useProductDetailController } from "@/components/product-detail/use-product-detail-controller"
import { RecentlyVisitedProductsSection } from "@/components/recently-visited-products-section"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"

export function ProductDetail({ handle }: ProductDetailProps) {
  const controller = useProductDetailController({ handle })
  const [activeInfoSection, setActiveInfoSection] = useState<
    string | undefined
  >(controller.defaultInfoSectionValue)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `controller.product?.id` is an intentional trigger — re-syncs the active section when navigating to a different product (App Router reuses the component).
  useEffect(() => {
    setActiveInfoSection(controller.defaultInfoSectionValue)
  }, [controller.defaultInfoSectionValue, controller.product?.id])

  // biome-ignore lint/correctness/useExhaustiveDependencies: `handle` is an intentional trigger — App Router reuses this client component across product navigations, so scroll-to-top must re-run when the handle changes even though the body doesn't read it.
  useEffect(() => {
    if (window.location.hash) {
      return
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }, [handle])

  // biome-ignore lint/correctness/useExhaustiveDependencies: `controller.product?.id` is an intentional trigger — re-selects the reviews tab when navigating to a different product while the reviews hash is in the URL.
  useEffect(() => {
    if (window.location.hash !== `#${PRODUCT_DETAIL_REVIEWS_SECTION_ID}`) {
      return
    }

    setActiveInfoSection(PRODUCT_DETAIL_REVIEWS_TAB_VALUE)
  }, [controller.product?.id])

  const handleShowAllReviews = () => {
    setActiveInfoSection(PRODUCT_DETAIL_REVIEWS_TAB_VALUE)
    window.history.replaceState(
      null,
      "",
      `#${PRODUCT_DETAIL_REVIEWS_SECTION_ID}`
    )
    window.requestAnimationFrame(() => {
      document
        .getElementById(PRODUCT_DETAIL_REVIEWS_SECTION_ID)
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-product-detail-page-gap p-product-detail-page font-rubik 2xl:p-product-detail-page-lg">
      <HerbatikaBreadcrumb items={controller.breadcrumbItems} />

      {controller.isBootstrappingRegion || controller.productQuery.isLoading ? (
        <ProductDetailSkeleton />
      ) : null}

      {!controller.isBootstrappingRegion && controller.productQuery.error ? (
        <section className="space-y-400 rounded-xl border border-border-secondary bg-surface p-600">
          <StatusText showIcon status="error">
            {controller.productQuery.error}
          </StatusText>
          <Button
            onClick={() => {
              runDetachedPromise(controller.productQuery.query.refetch())
            }}
            variant="secondary"
          >
            Skúsiť znova
          </Button>
        </section>
      ) : null}

      {controller.isBootstrappingRegion ||
      controller.productQuery.isLoading ||
      controller.productQuery.error ||
      controller.product ? null : (
        <section className="space-y-400 rounded-xl border border-border-secondary bg-surface p-600">
          <StatusText showIcon status="error">
            Produkt sa nepodarilo nájsť.
          </StatusText>
          <LinkButton as={NextLink} href="/" variant="secondary">
            Späť na domovskú stránku
          </LinkButton>
        </section>
      )}

      {!(
        controller.isBootstrappingRegion ||
        controller.productQuery.isLoading ||
        controller.productQuery.error
      ) && controller.product ? (
        <>
          <ProductDetailHero
            canAddToCart={controller.canAddToCart}
            currentAmountLabel={controller.currentAmountLabel}
            discountPercent={controller.discountPercent}
            displayOriginalLabel={controller.displayOriginalLabel}
            freeShippingThresholdLabel={controller.freeShippingThresholdLabel}
            galleryItems={controller.galleryItems}
            isAdding={controller.isMainProductAdding}
            maxQuantity={controller.maxQuantity}
            mediaFacts={controller.mediaFacts}
            offerState={controller.offerState}
            onAddToCart={controller.handleAddMainProductToCart}
            onQuantityChange={controller.handleQuantityChange}
            onVariantChange={controller.handleSelectVariant}
            product={controller.product}
            productCategories={controller.productCategories}
            productHighlights={controller.productHighlights}
            quantity={controller.quantity}
            selectedVariantId={controller.selectedVariantId}
            unitPriceLabel={controller.unitPriceLabel}
            variantItems={controller.variantItems}
            vipCreditLabel={controller.vipCreditLabel}
          >
            <ProductDetailOffers
              isAdding={controller.isMainProductAdding}
              onAddToCart={controller.handleAddVolumeDiscountToCart}
              onSelectOption={controller.handleSelectVolumeDiscount}
              options={controller.volumeDiscountOptions}
              selectedOptionId={controller.selectedVolumeDiscountId}
            />

            {controller.addToCartError ? (
              <StatusText showIcon status="error">
                {controller.addToCartError}
              </StatusText>
            ) : null}
          </ProductDetailHero>

          <ProductDetailMetrics
            onShowAllReviews={handleShowAllReviews}
            productId={controller.product.id}
          />

          <ProductDetailTabs
            activeSectionValue={activeInfoSection}
            defaultSectionValue={controller.defaultInfoSectionValue}
            onSectionValueChange={setActiveInfoSection}
            productId={controller.product.id}
            sections={controller.productContentSections}
          />
        </>
      ) : null}

      {!controller.isBootstrappingRegion && controller.product ? (
        <>
          <ProductDetailRelated
            isProductAdding={controller.isProductAdding}
            onAddToCart={controller.handleAddRelatedProductToCart}
            onProductHoverEnd={controller.handleRelatedProductHoverEnd}
            onProductHoverStart={controller.handleRelatedProductHoverStart}
            sections={controller.relatedSections}
          />
          <RecentlyVisitedProductsSection
            excludeHandle={controller.product.handle}
            hideWhenEmpty
          />
        </>
      ) : null}
    </main>
  )
}
