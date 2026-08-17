import type {
  AccountChildKey,
  CheckoutChildKey,
  FlowRootKey,
  Market,
  ReviewChildKey,
  RootSegmentMatch,
  RouteSegmentRegistry,
  SegmentRegistryG1,
  StaticRootPageKey,
  TypePrefixKey,
} from "./types"

export const MARKETS = [
  "sk",
  "cz",
  "hu",
  "ro",
] as const satisfies readonly Market[]

export const TYPE_PREFIX_KEYS = [
  "products",
  "categories",
  "brands",
  "collections",
  "campaigns",
  "advice",
  "information",
] as const satisfies readonly TypePrefixKey[]

export const FLOW_ROOT_KEYS = [
  "search",
  "cart",
  "checkout",
  "account",
  "reviews",
] as const satisfies readonly FlowRootKey[]

export const STATIC_ROOT_PAGE_KEYS = [
  "about",
  "contact",
  "faq",
  "shipping",
  "returns",
  "terms",
  "privacy",
  "cookies",
] as const satisfies readonly StaticRootPageKey[]

export const LEGAL_STATIC_ROOT_PAGE_KEYS = [
  "terms",
  "privacy",
  "cookies",
] as const satisfies readonly StaticRootPageKey[]

export const CHECKOUT_CHILD_KEYS = [
  "contact",
  "shipping",
  "payment",
  "review",
  "paymentReturn",
  "confirmation",
  "checkoutResult",
] as const satisfies readonly CheckoutChildKey[]

export const ACCOUNT_CHILD_KEYS = [
  "lists",
  "orders",
  "settings",
  "login",
  "register",
  "forgotPassword",
  "resetPassword",
] as const satisfies readonly AccountChildKey[]

export const REVIEW_CHILD_KEYS = [
  "product",
] as const satisfies readonly ReviewChildKey[]

export const SEGMENT_REGISTRY_G1 = {
  gate: "G1",
  status: "proposed-unverified",
  requiredBeforePublication: true,
  marketEvidence: {
    sk: {
      editorialApproval: null,
      legalApproval: null,
      frozenRegistryHash: null,
    },
    cz: {
      editorialApproval: null,
      legalApproval: null,
      frozenRegistryHash: null,
    },
    hu: {
      editorialApproval: null,
      legalApproval: null,
      frozenRegistryHash: null,
    },
    ro: {
      editorialApproval: null,
      legalApproval: null,
      frozenRegistryHash: null,
    },
  },
} as const satisfies SegmentRegistryG1

export const ROUTE_SEGMENT_REGISTRY = {
  sk: {
    typePrefixes: {
      products: "produkty",
      categories: "kategorie",
      brands: "znacky",
      collections: "kolekcie",
      campaigns: "akcie",
      advice: "poradna",
      information: "informacie",
    },
    flowRoots: {
      search: "vyhladavanie",
      cart: "kosik",
      checkout: "pokladna",
      account: "ucet",
      reviews: "recenzie",
    },
    staticRootPages: {
      about: "o-nas",
      contact: "kontakt",
      faq: "casto-kladene-otazky",
      shipping: "doprava",
      returns: "vratenie-tovaru",
      terms: "obchodne-podmienky",
      privacy: "ochrana-osobnych-udajov",
      cookies: "cookies",
    },
    children: {
      checkout: {
        contact: "kontakt",
        shipping: "doprava",
        payment: "platba",
        review: "kontrola",
        paymentReturn: "navrat-z-platby",
        confirmation: "potvrdenie-objednavky",
        checkoutResult: "vysledok",
      },
      account: {
        lists: "zoznamy",
        orders: "objednavky",
        settings: "nastavenia",
        login: "prihlasenie",
        register: "registracia",
        forgotPassword: "zabudnute-heslo",
        resetPassword: "obnova-hesla",
      },
      reviews: {
        product: "produkt",
      },
    },
  },
  cz: {
    typePrefixes: {
      products: "produkty",
      categories: "kategorie",
      brands: "znacky",
      collections: "kolekce",
      campaigns: "akce",
      advice: "poradna",
      information: "informace",
    },
    flowRoots: {
      search: "vyhledavani",
      cart: "kosik",
      checkout: "pokladna",
      account: "ucet",
      reviews: "recenze",
    },
    staticRootPages: {
      about: "o-nas",
      contact: "kontakt",
      faq: "caste-dotazy",
      shipping: "doprava",
      returns: "vraceni-zbozi",
      terms: "obchodni-podminky",
      privacy: "ochrana-osobnich-udaju",
      cookies: "cookies",
    },
    children: {
      checkout: {
        contact: "kontakt",
        shipping: "doprava",
        payment: "platba",
        review: "kontrola",
        paymentReturn: "navrat-z-platby",
        confirmation: "potvrzeni-objednavky",
        checkoutResult: "vysledek",
      },
      account: {
        lists: "seznamy",
        orders: "objednavky",
        settings: "nastaveni",
        login: "prihlaseni",
        register: "registrace",
        forgotPassword: "zapomenute-heslo",
        resetPassword: "obnova-hesla",
      },
      reviews: {
        product: "produkt",
      },
    },
  },
  hu: {
    typePrefixes: {
      products: "termekek",
      categories: "kategoriak",
      brands: "markak",
      collections: "gyujtemenyek",
      campaigns: "akciok",
      advice: "tanacsok",
      information: "informaciok",
    },
    flowRoots: {
      search: "kereses",
      cart: "kosar",
      checkout: "penztar",
      account: "fiok",
      reviews: "velemenyek",
    },
    staticRootPages: {
      about: "rolunk",
      contact: "kapcsolat",
      faq: "gyakori-kerdesek",
      shipping: "szallitas",
      returns: "visszakuldes",
      terms: "altalanos-szerzodesi-feltetelek",
      privacy: "adatvedelmi-tajekoztato",
      cookies: "cookie-tajekoztato",
    },
    children: {
      checkout: {
        contact: "kapcsolat",
        shipping: "szallitas",
        payment: "fizetes",
        review: "ellenorzes",
        paymentReturn: "fizetesi-visszateres",
        confirmation: "rendeles-visszaigazolas",
        checkoutResult: "eredmeny",
      },
      account: {
        lists: "listak",
        orders: "rendelesek",
        settings: "beallitasok",
        login: "bejelentkezes",
        register: "regisztracio",
        forgotPassword: "elfelejtett-jelszo",
        resetPassword: "jelszo-visszaallitas",
      },
      reviews: {
        product: "termek",
      },
    },
  },
  ro: {
    typePrefixes: {
      products: "produse",
      categories: "categorii",
      brands: "marci",
      collections: "colectii",
      campaigns: "promotii",
      advice: "sfaturi",
      information: "informatii",
    },
    flowRoots: {
      search: "cautare",
      cart: "cos",
      checkout: "finalizare-comanda",
      account: "cont",
      reviews: "recenzii",
    },
    staticRootPages: {
      about: "despre-noi",
      contact: "contact",
      faq: "intrebari-frecvente",
      shipping: "livrare",
      returns: "retururi",
      terms: "termeni-si-conditii",
      privacy: "politica-de-confidentialitate",
      cookies: "politica-cookies",
    },
    children: {
      checkout: {
        contact: "contact",
        shipping: "livrare",
        payment: "plata",
        review: "verificare",
        paymentReturn: "retur-plata",
        confirmation: "confirmare-comanda",
        checkoutResult: "rezultat",
      },
      account: {
        lists: "liste",
        orders: "comenzi",
        settings: "setari",
        login: "autentificare",
        register: "inregistrare",
        forgotPassword: "parola-uitata",
        resetPassword: "resetare-parola",
      },
      reviews: {
        product: "produs",
      },
    },
  },
} as const satisfies RouteSegmentRegistry

