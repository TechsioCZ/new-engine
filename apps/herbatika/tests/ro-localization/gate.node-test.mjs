import assert from "node:assert/strict"
import { test } from "node:test"
import {
  hashRoCatalogImportPlanValue,
  hashRoCatalogScopePlan,
  hashRoDemoContentOmissionLedger,
  hashRoVariantAvailabilityExpectations,
  parseRoCatalogScopePlanArtifact,
} from "../../../medusa-be/src/scripts/ro-catalog-readiness-contract.ts"
import {
  assertGlobalReadiness,
  assertNoServerErrors,
  assertPageEvidence,
  assertSeoEvidence,
  normalizeBaseUrl,
  normalizeText,
} from "./gate-core.mjs"
import {
  assertLiveReportIntegrity,
  captureSkPublicationBaseline,
  generateLiveReadiness,
  signBackendReadinessProof,
} from "./live-readiness.mjs"

const CREDENTIALS_ERROR_PATTERN = /credentials/
const CURRENCY_ERROR_PATTERN = /missing structured RON or visible amount/
const DEMO_WARNING_ERROR_PATTERN = /demo omission warnings do not match ledger/
const HREFLANG_ERROR_PATTERN = /missing sk hreflang/
const LIVE_HASH_ERROR_PATTERN = /evidence hash mismatch/
const MIXED_PAGE_ERROR_PATTERN = /Mixed or missing page deployment identity/
const MIXED_SHARD_ERROR_PATTERN = /Mixed sitemap deployment identity/
const HTTP_ERROR_PATTERN = /http/
const INVALID_BACKEND_PROOF_PATTERN =
  /invalid Medusa catalog readiness proof|readiness report contract is invalid/
const UNTRUSTED_BACKEND_ENVELOPE_PATTERN =
  /stale, invalid, or wrong-environment backend proof/
const LOCALIZED_PATH_ERROR_PATTERN = /final localized path mismatch/
const NOT_READY_ERROR_PATTERN = /report is not explicitly ready/
const NESTED_PLAN_ERROR_PATTERN = /Expected nested importer plan artifact/
const PLAN_HASH_ERROR_PATTERN = /planHash does not match canonical plan/
const RO_CONTENT_ERROR_PATTERN =
  /missing navigation label|leaked label|expected currency token|leaked currency/
const SITEMAP_COVERAGE_ERROR_PATTERN = /every sitemap product URL/
const SLUG_REUSE_ERROR_PATTERN = /categories still reuse SK slugs/
const SK_BASELINE_ERROR_PATTERN = /SK baseline changed/
const SK_PUBLICATION_ERROR_PATTERN = /SK publication contains errors/
const SHARED_INVENTORY_ERROR_PATTERN = /shared inventory baseline changed/
const SLOT_ERROR_PATTERN = /same deployment slot|slot must be BLUE/
const UNCLASSIFIED_URL_ERROR_PATTERN =
  /Unclassified catalog sitemap URL rejected/
const WRONG_ORIGIN_URL_ERROR_PATTERN = /Cross-origin sitemap URL rejected/
const SERVER_ERROR_PATTERN = /503 https:\/\/ro\.example\.test\/api/
const SUMMARY_ERRORS_PATTERN = /summary contains errors/
const SUMMARY_ISSUES_PATTERN = /summary contains issues/
const SCOPE_PLAN_ERROR_PATTERN = /does not match importer scope plan/
const INVALID_READINESS_CASES = [
  ["ready", false, NOT_READY_ERROR_PATTERN],
  ["summary.errors", 1, SUMMARY_ERRORS_PATTERN],
  ["summary.issues", 1, SUMMARY_ISSUES_PATTERN],
  ["skBaseline.unchanged", false, SK_BASELINE_ERROR_PATTERN],
  ["skPublication.errors", 1, SK_PUBLICATION_ERROR_PATTERN],
  ["sharedInventoryBaseline.matched", false, SHARED_INVENTORY_ERROR_PATTERN],
]

const readyReport = () => ({
  schemaVersion: 1,
  market: "ro",
  ready: true,
  summary: { errors: 0, issues: 0 },
  skBaseline: { unchanged: true },
  skPublication: { errors: 0 },
  sharedInventoryBaseline: { matched: true },
  backendProof: {
    authorityHash: "d".repeat(64),
    dataHash: "a".repeat(64),
  },
  builds: {
    sk: { hash: "build-blue-1", slot: "blue" },
    ro: { hash: "build-blue-1", slot: "blue" },
  },
  sitemap: {
    productUrls: 2151,
    checkedProductUrls: 2151,
    failedUrls: [],
  },
  localization: {
    products: {
      total: 2151,
      localized: 2151,
      identicalSlugsToSk: 0,
      identityComplete: 2151,
      missingSlugs: 0,
      ronComplete: 2151,
    },
    categories: {
      total: 200,
      localized: 200,
      identicalSlugsToSk: 0,
      identityComplete: 200,
      missingSlugs: 0,
      ronComplete: 200,
    },
    brands: {
      total: 100,
      localized: 100,
      identicalSlugsToSk: 0,
      identityComplete: 100,
      missingSlugs: 0,
      ronComplete: 100,
    },
    collections: {
      total: 50,
      localized: 50,
      identicalSlugsToSk: 0,
      identityComplete: 50,
      missingSlugs: 0,
      ronComplete: 50,
    },
  },
})

