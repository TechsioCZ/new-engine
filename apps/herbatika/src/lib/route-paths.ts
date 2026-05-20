import type { Route } from "next";

export type StorefrontRoute = Route;

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "");

export const asStorefrontRoute = (href: string): StorefrontRoute =>
  href as StorefrontRoute;

export const buildPath = (...segments: string[]) => {
  const pathname = segments.map(trimSlashes).filter(Boolean).join("/");
  return pathname ? `/${pathname}` : "/";
};

export const buildRoutePath = (...segments: string[]) =>
  asStorefrontRoute(buildPath(...segments));

export const buildHashRoutePath = (href: StorefrontRoute, hash: string) => {
  const normalizedHash = hash.replace(/^#+/, "");
  return normalizedHash ? asStorefrontRoute(`${href}#${normalizedHash}`) : href;
};

export const checkoutStepSlugs = {
  cart: "kosik",
  shippingPayment: "doprava-platba",
  address: "udaje",
  summary: "suhrn",
} as const;

export type CheckoutStepSlug =
  (typeof checkoutStepSlugs)[keyof typeof checkoutStepSlugs];

export const routePaths = {
  home: asStorefrontRoute("/"),
  homeSection: (sectionId: string) =>
    buildHashRoutePath(asStorefrontRoute("/"), sectionId),
  about: asStorefrontRoute("/o-nas"),
  blog: {
    index: asStorefrontRoute("/blog"),
    detail: (slug: string) => buildRoutePath("blog", slug),
  },
  faq: asStorefrontRoute("/faq"),
  cms: {
    detail: (slug: string) => buildRoutePath(slug),
  },
  category: {
    prefix: "/kategoria",
    detail: (slug: string) => buildRoutePath("kategoria", slug),
  },
  product: {
    detail: (handle: string) => buildRoutePath("produkt", handle),
  },
  checkout: {
    index: "/pokladna",
    cart: buildRoutePath("pokladna", checkoutStepSlugs.cart),
    paymentReturn: buildPath("pokladna", "platba", "navrat"),
    summary: buildRoutePath("pokladna", checkoutStepSlugs.summary),
    step: (step: CheckoutStepSlug) => buildRoutePath("pokladna", step),
  },
  account: {
    index: asStorefrontRoute("/ucet"),
    orders: asStorefrontRoute("/ucet/objednavky"),
    orderDetail: (id: string) => buildRoutePath("ucet", "objednavky", id),
    settings: asStorefrontRoute("/ucet/nastavenia"),
  },
  auth: {
    login: asStorefrontRoute("/prihlasenie"),
    register: asStorefrontRoute("/registracia"),
    forgotPassword: asStorefrontRoute("/zabudnute-heslo"),
    resetPassword: asStorefrontRoute("/obnova-hesla"),
  },
  search: {
    index: asStorefrontRoute("/vyhladavanie"),
  },
  brand: {
    index: asStorefrontRoute("/znacky"),
    detail: (slug: string) => buildRoutePath("znacky", slug),
  },
} as const;
