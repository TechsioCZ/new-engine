import type { HttpTypes } from "@medusajs/types";
import type { RegionInfo } from "@techsio/storefront-data/shared/region";

const DEFAULT_COUNTRY_CODE = "sk";
const PREFERRED_COUNTRY_CODES = ["sk", "at", "cz"] as const;
const PREFERRED_CURRENCIES = ["eur", "czk"] as const;
const DEFAULT_REGION_CURRENCY = "EUR";

export type HerbatikaCurrencyCode = "EUR" | "CZK";

const COUNTRY_CURRENCY_BY_CODE: Record<string, HerbatikaCurrencyCode> = {
  at: "EUR",
  cz: "CZK",
  sk: "EUR",
};

type RegionCurrencySource = RegionInfo & {
  currency_code?: unknown;
};

const normalizeRegionCurrencyCode = (
  value: unknown,
): HerbatikaCurrencyCode | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedCurrencyCode = value.trim().toUpperCase();
  if (normalizedCurrencyCode === "CZK") {
    return "CZK";
  }

  if (normalizedCurrencyCode === "EUR") {
    return "EUR";
  }

  return null;
};

const resolveRegionCountryCodes = (
  region: HttpTypes.StoreRegion,
): string[] => {
  return (
    region.countries
      ?.map((country) => country.iso_2?.toLowerCase())
      .filter((countryCode): countryCode is string => Boolean(countryCode)) ?? []
  );
};

export const resolveCountryCode = (region: HttpTypes.StoreRegion): string => {
  const countryCodes = resolveRegionCountryCodes(region);

  for (const preferredCountryCode of PREFERRED_COUNTRY_CODES) {
    if (countryCodes.includes(preferredCountryCode)) {
      return preferredCountryCode;
    }
  }

  return countryCodes[0] ?? DEFAULT_COUNTRY_CODE;
};

export const toRegionInfo = (region: HttpTypes.StoreRegion): RegionInfo => {
  return {
    region_id: region.id,
    country_code: resolveCountryCode(region),
  };
};

export const resolveRegionCurrency = (
  region?: RegionInfo | null,
): HerbatikaCurrencyCode => {
  const explicitCurrencyCode = normalizeRegionCurrencyCode(
    (region as RegionCurrencySource | null | undefined)?.currency_code,
  );

  if (explicitCurrencyCode) {
    return explicitCurrencyCode;
  }

  const countryCode = region?.country_code?.trim().toLowerCase();
  return countryCode
    ? (COUNTRY_CURRENCY_BY_CODE[countryCode] ?? DEFAULT_REGION_CURRENCY)
    : DEFAULT_REGION_CURRENCY;
};

export const pickDefaultRegion = (
  regions: HttpTypes.StoreRegion[],
): HttpTypes.StoreRegion | null => {
  if (regions.length === 0) {
    return null;
  }

  for (const preferredCountryCode of PREFERRED_COUNTRY_CODES) {
    const byCountry = regions.find((region) => {
      const regionCountryCodes = resolveRegionCountryCodes(region);

      return regionCountryCodes.includes(preferredCountryCode);
    });

    if (byCountry) {
      return byCountry;
    }
  }

  const byCurrency = regions.find((region) => {
    const currency = region.currency_code?.toLowerCase();
    return Boolean(
      currency && PREFERRED_CURRENCIES.includes(currency as "eur" | "czk"),
    );
  });

  return byCurrency ?? regions[0] ?? null;
};

export const resolveRegionByIdOrDefault = (
  regions: HttpTypes.StoreRegion[],
  regionId: string | null | undefined,
): HttpTypes.StoreRegion | null => {
  if (regionId) {
    const selectedRegion = regions.find((region) => region.id === regionId);
    if (selectedRegion) {
      return selectedRegion;
    }
  }

  return pickDefaultRegion(regions);
};
