import type { HttpTypes } from "@medusajs/types";
import type { IconType } from "@techsio/ui-kit/atoms/icon";

export type StorefrontProduct = HttpTypes.StoreProduct;

export type StorefrontProductDetailProps = {
  handle: string;
};

export type ProductPriceState = {
  currentLabel: string;
  originalLabel: string | null;
  currentAmount: number | null;
  currentAmountWithoutTax: number | null;
  originalAmount: number | null;
  currencyCode: string;
};

export type ProductOfferState = {
  code: string | null;
  ean: string | null;
  availabilityLabel: string;
  deliveryLabel: string;
  stockAmount: number | null;
  isInStock: boolean;
  offerSource: Record<string, unknown> | null;
  unitLabel: string | null;
  currentAmount: number | null;
  standardAmount: number | null;
  actionAmount: number | null;
  hasActiveDiscount: boolean;
};

export type ProductMediaFact = {
  id: "doses" | "daily-intake";
  icon: IconType;
  value: string;
  label: string;
};

export type ProductDetailContentSection = {
  key: string;
  title: string;
  html: string;
};

export type VolumeDiscountOption = {
  id: string;
  title: string;
  quantity: number;
  totalAmountLabel: string;
  perUnitLabel: string;
  oldTotalAmountLabel: string | null;
};

export type RelatedProductsSection = {
  id: string;
  title: string;
  products: StorefrontProduct[];
};
