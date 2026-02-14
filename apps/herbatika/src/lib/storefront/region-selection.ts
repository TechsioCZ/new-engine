import type { HttpTypes } from "@medusajs/types";
import type { RegionInfo } from "@techsio/storefront-data/shared";

const DEFAULT_COUNTRY_CODE = "sk";
const PREFERRED_COUNTRY_CODES = ["sk", "at", "cz"] as const;
const PREFERRED_CURRENCIES = ["eur", "czk"] as const;

export const resolveCountryCode = (region: HttpTypes.StoreRegion): string => {
  const firstCountry = region.countries?.[0]?.iso_2?.toLowerCase();
  return firstCountry ?? DEFAULT_COUNTRY_CODE;
};

export const toRegionInfo = (region: HttpTypes.StoreRegion): RegionInfo => {
  return {
    region_id: region.id,
    country_code: resolveCountryCode(region),
  };
};

export const pickDefaultRegion = (
  regions: HttpTypes.StoreRegion[],
): HttpTypes.StoreRegion | null => {
  if (regions.length === 0) {
    return null;
  }

  for (const preferredCountryCode of PREFERRED_COUNTRY_CODES) {
    const byCountry = regions.find((region) => {
      const regionCountryCodes =
        region.countries?.map((country) => country.iso_2?.toLowerCase()) ?? [];

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
