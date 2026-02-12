import type { HttpTypes } from "@medusajs/types";
import {
  createMedusaRegionService,
  createRegionHooks,
  type RegionInfo,
} from "@techsio/storefront-data";
import { useEffect, useMemo, useState } from "react";
import { storefrontCacheConfig } from "./cache";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys";
import { storefrontSdk } from "./sdk";

const REGION_STORAGE_KEY = "herbatika_region_id";
const DEFAULT_COUNTRY_CODE = "sk";

const PREFERRED_COUNTRY_CODES = ["sk", "at", "cz"] as const;
const PREFERRED_CURRENCIES = ["eur", "czk"] as const;

const getStoredRegionId = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(REGION_STORAGE_KEY);
};

const setStoredRegionId = (regionId: string) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(REGION_STORAGE_KEY, regionId);
};

const resolveCountryCode = (region: HttpTypes.StoreRegion): string => {
  const firstCountry = region.countries?.[0]?.iso_2?.toLowerCase();
  return firstCountry ?? DEFAULT_COUNTRY_CODE;
};

const toRegionInfo = (region: HttpTypes.StoreRegion): RegionInfo => {
  return {
    region_id: region.id,
    country_code: resolveCountryCode(region),
  };
};

const pickDefaultRegion = (
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

export const regionService = createMedusaRegionService(storefrontSdk);

export const regionHooks = createRegionHooks<
  HttpTypes.StoreRegion,
  HttpTypes.StoreRegionFilters,
  HttpTypes.StoreRegionFilters,
  { id?: string },
  { id?: string }
>({
  service: regionService,
  queryKeyNamespace: STOREFRONT_QUERY_KEY_NAMESPACE,
  cacheConfig: storefrontCacheConfig,
  buildListParams: (input) => input,
  buildDetailParams: (input) => input,
});

export const {
  useRegions,
  useSuspenseRegions,
  useRegion,
  useSuspenseRegion,
  usePrefetchRegions,
  usePrefetchRegion,
} = regionHooks;

export function useRegionBootstrap() {
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  const { regions, isLoading, isFetching, error } = useRegions({
    fields: "id,name,currency_code,countries.*",
    limit: 50,
  });

  useEffect(() => {
    const storedRegionId = getStoredRegionId();
    if (storedRegionId) {
      setSelectedRegionId(storedRegionId);
    }
  }, []);

  useEffect(() => {
    if (regions.length === 0) {
      return;
    }

    const selectedRegion = selectedRegionId
      ? regions.find((region) => region.id === selectedRegionId)
      : null;
    const preferredRegion = pickDefaultRegion(regions);

    // Always prefer deterministic bootstrap region priority over stale localStorage.
    const resolvedRegion = preferredRegion ?? selectedRegion;

    if (!resolvedRegion) {
      return;
    }

    if (resolvedRegion.id !== selectedRegionId) {
      setSelectedRegionId(resolvedRegion.id);
    }

    setStoredRegionId(resolvedRegion.id);
  }, [regions, selectedRegionId]);

  const selectedRegion = useMemo(() => {
    if (!selectedRegionId) {
      return null;
    }

    return regions.find((region) => region.id === selectedRegionId) ?? null;
  }, [regions, selectedRegionId]);

  const region = useMemo(() => {
    if (!selectedRegion) {
      return null;
    }

    return toRegionInfo(selectedRegion);
  }, [selectedRegion]);

  const setRegionById = (regionId: string) => {
    const exists = regions.some((region) => region.id === regionId);
    if (!exists) {
      return;
    }

    setSelectedRegionId(regionId);
    setStoredRegionId(regionId);
  };

  return {
    region,
    regions,
    selectedRegion,
    selectedRegionId,
    isLoading,
    isFetching,
    error,
    setRegionById,
  };
}
