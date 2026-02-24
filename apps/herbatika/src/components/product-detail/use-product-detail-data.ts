"use client";

import type { HttpTypes } from "@medusajs/types";
import { useRegionContext } from "@techsio/storefront-data/shared";
import type { SelectItem } from "@techsio/ui-kit/molecules/select";
import { useEffect, useMemo, useState } from "react";
import { PDP_FREE_SHIPPING_THRESHOLD } from "@/components/product-detail/product-detail.constants";
import type { StorefrontProduct } from "@/components/product-detail/product-detail.types";
import { useProductDetailDebugLog } from "@/components/product-detail/use-product-detail-debug-log";
import { useProductDetailRelatedProducts } from "@/components/product-detail/use-product-detail-related-products";
import { resolveGalleryItems, resolveProductHighlights } from "@/components/product-detail/utils/display-utils";
import { stripHtml } from "@/components/product-detail/utils/html-sanitizer";
import {
  normalizeCategoryName,
  resolveOfferState,
  resolveProductContentSections,
  resolveProductImages,
  resolveVariantLabel,
} from "@/components/product-detail/utils/metadata-parsers";
import {
  resolveDiscountPercent,
  resolveDisplayOriginalAmount,
  resolvePriceState,
  resolveVipCreditLabel,
  resolveVolumeDiscountOptions,
} from "@/components/product-detail/utils/pricing-utils";
import { asRecord, asString } from "@/components/product-detail/utils/value-utils";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import { STOREFRONT_PRODUCT_DETAIL_FIELDS, useProduct } from "@/lib/storefront/products";

type UseProductDetailDataProps = {
  handle: string;
};

