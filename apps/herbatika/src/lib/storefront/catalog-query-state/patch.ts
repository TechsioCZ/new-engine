import {
  CATALOG_PAGE_RESET_KEYS,
  type CatalogQueryState,
  type CatalogQueryStatePatch,
  type ResolveCatalogQueryStatePatchOptions,
} from "./parsers";
import { areCatalogQueryValuesEqual, hasOwnKey } from "./utils";

export const resolveCatalogQueryStatePatch = (
  currentState: CatalogQueryState,
  patch: CatalogQueryStatePatch,
  options: ResolveCatalogQueryStatePatchOptions = {},
): CatalogQueryStatePatch => {
  const resetMode = options.resetPage ?? "auto";

  if (resetMode === "never" || hasOwnKey(patch, "page")) {
    return patch;
  }

  if (resetMode === "always") {
    return currentState.page === 1 ? patch : { ...patch, page: 1 };
  }

  const shouldResetPage = CATALOG_PAGE_RESET_KEYS.some((key) => {
    if (!hasOwnKey(patch, key)) {
      return false;
    }

    const nextValue = patch[key];
    if (nextValue === undefined) {
      return false;
    }

    return !areCatalogQueryValuesEqual(currentState[key], nextValue);
  });

  if (!shouldResetPage || currentState.page === 1) {
    return patch;
  }

  return {
    ...patch,
    page: 1,
  };
};
