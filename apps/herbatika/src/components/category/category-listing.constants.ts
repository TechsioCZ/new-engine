import type { ProductSortValue } from "@/lib/storefront/plp-query-state";

export const SORT_TAB_ITEMS: Array<{
  label: string;
  value: ProductSortValue;
}> = [
  { label: "Odporúčame", value: "recommended" },
  { label: "Najlacnejšie", value: "title-asc" },
  { label: "Najdrahšie", value: "title-desc" },
  { label: "Najpredávanejšie", value: "oldest" },
  { label: "Najnovšie", value: "newest" },
];