export function useProductDetailData({ handle }: UseProductDetailDataProps) {
  const region = useRegionContext();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedVolumeDiscountId, setSelectedVolumeDiscountId] = useState<string | null>(
    null,
  );

  const productQuery = useProduct({
    handle,
    enabled: Boolean(region?.region_id),
    fields: STOREFRONT_PRODUCT_DETAIL_FIELDS,
  });

  const product = (productQuery.product ?? null) as StorefrontProduct | null;
  const variants = product?.variants ?? [];
  const productCategories = product?.categories ?? [];

  const selectedVariant = useMemo(() => {
    if (variants.length === 0) {
      return null;
    }

    return variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];
  }, [selectedVariantId, variants]);

  const optionTitlesById = useMemo(() => {
    const titles = new Map<string, string>();

    for (const option of product?.options ?? []) {
      if (!option.id) {
        continue;
      }

      const title = asString(option.title);
      if (!title) {
        continue;
      }

      titles.set(option.id, title);
    }

    return titles;
  }, [product?.options]);

  const variantItems = useMemo<SelectItem[]>(() => {
    return variants
      .filter((variant): variant is HttpTypes.StoreProductVariant & { id: string } =>
        Boolean(variant.id),
      )
      .map((variant) => ({
        value: variant.id,
        label: resolveVariantLabel(variant, optionTitlesById),
      }));
  }, [optionTitlesById, variants]);

  const offerState = useMemo(
    () => resolveOfferState(product, selectedVariant),
    [product, selectedVariant],
  );

  const productPrice = useMemo(() => {
    if (!product) {
      return null;
    }

    return resolvePriceState(product, selectedVariantId);
  }, [product, selectedVariantId]);

  const shortDescriptionHtml = useMemo(() => {
    const metadata = asRecord(product?.metadata);
    return asString(metadata?.short_description) ?? "";
  }, [product?.metadata]);

  const productSummaryText = useMemo(() => {
    const shortText = stripHtml(shortDescriptionHtml);
    if (shortText) {
      return shortText;
    }

    const descriptionText = stripHtml(product?.description);
    return descriptionText || "Popis produktu bude čoskoro doplnený.";
  }, [product?.description, shortDescriptionHtml]);

  const productImages = useMemo(() => resolveProductImages(product), [product]);
  const galleryItems = useMemo(
    () => resolveGalleryItems(productImages, product?.title),
    [product?.title, productImages],
  );

  const productHighlights = useMemo(
    () => resolveProductHighlights(productSummaryText, productCategories),
    [productCategories, productSummaryText],
  );

  const productContentSections = useMemo(
    () => resolveProductContentSections(product, shortDescriptionHtml),
    [product, shortDescriptionHtml],
  );

  const currentAmount = productPrice?.currentAmount ?? offerState.currentAmount;
  const currentAmountLabel = productPrice?.currentLabel ?? "Cena na vyžiadanie";
  const currentCurrencyCode = productPrice?.currencyCode ?? "EUR";

  const displayOriginalAmount = useMemo(
    () => resolveDisplayOriginalAmount(productPrice, offerState),
    [offerState, productPrice],
  );

  const displayOriginalLabel = useMemo(() => {
    if (!productPrice || typeof displayOriginalAmount !== "number") {
      return null;
    }

    return formatCurrencyAmount(displayOriginalAmount, currentCurrencyCode);
  }, [currentCurrencyCode, displayOriginalAmount, productPrice]);

  const discountPercent = useMemo(
    () => resolveDiscountPercent(currentAmount, displayOriginalAmount),
    [currentAmount, displayOriginalAmount],
  );
  const vipCreditLabel = useMemo(
    () => resolveVipCreditLabel(currentAmount, currentCurrencyCode),
    [currentAmount, currentCurrencyCode],
  );

  const unitPriceLabel =
    typeof currentAmount === "number" && offerState.unitLabel
      ? `${formatCurrencyAmount(currentAmount, currentCurrencyCode)} / ${offerState.unitLabel}`
      : null;

  const volumeDiscountOptions = useMemo(
    () => resolveVolumeDiscountOptions(currentAmount, currentCurrencyCode),
    [currentAmount, currentCurrencyCode],
  );

  const selectedVolumeDiscountOption = useMemo(() => {
    if (volumeDiscountOptions.length === 0) {
      return null;
    }

    return (
      volumeDiscountOptions.find((option) => option.id === selectedVolumeDiscountId) ??
      volumeDiscountOptions[0]
    );
  }, [selectedVolumeDiscountId, volumeDiscountOptions]);

  const relatedSections = useProductDetailRelatedProducts({
    product,
    regionId: region?.region_id,
  });

  useEffect(() => {
    setQuantity(1);
    setSelectedVariantId(product?.variants?.[0]?.id ?? null);
    setSelectedVolumeDiscountId(null);
  }, [product?.id, product?.variants]);

  useEffect(() => {
    setSelectedVolumeDiscountId(volumeDiscountOptions[0]?.id ?? null);
  }, [volumeDiscountOptions]);

  useProductDetailDebugLog(product);

  return {
    breadcrumbItems: [
      { label: "", href: "/", icon: "icon-[mdi--home-outline]" },
      ...(productCategories[0]?.handle
        ? [
            {
              label: normalizeCategoryName(productCategories[0].name),
              href: `/c/${productCategories[0].handle}`,
            },
          ]
        : []),
      { label: product?.title || handle },
    ],
    currentAmountLabel,
    defaultInfoSectionValue: productContentSections[0]?.key ?? "description",
    displayOriginalLabel,
    discountPercent,
    freeShippingThresholdLabel: formatCurrencyAmount(
      PDP_FREE_SHIPPING_THRESHOLD,
      currentCurrencyCode,
    ),
    galleryItems,
    isBootstrappingRegion: !region?.region_id,
    product,
    productCategories,
    productContentSections,
    productHighlights,
    productQuery,
    quantity,
    relatedSections,
    region,
    selectedVariant,
    selectedVariantId: selectedVariant?.id ?? null,
    selectedVolumeDiscountId: selectedVolumeDiscountOption?.id ?? null,
    selectedVolumeDiscountOption,
    setQuantity,
    setSelectedVariantId,
    setSelectedVolumeDiscountId,
    unitPriceLabel,
    variantItems,
    variants,
    vipCreditLabel,
    volumeDiscountOptions,
    offerState,
  };
}

export type ProductDetailDataState = ReturnType<typeof useProductDetailData>;
