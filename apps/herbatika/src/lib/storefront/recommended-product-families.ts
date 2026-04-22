import type { HttpTypes } from "@medusajs/types";

type RecommendedProductCandidate = {
  familyKey: string;
  firstSeenIndex: number;
  packageMultiplier: number;
  isInStock: boolean;
  product: HttpTypes.StoreProduct;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
};

const asString = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}`;
  }

  return null;
};

const asPositiveInteger = (value: unknown): number | null => {
  const parsed =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : typeof value === "string" && value.trim().length > 0
        ? Number(value.trim())
        : Number.NaN;

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const resolveProductMetadata = (product: HttpTypes.StoreProduct) => {
  return asRecord(product.metadata);
};

const resolveTopOffer = (product: HttpTypes.StoreProduct) => {
  const metadata = resolveProductMetadata(product);
  return asRecord(metadata?.top_offer);
};

const resolvePrimarySetItem = (product: HttpTypes.StoreProduct) => {
  const metadata = resolveProductMetadata(product);
  const setItems = Array.isArray(metadata?.set_items) ? metadata.set_items : [];

  for (const item of setItems) {
    const record = asRecord(item);
    if (!record) {
      continue;
    }

    const code = asString(record.code);
    const amount = asPositiveInteger(record.amount);
    if (!code) {
      continue;
    }

    return { code, amount };
  }

  return null;
};

const normalizeFamilyCode = (code: string | null) => {
  if (!code) {
    return null;
  }

  return code.split("/")[0]?.trim() || null;
};

const resolveTopOfferCode = (product: HttpTypes.StoreProduct) => {
  const topOffer = resolveTopOffer(product);
  return asString(topOffer?.code);
};

const resolveRecommendedProductFamilyKey = (product: HttpTypes.StoreProduct) => {
  const primarySetItem = resolvePrimarySetItem(product);
  if (primarySetItem?.code) {
    return primarySetItem.code;
  }

  const topOfferCode = normalizeFamilyCode(resolveTopOfferCode(product));
  if (topOfferCode) {
    return topOfferCode;
  }

  const metadata = resolveProductMetadata(product);
  const sourceShopitemId = asString(metadata?.source_shopitem_id);
  if (sourceShopitemId) {
    return sourceShopitemId;
  }

  return product.id ?? product.handle ?? product.title ?? "unknown-product";
};

const resolveRecommendedProductPackageMultiplier = (
  product: HttpTypes.StoreProduct,
) => {
  const primarySetItem = resolvePrimarySetItem(product);
  if (primarySetItem?.amount) {
    return primarySetItem.amount;
  }

  const topOfferCode = resolveTopOfferCode(product);
  if (topOfferCode) {
    const setMultiplier = topOfferCode.match(/\/(\d+)$/)?.[1];
    const parsedMultiplier = asPositiveInteger(setMultiplier);
    if (parsedMultiplier) {
      return parsedMultiplier;
    }
  }

  return 1;
};

const resolveRecommendedProductInStock = (product: HttpTypes.StoreProduct) => {
  const topOffer = resolveTopOffer(product);
  const stock = asRecord(topOffer?.stock);
  const amount =
    typeof stock?.amount === "number" && Number.isFinite(stock.amount)
      ? stock.amount
      : null;

  return amount === null ? true : amount > 0;
};

const isBetterRecommendedProductCandidate = (
  nextCandidate: RecommendedProductCandidate,
  currentCandidate: RecommendedProductCandidate,
) => {
  if (nextCandidate.isInStock !== currentCandidate.isInStock) {
    return nextCandidate.isInStock;
  }

  if (nextCandidate.packageMultiplier !== currentCandidate.packageMultiplier) {
    return nextCandidate.packageMultiplier < currentCandidate.packageMultiplier;
  }

  return nextCandidate.firstSeenIndex < currentCandidate.firstSeenIndex;
};

export const selectRecommendedProductRepresentatives = (
  products: HttpTypes.StoreProduct[],
  limit: number,
) => {
  const resolvedLimit = Math.max(limit, 0);
  if (resolvedLimit === 0 || products.length === 0) {
    return [];
  }

  const seenProducts = new Set<string>();
  const familyCandidates = new Map<string, RecommendedProductCandidate>();

  products.forEach((product, index) => {
    const productKey =
      product.id ?? product.handle ?? `${product.title ?? "product"}-${index}`;
    if (seenProducts.has(productKey)) {
      return;
    }

    seenProducts.add(productKey);

    const familyKey = resolveRecommendedProductFamilyKey(product);
    const currentCandidate = familyCandidates.get(familyKey);
    const nextCandidate: RecommendedProductCandidate = {
      familyKey,
      firstSeenIndex: currentCandidate?.firstSeenIndex ?? index,
      packageMultiplier: resolveRecommendedProductPackageMultiplier(product),
      isInStock: resolveRecommendedProductInStock(product),
      product,
    };

    if (
      !currentCandidate ||
      isBetterRecommendedProductCandidate(nextCandidate, currentCandidate)
    ) {
      familyCandidates.set(familyKey, nextCandidate);
    }
  });

  return [...familyCandidates.values()]
    .sort((left, right) => left.firstSeenIndex - right.firstSeenIndex)
    .slice(0, resolvedLimit)
    .map((candidate) => candidate.product);
};