const baseUrls = {
  ro: "https://ro.example.test",
  sk: "https://sk.example.test",
}
const backendSkBaseline = { count: 4, sha256: "b".repeat(64) }
const PROOF_HMAC_KEY = "test-readiness-proof-key-with-32-bytes-minimum"
const GATE_NOW = () => new Date("2026-08-20T18:00:00.000Z")
const CUTOVER_CHAIN_PROOF = {
  catalogPlanHash: "1".repeat(64),
  commerceManifestSha256: "d".repeat(64),
  commercePlanSha256: "2".repeat(64),
  databaseInstanceFingerprint: "e".repeat(64),
  maintenanceProofSha256: "3".repeat(64),
  matched: true,
  meilisearchConvergenceSha256: "4".repeat(64),
  postCommerceEnvelopeSha256: "5".repeat(64),
  receiptSha256: "6".repeat(64),
  releaseId: "ro-demo-test-release",
  schemaVersion: 1,
  scopeSha256: "7".repeat(64),
  staticTaxonomyConvergenceSha256: "c".repeat(64),
  urlRegistryConvergenceSha256: "8".repeat(64),
}
const RELEASE_IDENTITY = {
  backendBuildHash: "backend-build-1",
  backendDeploymentId: "backend-deploy-1",
  backendReleaseSha: "a".repeat(40),
  backendSlot: "blue",
  databaseFingerprint: "9".repeat(64),
  databaseInstanceFingerprint: "e".repeat(64),
  environmentId: "zane-production",
  locale: "ro-RO",
  marketCode: "ro",
  roOrigin: baseUrls.ro,
  salesChannelId: "sc_ro",
  skOrigin: baseUrls.sk,
  storefrontBuildHash: "build-blue-1",
  storefrontDeploymentId: "storefront-deploy-1",
  storefrontReleaseSha: "b".repeat(40),
  storefrontSlot: "blue",
}
const defaultScope = {
  brandExcludedIds: [],
  brandIds: ["brand_1"],
  categoryExcludedIds: [],
  categoryPublishedIds: ["category_1"],
  collectionIds: ["collection_1"],
  productExcludedIds: [],
  productPublishedIds: ["product_1"],
}
const scopePlanArtifact = (scope = defaultScope) => {
  const plan = {
    brandItems: [],
    categoryItems: [],
    excludedBrandItems: [],
    excludedCategoryItems: [],
    excludedItems: [],
    expectedSkBaseline: backendSkBaseline,
    items: [
      {
        entry: {
          variants: [
            {
              key: { kind: "sku", value: "sku_1" },
              roAvailability: "sellable",
              ronPrice: { amount: 1290 },
            },
          ],
        },
        productId: "product_1",
      },
    ],
    omissionLedger: null,
    omissionLedgerSha256: null,
    scope,
    scopeSha256: hashRoCatalogScopePlan(scope),
    summary: {},
  }
  return {
    plan,
    planHash: hashRoCatalogImportPlanValue(plan),
    schemaVersion: 1,
  }
}
const DEFAULT_SCOPE_ARTIFACT = scopePlanArtifact()
const DEFAULT_SCOPE_HASH = DEFAULT_SCOPE_ARTIFACT.plan.scopeSha256
const DEFAULT_IMPORT_PLAN_HASH = DEFAULT_SCOPE_ARTIFACT.planHash
CUTOVER_CHAIN_PROOF.catalogPlanHash = DEFAULT_IMPORT_PLAN_HASH
CUTOVER_CHAIN_PROOF.scopeSha256 = DEFAULT_SCOPE_HASH
const DEFAULT_VARIANT_EXPECTATIONS = [
  {
    keyKind: "sku",
    keyValue: "sku_1",
    productId: "product_1",
    roAvailability: "sellable",
    ronAmount: 1290,
  },
]
const bindScopePlan = (report, scope) => {
  const artifact = scopePlanArtifact(scope)
  report.cutoverChainProof = {
    ...report.cutoverChainProof,
    catalogPlanHash: artifact.planHash,
    scopeSha256: artifact.plan.scopeSha256,
  }
  report.scopePlanProof = {
    expectedDataHash: artifact.plan.scopeSha256,
    importPlanHash: artifact.planHash,
    matched: true,
    observedDataHash: artifact.plan.scopeSha256,
    schemaVersion: 1,
  }
  return artifact
}
const backendReadinessReport = () => ({
  cutoverChainProof: structuredClone(CUTOVER_CHAIN_PROOF),
  generatedAt: "2026-08-20T17:58:00.000Z",
  issues: [],
  market: "ro",
  ready: true,
  readinessMode: "production",
  roBrandScope: {
    excluded: 0,
    excludedIds: [],
    global: 1,
    published: 1,
    publishedIds: ["brand_1"],
  },
  roCatalogPublication: {
    brandIds: ["brand_1"],
    categoryIds: ["category_1"],
    collectionIds: ["collection_1"],
  },
  roCategoryScope: {
    active: 1,
    authoritySha256: "d".repeat(64),
    draft: 0,
    excluded: [],
    invalid: 0,
    published: 1,
    translated: 1,
    unassigned: 0,
  },
  roCompletenessProof: {
    algorithm: "sha256-canonical-json-v1",
    dataHash: "c".repeat(64),
    demoOmissionLedgerHash: null,
    locale: "ro-RO",
    provenance: "fresh-medusa-database-read",
    schemaVersion: 1,
  },
  roProductScope: {
    draft: 0,
    excluded: [],
    globalPublished: 1,
    invalid: 0,
    published: 1,
    publishedIds: ["product_1"],
    unassigned: 0,
  },
  roVariantScope: {
    dataHash: hashRoVariantAvailabilityExpectations(
      DEFAULT_VARIANT_EXPECTATIONS
    ),
    sellable: 1,
    unavailable: 0,
  },
  scopePlanProof: {
    expectedDataHash: DEFAULT_SCOPE_HASH,
    importPlanHash: DEFAULT_IMPORT_PLAN_HASH,
    matched: true,
    observedDataHash: DEFAULT_SCOPE_HASH,
    schemaVersion: 1,
  },
  sharedInventoryBaseline: {
    expected: { count: 1, sha256: "e".repeat(64) },
    matched: true,
    observed: { count: 1, sha256: "e".repeat(64) },
  },
  skBaseline: {
    expected: backendSkBaseline,
    matched: true,
    observed: backendSkBaseline,
  },
  skPublication: {
    brands: 1,
    categories: 1,
    collections: 1,
    errors: 0,
    products: 1,
  },
  scope: "ro-published-products-and-catalog-assignments",
  summary: {
    brands: 1,
    brandUrlAssignments: 1,
    demoContentOmissionFields: 0,
    demoOmissionLedgerEntries: 0,
    demoProductsWithContentOmissions: 0,
    errors: 0,
    warnings: 0,
    products: 1,
    productUrlAssignments: 1,
    variants: 1,
    variantsWithRonPrice: 1,
    categories: 1,
    categoryUrlAssignments: 1,
    categoryLocalizedContentContracts: 1,
    collections: 1,
    collectionUrlAssignments: 1,
  },
})

