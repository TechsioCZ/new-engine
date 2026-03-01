import type { ProductSortValue } from "@/lib/storefront/plp-query-state";

export const SORT_TAB_ITEMS: Array<{
  label: string;
  value: ProductSortValue;
}> = [
  { label: "Odporúčame", value: "recommended" },
  { label: "Najlacnejšie", value: "price-asc" },
  { label: "Najdrahšie", value: "price-desc" },
  { label: "Najpredávanejšie", value: "best-selling" },
  { label: "Najnovšie", value: "newest" },
];
