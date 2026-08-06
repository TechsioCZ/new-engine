import type { Market, UrlKind } from "./types"

export const SEGMENT_KEYS = [
  "products",
  "categories",
  "brands",
  "collections",
  "campaigns",
  "advice",
  "information",
  "search",
  "cart",
  "checkout",
  "account",
  "reviews",
  "checkout.contact",
  "checkout.shipping",
  "checkout.payment",
  "checkout.review",
  "checkout.paymentReturn",
  "checkout.confirmation",
  "account.orders",
  "account.lists",
  "account.settings",
  "account.login",
  "account.register",
  "account.forgotPassword",
  "account.resetPassword",
  "reviews.product",
  "about",
  "contact",
  "faq",
  "shipping",
  "returns",
  "terms",
  "privacy",
  "cookies",
] as const

export type SegmentKey = (typeof SEGMENT_KEYS)[number]
export type FlowKind = "search" | "cart" | "checkout" | "account" | "reviews"
export type RouteKind = UrlKind | FlowKind

export const SEGMENTS = {
  products: { sk: "produkty", cz: "produkty", hu: "termekek", ro: "produse" },
  categories: {
    sk: "kategorie",
    cz: "kategorie",
    hu: "kategoriak",
    ro: "categorii",
  },
  brands: { sk: "znacky", cz: "znacky", hu: "markak", ro: "marci" },
  collections: {
    sk: "kolekcie",
    cz: "kolekce",
    hu: "gyujtemenyek",
    ro: "colectii",
  },
  campaigns: { sk: "akcie", cz: "akce", hu: "akciok", ro: "promotii" },
  advice: { sk: "poradna", cz: "poradna", hu: "tanacsok", ro: "sfaturi" },
  information: {
    sk: "informacie",
    cz: "informace",
    hu: "informaciok",
    ro: "informatii",
  },
  search: {
    sk: "vyhladavanie",
    cz: "vyhledavani",
    hu: "kereses",
    ro: "cautare",
  },
  cart: { sk: "kosik", cz: "kosik", hu: "kosar", ro: "cos" },
  checkout: {
    sk: "pokladna",
    cz: "pokladna",
    hu: "penztar",
    ro: "finalizare-comanda",
  },
  account: { sk: "ucet", cz: "ucet", hu: "fiok", ro: "cont" },
  reviews: { sk: "recenzie", cz: "recenze", hu: "velemenyek", ro: "recenzii" },
  "checkout.contact": {
    sk: "kontakt",
    cz: "kontakt",
    hu: "kapcsolat",
    ro: "contact",
  },
  "checkout.shipping": {
    sk: "doprava",
    cz: "doprava",
    hu: "szallitas",
    ro: "livrare",
  },
  "checkout.payment": {
    sk: "platba",
    cz: "platba",
    hu: "fizetes",
    ro: "plata",
  },
  "checkout.review": {
    sk: "kontrola",
    cz: "kontrola",
    hu: "ellenorzes",
    ro: "verificare",
  },
  "checkout.paymentReturn": {
    sk: "navrat-z-platby",
    cz: "navrat-z-platby",
    hu: "fizetesi-visszateres",
    ro: "retur-plata",
  },
  "checkout.confirmation": {
    sk: "potvrdenie-objednavky",
    cz: "potvrzeni-objednavky",
    hu: "rendeles-visszaigazolas",
    ro: "confirmare-comanda",
  },
  "account.orders": {
    sk: "objednavky",
    cz: "objednavky",
    hu: "rendelesek",
    ro: "comenzi",
  },
  "account.lists": { sk: "zoznamy", cz: "seznamy", hu: "listak", ro: "liste" },
  "account.settings": {
    sk: "nastavenia",
    cz: "nastaveni",
    hu: "beallitasok",
    ro: "setari",
  },
  "account.login": {
    sk: "prihlasenie",
    cz: "prihlaseni",
    hu: "bejelentkezes",
    ro: "autentificare",
  },
  "account.register": {
    sk: "registracia",
    cz: "registrace",
    hu: "regisztracio",
    ro: "inregistrare",
  },
  "account.forgotPassword": {
    sk: "zabudnute-heslo",
    cz: "zapomenute-heslo",
    hu: "elfelejtett-jelszo",
    ro: "parola-uitata",
  },
  "account.resetPassword": {
    sk: "obnova-hesla",
    cz: "obnova-hesla",
    hu: "jelszo-visszaallitas",
    ro: "resetare-parola",
  },
  "reviews.product": {
    sk: "produkt",
    cz: "produkt",
    hu: "termek",
    ro: "produs",
  },
  about: { sk: "o-nas", cz: "o-nas", hu: "rolunk", ro: "despre-noi" },
  contact: { sk: "kontakt", cz: "kontakt", hu: "kapcsolat", ro: "contact" },
  faq: {
    sk: "casto-kladene-otazky",
    cz: "caste-dotazy",
    hu: "gyakori-kerdesek",
    ro: "intrebari-frecvente",
  },
  shipping: { sk: "doprava", cz: "doprava", hu: "szallitas", ro: "livrare" },
  returns: {
    sk: "vratenie-tovaru",
    cz: "vraceni-zbozi",
    hu: "visszakuldes",
    ro: "retururi",
  },
  terms: {
    sk: "obchodne-podmienky",
    cz: "obchodni-podminky",
    hu: "altalanos-szerzodesi-feltetelek",
    ro: "termeni-si-conditii",
  },
  privacy: {
    sk: "ochrana-osobnych-udajov",
    cz: "ochrana-osobnich-udaju",
    hu: "adatvedelmi-tajekoztato",
    ro: "politica-de-confidentialitate",
  },
  cookies: {
    sk: "cookies",
    cz: "cookies",
    hu: "cookie-tajekoztato",
    ro: "politica-cookies",
  },
} as const satisfies Record<SegmentKey, Record<Market, string>>

