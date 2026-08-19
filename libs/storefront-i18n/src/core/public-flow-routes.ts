export const PUBLIC_FLOW_MARKETS = ["sk", "cz", "hu", "ro"] as const

export type PublicFlowMarket = (typeof PUBLIC_FLOW_MARKETS)[number]

export const PUBLIC_FLOW_ROUTE_SEGMENTS = {
  sk: {
    flowRoots: {
      account: "ucet",
      cart: "kosik",
      checkout: "pokladna",
      reviews: "recenzie",
      search: "vyhladavanie",
    },
    children: {
      account: {
        deactivation: "zrusenie-uctu",
        forgotPassword: "zabudnute-heslo",
        lists: "zoznamy",
        login: "prihlasenie",
        orders: "objednavky",
        register: "registracia",
        resetPassword: "obnova-hesla",
        settings: "nastavenia",
      },
      checkout: {
        checkoutResult: "vysledok",
        confirmation: "potvrdenie-objednavky",
        contact: "kontakt",
        payment: "platba",
        paymentReturn: "navrat-z-platby",
        review: "kontrola",
        shipping: "doprava",
      },
      reviews: { product: "produkt" },
    },
  },
  cz: {
    flowRoots: {
      account: "ucet",
      cart: "kosik",
      checkout: "pokladna",
      reviews: "recenze",
      search: "vyhledavani",
    },
    children: {
      account: {
        deactivation: "zruseni-uctu",
        forgotPassword: "zapomenute-heslo",
        lists: "seznamy",
        login: "prihlaseni",
        orders: "objednavky",
        register: "registrace",
        resetPassword: "obnova-hesla",
        settings: "nastaveni",
      },
      checkout: {
        checkoutResult: "vysledek",
        confirmation: "potvrzeni-objednavky",
        contact: "kontakt",
        payment: "platba",
        paymentReturn: "navrat-z-platby",
        review: "kontrola",
        shipping: "doprava",
      },
      reviews: { product: "produkt" },
    },
  },
  hu: {
    flowRoots: {
      account: "fiok",
      cart: "kosar",
      checkout: "penztar",
      reviews: "velemenyek",
      search: "kereses",
    },
    children: {
      account: {
        deactivation: "fiok-torlese",
        forgotPassword: "elfelejtett-jelszo",
        lists: "listak",
        login: "bejelentkezes",
        orders: "rendelesek",
        register: "regisztracio",
        resetPassword: "jelszo-visszaallitas",
        settings: "beallitasok",
      },
      checkout: {
        checkoutResult: "eredmeny",
        confirmation: "rendeles-visszaigazolas",
        contact: "kapcsolat",
        payment: "fizetes",
        paymentReturn: "fizetesi-visszateres",
        review: "ellenorzes",
        shipping: "szallitas",
      },
      reviews: { product: "termek" },
    },
  },
  ro: {
    flowRoots: {
      account: "cont",
      cart: "cos",
      checkout: "finalizare-comanda",
      reviews: "recenzii",
      search: "cautare",
    },
    children: {
      account: {
        deactivation: "dezactivare-cont",
        forgotPassword: "parola-uitata",
        lists: "liste",
        login: "autentificare",
        orders: "comenzi",
        register: "inregistrare",
        resetPassword: "resetare-parola",
        settings: "setari",
      },
      checkout: {
        checkoutResult: "rezultat",
        confirmation: "confirmare-comanda",
        contact: "contact",
        payment: "plata",
        paymentReturn: "retur-plata",
        review: "verificare",
        shipping: "livrare",
      },
      reviews: { product: "produs" },
    },
  },
} as const

type FlowSegments = (typeof PUBLIC_FLOW_ROUTE_SEGMENTS)[PublicFlowMarket]
export type PublicAccountRoute = keyof FlowSegments["children"]["account"]
export type PublicCheckoutRoute = keyof FlowSegments["children"]["checkout"]

export type PublicFlowRouteTarget =
  | Readonly<{ kind: "search" }>
  | Readonly<{ kind: "cart" }>
  | Readonly<{
      kind: "checkout"
      step?: PublicCheckoutRoute
      value?: string
    }>
  | Readonly<{
      kind: "account"
      section?: PublicAccountRoute
      value?: string
    }>
  | Readonly<{ kind: "review"; token: string }>

export const parsePublicFlowMarket = (
  value: unknown
): PublicFlowMarket | undefined =>
  typeof value === "string" &&
  PUBLIC_FLOW_MARKETS.some((market) => market === value)
    ? (value as PublicFlowMarket)
    : undefined

const encodeOpaqueSegment = (value: string, name: string) => {
  if (!value || value === "." || value === "..") {
    throw new Error(`${name} must be a non-empty path segment`)
  }

  return encodeURIComponent(value)
}

const getPublicFlowSegments = (market: unknown): FlowSegments => {
  const parsedMarket = parsePublicFlowMarket(market)

  if (!parsedMarket) {
    throw new Error("Unsupported public flow market")
  }

  return PUBLIC_FLOW_ROUTE_SEGMENTS[parsedMarket]
}

export const buildPublicFlowPath = (
  target: PublicFlowRouteTarget,
  market: PublicFlowMarket
): string => {
  const segments = getPublicFlowSegments(market)

  switch (target.kind) {
    case "search":
      return `/${segments.flowRoots.search}`
    case "cart":
      return `/${segments.flowRoots.cart}`
    case "checkout": {
      const root = `/${segments.flowRoots.checkout}`

      if (!target.step) {
        if (target.value !== undefined) {
          throw new Error("A checkout value requires a checkout step")
        }

        return root
      }

      const step = `${root}/${segments.children.checkout[target.step]}`

      return target.value === undefined
        ? step
        : `${step}/${encodeOpaqueSegment(target.value, "Checkout value")}`
    }
    case "account": {
      const root = `/${segments.flowRoots.account}`

      if (!target.section) {
        if (target.value !== undefined) {
          throw new Error("An account value requires an account section")
        }

        return root
      }

      const section = `${root}/${segments.children.account[target.section]}`

      return target.value === undefined
        ? section
        : `${section}/${encodeOpaqueSegment(target.value, "Account value")}`
    }
    case "review":
      return `/${segments.flowRoots.reviews}/${segments.children.reviews.product}/${encodeOpaqueSegment(target.token, "Review token")}`
    default:
      throw new Error(
        `Unsupported public flow target: ${target satisfies never}`
      )
  }
}

export const buildPublicFlowUrl = (
  target: PublicFlowRouteTarget,
  market: PublicFlowMarket,
  canonicalOrigin: string
): URL => {
  const origin = new URL(canonicalOrigin)

  if (
    (origin.protocol !== "https:" && origin.protocol !== "http:") ||
    origin.username ||
    origin.password
  ) {
    throw new Error(
      "Canonical origin must use HTTP or HTTPS without credentials"
    )
  }

  return new URL(buildPublicFlowPath(target, market), origin.origin)
}
