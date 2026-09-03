import { describe, expect, expectTypeOf, it } from "vitest"
import {
  ACCOUNT_CHILD_KEYS,
  CHECKOUT_CHILD_KEYS,
  FLOW_ROOT_KEYS,
  LEGAL_STATIC_ROOT_PAGE_KEYS,
  MARKETS,
  parseAccountChildSegment,
  parseCheckoutChildSegment,
  parseFlowRootSegment,
  parseMarket,
  parseReviewChildSegment,
  parseRootSegment,
  parseStaticRootPageSegment,
  parseTypePrefixSegment,
  REVIEW_CHILD_KEYS,
  ROUTE_SEGMENT_REGISTRY,
  SEGMENT_REGISTRY_G1,
  STATIC_ROOT_PAGE_KEYS,
  TYPE_PREFIX_KEYS,
} from "./segments"
import type {
  AccountChildKey,
  CheckoutChildKey,
  ReviewChildKey,
  RootSegmentMatch,
  StaticRootPageKey,
} from "./types"

const ASCII_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const EXPECTED_SEGMENTS = {
  sk: {
    typePrefixes: {
      products: "produkty",
      categories: "kategorie",
      brands: "znacky",
      collections: "kolekcie",
      campaigns: "akcie",
      advice: "blog",
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
      dropshipping: "dropshipping",
      privateLabel: "private-label",
      wholesale: "velkoobchod",
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
        deactivation: "zrusenie-uctu",
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
      advice: "blog",
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
      dropshipping: "dropshipping",
      privateLabel: "private-label",
      wholesale: "velkoobchod",
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
        deactivation: "zruseni-uctu",
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
      advice: "blog",
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
        deactivation: "fiok-torlese",
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
      advice: "blog",
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
      affiliate: "program-afiliere",
      contact: "contact",
      dropshipping: "dropshipping",
      faq: "intrebari-frecvente",
      giftVoucher: "voucher-cadou",
      privateLabel: "marca-proprie",
      shipping: "livrare",
      returns: "retururi",
      terms: "termeni-si-conditii",
      privacy: "politica-de-confidentialitate",
      cookies: "politica-cookies",
      wholesale: "vanzare-en-gros",
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
        deactivation: "dezactivare-cont",
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
} as const

describe("localized route segment registry", () => {
  it("contains the exact four-market Part 02 registry", () => {
    expect(MARKETS).toEqual(["sk", "cz", "hu", "ro"])
    expect(ROUTE_SEGMENT_REGISTRY).toEqual(EXPECTED_SEGMENTS)
  })

  it("keeps the incomplete G1 approval state explicit", () => {
    expect(SEGMENT_REGISTRY_G1).toEqual({
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
    })
    expect(LEGAL_STATIC_ROOT_PAGE_KEYS).toEqual(["terms", "privacy", "cookies"])
  })

  it("keeps every sibling namespace collision-free and ASCII-only", () => {
    for (const market of MARKETS) {
      const groups = ROUTE_SEGMENT_REGISTRY[market]
      const staticRootPages: Readonly<
        Partial<Record<StaticRootPageKey, string>>
      > = groups.staticRootPages
      const rootSegments = [
        ...TYPE_PREFIX_KEYS.map((key) => groups.typePrefixes[key]),
        ...FLOW_ROOT_KEYS.map((key) => groups.flowRoots[key]),
        ...STATIC_ROOT_PAGE_KEYS.flatMap((key) => {
          const segment = staticRootPages[key]
          return segment ? [segment] : []
        }),
      ]

      expect(new Set(rootSegments).size).toBe(rootSegments.length)
      expect(new Set(Object.values(groups.children.checkout)).size).toBe(
        CHECKOUT_CHILD_KEYS.length
      )
      expect(new Set(Object.values(groups.children.account)).size).toBe(
        ACCOUNT_CHILD_KEYS.length
      )
      expect(new Set(Object.values(groups.children.reviews)).size).toBe(
        REVIEW_CHILD_KEYS.length
      )

      for (const segment of [
        ...rootSegments,
        ...Object.values(groups.children.checkout),
        ...Object.values(groups.children.account),
        ...Object.values(groups.children.reviews),
      ]) {
        expect(segment).toMatch(ASCII_SLUG_PATTERN)
      }
    }
  })
})

describe("exact sibling segment parsing", () => {
  it("parses markets and root sibling groups without normalization", () => {
    expect(parseMarket("sk")).toBe("sk")
    expect(parseMarket("SK")).toBeNull()

    expect(parseTypePrefixSegment("hu", "termekek")).toBe("products")
    expect(parseFlowRootSegment("hu", "penztar")).toBe("checkout")
    expect(parseStaticRootPageSegment("hu", "rolunk")).toBe("about")
    expect(parseTypePrefixSegment("sk", "termekek")).toBeNull()
    expect(parseFlowRootSegment("hu", "Penztar")).toBeNull()
    expect(parseStaticRootPageSegment("hu", "rolunk/")).toBeNull()
  })

  it("classifies exact root siblings with a discriminated result", () => {
    expect(parseRootSegment("ro", "produse")).toEqual({
      group: "type-prefix",
      key: "products",
    })
    expect(parseRootSegment("ro", "finalizare-comanda")).toEqual({
      group: "flow-root",
      key: "checkout",
    })
    expect(parseRootSegment("ro", "despre-noi")).toEqual({
      group: "static-root-page",
      key: "about",
    })
    expect(parseRootSegment("ro", " produse")).toBeNull()
    expectTypeOf(
      parseRootSegment("ro", "produse")
    ).toEqualTypeOf<RootSegmentMatch | null>()
  })

  it("keeps RO-only demo roots unavailable in the SK namespace", () => {
    expect(parseStaticRootPageSegment("ro", "program-afiliere")).toBe(
      "affiliate"
    )
    expect(parseStaticRootPageSegment("sk", "program-afiliere")).toBeNull()
  })

  it("parses children only among siblings of their declared parent", () => {
    expect(parseCheckoutChildSegment("sk", "kontakt")).toBe("contact")
    expect(parseCheckoutChildSegment("sk", "vysledok")).toBe("checkoutResult")
    expect(parseAccountChildSegment("sk", "objednavky")).toBe("orders")
    expect(parseReviewChildSegment("sk", "produkt")).toBe("product")

    expect(parseAccountChildSegment("sk", "kontakt")).toBeNull()
    expect(parseCheckoutChildSegment("sk", "objednavky")).toBeNull()
    expect(parseReviewChildSegment("hu", "produkt")).toBeNull()
    expect(parseReviewChildSegment("hu", "termek")).toBe("product")

    expectTypeOf(
      parseCheckoutChildSegment("sk", "kontakt")
    ).toEqualTypeOf<CheckoutChildKey | null>()
    expectTypeOf(
      parseAccountChildSegment("sk", "objednavky")
    ).toEqualTypeOf<AccountChildKey | null>()
    expectTypeOf(
      parseReviewChildSegment("sk", "produkt")
    ).toEqualTypeOf<ReviewChildKey | null>()
  })
})
