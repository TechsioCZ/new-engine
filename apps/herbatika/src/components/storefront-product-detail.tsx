"use client";

import type { HttpTypes } from "@medusajs/types";
import { useRegionContext } from "@techsio/storefront-data/shared";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { Image } from "@techsio/ui-kit/atoms/image";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input";
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import { Breadcrumb } from "@techsio/ui-kit/molecules/breadcrumb";
import { FormNumericInput } from "@techsio/ui-kit/molecules/form-numeric-input";
import NextLink from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HerbatikaHomeProductCard } from "@/components/herbatika-home-product-card";
import { useAddLineItem, useCart } from "@/lib/storefront/cart";
import { usePrefetchProduct, useProduct, useProducts } from "@/lib/storefront/products";

type StorefrontProductDetailProps = {
  handle: string;
};

type ProductPriceState = {
  currentLabel: string;
  originalLabel: string | null;
};

const PRODUCT_DETAIL_FIELDS =
  "id,title,handle,description,thumbnail,images,*categories.id,*categories.name,*categories.handle,*categories.parent_category_id,*variants.calculated_price,+metadata";

const RELATED_PRODUCTS_LIMIT = 4;
const PRODUCT_FALLBACK_IMAGE = "/file.svg";

const resolveErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unknown error occurred.";
};

const normalizeCategoryName = (value?: string | null) => {
  if (!value) {
    return "Kategória";
  }

  return value.replace(/^>\s*/, "").trim();
};

