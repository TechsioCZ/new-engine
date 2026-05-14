import type { CheckoutStepSlug } from "@/components/checkout/checkout.constants";

type SearchParamValue = string | string[] | undefined;
type SearchParamsInput = Record<string, SearchParamValue>;

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "");

const path = (...segments: string[]) => {
  const pathname = segments.map(trimSlashes).filter(Boolean).join("/");
  return pathname ? `/${pathname}` : "/";
};

const hashPath = (href: string, hash: string) => {
  const normalizedHash = hash.replace(/^#+/, "");
  return normalizedHash ? `${href}#${normalizedHash}` : href;
};

export const routes = {
  home: "/",
  homeSection: (sectionId: string) => hashPath("/", sectionId),
  about: "/o-nas",
  blog: {
    index: "/blog",
    detail: (slug: string) => path("blog", slug),
  },
  faq: "/faq",
  cms: {
    detail: (slug: string) => path(slug),
  },
  category: {
    detail: (slug: string) => path("kategoria", slug),
  },
  product: {
    detail: (handle: string) => path("produkt", handle),
  },
  checkout: {
    index: "/pokladna",
    step: (step: CheckoutStepSlug) => path("pokladna", step),
  },
  account: {
    index: "/ucet",
    orders: "/ucet/objednavky",
    orderDetail: (id: string) => path("ucet", "objednavky", id),
    settings: "/ucet/nastavenia",
  },
  auth: {
    login: "/prihlasenie",
    register: "/registracia",
    forgotPassword: "/zabudnute-heslo",
    resetPassword: "/obnova-hesla",
  },
  search: {
    index: "/vyhladavanie",
  },
  brand: {
    index: "/znacky",
    detail: (slug: string) => path("znacky", slug),
  },
} as const;

export const appendSearchParamsToHref = (
  href: string,
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
  return queryString ? `${href}?${queryString}` : href;
};

export const isCheckoutPathname = (pathname: string) =>
  pathname === routes.checkout.index ||
  pathname.startsWith(`${routes.checkout.index}/`);
