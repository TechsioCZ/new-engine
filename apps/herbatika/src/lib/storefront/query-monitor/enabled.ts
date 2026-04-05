const STOREFRONT_MONITOR_SEARCH_PARAM = "storefrontMonitor";
const STOREFRONT_MONITOR_SESSION_KEY = "herbatika.storefront-monitor";

const parseBooleanFlag = (value: string | null | undefined): boolean | null => {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (!normalizedValue) {
    return null;
  }

  if (
    normalizedValue === "1" ||
    normalizedValue === "true" ||
    normalizedValue === "yes" ||
    normalizedValue === "on"
  ) {
    return true;
  }

  if (
    normalizedValue === "0" ||
    normalizedValue === "false" ||
    normalizedValue === "no" ||
    normalizedValue === "off"
  ) {
    return false;
  }

  return null;
};

export const isStorefrontMonitorEnabled = (): boolean => {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
    return false;
  }

  const envEnabled = parseBooleanFlag(
    process.env.NEXT_PUBLIC_ENABLE_STOREFRONT_QUERY_MONITOR,
  );
  if (envEnabled === true) {
    return true;
  }

  const searchParamEnabled = parseBooleanFlag(
    new URLSearchParams(window.location.search).get(
      STOREFRONT_MONITOR_SEARCH_PARAM,
    ),
  );

  if (searchParamEnabled === true) {
    window.sessionStorage.setItem(STOREFRONT_MONITOR_SESSION_KEY, "1");
    return true;
  }

  if (searchParamEnabled === false) {
    window.sessionStorage.removeItem(STOREFRONT_MONITOR_SESSION_KEY);
    return false;
  }

  return window.sessionStorage.getItem(STOREFRONT_MONITOR_SESSION_KEY) === "1";
};