const formatAmount = (amount: number, currencyCode: string): string => {
  const normalizedCurrency =
    typeof currencyCode === "string" && currencyCode.length === 3
      ? currencyCode.toUpperCase()
      : "EUR";
  const locale = normalizedCurrency === "CZK" ? "cs-CZ" : "sk-SK";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${normalizedCurrency}`;
  }
};

const resolvePriceState = (product: HttpTypes.StoreProduct): ProductPriceState => {
  const calculatedPrice = product.variants?.[0]?.calculated_price;
  const calculatedAmount = calculatedPrice?.calculated_amount;
  const originalAmount = calculatedPrice?.original_amount;
  const currencyCode =
    typeof calculatedPrice?.currency_code === "string"
      ? calculatedPrice.currency_code
      : "EUR";

  if (typeof calculatedAmount !== "number") {
    return {
      currentLabel: "Cena na vyžiadanie",
      originalLabel: null,
    };
  }

  return {
    currentLabel: formatAmount(calculatedAmount, currencyCode),
    originalLabel:
      typeof originalAmount === "number" && originalAmount > calculatedAmount
        ? formatAmount(originalAmount, currencyCode)
        : null,
  };
};

const resolveProductImages = (product: HttpTypes.StoreProduct | null): string[] => {
  if (!product) {
    return [];
  }

  const imageUrls = new Set<string>();

  if (product.thumbnail) {
    imageUrls.add(product.thumbnail);
  }

  for (const image of product.images ?? []) {
    if (typeof image?.url === "string" && image.url.length > 0) {
      imageUrls.add(image.url);
    }
  }

  return imageUrls.size > 0 ? Array.from(imageUrls) : [PRODUCT_FALLBACK_IMAGE];
};

const resolveRelatedCategoryIds = (product: HttpTypes.StoreProduct | null): string[] => {
  const productCategories = product?.categories ?? [];
  if (productCategories.length === 0) {
    return [];
  }

  const parentCategoryIds = new Set<string>();
  const allCategoryIds = new Set<string>();

  for (const category of productCategories) {
    if (category.id) {
      allCategoryIds.add(category.id);
    }

    if (category.parent_category_id) {
      parentCategoryIds.add(category.parent_category_id);
    }
  }

  const leafCategoryIds = Array.from(allCategoryIds).filter(
    (categoryId) => !parentCategoryIds.has(categoryId),
  );

  return (leafCategoryIds.length > 0 ? leafCategoryIds : Array.from(allCategoryIds)).slice(
    0,
    3,
  );
};

function ProductDetailSkeleton() {
  return (
    <section className="rounded-xl border border-black/10 bg-white p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
        <Skeleton.Rectangle className="aspect-square rounded-xl" />
        <div className="space-y-4">
          <Skeleton.Text noOfLines={2} />
          <Skeleton.Rectangle className="h-10 w-40 rounded-lg" />
          <Skeleton.Text noOfLines={5} />
        </div>
      </div>
    </section>
  );
}

export function StorefrontProductDetail({ handle }: StorefrontProductDetailProps) {
  const region = useRegionContext();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [addToCartError, setAddToCartError] = useState<string | null>(null);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);

  const productQuery = useProduct({
    handle,
    enabled: Boolean(region?.region_id),
    fields: PRODUCT_DETAIL_FIELDS,
  });

  const cartQuery = useCart({
    autoCreate: true,
    region_id: region?.region_id,
    country_code: region?.country_code,
    enabled: Boolean(region?.region_id),
  });

  const addLineItemMutation = useAddLineItem();
  const prefetchProduct = usePrefetchProduct({
    defaultDelay: 220,
    skipMode: "any",
  });

  const product = productQuery.product;
  const productImages = useMemo(() => resolveProductImages(product), [product]);
  const relatedCategoryIds = useMemo(() => resolveRelatedCategoryIds(product), [product]);

  const relatedProductsQuery = useProducts({
    page: 1,
    limit: RELATED_PRODUCTS_LIMIT + 1,
    category_id: relatedCategoryIds.length > 0 ? relatedCategoryIds : undefined,
    order: "-created_at",
    enabled: Boolean(region?.region_id && product?.id),
  });

  const relatedProducts = useMemo(() => {
    if (!product?.id) {
      return relatedProductsQuery.products.slice(0, RELATED_PRODUCTS_LIMIT);
    }

    return relatedProductsQuery.products
      .filter((relatedProduct) => relatedProduct.id !== product.id)
      .slice(0, RELATED_PRODUCTS_LIMIT);
  }, [product?.id, relatedProductsQuery.products]);

  useEffect(() => {
    setQuantity(1);
  }, [product?.id]);

  useEffect(() => {
    setSelectedImage(productImages[0] ?? PRODUCT_FALLBACK_IMAGE);
  }, [productImages]);

  const addProductToCart = async (
    productToAdd: HttpTypes.StoreProduct,
    quantityToAdd: number,
  ) => {
    setAddToCartError(null);
    setActiveProductId(productToAdd.id);

    try {
      const variantId = productToAdd.variants?.[0]?.id;
      if (!variantId || !region?.region_id) {
        throw new Error("Produkt nemá dostupnú variantu na pridanie do košíka.");
      }

      await addLineItemMutation.mutateAsync({
        cartId: cartQuery.cart?.id,
        variantId,
        quantity: quantityToAdd,
        autoCreate: true,
        region_id: region.region_id,
        country_code: region.country_code,
      });
    } catch (error) {
      setAddToCartError(resolveErrorMessage(error));
    } finally {
      setActiveProductId(null);
    }
  };

  const isBootstrappingRegion = !region?.region_id;
  const productPrice = product ? resolvePriceState(product) : null;
  const productCategories = product?.categories ?? [];
  const isMainProductAdding =
    addLineItemMutation.isPending &&
    Boolean(product?.id) &&
    activeProductId === product?.id;

  const breadcrumbItems = [
    { label: "Domov", href: "/" },
    ...(productCategories[0]?.handle
      ? [
          {
            label: normalizeCategoryName(productCategories[0].name),
            href: `/c/${productCategories[0].handle}`,
          },
        ]
      : []),
    { label: product?.title || handle },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <Breadcrumb items={breadcrumbItems} linkAs={NextLink} />

      {isBootstrappingRegion || productQuery.isLoading ? <ProductDetailSkeleton /> : null}

      {!isBootstrappingRegion && productQuery.error ? (
        <section className="space-y-4 rounded-xl border border-black/10 bg-white p-6">
          <ErrorText showIcon>{productQuery.error}</ErrorText>
          <Button
            onClick={() => {
              void productQuery.query.refetch();
            }}
            variant="secondary"
          >
            Skúsiť znova
          </Button>
        </section>
      ) : null}

      {!isBootstrappingRegion && !productQuery.isLoading && !productQuery.error && !product ? (
        <section className="space-y-4 rounded-xl border border-black/10 bg-white p-6">
          <ErrorText showIcon>Produkt sa nepodarilo nájsť.</ErrorText>
          <LinkButton as={NextLink} href="/" variant="secondary">
            Späť na domovskú stránku
          </LinkButton>
        </section>
      ) : null}

      {!isBootstrappingRegion && !productQuery.isLoading && !productQuery.error && product ? (
        <section className="rounded-xl border border-black/10 bg-white p-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
            <div className="space-y-3">
              <Image
                alt={product.title || "Produkt"}
                className="aspect-square w-full rounded-xl border border-border-secondary object-cover"
                src={selectedImage || PRODUCT_FALLBACK_IMAGE}
              />

              {productImages.length > 1 ? (
                <div className="grid grid-cols-5 gap-2">
                  {productImages.map((imageUrl) => {
                    const isSelected = selectedImage === imageUrl;
                    return (
                      <Button
                        className={`rounded-lg border p-0 ${isSelected ? "border-primary" : "border-border-secondary"}`}
                        key={imageUrl}
                        onClick={() => setSelectedImage(imageUrl)}
                        theme="unstyled"
                        type="button"
                      >
                        <Image
                          alt={product.title || "Produkt"}
                          className="aspect-square w-full rounded-lg object-cover"
                          src={imageUrl}
                        />
                      </Button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <header className="space-y-2">
                <h1 className="text-2xl font-bold text-fg-primary">{product.title}</h1>
                <ExtraText className="text-fg-tertiary">Kód produktu: {product.handle}</ExtraText>
                {productCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {productCategories.slice(0, 6).map((category) => (
                      <LinkButton
                        as={NextLink}
                        href={category.handle ? `/c/${category.handle}` : "#"}
                        key={category.id}
                        size="sm"
                        theme="outlined"
                        variant="secondary"
                      >
                        {normalizeCategoryName(category.name)}
                      </LinkButton>
                    ))}
                  </div>
                ) : null}
              </header>

              {productPrice ? (
                <div className="space-y-1">
                  {productPrice.originalLabel ? (
                    <div className="text-sm text-fg-tertiary line-through">
                      {productPrice.originalLabel}
                    </div>
                  ) : null}
                  <div className="text-3xl font-bold text-primary">
                    {productPrice.currentLabel}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Badge variant="success">Skladom</Badge>
                <Badge variant="info">Doručenie 1-3 pracovné dni</Badge>
              </div>

              <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg-secondary">
                {product.description || "Popis produktu bude čoskoro doplnený."}
              </p>

              <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                <FormNumericInput
                  id="product-quantity"
                  label="Množstvo"
                  max={50}
                  min={1}
                  onChange={(value) => {
                    if (!Number.isFinite(value) || value < 1) {
                      setQuantity(1);
                      return;
                    }

                    setQuantity(Math.floor(value));
                  }}
                  size="sm"
                  value={quantity}
                >
                  <NumericInput.Control>
                    <NumericInput.Input />
                    <NumericInput.TriggerContainer>
                      <NumericInput.IncrementTrigger />
                      <NumericInput.DecrementTrigger />
                    </NumericInput.TriggerContainer>
                  </NumericInput.Control>
                </FormNumericInput>

                <div className="flex items-end gap-2">
                  <Button
                    block
                    disabled={!product.variants?.[0]?.id || isMainProductAdding}
                    onClick={() => {
                      void addProductToCart(product, quantity);
                    }}
                    variant="primary"
                  >
                    {isMainProductAdding ? "Pridávam..." : "Pridať do košíka"}
                  </Button>
                  <LinkButton as={NextLink} href="/checkout" theme="outlined" variant="secondary">
                    Košík
                  </LinkButton>
                </div>
              </div>

              {addToCartError ? <ErrorText showIcon>{addToCartError}</ErrorText> : null}
            </div>
          </div>
        </section>
      ) : null}

      {!isBootstrappingRegion && product && !relatedProductsQuery.isLoading && relatedProducts.length > 0 ? (
        <section className="space-y-4 rounded-xl border border-black/10 bg-white p-6">
          <header className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Súvisiace produkty</h2>
            <ExtraText className="text-fg-tertiary">
              {`Nájdené: ${relatedProducts.length}`}
            </ExtraText>
          </header>

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {relatedProducts.map((relatedProduct) => (
              <HerbatikaHomeProductCard
                isAdding={
                  addLineItemMutation.isPending && activeProductId === relatedProduct.id
                }
                key={relatedProduct.id}
                onAddToCart={(productToAdd) => {
                  void addProductToCart(productToAdd, 1);
                }}
                onProductHoverEnd={(hoveredProduct) => {
                  prefetchProduct.cancelPrefetch(`related-product-${hoveredProduct.id}`);
                }}
                onProductHoverStart={(hoveredProduct) => {
                  if (!hoveredProduct.handle) {
                    return;
                  }

                  prefetchProduct.delayedPrefetch(
                    { handle: hoveredProduct.handle },
                    220,
                    `related-product-${hoveredProduct.id}`,
                  );
                }}
                product={relatedProduct}
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
