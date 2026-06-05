"use client";

import type { RegionInfo } from "@techsio/storefront-data/shared/region";
import { useEffect, useMemo, useState } from "react";
import { REGION_LIST_FIELDS, REGION_LIST_LIMIT } from "./region-query-config";
import {
  getStoredRegionPreference,
  persistRegionPreference,
} from "./region-preferences";
import { resolveRegionByIdOrDefault, toRegionInfo } from "./region-selection";
import { storefront } from "./storefront";

const regionHooks = storefront.hooks.regions;

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