const backendReadinessProof = (
  report = backendReadinessReport(),
  environment = {},
  issuedAt = "2026-08-20T17:59:00.000Z"
) =>
  signBackendReadinessProof({
    environment: {
      databaseFingerprint: RELEASE_IDENTITY.databaseFingerprint,
      databaseInstanceFingerprint: RELEASE_IDENTITY.databaseInstanceFingerprint,
      cutoverChainProof: report.cutoverChainProof,
      deploymentHash: "build-blue-1",
      deploymentSlot: "blue",
      importPlanHash: report.scopePlanProof?.importPlanHash,
      roOrigin: baseUrls.ro,
      releaseIdentity: RELEASE_IDENTITY,
      scopePlanHash: report.scopePlanProof?.expectedDataHash,
      skOrigin: baseUrls.sk,
      ...environment,
    },
    issuedAt,
    report,
    secret: PROOF_HMAC_KEY,
  })

const xml = (value, { hash = "build-blue-1", slot = "blue" } = {}) =>
  new Response(value, {
    headers: {
      "content-type": "application/xml",
      "x-zane-dpl-hash": hash,
      "x-zane-dpl-slot": slot,
    },
    status: 200,
  })

const html = ({
  canonical,
  currencyCodes,
  description,
  hash = "build-blue-1",
  identity,
  identityKey = "sku",
  lang,
  slot = "blue",
  title,
  visibleLongDescription,
}) =>
  new Response(
    `<!doctype html><html lang="${lang}"><head><title>${title}</title><meta name="description" content="${description ?? `${title} description`}"><link rel="canonical" href="${canonical}"></head><body>${title}<article>${visibleLongDescription ?? `${title} detailed catalog content`}</article><script type="application/ld+json">{"${identityKey}":"${identity}","offers":[${currencyCodes.map((code) => `{"priceCurrency":"${code}"}`).join(",")}]}</script></body></html>`,
    {
      headers: {
        "content-type": "text/html",
        "x-zane-dpl-hash": hash,
        "x-zane-dpl-slot": slot,
      },
      status: 200,
    }
  )

