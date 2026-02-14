"use client";

import type { HttpTypes } from "@medusajs/types";
import { useRegionContext } from "@techsio/storefront-data/shared";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { Image } from "@techsio/ui-kit/atoms/image";
import { Link } from "@techsio/ui-kit/atoms/link";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input";
import { Rating } from "@techsio/ui-kit/atoms/rating";
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import { Accordion } from "@techsio/ui-kit/molecules/accordion";
import { Breadcrumb } from "@techsio/ui-kit/molecules/breadcrumb";
import { FormNumericInput } from "@techsio/ui-kit/molecules/form-numeric-input";
import { Select, type SelectItem } from "@techsio/ui-kit/molecules/select";
import { Tabs } from "@techsio/ui-kit/molecules/tabs";
import NextLink from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HerbatikaHomeProductCard } from "@/components/herbatika-home-product-card";
import { useAddLineItem, useCart } from "@/lib/storefront/cart";
import {
  STOREFRONT_PRODUCT_DETAIL_FIELDS,
  usePrefetchProduct,
  useProduct,
  useProducts,
} from "@/lib/storefront/products";

type StorefrontProductDetailProps = {
  handle: string;
};

type ProductPriceState = {
  currentLabel: string;
  originalLabel: string | null;
};

type RelatedProductsSection = {
  id: string;
  title: string;
  products: HttpTypes.StoreProduct[];
};

type ProductDetailContentSection = {
  key: string;
  title: string;
  html: string;
};
type StorefrontProduct = HttpTypes.StoreProduct;

type ProductOfferState = {
  code: string | null;
  ean: string | null;
  availabilityLabel: string;
  deliveryLabel: string;
  stockAmount: number | null;
  isInStock: boolean;
};

const RELATED_PRODUCTS_FIELDS =
  "id,title,handle,thumbnail,*variants.calculated_price";

const PRODUCT_FALLBACK_IMAGE = "/file.svg";
const RELATED_PRODUCTS_PER_SECTION = 4;
const RELATED_SECTION_TITLES = [
  "Ďalšie kúpil tiež",
  "Súvisiace produkty",
  "Naposledy navštívené",
] as const;
const RELATED_PRODUCTS_LIMIT =
  RELATED_PRODUCTS_PER_SECTION * RELATED_SECTION_TITLES.length + 1;
const PRODUCT_DETAIL_SECTION_ORDER = [
  "description",
  "usage",
  "composition",
  "warning",
  "other",
] as const;
const PRODUCT_DETAIL_SECTION_TITLES: Record<string, string> = {
  description: "Popis",
  usage: "Použitie",
  composition: "Zloženie",
  warning: "Upozornenie",
  other: "Ostatné informácie",
};

const ALLOWED_HTML_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "em",
  "h2",
  "h3",
  "h4",
  "i",
  "li",
  "ol",
  "p",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);

const ALLOWED_GLOBAL_ATTRIBUTES = new Set(["title"]);

const ALLOWED_TAG_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel", "title"]),
  td: new Set(["colspan", "rowspan", "title"]),
  th: new Set(["colspan", "rowspan", "title"]),
};

const resolveErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unknown error occurred.";
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
};

const asString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
};

