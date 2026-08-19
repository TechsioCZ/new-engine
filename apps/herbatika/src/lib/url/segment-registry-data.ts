import { PUBLIC_FLOW_ROUTE_SEGMENTS } from "@techsio/storefront-i18n/core/public-flow-routes"
import type { RouteSegmentRegistry, SegmentRegistryG1 } from "./types"

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
    flowRoots: PUBLIC_FLOW_ROUTE_SEGMENTS.sk.flowRoots,
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
    children: PUBLIC_FLOW_ROUTE_SEGMENTS.sk.children,
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
    flowRoots: PUBLIC_FLOW_ROUTE_SEGMENTS.cz.flowRoots,
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
    children: PUBLIC_FLOW_ROUTE_SEGMENTS.cz.children,
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
    flowRoots: PUBLIC_FLOW_ROUTE_SEGMENTS.hu.flowRoots,
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
    children: PUBLIC_FLOW_ROUTE_SEGMENTS.hu.children,
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
    flowRoots: PUBLIC_FLOW_ROUTE_SEGMENTS.ro.flowRoots,
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
    children: PUBLIC_FLOW_ROUTE_SEGMENTS.ro.children,
  },
} as const satisfies RouteSegmentRegistry
