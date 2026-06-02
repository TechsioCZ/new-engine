import type { ProductLocationAvailabilityId } from "@/components/product-detail/product-detail.types";

export const HIGH_AVAILABILITY_THRESHOLD = 10;
export const HIGH_AVAILABILITY_LABEL = "Skladem (>10 ks)";

export const LOCATION_DEFINITIONS: Array<{
  id: ProductLocationAvailabilityId;
  label: string;
  aliases: string[];
}> = [
  {
    id: "store",
    label: "Prodejna",
    aliases: ["prodejna", "predajna", "kamenná prodejna", "kamenná predajna"],
  },
  {
    id: "makov-warehouse",
    label: "Hlavní sklad Makov",
    aliases: [
      "hlavní sklad makov",
      "hlavny sklad makov",
      "hlavný sklad makov",
      "makov",
    ],
  },
];

export const LOCATION_NAME_KEYS = [
  "location",
  "location_name",
  "stock_location",
  "stock_location_name",
  "name",
  "label",
];

export const LOCATION_COLLECTION_KEYS = [
  "locations",
  "location_availability",
  "availability_by_location",
  "stock_by_location",
];

export const SELLABLE_QUANTITY_KEYS = [
  "available_amount",
  "available_quantity",
  "sellable_amount",
  "sellable_quantity",
  "salable_amount",
  "salable_quantity",
  "amount",
];

export const PHYSICAL_QUANTITY_KEYS = [
  "stocked_quantity",
  "physical_amount",
  "physical_quantity",
  "quantity",
];

export const NON_SELLABLE_QUANTITY_KEYS = [
  "reserved_amount",
  "reserved_quantity",
  "reserved",
  "blocked_amount",
  "blocked_quantity",
  "blocked",
  "unavailable_amount",
  "unavailable_quantity",
];
