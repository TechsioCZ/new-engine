import type { HttpTypes } from "@medusajs/types";
import type { SelectItem } from "@techsio/ui-kit/molecules/select";
import type { CheckoutAddressValues } from "@/lib/forms/checkout/address.form";

export type AddressFormState = CheckoutAddressValues;

export const COUNTRY_SELECT_ITEMS: SelectItem[] = [
  { value: "SK", label: "Slovensko" },
  { value: "CZ", label: "Česko" },
  { value: "AT", label: "Rakúsko" },
  { value: "HU", label: "Maďarsko" },
];

type CheckoutCountryRegionInput = {
  activeCountryCode?: string | null;
  countryCode?: string | null;
  regionId?: string | null;
  regions: HttpTypes.StoreRegion[];
};

const normalizeCountryCode = (countryCode: string | null | undefined) => {
  const normalized = countryCode?.trim().toUpperCase();
  return normalized && /^[A-Z]{2}$/.test(normalized) ? normalized : null;
};

const findCheckoutRegion = ({
  regionId,
  regions,
}: Pick<CheckoutCountryRegionInput, "regionId" | "regions">) => {
  if (!regionId) {
    return null;
  }

  return regions.find((region) => region.id === regionId) ?? null;
};

const resolveRegionCountryCodes = (region: HttpTypes.StoreRegion | null) => {
  return new Set(
    region?.countries
      ?.map((country) => normalizeCountryCode(country.iso_2))
      .filter((countryCode): countryCode is string => Boolean(countryCode)) ?? [],
  );
};

const resolveCheckoutCountryCodes = ({
  activeCountryCode,
  regionId,
  regions,
}: Pick<
  CheckoutCountryRegionInput,
  "activeCountryCode" | "regionId" | "regions"
>) => {
  const regionCountryCodes = resolveRegionCountryCodes(
    findCheckoutRegion({ regionId, regions }),
  );
  const normalizedActiveCountryCode = normalizeCountryCode(activeCountryCode);

  if (
    normalizedActiveCountryCode &&
    (regionCountryCodes.size === 0 ||
      regionCountryCodes.has(normalizedActiveCountryCode))
  ) {
    return new Set([normalizedActiveCountryCode]);
  }

  return regionCountryCodes;
};

export const resolveCheckoutCountryItemsForRegion = ({
  activeCountryCode,
  regionId,
  regions,
}: Pick<
  CheckoutCountryRegionInput,
  "activeCountryCode" | "regionId" | "regions"
>): SelectItem[] => {
  const countryCodes = resolveCheckoutCountryCodes({
    activeCountryCode,
    regionId,
    regions,
  });

  if (countryCodes.size === 0) {
    return COUNTRY_SELECT_ITEMS;
  }

  const regionItems = COUNTRY_SELECT_ITEMS.filter((item) =>
    countryCodes.has(normalizeCountryCode(item.value) ?? ""),
  );

  return regionItems.length > 0 ? regionItems : COUNTRY_SELECT_ITEMS;
};

export const isCheckoutCountryAvailableForRegion = ({
  activeCountryCode,
  countryCode,
  regionId,
  regions,
}: CheckoutCountryRegionInput) => {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const countryCodes = resolveCheckoutCountryCodes({
    activeCountryCode,
    regionId,
    regions,
  });

  if (!normalizedCountryCode || countryCodes.size === 0) {
    return false;
  }

  return countryCodes.has(normalizedCountryCode);
};

export const CHECKOUT_STEPS = [
  { id: "cart", slug: "kosik", title: "Košík" },
  { id: "shipping-payment", slug: "doprava-platba", title: "Doprava a platba" },
  { id: "address", slug: "udaje", title: "Vaše údaje" },
  { id: "summary", slug: "suhrn", title: "Súhrn" },
] as const;

export type CheckoutStepSlug = (typeof CHECKOUT_STEPS)[number]["slug"];

export const DEFAULT_CHECKOUT_STEP_SLUG: CheckoutStepSlug = "kosik";