const sitemapUrlBlock = ({ alternates = {}, url }) =>
  `<url><loc>${url}</loc>${Object.entries(alternates)
    .map(
      ([hreflang, href]) =>
        `<xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}" />`
    )
    .join("")}</url>`

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: explicit fault-injection flags keep the live-crawl regression matrix in one deterministic fixture
const createLiveFetch = (options = {}) => {
  const {
    deploymentHash = "build-blue-1",
    deploymentSlot = "blue",
    differentRoSlot = false,
    emptyRoVisibleContent = false,
    mixedPage = false,
    mixedRoCurrency = false,
    mixedShard = false,
    missingRoCollection = false,
    mutatedSk = false,
    sameBrand = false,
    slovakRoDescriptions = false,
    slovakRoVisibleContent = false,
    swappedRoProductIdentity = false,
    unclassifiedRoCatalog = false,
    visibleRoEur = false,
    wrongOriginRoProduct = false,
  } = options
  const routes = new Map()
  const entities = {
    products: ["produkt-sk", "produs-ro"],
    categories: ["kategoria-sk", "categorie-ro"],
    brands: ["znacka-sk", "marca-ro"],
    collections: ["kolekcia-sk", "colectie-ro"],
  }
  const identityKeys = {
    brands: "source_brand_id",
    categories: "source_category_id",
    collections: "source_collection_id",
    products: "sku",
  }
  const identities = {
    brands: "brand_1",
    categories: "category_1",
    collections: "collection_1",
    products: "sku_1",
  }
  for (const [kind, [skSlug, roSlug]] of Object.entries(entities)) {
    const effectiveRoSlug = sameBrand && kind === "brands" ? skSlug : roSlug
    const skUrl = `${baseUrls.sk}/${fixture.sk.prefixes[kind]}/${skSlug}`
    const roUrl = `${baseUrls.ro}/${fixture.ro.prefixes[kind]}/${effectiveRoSlug}`
    const roCurrencyCodes =
      mixedRoCurrency && kind === "products" ? ["RON", "EUR"] : ["RON"]
    const roDescription = slovakRoDescriptions
      ? `${kind} SK description`
      : `${kind} RO description`
    const roIdentity =
      swappedRoProductIdentity && kind === "products"
        ? "sku_swapped"
        : identities[kind]
    const roTitle = sameBrand && kind === "brands" ? `${kind} SK` : `${kind} RO`
    let roVisibleLongDescription = `${kind} Descriere română detaliată despre utilizare și compoziție${visibleRoEur && kind === "products" ? " 19,90 EUR" : ""}`
    if (kind === "products" && emptyRoVisibleContent) {
      roVisibleLongDescription = ""
    } else if (kind === "products" && slovakRoVisibleContent) {
      roVisibleLongDescription = `${kind} Slovenský dlhý popis použitia a zloženia`
    }
    routes.set(skUrl, () =>
      html({
        canonical: skUrl,
        currencyCodes: ["EUR"],
        identity: identities[kind],
        identityKey: identityKeys[kind],
        hash: deploymentHash,
        lang: "sk-SK",
        slot: deploymentSlot,
        title: `${kind} SK${mutatedSk ? " MUTATED" : ""}`,
        visibleLongDescription: `${kind} Slovenský dlhý popis použitia a zloženia`,
      })
    )
    routes.set(roUrl, () =>
      html({
        canonical: roUrl,
        currencyCodes: roCurrencyCodes,
        description: roDescription,
        identity: roIdentity,
        identityKey: identityKeys[kind],
        lang: "ro-RO",
        hash: mixedPage && kind === "products" ? "build-other" : deploymentHash,
        slot: differentRoSlot ? "green" : deploymentSlot,
        title: roTitle,
        visibleLongDescription: roVisibleLongDescription,
      })
    )
  }
  for (const market of ["sk", "ro"]) {
    const origin = baseUrls[market]
    routes.set(`${origin}/sitemap.xml`, () =>
      xml(
        `<sitemapindex><sitemap><loc>${origin}/sitemap-live.xml</loc></sitemap></sitemapindex>`,
        {
          hash: deploymentHash,
          slot: market === "ro" && differentRoSlot ? "green" : deploymentSlot,
        }
      )
    )
    const records = Object.entries(entities).flatMap(
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: each branch injects one sitemap failure mode for a named regression test
      ([kind, [skSlug, roSlug]]) => {
        if (market === "ro" && kind === "collections" && missingRoCollection) {
          return []
        }
        const effectiveRoSlug = sameBrand && kind === "brands" ? skSlug : roSlug
        const skUrl = `${baseUrls.sk}/${fixture.sk.prefixes[kind]}/${skSlug}`
        const roUrl = `${baseUrls.ro}/${fixture.ro.prefixes[kind]}/${effectiveRoSlug}`
        let recordUrl = market === "sk" ? skUrl : roUrl
        if (market === "ro" && kind === "products" && wrongOriginRoProduct) {
          recordUrl = "https://evil.example/produse/injected"
        } else if (
          market === "ro" &&
          kind === "products" &&
          unclassifiedRoCatalog
        ) {
          recordUrl = `${baseUrls.ro}/catalog-neclasificat/produs-ro`
        }
        return [
          sitemapUrlBlock({
            alternates: { "sk-SK": skUrl, "ro-RO": roUrl },
            url: recordUrl,
          }),
        ]
      }
    )
    routes.set(`${origin}/sitemap-live.xml`, () =>
      xml(
        `<urlset xmlns:xhtml="http://www.w3.org/1999/xhtml">${records.join("")}</urlset>`,
        {
          hash: mixedShard && market === "ro" ? "build-other" : deploymentHash,
          slot: market === "ro" && differentRoSlot ? "green" : deploymentSlot,
        }
      )
    )
  }
  return (url) => {
    const response = routes.get(url)?.()
    return response ?? new Response("not found", { status: 404 })
  }
}
const fixture = {
  ro: {
    language: "ro",
    locale: "ro-RO",
    rootTitle: "Herbatica",
    prefixes: {
      products: "produse",
      categories: "categorii",
      brands: "marci",
      collections: "colectii",
    },
    rootLabels: ["Ce mă preocupă", "Cosmetică naturală"],
    forbiddenRootLabels: ["Trápi ma"],
    reviewedNeutral: [],
    currency: {
      code: "RON",
      displayTokens: ["RON", "lei"],
      forbiddenCodes: ["EUR"],
      forbiddenDisplayTokens: ["EUR", "€"],
    },
    category: {
      path: "/categorii/suplimente-nutritive",
      slug: "suplimente-nutritive",
      title: "Suplimente nutritive",
    },
    product: {
      path: "/produse/befungin-tinctura-cu-extract-de-chaga-siberian",
      slug: "befungin-tinctura-cu-extract-de-chaga-siberian",
      title: "Befungin - tinctură cu extract de chaga siberiană",
      identifiers: ["4868"],
    },
  },
  sk: {
    language: "sk",
    locale: "sk-SK",
    rootTitle: "Herbatica",
    prefixes: {
      products: "produkty",
      categories: "kategorie",
      brands: "znacky",
      collections: "kolekcie",
    },
    rootLabels: ["Trápi ma", "Prírodná kozmetika"],
    currency: { code: "EUR", displayTokens: ["€", "EUR"] },
    category: {
      path: "/kategorie/doplnky-vyzivy",
      slug: "doplnky-vyzivy",
      title: "Doplnky výživy",
    },
    product: {
      path: "/produkty/befungin-tinktura-s-extraktom-z-cagy",
      slug: "befungin-tinktura-s-extraktom-z-cagy",
      title: "Befungin - tinktúra s extraktom z Čagy",
      identifiers: ["4868"],
    },
  },
}

const liveReportFor = async ({
  backendReadiness = backendReadinessReport(),
  backendProofEnvelope,
  demoOmissionLedgerArtifact,
  fetchOptions,
  gateFixture = fixture,
  gateScopePlanArtifact = scopePlanArtifact(),
  readinessMode = "production",
} = {}) => {
  const baselineFetch = createLiveFetch()
  const skBaseline = await captureSkPublicationBaseline({
    backendSkBaseline,
    baseUrl: baseUrls.sk,
    fetchImpl: baselineFetch,
    fixture: fixture.sk,
    requestDelayMs: 0,
  })
  const releaseIdentity = {
    ...RELEASE_IDENTITY,
    storefrontBuildHash: fetchOptions?.deploymentHash ?? "build-blue-1",
    storefrontSlot: fetchOptions?.deploymentSlot ?? "blue",
  }
  return generateLiveReadiness({
    backendReadiness:
      backendProofEnvelope ??
      backendReadinessProof(backendReadiness, {
        cutoverChainProof: backendReadiness.cutoverChainProof,
        deploymentHash: fetchOptions?.deploymentHash ?? "build-blue-1",
        deploymentSlot: fetchOptions?.deploymentSlot ?? "blue",
        releaseIdentity,
      }),
    baseUrls,
    cutoverChainProof: backendReadiness.cutoverChainProof,
    fetchImpl: createLiveFetch(fetchOptions),
    fixture: gateFixture,
    now: GATE_NOW,
    proofHmacKey: PROOF_HMAC_KEY,
    requestDelayMs: 0,
    releaseIdentity,
    readinessMode,
    demoOmissionLedgerArtifact,
    scopePlanArtifact: gateScopePlanArtifact,
    skBaseline,
  })
}

const evidence = ({ market, pageKey }) => {
  const page = pageKey === "root" ? { path: "/" } : fixture[market][pageKey]
  return {
    alternates: {
      "ro-ro": new URL(
        pageKey === "root" ? "/" : fixture.ro[pageKey].path,
        `${baseUrls.ro}/`
      ).href,
      "sk-sk": new URL(
        pageKey === "root" ? "/" : fixture.sk[pageKey].path,
        `${baseUrls.sk}/`
      ).href,
    },
    bodyText:
      pageKey === "root"
        ? fixture[market].rootLabels.join(" ")
        : `${page.title} ${(page.identifiers ?? []).join(" ")}`,
    canonical: new URL(page.path, `${baseUrls[market]}/`).href,
    htmlLang: fixture[market].locale,
    priceCurrencies: [fixture[market].currency.code],
    status: 200,
    title: page.title ?? "Herbatica",
    url: new URL(page.path, `${baseUrls[market]}/`).href,
  }
}

test("accepts localized root, category, product, SEO and currency evidence", () => {
  for (const market of ["sk", "ro"]) {
    for (const pageKey of ["root", "category", "product"]) {
      const pageEvidence = evidence({ market, pageKey })
      assertPageEvidence({
        evidence: pageEvidence,
        marketFixture: fixture[market],
        pageKey,
      })
      assertSeoEvidence({
        baseUrls,
        evidence: pageEvidence,
        fixture,
        market,
        pageKey,
      })
    }
  }
  assertNoServerErrors([])
})

test("rejects Slovak navigation and EUR leakage on Romanian pages", () => {
  const pageEvidence = evidence({ market: "ro", pageKey: "root" })
  pageEvidence.bodyText = "Trápi ma Cosmetică naturală EUR"
  assert.throws(
    () =>
      assertPageEvidence({
        evidence: pageEvidence,
        marketFixture: fixture.ro,
        pageKey: "root",
      }),
    RO_CONTENT_ERROR_PATTERN
  )
})

test("rejects non-localized product paths and missing hreflang", () => {
  const pageEvidence = evidence({ market: "ro", pageKey: "product" })
  pageEvidence.url = `${baseUrls.ro}/produse/befungin-tinktura-s-extraktom-z-cagy`
  pageEvidence.alternates["sk-sk"] = undefined
  assert.throws(
    () =>
      assertPageEvidence({
        evidence: pageEvidence,
        marketFixture: fixture.ro,
        pageKey: "product",
      }),
    LOCALIZED_PATH_ERROR_PATTERN
  )
  pageEvidence.url = pageEvidence.canonical
  assert.throws(
    () =>
      assertSeoEvidence({
        baseUrls,
        evidence: pageEvidence,
        fixture,
        market: "ro",
        pageKey: "product",
      }),
    HREFLANG_ERROR_PATTERN
  )
})

test("rejects captured 5xx responses", () => {
  assert.throws(
    () =>
      assertNoServerErrors([
        { status: 503, url: "https://ro.example.test/api" },
      ]),
    SERVER_ERROR_PATTERN
  )
})

test("does not accept the Romanian word ulei as lei currency evidence", () => {
  const pageEvidence = evidence({ market: "ro", pageKey: "root" })
  pageEvidence.bodyText = `${fixture.ro.rootLabels.join(" ")} Ulei de chimen negru 100 ml`
  pageEvidence.priceCurrencies = []
  assert.throws(
    () =>
      assertPageEvidence({
        evidence: pageEvidence,
        marketFixture: fixture.ro,
        pageKey: "root",
      }),
    CURRENCY_ERROR_PATTERN
  )
  pageEvidence.bodyText += " 49,90 lei"
  assert.doesNotThrow(() =>
    assertPageEvidence({
      evidence: pageEvidence,
      marketFixture: fixture.ro,
      pageKey: "root",
    })
  )
})

test("reconciles every sitemap product and all localized entity kinds", () => {
  const report = readyReport()
  assert.doesNotThrow(() => assertGlobalReadiness(report))
  report.sitemap.checkedProductUrls = 51
  assert.throws(
    () => assertGlobalReadiness(report),
    SITEMAP_COVERAGE_ERROR_PATTERN
  )
  report.sitemap.checkedProductUrls = report.sitemap.productUrls
  report.localization.categories.identicalSlugsToSk = 1
  assert.throws(() => assertGlobalReadiness(report), SLUG_REUSE_ERROR_PATTERN)
})

test("fails closed on every top-level readiness and SK safety signal", () => {
  for (const [path, value, expectedError] of INVALID_READINESS_CASES) {
    const report = readyReport()
    const [parent, child] = path.split(".")
    if (child) {
      report[parent][child] = value
    } else {
      report[parent] = value
    }
    assert.throws(() => assertGlobalReadiness(report), expectedError)
  }
})

test("generates and hashes global readiness from live sitemap shards and pages", async () => {
  const fetchImpl = createLiveFetch()
  const skBaseline = await captureSkPublicationBaseline({
    backendSkBaseline,
    baseUrl: baseUrls.sk,
    concurrency: 2,
    fetchImpl,
    fixture: fixture.sk,
    now: () => new Date("2026-08-20T17:00:00.000Z"),
    requestDelayMs: 0,
  })
  const backendReadiness = backendReadinessProof()
  const report = await generateLiveReadiness({
    backendReadiness,
    baseUrls,
    concurrency: 2,
    cutoverChainProof: CUTOVER_CHAIN_PROOF,
    fetchImpl,
    fixture,
    now: () => new Date("2026-08-20T18:00:00.000Z"),
    proofHmacKey: PROOF_HMAC_KEY,
    requestDelayMs: 0,
    releaseIdentity: RELEASE_IDENTITY,
    scopePlanArtifact: scopePlanArtifact(),
    skBaseline,
  })

  assert.equal(report.ready, true)
  assert.equal(report.sitemap.productUrls, 1)
  assert.equal(report.sitemap.checkedProductUrls, 1)
  assert.equal(report.localization.categories.localized, 1)
  assert.equal(report.localization.products.ronComplete, 1)
  assert.equal(report.localization.brands.identicalSlugsToSk, 0)
  assert.equal(report.builds.sk.hash, "build-blue-1")
  assert.equal(report.backendProof.dataHash, "c".repeat(64))
  assert.doesNotThrow(() => assertLiveReportIntegrity(report, baseUrls))
  assert.doesNotThrow(() => assertGlobalReadiness(report))

  report.localization.products.total = 9999
  assert.throws(
    () => assertLiveReportIntegrity(report, baseUrls),
    LIVE_HASH_ERROR_PATTERN
  )
})

test("consumes the exact nested importer dry-run artifact and rejects flat or tampered plans", () => {
  const artifact = scopePlanArtifact()
  assert.deepEqual(parseRoCatalogScopePlanArtifact(artifact), {
    hash: artifact.plan.scopeSha256,
    planHash: artifact.planHash,
    scope: artifact.plan.scope,
    variantExpectations: DEFAULT_VARIANT_EXPECTATIONS,
  })

  assert.throws(
    () =>
      parseRoCatalogScopePlanArtifact({
        scope: artifact.plan.scope,
        scopeSha256: artifact.plan.scopeSha256,
      }),
    NESTED_PLAN_ERROR_PATTERN
  )

  const tampered = structuredClone(artifact)
  tampered.plan.summary.products = 999
  assert.throws(
    () => parseRoCatalogScopePlanArtifact(tampered),
    PLAN_HASH_ERROR_PATTERN
  )
})

test("rejects 200 responses when SK publication changed after its trusted snapshot", async () => {
  const skBaseline = await captureSkPublicationBaseline({
    backendSkBaseline,
    baseUrl: baseUrls.sk,
    concurrency: 2,
    fetchImpl: createLiveFetch(),
    fixture: fixture.sk,
    requestDelayMs: 0,
  })
  const backendReadiness = backendReadinessProof()
  const report = await generateLiveReadiness({
    backendReadiness,
    baseUrls,
    concurrency: 2,
    cutoverChainProof: CUTOVER_CHAIN_PROOF,
    fetchImpl: createLiveFetch({ mutatedSk: true }),
    fixture,
    now: GATE_NOW,
    proofHmacKey: PROOF_HMAC_KEY,
    requestDelayMs: 0,
    releaseIdentity: RELEASE_IDENTITY,
    scopePlanArtifact: scopePlanArtifact(),
    skBaseline,
  })
  assert.equal(report.skBaseline.unchanged, false)
  assert.equal(report.skPublication.errors, 0)
  report.ready = true
  assert.throws(() => assertGlobalReadiness(report), SK_BASELINE_ERROR_PATTERN)
})

test("accepts unchanged SK semantics across an intentional deployment change", async () => {
  const report = await liveReportFor({
    fetchOptions: { deploymentHash: "build-blue-2" },
  })
  assert.equal(report.builds.sk.hash, "build-blue-2")
  assert.equal(report.builds.ro.hash, "build-blue-2")
  assert.equal(report.skBaseline.unchanged, true)
  assert.equal(report.ready, true)
})

test("rejects missing or invalid RO completeness proof", async () => {
  const missing = backendReadinessReport()
  missing.roCompletenessProof = undefined
  await assert.rejects(
    liveReportFor({ backendReadiness: missing }),
    INVALID_BACKEND_PROOF_PATTERN
  )

  const tampered = backendReadinessReport()
  tampered.roCompletenessProof.dataHash = "not-a-sha256"
  await assert.rejects(
    liveReportFor({ backendReadiness: tampered }),
    INVALID_BACKEND_PROOF_PATTERN
  )
})

test("rejects stale and wrong-environment signed backend proofs", async () => {
  const stale = backendReadinessProof(
    backendReadinessReport(),
    {},
    "2026-08-20T17:00:00.000Z"
  )
  await assert.rejects(
    liveReportFor({ backendProofEnvelope: stale }),
    UNTRUSTED_BACKEND_ENVELOPE_PATTERN
  )

  const wrongEnvironment = backendReadinessProof(backendReadinessReport(), {
    roOrigin: "https://other-ro.example.test",
  })
  await assert.rejects(
    liveReportFor({ backendProofEnvelope: wrongEnvironment }),
    UNTRUSTED_BACKEND_ENVELOPE_PATTERN
  )

  const clonedDatabase = backendReadinessProof(backendReadinessReport(), {
    databaseInstanceFingerprint: "f".repeat(64),
  })
  await assert.rejects(
    liveReportFor({ backendProofEnvelope: clonedDatabase }),
    UNTRUSTED_BACKEND_ENVELOPE_PATTERN
  )
})

test("accepts only demo omission warnings exactly bound to the ledger", async () => {
  const demoOmissionLedgerArtifact = {
    entries: [
      {
        omittedFields: ["usage", "composition", "warning", "other"],
        productContentId: "content_1",
        productId: "product_1",
        roDescriptionSha256: "1".repeat(64),
        sourceContentSha256: "2".repeat(64),
        sourceUrl: "https://www.herbatica.ro/produs/produs-oficial/",
      },
    ],
    mode: "official-ro-description-only",
    schemaVersion: 1,
  }
  const demoReport = backendReadinessReport()
  demoReport.readinessMode = "demo"
  demoReport.issues = [
    {
      code: "RO_DEMO_STRUCTURED_CONTENT_OMITTED",
      entityId: "product_1",
      entityKind: "product",
      message: "Accepted signed demo omission",
      severity: "warning",
    },
  ]
  demoReport.roCompletenessProof.demoOmissionLedgerHash =
    hashRoDemoContentOmissionLedger(demoOmissionLedgerArtifact)
  demoReport.summary.demoContentOmissionFields = 4
  demoReport.summary.demoOmissionLedgerEntries = 1
  demoReport.summary.demoProductsWithContentOmissions = 1
  demoReport.summary.warnings = 1
  const accepted = await liveReportFor({
    backendReadiness: demoReport,
    demoOmissionLedgerArtifact,
    readinessMode: "demo",
  })
  assert.equal(accepted.ready, true)

  demoReport.issues[0].code = "UNRELATED_WARNING"
  await assert.rejects(
    liveReportFor({
      backendReadiness: demoReport,
      demoOmissionLedgerArtifact,
      readinessMode: "demo",
    }),
    DEMO_WARNING_ERROR_PATTERN
  )

  demoReport.issues[0].code = "RO_DEMO_STRUCTURED_CONTENT_OMITTED"
  demoReport.issues[0].severity = "error"
  await assert.rejects(
    liveReportFor({
      backendReadiness: demoReport,
      demoOmissionLedgerArtifact,
      readinessMode: "demo",
    }),
    DEMO_WARNING_ERROR_PATTERN
  )
})

test("rejects Romanian title and slug when the page description remains Slovak", async () => {
  const baselineFetch = createLiveFetch()
  const skBaseline = await captureSkPublicationBaseline({
    backendSkBaseline,
    baseUrl: baseUrls.sk,
    fetchImpl: baselineFetch,
    fixture: fixture.sk,
    requestDelayMs: 0,
  })
  const backendReadiness = backendReadinessProof()
  const report = await generateLiveReadiness({
    backendReadiness,
    baseUrls,
    cutoverChainProof: CUTOVER_CHAIN_PROOF,
    fetchImpl: createLiveFetch({ slovakRoDescriptions: true }),
    fixture,
    now: GATE_NOW,
    proofHmacKey: PROOF_HMAC_KEY,
    requestDelayMs: 0,
    releaseIdentity: RELEASE_IDENTITY,
    scopePlanArtifact: scopePlanArtifact(),
    skBaseline,
  })
  assert.equal(report.localization.products.localized, 0)
  assert.equal(report.ready, false)
})

test("rejects Slovak visible long-form content even with Romanian meta", async () => {
  const report = await liveReportFor({
    fetchOptions: { slovakRoVisibleContent: true },
  })
  assert.equal(report.localization.products.localized, 0)
  assert.equal(report.ready, false)
})

test("rejects empty rendered Romanian product content even with localized meta", async () => {
  const report = await liveReportFor({
    fetchOptions: { emptyRoVisibleContent: true },
  })
  assert.equal(report.localization.products.localized, 0)
  assert.equal(report.ready, false)
})

test("rejects wrong-origin sitemap product locations", async () => {
  await assert.rejects(
    liveReportFor({ fetchOptions: { wrongOriginRoProduct: true } }),
    WRONG_ORIGIN_URL_ERROR_PATTERN
  )
})

test("rejects unclassified same-origin catalog locations", async () => {
  await assert.rejects(
    liveReportFor({ fetchOptions: { unclassifiedRoCatalog: true } }),
    UNCLASSIFIED_URL_ERROR_PATTERN
  )
})

test("rejects mixed deployment identity across sitemap shards and pages", async () => {
  await assert.rejects(
    liveReportFor({ fetchOptions: { mixedShard: true } }),
    MIXED_SHARD_ERROR_PATTERN
  )
  await assert.rejects(
    liveReportFor({ fetchOptions: { mixedPage: true } }),
    MIXED_PAGE_ERROR_PATTERN
  )
})

test("requires one shared deployment slot for SK and RO", async () => {
  await assert.rejects(
    liveReportFor({ fetchOptions: { differentRoSlot: true } }),
    UNTRUSTED_BACKEND_ENVELOPE_PATTERN
  )
  const report = readyReport()
  report.builds.ro.slot = "green"
  assert.throws(() => assertGlobalReadiness(report), SLOT_ERROR_PATTERN)
})

test("accepts one shared GREEN deployment slot", async () => {
  const report = await liveReportFor({
    fetchOptions: {
      deploymentHash: "build-green-2",
      deploymentSlot: "green",
    },
  })
  assert.equal(report.builds.sk.slot, "green")
  assert.equal(report.builds.ro.slot, "green")
  assert.equal(report.ready, true)
  assert.doesNotThrow(() => assertGlobalReadiness(report))
})

test("rejects Romanian pages exposing both RON and EUR", async () => {
  const report = await liveReportFor({
    fetchOptions: { mixedRoCurrency: true },
  })
  assert.equal(report.localization.products.ronComplete, 0)
  assert.equal(report.localization.products.localized, 0)
  assert.equal(report.ready, false)
})

test("rejects visible EUR even when structured commerce data is RON", async () => {
  const report = await liveReportFor({
    fetchOptions: { visibleRoEur: true },
  })
  assert.deepEqual(report.localization.products, {
    identityComplete: 1,
    identicalSlugsToSk: 0,
    localized: 0,
    missingSlugs: 0,
    ronComplete: 0,
    total: 1,
  })
  assert.equal(report.ready, false)
})

test("rejects swapped stable product identity", async () => {
  const report = await liveReportFor({
    fetchOptions: { swappedRoProductIdentity: true },
  })
  assert.equal(report.localization.products.identityComplete, 0)
  assert.equal(report.localization.products.localized, 0)
  assert.equal(report.ready, false)
})

test("allows same proper-name brand only with reviewed owner and reason", async () => {
  const sameBrandFetch = { sameBrand: true }
  const rejected = await liveReportFor({ fetchOptions: sameBrandFetch })
  assert.equal(rejected.localization.brands.identicalSlugsToSk, 1)
  assert.equal(rejected.ready, false)

  const skUrl = `${baseUrls.sk}/${fixture.sk.prefixes.brands}/znacka-sk`
  const roUrl = `${baseUrls.ro}/${fixture.ro.prefixes.brands}/znacka-sk`
  const reviewedFixture = structuredClone(fixture)
  reviewedFixture.ro.reviewedNeutral = [
    {
      kind: "brands",
      owner: "catalog-localization-owner@example.test",
      reason: "Registered proper name is intentionally locale-neutral",
      roUrl,
      skUrl,
    },
  ]
  const accepted = await liveReportFor({
    fetchOptions: sameBrandFetch,
    gateFixture: reviewedFixture,
  })
  assert.equal(accepted.localization.brands.identicalSlugsToSk, 0)
  assert.equal(accepted.localization.brands.localized, 1)
  assert.equal(accepted.ready, true)
})

test("reconciles published and excluded brands to authoritative scope", async () => {
  const backendReadiness = backendReadinessReport()
  backendReadiness.skPublication.brands = 2
  backendReadiness.roBrandScope = {
    excluded: 1,
    excludedIds: ["brand_2"],
    global: 2,
    published: 1,
    publishedIds: ["brand_1"],
  }
  const brandScope = {
    ...defaultScope,
    brandExcludedIds: ["brand_2"],
  }
  const gateScopePlanArtifact = bindScopePlan(backendReadiness, brandScope)
  const report = await liveReportFor({
    backendReadiness,
    gateScopePlanArtifact,
  })
  assert.equal(report.localization.brands.total, 1)
  assert.equal(report.ready, true)

  backendReadiness.skPublication.brands = 3
  await assert.rejects(
    liveReportFor({
      backendReadiness,
      gateScopePlanArtifact,
    }),
    SCOPE_PLAN_ERROR_PATTERN
  )
})

test("reconciles every SK inventory total to the reviewed scope partition", async () => {
  for (const [kind, count] of [
    ["products", 2],
    ["categories", 2],
    ["collections", 2],
  ]) {
    const backendReadiness = backendReadinessReport()
    backendReadiness.skPublication[kind] = count
    await assert.rejects(
      liveReportFor({ backendReadiness }),
      SCOPE_PLAN_ERROR_PATTERN,
      `unexpected SK ${kind} inventory must fail`
    )
  }
})

test("rejects a missing public Romanian collection", async () => {
  const report = await liveReportFor({
    fetchOptions: { missingRoCollection: true },
  })
  assert.equal(report.localization.collections.total, 0)
  assert.equal(report.ready, false)
  assert.equal(report.summary.issues, 2)
})

test("accepts zero public collections when backend authority also reports zero", async () => {
  const backendReadiness = backendReadinessReport()
  backendReadiness.skPublication.collections = 0
  backendReadiness.summary.collections = 0
  backendReadiness.summary.collectionUrlAssignments = 0
  backendReadiness.roCatalogPublication.collectionIds = []
  const zeroCollectionScope = { ...defaultScope, collectionIds: [] }
  const gateScopePlanArtifact = bindScopePlan(
    backendReadiness,
    zeroCollectionScope
  )
  const report = await liveReportFor({
    backendReadiness,
    fetchOptions: { missingRoCollection: true },
    gateScopePlanArtifact,
  })
  assert.equal(report.localization.collections.total, 0)
  assert.equal(report.summary.issues, 0)
  assert.equal(report.ready, true)
  assert.doesNotThrow(() => assertGlobalReadiness(report))
})

test("normalizes Unicode, whitespace and safe base URLs", () => {
  assert.equal(
    normalizeText("  tinctura\u0306   românească "),
    "tinctură românească"
  )
  assert.equal(
    normalizeBaseUrl("https://ro.example.test/path/", "RO"),
    baseUrls.ro
  )
  assert.throws(
    () => normalizeBaseUrl("ftp://ro.example.test", "RO"),
    HTTP_ERROR_PATTERN
  )
  assert.throws(
    () => normalizeBaseUrl("https://user:secret@ro.example.test", "RO"),
    CREDENTIALS_ERROR_PATTERN
  )
})
