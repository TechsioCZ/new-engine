import {
  asStorefrontRoute,
  routePaths,
  type StorefrontRoute,
} from "./route-paths";

type SearchParamValue = string | string[] | undefined;
type SearchParamsInput = Record<string, SearchParamValue>;

export const routes = routePaths;

export const appendSearchParamsToHref = (
  href: StorefrontRoute,
  searchParams: SearchParamsInput,
) => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
      continue;
    }

    if (value !== undefined) {
      params.set(key, value);
    }
  }

  const queryString = params.toString();
  return queryString ? asStorefrontRoute(`${href}?${queryString}`) : href;
};

export const isCheckoutPathname = (pathname: string) =>
  pathname === routes.checkout.index ||
  pathname.startsWith(`${routes.checkout.index}/`);

export const resolveCategoryHandleFromHref = (href: string) => {
  const categoryPathPrefix = `${routes.category.prefix}/`;

  if (href.startsWith(categoryPathPrefix)) {
    return href.slice(categoryPathPrefix.length);
  }

  return null;
};
