"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useTranslations } from "next-intl"

import NextLink from "@/components/app-link"
import { HerbatikaBreadcrumb } from "@/components/herbatika-breadcrumb"
import type { ProductDetailProps } from "@/components/product-detail/product-detail.types"
import { ProductDetailHero } from "@/components/product-detail/sections/product-detail-hero"
import { ProductDetailMetrics } from "@/components/product-detail/sections/product-detail-metrics"
import { ProductDetailOffers } from "@/components/product-detail/sections/product-detail-offers"
import { ProductDetailRelated } from "@/components/product-detail/sections/product-detail-related"
import { ProductDetailSkeleton } from "@/components/product-detail/sections/product-detail-skeleton"
import { ProductDetailTabs } from "@/components/product-detail/sections/product-detail-tabs"
import { useProductDetailController } from "@/components/product-detail/use-product-detail-controller"
import { useProductDetailSectionNavigation } from "@/components/product-detail/use-product-detail-section-navigation"
import { RecentlyVisitedProductsSection } from "@/components/recently-visited-products-section"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"

export const ProductDetail = ({
  handle,
  initialVariantId,
}: ProductDetailProps) => {
  const tCatalog = useTranslations("catalog")
  const controller = useProductDetailController({
    handle,
    ...(initialVariantId === undefined ? {} : { initialVariantId }),
  })
  const { isBootstrappingRegion, product, productQuery } = controller
  const productId = product?.id
  const hasProduct = product !== null && product !== undefined
  const hasProductError =
    productQuery.error !== null && productQuery.error !== undefined
  const isProductLoading = isBootstrappingRegion || productQuery.isLoading
  const { activeSectionValue, handleSectionValueChange, handleShowAllReviews } =
    useProductDetailSectionNavigation({
      defaultValue: controller.defaultInfoSectionValue,
      handle,
      productId,
    })
  const activeSectionProps =
    activeSectionValue === undefined ? {} : { activeSectionValue }

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-product-detail-page-gap p-product-detail-page font-rubik 2xl:p-product-detail-page-lg">
      <HerbatikaBreadcrumb items={controller.breadcrumbItems} />

      {isProductLoading ? <ProductDetailSkeleton /> : null}

      {!isBootstrappingRegion && hasProductError ? (
        <section className="space-y-400 rounded-xl border border-border-secondary bg-surface p-600">
          <StatusText showIcon status="error">
            {tCatalog("product_detail.errors.load_failed")}
          </StatusText>
          <Button
            onClick={() => {
              runDetachedPromise(productQuery.query.refetch())
            }}
            variant="secondary"
          >
            {tCatalog("product_detail.retry")}
          </Button>
        </section>
      ) : null}

      {!isProductLoading && !hasProductError && !hasProduct ? (
        <section className="space-y-400 rounded-base border border-border-secondary bg-surface p-600">
          <StatusText showIcon status="error">
            {tCatalog("product_detail.errors.not_found")}
          </StatusText>
          <LinkButton as={NextLink} href="/" size="sm" variant="secondary">
            {tCatalog("product_detail.back_home")}
          </LinkButton>
        </section>
      ) : null}

      {!isProductLoading && !hasProductError && hasProduct ? (
        <>
          <ProductDetailHero
            canAddToCart={controller.canAddToCart}
            currentAmountLabel={controller.currentAmountLabel}
            discountPercent={controller.discountPercent}
            displayOriginalLabel={controller.displayOriginalLabel}
            freeShippingThresholdLabel={controller.freeShippingThresholdLabel}
            galleryItems={controller.galleryItems}
            isAdding={controller.isMainProductAdding}
            locationAvailabilityState={controller.locationAvailabilityState}
            maxQuantity={controller.maxQuantity}
            mediaFacts={controller.mediaFacts}
            offerState={controller.offerState}
            onAddToCart={controller.handleAddMainProductToCart}
            onQuantityChange={controller.handleQuantityChange}
            onVariantChange={controller.handleSelectVariant}
            product={product}
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
          </ProductDetailHero>

          <ProductDetailMetrics
            onShowAllReviews={handleShowAllReviews}
            productId={product.id}
          />

          <ProductDetailTabs
            {...activeSectionProps}
            defaultSectionValue={controller.defaultInfoSectionValue}
            onSectionValueChange={handleSectionValueChange}
            productId={product.id}
            sections={controller.productContentSections}
          />
        </>
      ) : null}

      {!isBootstrappingRegion && hasProduct ? (
        <>
          <ProductDetailRelated
            isProductAdding={controller.isProductAdding}
            onAddToCart={controller.handleAddRelatedProductToCart}
            onProductHoverEnd={controller.handleRelatedProductHoverEnd}
            onProductHoverStart={controller.handleRelatedProductHoverStart}
            sections={controller.relatedSections}
          />
          <RecentlyVisitedProductsSection
            excludeHandle={product.handle}
            hideWhenEmpty
          />
        </>
      ) : null}
    </main>
  )
}
