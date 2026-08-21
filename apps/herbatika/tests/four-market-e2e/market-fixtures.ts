export const MARKET_CODES = ["sk", "cz", "hu", "ro"] as const

export type MarketCode = (typeof MARKET_CODES)[number]

export type MarketFixture = Readonly<{
  accountPath: string
  addToCartLabel: string
  cartPath: string
  checkoutContactPath: string
  checkoutAddress: Readonly<{
    city: string
    phone: string
    postalCode: string
  }>
  checkoutReviewPath: string
  checkoutShippingPath: string
  completeOrderLabel: string
  currencyPattern: RegExp
  defaultOrigin: string
  invalidCredentialsLabel: string
  locale: string
  loginPath: string
  market: MarketCode
  productRoot: string
  searchInputLabel: string
  searchPath: string
  signInLabel: string
}>

export const MARKET_FIXTURES = {
  sk: {
    accountPath: "/ucet",
    addToCartLabel: "Do košíka",
    cartPath: "/kosik",
    checkoutAddress: {
      city: "Bratislava",
      phone: "+421900123456",
      postalCode: "81101",
    },
    checkoutContactPath: "/pokladna/kontakt",
    checkoutReviewPath: "/pokladna/kontrola",
    checkoutShippingPath: "/pokladna/doprava",
    completeOrderLabel: "Dokončiť objednávku",
    currencyPattern: /€/u,
    defaultOrigin: "https://test-engine-herbatika-zane.web-revolution.cz",
    invalidCredentialsLabel: "Nesprávny e-mail alebo heslo.",
    locale: "sk-SK",
    loginPath: "/ucet/prihlasenie",
    market: "sk",
    productRoot: "/produkty",
    searchInputLabel: "Vyhľadávanie",
    searchPath: "/vyhladavanie",
    signInLabel: "Prihlásiť sa",
  },
  cz: {
    accountPath: "/ucet",
    addToCartLabel: "Do košíku",
    cartPath: "/kosik",
    checkoutAddress: {
      city: "Praha",
      phone: "+420601123456",
      postalCode: "11000",
    },
    checkoutContactPath: "/pokladna/kontakt",
    checkoutReviewPath: "/pokladna/kontrola",
    checkoutShippingPath: "/pokladna/doprava",
    completeOrderLabel: "Dokončit objednávku",
    currencyPattern: /Kč/u,
    defaultOrigin: "https://test-engine-herbatika-cz-zane.web-revolution.cz",
    invalidCredentialsLabel: "Nesprávný e-mail nebo heslo.",
    locale: "cs-CZ",
    loginPath: "/ucet/prihlaseni",
    market: "cz",
    productRoot: "/produkty",
    searchInputLabel: "Vyhledávání",
    searchPath: "/vyhledavani",
    signInLabel: "Přihlásit se",
  },
  hu: {
    accountPath: "/fiok",
    addToCartLabel: "Kosárba",
    cartPath: "/kosar",
    checkoutAddress: {
      city: "Budapest",
      phone: "+3612345678",
      postalCode: "1051",
    },
    checkoutContactPath: "/penztar/kapcsolat",
    checkoutReviewPath: "/penztar/ellenorzes",
    checkoutShippingPath: "/penztar/szallitas",
    completeOrderLabel: "Rendelés befejezése",
    currencyPattern: /Ft/u,
    defaultOrigin: "https://test-engine-herbatika-hu-zane.web-revolution.cz",
    invalidCredentialsLabel: "Helytelen e-mail-cím vagy jelszó.",
    locale: "hu-HU",
    loginPath: "/fiok/bejelentkezes",
    market: "hu",
    productRoot: "/termekek",
    searchInputLabel: "Keresés",
    searchPath: "/kereses",
    signInLabel: "Bejelentkezés",
  },
  ro: {
    accountPath: "/cont",
    addToCartLabel: "Adaugă în coș",
    cartPath: "/cos",
    checkoutAddress: {
      city: "București",
      phone: "+40721123456",
      postalCode: "010101",
    },
    checkoutContactPath: "/finalizare-comanda/contact",
    checkoutReviewPath: "/finalizare-comanda/verificare",
    checkoutShippingPath: "/finalizare-comanda/livrare",
    completeOrderLabel: "Finalizează comanda",
    currencyPattern: /(?:lei|RON)/iu,
    defaultOrigin: "https://test-engine-herbatika-ro-zane.web-revolution.cz",
    invalidCredentialsLabel: "Adresa de e-mail sau parola este incorectă.",
    locale: "ro-RO",
    loginPath: "/cont/autentificare",
    market: "ro",
    productRoot: "/produse",
    searchInputLabel: "Căutare",
    searchPath: "/cautare",
    signInLabel: "Autentificare",
  },
} as const satisfies Record<MarketCode, MarketFixture>

const ORIGIN_ENV_KEYS = {
  cz: "HERBATIKA_E2E_ORIGIN_CZ",
  hu: "HERBATIKA_E2E_ORIGIN_HU",
  ro: "HERBATIKA_E2E_ORIGIN_RO",
  sk: "HERBATIKA_E2E_ORIGIN_SK",
} as const

export const resolveMarketOrigin = (market: MarketCode) => {
  const configured = process.env[ORIGIN_ENV_KEYS[market]]?.trim()
  const url = new URL(configured || MARKET_FIXTURES[market].defaultOrigin)

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${ORIGIN_ENV_KEYS[market]} must be an HTTP(S) origin`)
  }

  return url.origin
}

export const fixtureForProject = (projectName: string) => {
  if (!MARKET_CODES.some((market) => market === projectName)) {
    throw new Error(`Unknown four-market Playwright project: ${projectName}`)
  }

  return MARKET_FIXTURES[projectName as MarketCode]
}