/** Native UI text is intentionally separate from the ASCII routing values. */
export const SEGMENT_LABELS = {
  products: { sk: "Produkty", cz: "Produkty", hu: "Termékek", ro: "Produse" },
  categories: {
    sk: "Kategórie",
    cz: "Kategorie",
    hu: "Kategóriák",
    ro: "Categorii",
  },
  brands: { sk: "Značky", cz: "Značky", hu: "Márkák", ro: "Mărci" },
  collections: {
    sk: "Kolekcie",
    cz: "Kolekce",
    hu: "Gyűjtemények",
    ro: "Colecții",
  },
  campaigns: { sk: "Akcie", cz: "Akce", hu: "Akciók", ro: "Promoții" },
  advice: { sk: "Poradňa", cz: "Poradna", hu: "Tanácsok", ro: "Sfaturi" },
  information: {
    sk: "Informácie",
    cz: "Informace",
    hu: "Információk",
    ro: "Informații",
  },
  search: {
    sk: "Vyhľadávanie",
    cz: "Vyhledávání",
    hu: "Keresés",
    ro: "Căutare",
  },
  cart: { sk: "Košík", cz: "Košík", hu: "Kosár", ro: "Coș" },
  checkout: {
    sk: "Pokladňa",
    cz: "Pokladna",
    hu: "Pénztár",
    ro: "Finalizare comandă",
  },
  account: { sk: "Účet", cz: "Účet", hu: "Fiók", ro: "Cont" },
  reviews: { sk: "Recenzie", cz: "Recenze", hu: "Vélemények", ro: "Recenzii" },
  "checkout.contact": {
    sk: "Kontakt",
    cz: "Kontakt",
    hu: "Kapcsolat",
    ro: "Contact",
  },
  "checkout.shipping": {
    sk: "Doprava",
    cz: "Doprava",
    hu: "Szállítás",
    ro: "Livrare",
  },
  "checkout.payment": {
    sk: "Platba",
    cz: "Platba",
    hu: "Fizetés",
    ro: "Plată",
  },
  "checkout.review": {
    sk: "Kontrola",
    cz: "Kontrola",
    hu: "Ellenőrzés",
    ro: "Verificare",
  },
  "checkout.paymentReturn": {
    sk: "Návrat z platby",
    cz: "Návrat z platby",
    hu: "Fizetési visszatérés",
    ro: "Retur plată",
  },
  "checkout.confirmation": {
    sk: "Potvrdenie objednávky",
    cz: "Potvrzení objednávky",
    hu: "Rendelés-visszaigazolás",
    ro: "Confirmare comandă",
  },
  "account.orders": {
    sk: "Objednávky",
    cz: "Objednávky",
    hu: "Rendelések",
    ro: "Comenzi",
  },
  "account.lists": { sk: "Zoznamy", cz: "Seznamy", hu: "Listák", ro: "Liste" },
  "account.settings": {
    sk: "Nastavenia",
    cz: "Nastavení",
    hu: "Beállítások",
    ro: "Setări",
  },
  "account.login": {
    sk: "Prihlásenie",
    cz: "Přihlášení",
    hu: "Bejelentkezés",
    ro: "Autentificare",
  },
  "account.register": {
    sk: "Registrácia",
    cz: "Registrace",
    hu: "Regisztráció",
    ro: "Înregistrare",
  },
  "account.forgotPassword": {
    sk: "Zabudnuté heslo",
    cz: "Zapomenuté heslo",
    hu: "Elfelejtett jelszó",
    ro: "Parolă uitată",
  },
  "account.resetPassword": {
    sk: "Obnova hesla",
    cz: "Obnova hesla",
    hu: "Jelszó-visszaállítás",
    ro: "Resetare parolă",
  },
  "reviews.product": {
    sk: "Produkt",
    cz: "Produkt",
    hu: "Termék",
    ro: "Produs",
  },
  about: { sk: "O nás", cz: "O nás", hu: "Rólunk", ro: "Despre noi" },
  contact: { sk: "Kontakt", cz: "Kontakt", hu: "Kapcsolat", ro: "Contact" },
  faq: {
    sk: "Často kladené otázky",
    cz: "Časté dotazy",
    hu: "Gyakori kérdések",
    ro: "Întrebări frecvente",
  },
  shipping: { sk: "Doprava", cz: "Doprava", hu: "Szállítás", ro: "Livrare" },
  returns: {
    sk: "Vrátenie tovaru",
    cz: "Vrácení zboží",
    hu: "Visszaküldés",
    ro: "Retururi",
  },
  terms: {
    sk: "Obchodné podmienky",
    cz: "Obchodní podmínky",
    hu: "Általános szerződési feltételek",
    ro: "Termeni și condiții",
  },
  privacy: {
    sk: "Ochrana osobných údajov",
    cz: "Ochrana osobních údajů",
    hu: "Adatvédelmi tájékoztató",
    ro: "Politică de confidențialitate",
  },
  cookies: {
    sk: "Cookies",
    cz: "Cookies",
    hu: "Cookie-tájékoztató",
    ro: "Politica cookies",
  },
} as const satisfies Record<SegmentKey, Record<Market, string>>

