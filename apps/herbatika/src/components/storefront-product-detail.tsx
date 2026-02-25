"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Breadcrumb } from "@techsio/ui-kit/molecules/breadcrumb";
import NextLink from "next/link";
import { ProductDetailMetrics } from "@/components/product-detail/sections/product-detail-metrics";
import { ProductDetailOffers } from "@/components/product-detail/sections/product-detail-offers";
import { ProductDetailRelated } from "@/components/product-detail/sections/product-detail-related";
import { ProductDetailSkeleton } from "@/components/product-detail/sections/product-detail-skeleton";
import { ProductDetailTabs } from "@/components/product-detail/sections/product-detail-tabs";
import { ProductDetailHero } from "@/components/product-detail/sections/product-detail-hero";
import {
  useProductDetailController,
} from "@/components/product-detail/use-product-detail-controller";
import type { StorefrontProductDetailProps } from "@/components/product-detail/product-detail.types";

export function StorefrontProductDetail({ handle }: StorefrontProductDetailProps) {
  const controller = useProductDetailController({ handle });

  return (
    <main className="mx-auto font-rubik flex w-full max-w-max-w flex-col gap-600 px-400 py-600 lg:px-550">
      <Breadcrumb items={controller.breadcrumbItems} linkAs={NextLink} />

      {controller.isBootstrappingRegion || controller.productQuery.isLoading ? (
        <ProductDetailSkeleton />
      ) : null}

      {!controller.isBootstrappingRegion && controller.productQuery.error ? (
        <section className="space-y-400 rounded-xl border border-border-secondary bg-surface p-600">
          <ErrorText showIcon>{controller.productQuery.error}</ErrorText>
          <Button
            onClick={() => {
              void controller.productQuery.query.refetch();
            }}
            variant="secondary"
          >
            Skúsiť znova
          </Button>
        </section>
      ) : null}

      {!controller.isBootstrappingRegion &&
      !controller.productQuery.isLoading &&
      !controller.productQuery.error &&
      !controller.product ? (
        <section className="space-y-400 rounded-xl border border-border-secondary bg-surface p-600">
          <ErrorText showIcon>Produkt sa nepodarilo nájsť.</ErrorText>
          <LinkButton as={NextLink} href="/" variant="secondary">
            Späť na domovskú stránku
          </LinkButton>
        </section>
      ) : null}

      {!controller.isBootstrappingRegion &&
      !controller.productQuery.isLoading &&
      !controller.productQuery.error &&
      controller.product ? (
        <>
          <ProductDetailHero
            currentAmountLabel={controller.currentAmountLabel}
            discountPercent={controller.discountPercent}
            displayOriginalLabel={controller.displayOriginalLabel}
            freeShippingThresholdLabel={controller.freeShippingThresholdLabel}
            galleryItems={controller.galleryItems}
            mediaFacts={controller.mediaFacts}
            isAdding={controller.isMainProductAdding}
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
              <ErrorText showIcon>{controller.addToCartError}</ErrorText>
            ) : null}
          </ProductDetailHero>

          <ProductDetailMetrics />

          <ProductDetailTabs
            defaultSectionValue={controller.defaultInfoSectionValue}
            sections={controller.productContentSections}
          />
        </>
      ) : null}

      {!controller.isBootstrappingRegion && controller.product ? (
        <ProductDetailRelated
          isProductAdding={controller.isProductAdding}
          onAddToCart={controller.handleAddRelatedProductToCart}
          onProductHoverEnd={controller.handleRelatedProductHoverEnd}
          onProductHoverStart={controller.handleRelatedProductHoverStart}
          sections={controller.relatedSections}
        />
      ) : null}
    </main>
  );
}
