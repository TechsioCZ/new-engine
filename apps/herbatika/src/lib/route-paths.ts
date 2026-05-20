const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "");

export const buildRoutePath = (...segments: string[]) => {
  const pathname = segments.map(trimSlashes).filter(Boolean).join("/");
  return pathname ? `/${pathname}` : "/";
};

export const buildHashRoutePath = (href: string, hash: string) => {
  const normalizedHash = hash.replace(/^#+/, "");
  return normalizedHash ? `${href}#${normalizedHash}` : href;
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
  home: "/",
  homeSection: (sectionId: string) => buildHashRoutePath("/", sectionId),
  about: "/o-nas",
  blog: {
    index: "/blog",
    detail: (slug: string) => buildRoutePath("blog", slug),
  },
  faq: "/faq",
  cms: {
    detail: (slug: string) => buildRoutePath(slug),
  },
  category: {
    detail: (slug: string) => buildRoutePath("kategoria", slug),
  },
  product: {
    detail: (handle: string) => buildRoutePath("produkt", handle),
  },
  checkout: {
    index: "/pokladna",
    cart: buildRoutePath("pokladna", checkoutStepSlugs.cart),
    paymentReturn: buildRoutePath("pokladna", "platba", "navrat"),
    summary: buildRoutePath("pokladna", checkoutStepSlugs.summary),
    step: (step: CheckoutStepSlug) => buildRoutePath("pokladna", step),
  },
  account: {
    index: "/ucet",
    orders: "/ucet/objednavky",
    orderDetail: (id: string) => buildRoutePath("ucet", "objednavky", id),
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
    detail: (slug: string) => buildRoutePath("znacky", slug),
  },
} as const;
