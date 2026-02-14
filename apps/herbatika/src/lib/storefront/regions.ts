import type { HttpTypes } from "@medusajs/types";
import {
  createRegionHooks,
  type RegionInfo,
} from "@techsio/storefront-data";
import { useEffect, useMemo, useState } from "react";
import { storefrontCacheConfig } from "./cache";
import {
  getStoredRegionPreference,
  persistRegionPreference,
} from "./region-preferences";
import { REGION_LIST_FIELDS, REGION_LIST_LIMIT } from "./region-query-config";
import { regionService } from "./region-service";
import { resolveRegionByIdOrDefault, toRegionInfo } from "./region-selection";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys";

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

type UseRegionBootstrapOptions = {
  initialRegion?: RegionInfo | null;
};

export function useRegionBootstrap(options: UseRegionBootstrapOptions = {}) {
  const initialRegion = options.initialRegion ?? null;

  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(
    initialRegion?.region_id ?? null,
  );

  const { regions, isLoading, isFetching, error } = useRegions({
    fields: REGION_LIST_FIELDS,
    limit: REGION_LIST_LIMIT,
  });

  useEffect(() => {
    const storedRegion = getStoredRegionPreference();
    const storedRegionId = storedRegion?.region_id ?? null;

    if (!storedRegionId) {
      return;
    }

    setSelectedRegionId((currentRegionId) => {
      return currentRegionId ?? storedRegionId;
    });
  }, []);

  useEffect(() => {
    if (regions.length === 0) {
      return;
    }

    const resolvedRegion = resolveRegionByIdOrDefault(regions, selectedRegionId);

    if (!resolvedRegion) {
      return;
    }

    if (resolvedRegion.id !== selectedRegionId) {
      setSelectedRegionId(resolvedRegion.id);
    }

    persistRegionPreference(toRegionInfo(resolvedRegion));
  }, [regions, selectedRegionId]);

  const selectedRegion = useMemo(() => {
    if (!selectedRegionId) {
      return null;
    }

    return regions.find((region) => region.id === selectedRegionId) ?? null;
  }, [regions, selectedRegionId]);

  const region = useMemo(() => {
    if (selectedRegion) {
      return toRegionInfo(selectedRegion);
    }

    return initialRegion;
  }, [initialRegion, selectedRegion]);

  const setRegionById = (regionId: string) => {
    const nextRegion = regions.find((region) => region.id === regionId);
    if (!nextRegion) {
      return;
    }

    setSelectedRegionId(nextRegion.id);
    persistRegionPreference(toRegionInfo(nextRegion));
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