const asNumber = (value: unknown): number | null => {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const normalizeSectionKey = (value: unknown): string | null => {
  const parsed = asString(value);
  if (!parsed) {
    return null;
  }

  const normalized = parsed
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");

  return normalized.length > 0 ? normalized : null;
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

const resolveProductImages = (product: StorefrontProduct | null): string[] => {
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

const resolveRelatedCategoryIds = (product: StorefrontProduct | null): string[] => {
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

const resolveVariantLabel = (
  variant: HttpTypes.StoreProductVariant,
  optionTitlesById: Map<string, string>,
) => {
  const optionLabels = (variant.options ?? [])
    .map((option) => {
      const optionValue = asString(option?.value);
      if (!optionValue) {
        return null;
      }

      const optionTitle = option.option_id
        ? optionTitlesById.get(option.option_id)
        : undefined;

      return optionTitle ? `${optionTitle}: ${optionValue}` : optionValue;
    })
    .filter((value): value is string => Boolean(value));

  if (optionLabels.length > 0) {
    return optionLabels.join(" | ");
  }

  const title = asString(variant.title);

  if (title && title !== "Default") {
    return title;
  }

  return "Predvolená varianta";
};

const resolvePriceState = (
  product: StorefrontProduct,
  selectedVariantId: string | null,
): ProductPriceState => {
  const variants = product.variants ?? [];
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];

  const calculatedPrice = selectedVariant?.calculated_price;
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

const resolveOfferState = (product: StorefrontProduct | null): ProductOfferState => {
  const metadata = asRecord(product?.metadata);
  const topOffer = asRecord(metadata?.top_offer);
  const stock = asRecord(topOffer?.stock);
  const stockAmount = asNumber(stock?.amount);

  const isInStock = stockAmount === null ? true : stockAmount > 0;

  const inStockLabel =
    asString(topOffer?.availability_in_stock) ?? "Skladom";
  const outOfStockLabel =
    asString(topOffer?.availability_out_of_stock) ?? "Momentálne nie je skladom";

  return {
    code: asString(topOffer?.code),
    ean: asString(topOffer?.ean),
    availabilityLabel: isInStock ? inStockLabel : outOfStockLabel,
    deliveryLabel: isInStock
      ? "Doručenie 1-3 pracovné dni"
      : "Doručenie po naskladnení",
    stockAmount,
    isInStock,
  };
};

const stripHtml = (value: string | null | undefined): string => {
  if (!value) {
    return "";
  }

  return value
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const sanitizeHtml = (html: string): string => {
  if (!html || typeof window === "undefined") {
    return "";
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");

  const sanitizeNode = (node: Node) => {
    const childNodes = Array.from(node.childNodes);

    for (const childNode of childNodes) {
      if (childNode.nodeType === Node.COMMENT_NODE) {
        childNode.parentNode?.removeChild(childNode);
        continue;
      }

      if (childNode.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }

      const element = childNode as HTMLElement;
      const tag = element.tagName.toLowerCase();

      sanitizeNode(element);

      if (!ALLOWED_HTML_TAGS.has(tag)) {
        const fragment = document.createDocumentFragment();
        while (element.firstChild) {
          fragment.appendChild(element.firstChild);
        }
        element.replaceWith(fragment);
        continue;
      }

      const allowedTagAttributes =
        ALLOWED_TAG_ATTRIBUTES[tag] ?? new Set<string>();

      for (const attribute of Array.from(element.attributes)) {
        const name = attribute.name.toLowerCase();

        const isAllowed =
          ALLOWED_GLOBAL_ATTRIBUTES.has(name) || allowedTagAttributes.has(name);

        if (!isAllowed) {
          element.removeAttribute(attribute.name);
        }
      }

      if (tag === "a") {
        const href = element.getAttribute("href")?.trim() ?? "";

        const hasSafeHref = /^(https?:|mailto:|tel:|\/|#)/i.test(href);

        if (!hasSafeHref) {
          element.removeAttribute("href");
          element.removeAttribute("target");
          element.removeAttribute("rel");
          continue;
        }

        if (/^https?:/i.test(href)) {
          element.setAttribute("target", "_blank");
          element.setAttribute("rel", "noopener noreferrer");
        }
      }
    }
  };

  sanitizeNode(document.body);
  return document.body.innerHTML.trim();
};

const resolveProductContentSections = (
  product: StorefrontProduct | null,
  shortDescriptionHtml: string,
): ProductDetailContentSection[] => {
  const metadata = asRecord(product?.metadata);
  const sectionMap = asRecord(metadata?.content_sections_map);
  const sectionsFromList = Array.isArray(metadata?.content_sections)
    ? metadata.content_sections
    : [];

  const sectionHtmlByKey = new Map<string, string>();
  for (const section of sectionsFromList) {
    const sectionRecord = asRecord(section);
    if (!sectionRecord) {
      continue;
    }

    const key = normalizeSectionKey(sectionRecord.key);
    const html = asString(sectionRecord.html);
    if (!key || !html) {
      continue;
    }

    if (!sectionHtmlByKey.has(key)) {
      sectionHtmlByKey.set(key, html);
    }
  }

  const fallbackHtml = [shortDescriptionHtml, asString(product?.description)]
    .filter((value): value is string => Boolean(value))
    .join("\n");

  return PRODUCT_DETAIL_SECTION_ORDER.map((sectionKey) => {
    let html =
      asString(sectionMap?.[sectionKey]) ?? sectionHtmlByKey.get(sectionKey) ?? "";

    if (!html && sectionKey === "description") {
      html = fallbackHtml;
    }

    return {
      key: sectionKey,
      title: PRODUCT_DETAIL_SECTION_TITLES[sectionKey] ?? "Obsah",
      html,
    };
  });
};

const fillSectionProducts = (
  products: HttpTypes.StoreProduct[],
  sectionIndex: number,
): HttpTypes.StoreProduct[] => {
  if (products.length === 0) {
    return [];
  }

  const start = sectionIndex * RELATED_PRODUCTS_PER_SECTION;
  const initialSlice = products.slice(start, start + RELATED_PRODUCTS_PER_SECTION);

  if (initialSlice.length >= RELATED_PRODUCTS_PER_SECTION) {
    return initialSlice;
  }

  const sectionProducts = [...initialSlice];
  const usedIds = new Set(sectionProducts.map((product) => product.id));

  for (const product of products) {
    if (sectionProducts.length >= RELATED_PRODUCTS_PER_SECTION) {
      break;
    }

    if (usedIds.has(product.id)) {
      continue;
    }

    sectionProducts.push(product);
    usedIds.add(product.id);
  }

  return sectionProducts;
};

const resolveRelatedSections = (
  products: HttpTypes.StoreProduct[],
): RelatedProductsSection[] => {
  return RELATED_SECTION_TITLES.map((title, sectionIndex) => {
    return {
      id: `related-${sectionIndex}`,
      title,
      products: fillSectionProducts(products, sectionIndex),
    };
  }).filter((section) => section.products.length > 0);
};

function ProductDetailSkeleton() {
  return (
    <section className="rounded-xl border border-black/10 bg-white p-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
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

type HtmlContentProps = {
  html: string;
  fallback: string;
};

function HtmlContent({ html, fallback }: HtmlContentProps) {
  const sanitizedHtml = useMemo(() => sanitizeHtml(html), [html]);

  if (!sanitizedHtml) {
    return <p className="text-sm leading-relaxed text-fg-secondary">{fallback}</p>;
  }

  return (
    <div
      className="space-y-3 text-sm leading-relaxed text-fg-secondary [&_a]:text-primary [&_a]:underline [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ol]:space-y-1 [&_p]:mb-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border-secondary [&_td]:p-2 [&_th]:border [&_th]:border-border-secondary [&_th]:bg-surface-secondary [&_th]:p-2"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}

export function StorefrontProductDetail({ handle }: StorefrontProductDetailProps) {
  const region = useRegionContext();

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [addToCartError, setAddToCartError] = useState<string | null>(null);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);

  const productQuery = useProduct({
    handle,
    enabled: Boolean(region?.region_id),
    fields: STOREFRONT_PRODUCT_DETAIL_FIELDS,
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

  const product = (productQuery.product ?? null) as StorefrontProduct | null;

  const productImages = useMemo(() => resolveProductImages(product), [product]);
  const relatedCategoryIds = useMemo(() => resolveRelatedCategoryIds(product), [product]);

  const offerState = useMemo(() => resolveOfferState(product), [product]);

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

  const productContentSections = useMemo(
    () => resolveProductContentSections(product, shortDescriptionHtml),
    [product, shortDescriptionHtml],
  );
  const defaultInfoSectionValue = productContentSections[0]?.key ?? "description";

  const variants = product?.variants ?? [];

  const selectedVariant = useMemo(() => {
    if (variants.length === 0) {
      return null;
    }

    return variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];
  }, [selectedVariantId, variants]);

  const productPrice = useMemo(() => {
    if (!product) {
      return null;
    }

    return resolvePriceState(product, selectedVariantId);
  }, [product, selectedVariantId]);

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
      .map((variant) => {
        return {
          value: variant.id,
          label: resolveVariantLabel(variant, optionTitlesById),
        };
      });
  }, [optionTitlesById, variants]);

  const relatedProductsQuery = useProducts({
    page: 1,
    limit: RELATED_PRODUCTS_LIMIT,
    category_id: relatedCategoryIds.length > 0 ? relatedCategoryIds : undefined,
    order: "-created_at",
    fields: RELATED_PRODUCTS_FIELDS,
    enabled: Boolean(region?.region_id && product?.id),
  });

  const relatedProducts = useMemo(() => {
    const filtered = relatedProductsQuery.products.filter(
      (relatedProduct) => relatedProduct.id !== product?.id,
    );

    return filtered.slice(0, RELATED_PRODUCTS_LIMIT);
  }, [product?.id, relatedProductsQuery.products]);

  const relatedSections = useMemo(
    () => resolveRelatedSections(relatedProducts),
    [relatedProducts],
  );

  useEffect(() => {
    setQuantity(1);
    setSelectedVariantId(product?.variants?.[0]?.id ?? null);
  }, [product?.id, product?.variants]);

  useEffect(() => {
    setSelectedImage(productImages[0] ?? PRODUCT_FALLBACK_IMAGE);
  }, [productImages]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !product) {
      return;
    }

    const metadata = asRecord(product.metadata);

    console.info("[PDP] loaded product", {
      id: product.id,
      handle: product.handle,
      imageCount: product.images?.length ?? 0,
      categoryCount: product.categories?.length ?? 0,
      variantCount: product.variants?.length ?? 0,
      hasShortDescription: typeof metadata?.short_description === "string",
      contentSectionsCount: Array.isArray(metadata?.content_sections)
        ? metadata.content_sections.length
        : 0,
      hasContentSectionsMap:
        asRecord(metadata?.content_sections_map) !== null,
    });
  }, [product]);

  const addProductToCart = async (
    productToAdd: HttpTypes.StoreProduct,
    quantityToAdd: number,
    variantIdOverride?: string | null,
  ) => {
    setAddToCartError(null);
    setActiveProductId(productToAdd.id);

    try {
      const variantId = variantIdOverride ?? productToAdd.variants?.[0]?.id;
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
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-6 lg:px-6">
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
        <>
          <section className="rounded-xl border border-black/10 bg-white p-4 lg:p-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
              <div className="grid gap-3 sm:grid-cols-[84px_minmax(0,1fr)]">
                {productImages.length > 1 ? (
                  <div className="order-2 flex gap-2 overflow-x-auto pb-1 sm:order-1 sm:flex-col sm:overflow-visible sm:pb-0">
                    {productImages.map((imageUrl) => {
                      const isSelected = selectedImage === imageUrl;

                      return (
                        <Button
                          className={`min-w-[72px] rounded-lg border p-0 sm:min-w-0 ${
                            isSelected ? "border-primary" : "border-border-secondary"
                          }`}
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

                <Image
                  alt={product.title || "Produkt"}
                  className="order-1 aspect-square w-full rounded-xl border border-border-secondary object-cover sm:order-2"
                  src={selectedImage || PRODUCT_FALLBACK_IMAGE}
                />
              </div>

              <div className="space-y-5">
                <header className="space-y-3">
                  <h1 className="text-3xl font-bold leading-tight text-fg-primary">
                    {product.title}
                  </h1>

                  <div className="space-y-1">
                    <ExtraText className="text-fg-tertiary">
                      Kód produktu: {offerState.code ?? product.handle}
                    </ExtraText>
                    {offerState.ean ? (
                      <ExtraText className="text-fg-tertiary">EAN: {offerState.ean}</ExtraText>
                    ) : null}
                  </div>

                  {productCategories.length > 0 ? (
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {productCategories.slice(0, 8).map((category) => {
                        if (!category.handle) {
                          return null;
                        }

                        return (
                          <Link
                            as={NextLink}
                            className="text-sm font-medium text-fg-primary hover:text-primary"
                            href={`/c/${category.handle}`}
                            key={category.id}
                          >
                            {normalizeCategoryName(category.name)}
                          </Link>
                        );
                      })}
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
                    <div className="text-4xl font-bold text-primary">{productPrice.currentLabel}</div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Badge variant={offerState.isInStock ? "success" : "warning"}>
                    {offerState.availabilityLabel}
                  </Badge>
                  <Badge variant="info">{offerState.deliveryLabel}</Badge>
                  {typeof offerState.stockAmount === "number" ? (
                    <Badge variant="secondary">{`Sklad: ${offerState.stockAmount} ks`}</Badge>
                  ) : null}
                </div>

                <p className="text-sm leading-relaxed text-fg-secondary">{productSummaryText}</p>

                {variantItems.length > 1 ? (
                  <Select
                    items={variantItems}
                    onValueChange={(details) => {
                      setSelectedVariantId(details.value[0] ?? null);
                    }}
                    size="sm"
                    value={selectedVariant?.id ? [selectedVariant.id] : []}
                  >
                    <Select.Label>Varianta</Select.Label>
                    <Select.Control>
                      <Select.Trigger>
                        <Select.ValueText placeholder="Vyberte variantu" />
                      </Select.Trigger>
                    </Select.Control>
                    <Select.Positioner>
                      <Select.Content>
                        {variantItems.map((item) => (
                          <Select.Item item={item} key={item.value}>
                            <Select.ItemText />
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Select>
                ) : null}

                <div className="grid gap-3 md:grid-cols-[200px_minmax(0,1fr)]">
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
                      disabled={!selectedVariant?.id || isMainProductAdding}
                      onClick={() => {
                        void addProductToCart(product, quantity, selectedVariant?.id);
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

          <section className="rounded-xl border border-black/10 bg-white p-4 lg:p-6">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-fg-primary">Hodnotenie produktu</h2>
              <div className="flex items-center gap-2">
                <Rating readOnly size="sm" value={0} />
                <ExtraText className="text-fg-tertiary">Zatiaľ bez hodnotení</ExtraText>
              </div>
            </header>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border-secondary bg-surface-secondary p-3">
                <ExtraText className="text-fg-tertiary">Dostupnosť</ExtraText>
                <p className="mt-1 text-sm font-semibold text-fg-primary">
                  {offerState.availabilityLabel}
                </p>
              </div>

              <div className="rounded-xl border border-border-secondary bg-surface-secondary p-3">
                <ExtraText className="text-fg-tertiary">Kategórie</ExtraText>
                <p className="mt-1 text-sm font-semibold text-fg-primary">
                  {productCategories.length > 0
                    ? `${productCategories.length} zaradení`
                    : "Bez zaradenia"}
                </p>
              </div>

              <div className="rounded-xl border border-border-secondary bg-surface-secondary p-3">
                <ExtraText className="text-fg-tertiary">Varianty</ExtraText>
                <p className="mt-1 text-sm font-semibold text-fg-primary">
                  {variants.length > 1 ? `${variants.length} možností` : "1 možnosť"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-black/10 bg-white p-4 lg:p-6">
            <h2 className="mb-4 text-xl font-semibold text-fg-primary">Informácie o produkte</h2>

            <div className="hidden lg:block">
              <Tabs defaultValue={defaultInfoSectionValue} fitted justify="start" variant="line">
                <Tabs.List>
                  {productContentSections.map((section) => (
                    <Tabs.Trigger key={section.key} value={section.key}>
                      {section.title}
                    </Tabs.Trigger>
                  ))}
                  <Tabs.Indicator />
                </Tabs.List>

                {productContentSections.map((section) => (
                  <Tabs.Content className="pt-4" key={section.key} value={section.key}>
                    <HtmlContent
                      fallback="Obsah sekcie bude čoskoro doplnený."
                      html={section.html}
                    />
                  </Tabs.Content>
                ))}
              </Tabs>
            </div>

            <div className="lg:hidden">
              <Accordion defaultValue={[defaultInfoSectionValue]} size="sm" variant="default">
                {productContentSections.map((section) => (
                  <Accordion.Item key={section.key} value={section.key}>
                    <Accordion.Header>
                      <Accordion.Title>{section.title}</Accordion.Title>
                      <Accordion.Indicator />
                    </Accordion.Header>
                    <Accordion.Content>
                      <HtmlContent
                        fallback="Obsah sekcie bude čoskoro doplnený."
                        html={section.html}
                      />
                    </Accordion.Content>
                  </Accordion.Item>
                ))}
              </Accordion>
            </div>
          </section>
        </>
      ) : null}

      {!isBootstrappingRegion && product && relatedSections.length > 0
        ? relatedSections.map((section) => (
            <section className="space-y-4 rounded-xl border border-black/10 bg-white p-4 lg:p-6" key={section.id}>
              <header className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-fg-primary">{section.title}</h2>
                <ExtraText className="text-fg-tertiary">
                  {`Nájdené: ${section.products.length}`}
                </ExtraText>
              </header>

              <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                {section.products.map((relatedProduct) => (
                  <HerbatikaHomeProductCard
                    isAdding={
                      addLineItemMutation.isPending &&
                      activeProductId === relatedProduct.id
                    }
                    key={relatedProduct.id}
                    onAddToCart={(productToAdd) => {
                      void addProductToCart(productToAdd, 1);
                    }}
                    onProductHoverEnd={(hoveredProduct) => {
                      prefetchProduct.cancelPrefetch(
                        `${section.id}-product-${hoveredProduct.id}`,
                      );
                    }}
                    onProductHoverStart={(hoveredProduct) => {
                      if (!hoveredProduct.handle) {
                        return;
                      }

                      prefetchProduct.delayedPrefetch(
                        {
                          handle: hoveredProduct.handle,
                          fields: STOREFRONT_PRODUCT_DETAIL_FIELDS,
                        },
                        220,
                        `${section.id}-product-${hoveredProduct.id}`,
                      );
                    }}
                    product={relatedProduct}
                  />
                ))}
              </div>
            </section>
          ))
        : null}
    </main>
  );
}