export const ROUTABLE_SEGMENT_KEYS = {
  product: "products",
  category: "categories",
  brand: "brands",
  collection: "collections",
  campaign: "campaigns",
  article: "advice",
  page: "information",
  search: "search",
  cart: "cart",
  checkout: "checkout",
  account: "account",
  reviews: "reviews",
} as const satisfies Record<RouteKind, SegmentKey>

const MARKETS = ["sk", "cz", "hu", "ro"] as const satisfies readonly Market[]
const ROUTE_KINDS = Object.keys(ROUTABLE_SEGMENT_KEYS) as RouteKind[]

export const SEGMENT_TO_KIND = Object.fromEntries(
  MARKETS.map((market) => [
    market,
    Object.fromEntries(
      ROUTE_KINDS.map((kind) => [
        SEGMENTS[ROUTABLE_SEGMENT_KEYS[kind]][market],
        kind,
      ])
    ),
  ])
) as Record<Market, Readonly<Record<string, RouteKind>>>

export const URL_KIND_BY_SEGMENT = SEGMENT_TO_KIND

export function getSegment(market: Market, key: SegmentKey): string {
  return SEGMENTS[key][market]
}

export function getSegmentLabel(market: Market, key: SegmentKey): string {
  return SEGMENT_LABELS[key][market]
}

export function resolveKindFromSegment(
  market: Market,
  segment: string
): RouteKind | undefined {
  return SEGMENT_TO_KIND[market][segment.toLowerCase()]
}