const parseSiblingSegment = <Key extends string>(
  keys: readonly Key[],
  siblings: Readonly<Record<Key, string>>,
  segment: string
): Key | null => keys.find((key) => siblings[key] === segment) ?? null

export const parseMarket = (value: string): Market | null =>
  MARKETS.find((market) => market === value) ?? null

export const parseTypePrefixSegment = (
  market: Market,
  segment: string
): TypePrefixKey | null =>
  parseSiblingSegment(
    TYPE_PREFIX_KEYS,
    ROUTE_SEGMENT_REGISTRY[market].typePrefixes,
    segment
  )

export const parseFlowRootSegment = (
  market: Market,
  segment: string
): FlowRootKey | null =>
  parseSiblingSegment(
    FLOW_ROOT_KEYS,
    ROUTE_SEGMENT_REGISTRY[market].flowRoots,
    segment
  )

export const parseStaticRootPageSegment = (
  market: Market,
  segment: string
): StaticRootPageKey | null =>
  parseSiblingSegment(
    STATIC_ROOT_PAGE_KEYS,
    ROUTE_SEGMENT_REGISTRY[market].staticRootPages,
    segment
  )

export const parseRootSegment = (
  market: Market,
  segment: string
): RootSegmentMatch | null => {
  const typePrefix = parseTypePrefixSegment(market, segment)
  if (typePrefix !== null) {
    return { group: "type-prefix", key: typePrefix }
  }

  const flowRoot = parseFlowRootSegment(market, segment)
  if (flowRoot !== null) {
    return { group: "flow-root", key: flowRoot }
  }

  const staticRootPage = parseStaticRootPageSegment(market, segment)
  if (staticRootPage !== null) {
    return { group: "static-root-page", key: staticRootPage }
  }

  return null
}

export const parseCheckoutChildSegment = (
  market: Market,
  segment: string
): CheckoutChildKey | null =>
  parseSiblingSegment(
    CHECKOUT_CHILD_KEYS,
    ROUTE_SEGMENT_REGISTRY[market].children.checkout,
    segment
  )

export const parseAccountChildSegment = (
  market: Market,
  segment: string
): AccountChildKey | null =>
  parseSiblingSegment(
    ACCOUNT_CHILD_KEYS,
    ROUTE_SEGMENT_REGISTRY[market].children.account,
    segment
  )

export const parseReviewChildSegment = (
  market: Market,
  segment: string
): ReviewChildKey | null =>
  parseSiblingSegment(
    REVIEW_CHILD_KEYS,
    ROUTE_SEGMENT_REGISTRY[market].children.reviews,
    segment
  )
