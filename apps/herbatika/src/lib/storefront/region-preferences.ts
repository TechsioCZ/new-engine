import type { RegionInfo } from "@techsio/storefront-data/shared/region";

export const REGION_STORAGE_KEY = "herbatika_region_id";
export const REGION_COUNTRY_CODE_STORAGE_KEY = "herbatika_region_country_code";
export const REGION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const REGION_ID_PATTERN = /^reg_[a-z0-9]+$/i;
const COUNTRY_CODE_PATTERN = /^[a-z]{2}$/i;

const normalizeRegionId = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!REGION_ID_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
};

export const normalizeCountryCode = (
  value: string | null | undefined,
): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!COUNTRY_CODE_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
};

const writeCookie = (name: string, value: string) => {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${REGION_COOKIE_MAX_AGE}; samesite=lax`;
};

export const persistRegionPreference = (region: RegionInfo) => {
  const regionId = normalizeRegionId(region.region_id);
  const countryCode = normalizeCountryCode(region.country_code);

  if (!regionId || !countryCode) {
    return;
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(REGION_STORAGE_KEY, regionId);
    window.localStorage.setItem(
      REGION_COUNTRY_CODE_STORAGE_KEY,
      countryCode,
    );
  }

  writeCookie(REGION_STORAGE_KEY, regionId);
  writeCookie(REGION_COUNTRY_CODE_STORAGE_KEY, countryCode);
};

export const getStoredRegionPreference = (): RegionInfo | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const regionId = normalizeRegionId(window.localStorage.getItem(REGION_STORAGE_KEY));
  const countryCode = normalizeCountryCode(
    window.localStorage.getItem(REGION_COUNTRY_CODE_STORAGE_KEY),
  );

  if (!regionId || !countryCode) {
    return null;
  }

  return {
    region_id: regionId,
    country_code: countryCode,
  };
};

export const resolveRegionInfoFromCookieValues = (
  regionIdRaw: string | null | undefined,
  countryCodeRaw: string | null | undefined,
): RegionInfo | null => {
  const regionId = normalizeRegionId(regionIdRaw);
  const countryCode = normalizeCountryCode(countryCodeRaw);

  if (!regionId || !countryCode) {
    return null;
  }

  return {
    region_id: regionId,
    country_code: countryCode,
  };
};
