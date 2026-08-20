import { createHash, createHmac, timingSafeEqual } from "node:crypto"
import { setTimeout as delay } from "node:timers/promises"
import {
  hashRoDemoContentOmissionLedger,
  hashRoVariantAvailabilityExpectations,
  parseRoCatalogReadinessReportArtifact,
  parseRoCatalogScopePlanArtifact,
  parseRoDemoContentOmissionLedgerArtifact,
} from "../../../medusa-be/src/scripts/ro-catalog-readiness-contract.ts"

const URL_BLOCK_PATTERN = /<url\b[^>]*>([\s\S]*?)<\/url>/gi
const LOC_PATTERN = /<loc\b[^>]*>([\s\S]*?)<\/loc>/i
const LINK_PATTERN = /<xhtml:link\b([^>]*)\/?\s*>/gi
const ATTRIBUTE_PATTERN = /([\w:-]+)=["']([^"']*)["']/g
const HTML_LANG_PATTERN = /<html\b[^>]*\blang=["']([^"']*)["']/i
const TITLE_PATTERN = /<title\b[^>]*>([\s\S]*?)<\/title>/i
const CANONICAL_PATTERN = /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i
const DESCRIPTION_PATTERN = /<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/i
const CURRENCY_PATTERN =
  /["'](?:priceCurrency|currencyCode)["']\s*:\s*["']([A-Za-z]{3})["']/gi
const VISIBLE_CURRENCY_PATTERN =
  /(?:\d+(?:[.,]\d{1,2})?\s*(RON|EUR|USD|GBP|HUF|CZK|PLN|lei|€|\$|£)|(RON|EUR|USD|GBP|HUF|CZK|PLN|lei|€|\$|£)\s*\d+(?:[.,]\d{1,2})?)/giu
const IDENTITY_PATTERN =
  /["'](sku|source_guid|source_category_id|source_brand_id|source_collection_id)["']\s*:\s*["']([^"']+)["']/gi
const BODY_PATTERN = /<body\b[^>]*>([\s\S]*?)<\/body>/i
const SCRIPT_STYLE_PATTERN =
  /<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi
const TAG_PATTERN = /<[^>]*>/g
const SHA256_PATTERN = /^[a-f0-9]{64}$/
const HMAC_PATTERN = /^hmac-sha256:([a-f0-9]{64})$/
const ZANE_SLOT_PATTERN = /^(?:blue|green)$/
const RELEASE_SHA_PATTERN = /^[a-f0-9]{40}$/
const DEPLOYMENT_ID_PATTERN = /^[A-Za-z0-9._:-]{1,160}$/
const BACKEND_PROOF_MAX_AGE_MS = 15 * 60 * 1000

const RELEASE_IDENTITY_KEYS = [
  "backendBuildHash",
  "backendDeploymentId",
  "backendReleaseSha",
  "backendSlot",
  "databaseFingerprint",
  "databaseInstanceFingerprint",
  "environmentId",
  "locale",
  "marketCode",
  "roOrigin",
  "salesChannelId",
  "skOrigin",
  "storefrontBuildHash",
  "storefrontDeploymentId",
  "storefrontReleaseSha",
  "storefrontSlot",
]

const validReleaseIdentity = (identity, baseUrls) =>
  identity &&
  JSON.stringify(Object.keys(identity).sort()) ===
    JSON.stringify(RELEASE_IDENTITY_KEYS) &&
  RELEASE_SHA_PATTERN.test(identity.backendReleaseSha) &&
  RELEASE_SHA_PATTERN.test(identity.storefrontReleaseSha) &&
  SHA256_PATTERN.test(identity.databaseFingerprint) &&
  SHA256_PATTERN.test(identity.databaseInstanceFingerprint) &&
  [
    identity.backendBuildHash,
    identity.backendDeploymentId,
    identity.environmentId,
    identity.salesChannelId,
    identity.storefrontBuildHash,
    identity.storefrontDeploymentId,
  ].every((value) => DEPLOYMENT_ID_PATTERN.test(value)) &&
  ZANE_SLOT_PATTERN.test(identity.backendSlot) &&
  ZANE_SLOT_PATTERN.test(identity.storefrontSlot) &&
  identity.marketCode === "ro" &&
  identity.locale === "ro-RO" &&
  identity.roOrigin === new URL(baseUrls.ro).origin &&
  identity.skOrigin === new URL(baseUrls.sk).origin

const decodeXml = (value) =>
  value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")

const visibleText = (html) =>
  decodeXml(
    (html.match(BODY_PATTERN)?.[1] ?? "")
      .replace(SCRIPT_STYLE_PATTERN, " ")
      .replace(TAG_PATTERN, " ")
  )
    .replace(/\s+/g, " ")
    .trim()

const attributes = (tag) =>
  Object.fromEntries(
    [...tag.matchAll(ATTRIBUTE_PATTERN)].map((match) => [
      match[1].toLowerCase(),
      decodeXml(match[2]),
    ])
  )

const canonicalJson = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}

export const signBackendReadinessProof = ({
  environment,
  issuedAt,
  report,
  secret,
}) => {
  if (typeof secret !== "string" || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error(
      "readiness: proof HMAC secret must contain at least 32 bytes"
    )
  }
  const envelope = {
    schemaVersion: 1,
    kind: "herbatika-backend-readiness-proof",
    environment,
    issuedAt,
    report,
    reportHash: createHash("sha256")
      .update(canonicalJson(report))
      .digest("hex"),
  }
  return {
    ...envelope,
    signature: `hmac-sha256:${createHmac("sha256", secret)
      .update(canonicalJson(envelope))
      .digest("hex")}`,
  }
}

const verifyBackendReadinessProof = ({
  baseUrls,
  envelope,
  now,
  proofHmacKey,
  proofMaxAgeMs,
  cutoverChainProof,
  releaseIdentity,
  roSitemap,
  scopePlan,
  skSitemap,
}) => {
  const signature = envelope?.signature?.match(HMAC_PATTERN)?.[1]
  const { signature: _signature, ...unsigned } = envelope ?? {}
  const expectedSignature =
    typeof proofHmacKey === "string" && Buffer.byteLength(proofHmacKey) >= 32
      ? createHmac("sha256", proofHmacKey)
          .update(canonicalJson(unsigned))
          .digest("hex")
      : ""
  const actualBuffer = Buffer.from(signature ?? "", "hex")
  const expectedBuffer = Buffer.from(expectedSignature, "hex")
  const issuedAt = new Date(envelope?.issuedAt ?? "")
  const reportGeneratedAt = new Date(envelope?.report?.generatedAt ?? "")
  const age = now().valueOf() - issuedAt.valueOf()
  const reportAge = now().valueOf() - reportGeneratedAt.valueOf()
  const expectedEnvironment = {
    cutoverChainProof,
    databaseFingerprint: releaseIdentity.databaseFingerprint,
    databaseInstanceFingerprint: releaseIdentity.databaseInstanceFingerprint,
    deploymentHash: skSitemap.buildHash,
    deploymentSlot: skSitemap.buildSlot,
    importPlanHash: scopePlan.planHash,
    roOrigin: new URL(baseUrls.ro).origin,
    releaseIdentity,
    scopePlanHash: scopePlan.hash,
    skOrigin: new URL(baseUrls.sk).origin,
  }
  if (
    envelope?.schemaVersion !== 1 ||
    envelope.kind !== "herbatika-backend-readiness-proof" ||
    !SHA256_PATTERN.test(envelope.reportHash ?? "") ||
    envelope.reportHash !==
      createHash("sha256")
        .update(canonicalJson(envelope.report))
        .digest("hex") ||
    !Number.isSafeInteger(proofMaxAgeMs) ||
    proofMaxAgeMs <= 0 ||
    Number.isNaN(issuedAt.valueOf()) ||
    Number.isNaN(reportGeneratedAt.valueOf()) ||
    age < 0 ||
    age > proofMaxAgeMs ||
    reportAge < 0 ||
    reportAge > proofMaxAgeMs ||
    canonicalJson(envelope.environment) !==
      canonicalJson(expectedEnvironment) ||
    roSitemap.buildHash !== skSitemap.buildHash ||
    !ZANE_SLOT_PATTERN.test(skSitemap.buildSlot) ||
    roSitemap.buildSlot !== skSitemap.buildSlot ||
    !(signature && expectedSignature) ||
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error(
      "readiness: stale, invalid, or wrong-environment backend proof"
    )
  }
  return parseRoCatalogReadinessReportArtifact(envelope.report)
}

const exactIds = (actual, expected) =>
  Array.isArray(actual) &&
  actual.length === expected.length &&
  actual.every((value, index) => value === expected[index])

const assertScopePlanProof = (
  report,
  { hash, planHash, scope, variantExpectations },
  cutoverChainProof
) => {
  const productExcludedIds = report.roProductScope?.excluded?.map(
    ({ id }) => id
  )
  const categoryExcludedIds = report.roCategoryScope?.excluded?.map(
    ({ id }) => id
  )
  const sellableVariants = variantExpectations.filter(
    ({ roAvailability }) => roAvailability === "sellable"
  ).length
  const unavailableVariants = variantExpectations.length - sellableVariants
  if (
    report.scopePlanProof?.schemaVersion !== 1 ||
    canonicalJson(report.cutoverChainProof) !==
      canonicalJson(cutoverChainProof) ||
    report.scopePlanProof.importPlanHash !== planHash ||
    report.roVariantScope?.dataHash !==
      hashRoVariantAvailabilityExpectations(variantExpectations) ||
    report.roVariantScope?.sellable !== sellableVariants ||
    report.roVariantScope?.unavailable !== unavailableVariants ||
    report.scopePlanProof.matched !== true ||
    report.scopePlanProof.expectedDataHash !== hash ||
    report.scopePlanProof.observedDataHash !== hash ||
    !exactIds(report.roProductScope?.publishedIds, scope.productPublishedIds) ||
    !exactIds(productExcludedIds, scope.productExcludedIds) ||
    report.roProductScope?.published !== scope.productPublishedIds.length ||
    !exactIds(
      report.roCatalogPublication?.categoryIds,
      scope.categoryPublishedIds
    ) ||
    !exactIds(categoryExcludedIds, scope.categoryExcludedIds) ||
    !exactIds(report.roCatalogPublication?.brandIds, scope.brandIds) ||
    !exactIds(report.roBrandScope?.publishedIds, scope.brandIds) ||
    !exactIds(report.roBrandScope?.excludedIds, scope.brandExcludedIds) ||
    report.roBrandScope?.published !== scope.brandIds.length ||
    report.roBrandScope?.excluded !== scope.brandExcludedIds.length ||
    report.roBrandScope?.global !==
      scope.brandIds.length + scope.brandExcludedIds.length ||
    !exactIds(
      report.roCatalogPublication?.collectionIds,
      scope.collectionIds
    ) ||
    report.summary.products !== scope.productPublishedIds.length ||
    report.roProductScope?.globalPublished !==
      scope.productPublishedIds.length + scope.productExcludedIds.length ||
    report.roCategoryScope?.active !==
      scope.categoryPublishedIds.length + scope.categoryExcludedIds.length ||
    report.roCategoryScope?.published !== scope.categoryPublishedIds.length ||
    report.skPublication?.products !== report.roProductScope.globalPublished ||
    report.skPublication?.categories !== report.roCategoryScope.active ||
    report.skPublication?.brands !==
      scope.brandIds.length + scope.brandExcludedIds.length ||
    report.skPublication?.collections !== scope.collectionIds.length
  ) {
    throw new Error(
      "readiness: backend report does not match importer scope plan"
    )
  }
}

export const liveReportHash = (report) => {
  const { evidenceHash: _evidenceHash, ...evidence } = report
  return createHash("sha256").update(canonicalJson(evidence)).digest("hex")
}

const parseSitemapRecords = (xml) =>
  [...xml.matchAll(URL_BLOCK_PATTERN)].map((match) => {
    const block = match[1]
    const loc = block.match(LOC_PATTERN)?.[1]
    const alternates = Object.fromEntries(
      [...block.matchAll(LINK_PATTERN)]
        .map((link) => attributes(link[1]))
        .filter((link) => link.hreflang && link.href)
        .map((link) => [link.hreflang.toLowerCase(), link.href])
    )
    return { alternates, url: decodeXml(loc?.trim() ?? "") }
  })

const parseIndexLocations = (xml) =>
  [...xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)].map((match) =>
    decodeXml(match[1].trim())
  )

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: bounded recursive sitemap traversal validates origin, status, shards, and build identity together
const crawlSitemap = async ({ baseUrl, fetchImpl }) => {
  const origin = new URL(baseUrl).origin
  const pending = [new URL("/sitemap.xml", `${origin}/`).href]
  const queued = new Set(pending)
  const seen = new Set()
  const recordUrls = new Set()
  const records = []
  let buildHash = ""
  let buildSlot = ""

  while (pending.length > 0) {
    const sitemapUrl = pending.shift()
    if (seen.has(sitemapUrl)) {
      continue
    }
    seen.add(sitemapUrl)
    const response = await fetchImpl(sitemapUrl, { redirect: "follow" })
    if (response.status !== 200) {
      throw new Error(`Sitemap ${sitemapUrl} returned ${response.status}`)
    }
    const responseHash = response.headers.get("x-zane-dpl-hash") ?? ""
    const responseSlot = response.headers.get("x-zane-dpl-slot") ?? ""
    if (!(responseHash && responseSlot)) {
      throw new Error(`Sitemap ${sitemapUrl} is missing deployment identity`)
    }
    if (
      (buildHash && buildHash !== responseHash) ||
      (buildSlot && buildSlot !== responseSlot)
    ) {
      throw new Error(`Mixed sitemap deployment identity at ${sitemapUrl}`)
    }
    buildHash = responseHash
    buildSlot = responseSlot
    const xml = await response.text()
    const pageRecords = parseSitemapRecords(xml)
    if (pageRecords.length > 0) {
      for (const record of pageRecords) {
        let parsed
        try {
          parsed = new URL(record.url)
        } catch {
          throw new Error(`Malformed sitemap URL rejected: ${record.url}`)
        }
        if (parsed.origin !== origin) {
          throw new Error(`Cross-origin sitemap URL rejected: ${parsed.href}`)
        }
        if (recordUrls.has(parsed.href)) {
          throw new Error(`Duplicate sitemap URL rejected: ${parsed.href}`)
        }
        recordUrls.add(parsed.href)
        records.push({ ...record, url: parsed.href })
      }
      continue
    }
    for (const location of parseIndexLocations(xml)) {
      const shard = new URL(location, `${origin}/`)
      if (shard.origin !== origin) {
        throw new Error(`Cross-origin sitemap shard rejected: ${shard.href}`)
      }
      if (queued.has(shard.href)) {
        throw new Error(`Duplicate sitemap shard rejected: ${shard.href}`)
      }
      queued.add(shard.href)
      pending.push(shard.href)
    }
  }
  return { buildHash, buildSlot, records }
}

const mapLimit = async (values, concurrency, mapper) => {
  const results = new Array(values.length)
  let cursor = 0
  const worker = async () => {
    while (cursor < values.length) {
      const index = cursor
      cursor += 1
      results[index] = await mapper(values[index], index)
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, worker)
  )
  return results
}

const pageEvidence = async ({ fetchImpl, requestDelayMs, url }) => {
  if (requestDelayMs > 0) {
    await delay(requestDelayMs)
  }
  try {
    const response = await fetchImpl(url, { redirect: "follow" })
    const html = await response.text()
    const canonicalTag = html.match(CANONICAL_PATTERN)?.[0] ?? ""
    const descriptionTag = html.match(DESCRIPTION_PATTERN)?.[0] ?? ""
    const canonical = attributes(canonicalTag).href ?? ""
    const renderedVisibleText = visibleText(html)
    const currencyCode = (token) =>
      ({ "€": "EUR", $: "USD", "£": "GBP", lei: "RON" })[token.toLowerCase()] ??
      token.toUpperCase()
    return {
      buildHash: response.headers.get("x-zane-dpl-hash") ?? "",
      buildSlot: response.headers.get("x-zane-dpl-slot") ?? "",
      canonical,
      contentHash: createHash("sha256").update(html).digest("hex"),
      currencyCodes: [
        ...new Set(
          [
            ...[...html.matchAll(CURRENCY_PATTERN)].map((match) => match[1]),
            ...[...renderedVisibleText.matchAll(VISIBLE_CURRENCY_PATTERN)].map(
              (match) => match[1] ?? match[2]
            ),
          ].map(currencyCode)
        ),
      ],
      description: decodeXml(attributes(descriptionTag).content ?? ""),
      htmlLang: html.match(HTML_LANG_PATTERN)?.[1] ?? "",
      identities: [
        ...new Map(
          [...html.matchAll(IDENTITY_PATTERN)].map((match) => [
            `${match[1]}:${match[2]}`,
            { key: match[1], value: match[2] },
          ])
        ).values(),
      ],
      status: response.status,
      title: decodeXml(
        (html.match(TITLE_PATTERN)?.[1] ?? "").replace(TAG_PATTERN, "").trim()
      ),
      url,
      visibleText: renderedVisibleText,
    }
  } catch (error) {
    return {
      buildHash: "",
      buildSlot: "",
      canonical: "",
      contentHash: "",
      currencyCodes: [],
      description: "",
      error: error.message,
      htmlLang: "",
      identities: [],
      status: 0,
      title: "",
      url,
      visibleText: "",
    }
  }
}

const entityKind = (url, prefixes) => {
  const firstSegment = new URL(url).pathname.split("/").find(Boolean)
  return Object.entries(prefixes).find(
    ([, prefix]) => prefix === firstSegment
  )?.[0]
}

const slug = (url) =>
  new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? ""

const sameIdentities = (left, right) => {
  const serialized = (identity) => `${identity.key}:${identity.value}`
  const normalizedLeft = [...new Set(left.map(serialized))].sort()
  const normalizedRight = [...new Set(right.map(serialized))].sort()
  return (
    normalizedLeft.length > 0 &&
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((value, index) => value === normalizedRight[index])
  )
}

const primaryIdentityValues = (identities, kind) => {
  const keys = {
    brands: new Set(["source_brand_id"]),
    categories: new Set(["source_category_id"]),
    collections: new Set(["source_collection_id"]),
    products: new Set(["sku", "source_guid"]),
  }[kind]
  return identities.filter(({ key }) => keys.has(key)).map(({ value }) => value)
}

const leaksSkVisibleContent = (roPage, skPage) => {
  const skContent = skPage.visibleText
    .replace(skPage.title, " ")
    .replace(skPage.description, " ")
    .replace(/\s+/g, " ")
    .trim()
  return skContent.length >= 24 && roPage.visibleText.includes(skContent)
}

const hasMeaningfulVisibleCatalogContent = (page) =>
  page.visibleText.replace(page.title, " ").replace(/\s+/g, " ").trim()
    .length >= 24

const reviewedNeutral = (fixture, kind, roUrl, skUrl) =>
  (fixture.reviewedNeutral ?? []).some(
    (entry) =>
      entry.kind === kind &&
      entry.roUrl === roUrl &&
      entry.skUrl === skUrl &&
      typeof entry.owner === "string" &&
      entry.owner.trim() &&
      typeof entry.reason === "string" &&
      entry.reason.trim()
  )

const publicationHash = (records, pages) =>
  createHash("sha256")
    .update(
      canonicalJson(
        records
          .map((record) => pages.get(record.url))
          .filter(Boolean)
          .map(
            ({
              canonical,
              currencyCodes,
              description,
              htmlLang,
              identities,
              status,
              title,
              url,
              visibleText: renderedVisibleText,
            }) => ({
              canonical,
              currencyCodes,
              description,
              htmlLang,
              identities,
              status,
              title,
              url,
              visibleText: renderedVisibleText,
            })
          )
          .sort((left, right) => left.url.localeCompare(right.url))
      )
    )
    .digest("hex")

const assertDemoOmissionPolicy = (proof, ledger) => {
  const warnings = proof.issues.filter(({ severity }) => severity === "warning")
  if (proof.readinessMode === "production") {
    if (
      ledger ||
      proof.issues.length !== 0 ||
      warnings.length !== 0 ||
      proof.summary.warnings !== 0 ||
      proof.roCompletenessProof.demoOmissionLedgerHash !== null ||
      proof.summary.demoOmissionLedgerEntries !== 0 ||
      proof.summary.demoProductsWithContentOmissions !== 0 ||
      proof.summary.demoContentOmissionFields !== 0
    ) {
      throw new Error("readiness: production report contains demo omissions")
    }
    return
  }
  if (!ledger) {
    throw new Error("readiness: demo omission ledger is required")
  }
  const productIds = ledger.entries.map(({ productId }) => productId).sort()
  const warningIds = warnings.map(({ entityId }) => entityId).sort()
  const omittedFieldCount = ledger.entries.reduce(
    (total, entry) => total + entry.omittedFields.length,
    0
  )
  if (
    warnings.length !== proof.issues.length ||
    proof.roCompletenessProof.demoOmissionLedgerHash !==
      hashRoDemoContentOmissionLedger(ledger) ||
    warnings.some(
      (issue) =>
        issue.code !== "RO_DEMO_STRUCTURED_CONTENT_OMITTED" ||
        issue.entityKind !== "product" ||
        typeof issue.entityId !== "string"
    ) ||
    !exactIds(warningIds, productIds) ||
    proof.summary.warnings !== ledger.entries.length ||
    proof.summary.demoOmissionLedgerEntries !== ledger.entries.length ||
    proof.summary.demoProductsWithContentOmissions !== ledger.entries.length ||
    proof.summary.demoContentOmissionFields !== omittedFieldCount
  ) {
    throw new Error("readiness: demo omission warnings do not match ledger")
  }
}

const assertBackendProof = (proof, readinessMode, demoOmissionLedger) => {
  const generatedAt = new Date(proof?.generatedAt ?? "")
  if (
    proof?.market !== "ro" ||
    proof.ready !== true ||
    proof.readinessMode !== readinessMode ||
    proof.scope !== "ro-published-products-and-catalog-assignments" ||
    !Array.isArray(proof.issues) ||
    proof.summary?.errors !== 0 ||
    Number.isNaN(generatedAt.valueOf()) ||
    generatedAt.toISOString() !== proof.generatedAt ||
    proof.skBaseline?.matched !== true ||
    proof.skBaseline.expected?.count !== proof.skBaseline.observed?.count ||
    proof.skBaseline.expected?.sha256 !== proof.skBaseline.observed?.sha256 ||
    !SHA256_PATTERN.test(proof.skBaseline.expected?.sha256 ?? "") ||
    proof.skPublication?.errors !== 0 ||
    proof.sharedInventoryBaseline?.matched !== true ||
    proof.sharedInventoryBaseline.expected?.count !==
      proof.sharedInventoryBaseline.observed?.count ||
    proof.sharedInventoryBaseline.expected?.sha256 !==
      proof.sharedInventoryBaseline.observed?.sha256 ||
    !SHA256_PATTERN.test(
      proof.sharedInventoryBaseline.expected?.sha256 ?? ""
    ) ||
    proof.roCompletenessProof?.schemaVersion !== 1 ||
    proof.roCompletenessProof.algorithm !== "sha256-canonical-json-v1" ||
    proof.roCompletenessProof.locale !== "ro-RO" ||
    proof.roCompletenessProof.provenance !== "fresh-medusa-database-read" ||
    !SHA256_PATTERN.test(proof.roCompletenessProof.dataHash ?? "")
  ) {
    throw new Error("readiness: invalid Medusa catalog readiness proof")
  }
  assertDemoOmissionPolicy(proof, demoOmissionLedger)
  if (
    !(
      Number.isSafeInteger(proof.summary.products) && proof.summary.products > 0
    ) ||
    proof.summary.productUrlAssignments !== proof.summary.products ||
    proof.summary.variants !==
      proof.roVariantScope.sellable + proof.roVariantScope.unavailable ||
    proof.summary.variantsWithRonPrice !== proof.roVariantScope.sellable ||
    !(
      Number.isSafeInteger(proof.summary.categories) &&
      proof.summary.categories > 0
    ) ||
    proof.summary.categories !== proof.roCategoryScope?.active ||
    proof.summary.categoryUrlAssignments !==
      proof.roCatalogPublication?.categoryIds?.length ||
    proof.summary.categoryLocalizedContentContracts !==
      proof.roCatalogPublication?.categoryIds?.length ||
    proof.summary.brandUrlAssignments !== proof.summary.brands ||
    proof.summary.collectionUrlAssignments !== proof.summary.collections ||
    !Array.isArray(proof.roCatalogPublication?.brandIds) ||
    proof.roCatalogPublication.brandIds.length !== proof.summary.brands ||
    !Array.isArray(proof.roCatalogPublication?.categoryIds) ||
    proof.roCatalogPublication.categoryIds.length !==
      proof.roCategoryScope?.published ||
    !Array.isArray(proof.roCatalogPublication?.collectionIds) ||
    proof.roCatalogPublication.collectionIds.length !==
      proof.summary.collections
  ) {
    throw new Error(
      "readiness: Medusa exact-locale catalog coverage is incomplete"
    )
  }
}

const assertSkBaseline = (baseline, baseUrl) => {
  if (
    baseline?.schemaVersion !== 1 ||
    baseline.kind !== "herbatika-sk-publication-baseline" ||
    baseline.algorithm !== "sha256" ||
    baseline.origin !== new URL(baseUrl).origin ||
    !SHA256_PATTERN.test(baseline.publicationHash ?? "") ||
    baseline.provenance?.source !== "pre-deploy-live-crawl" ||
    !SHA256_PATTERN.test(
      baseline.provenance?.backendSkBaseline?.sha256 ?? ""
    ) ||
    !Number.isSafeInteger(baseline.provenance?.backendSkBaseline?.count)
  ) {
    throw new Error("readiness: invalid trusted SK publication baseline")
  }
}

export const captureSkPublicationBaseline = async ({
  backendSkBaseline,
  baseUrl,
  concurrency = 4,
  fetchImpl = fetch,
  fixture,
  now = () => new Date(),
  requestDelayMs = 75,
}) => {
  if (
    !(
      SHA256_PATTERN.test(backendSkBaseline?.sha256 ?? "") &&
      Number.isSafeInteger(backendSkBaseline?.count)
    )
  ) {
    throw new Error("Trusted Medusa SK baseline count and SHA-256 are required")
  }
  const sitemap = await crawlSitemap({ baseUrl, fetchImpl })
  const records = sitemap.records.filter((record) =>
    entityKind(record.url, fixture.prefixes)
  )
  const evidence = await mapLimit(
    [...new Set(records.map((record) => record.url))].sort(),
    concurrency,
    (url) => pageEvidence({ fetchImpl, requestDelayMs, url })
  )
  for (const page of evidence) {
    if (
      page.buildHash !== sitemap.buildHash ||
      page.buildSlot !== sitemap.buildSlot
    ) {
      throw new Error(
        `Mixed or missing page deployment identity at ${page.url}`
      )
    }
  }
  const pages = new Map(evidence.map((page) => [page.url, page]))
  return {
    schemaVersion: 1,
    kind: "herbatika-sk-publication-baseline",
    algorithm: "sha256",
    origin: new URL(baseUrl).origin,
    publicationHash: publicationHash(records, pages),
    capturedAt: now().toISOString(),
    provenance: {
      buildHash: sitemap.buildHash,
      buildSlot: sitemap.buildSlot,
      backendSkBaseline,
      source: "pre-deploy-live-crawl",
      urlCount: records.length,
    },
  }
}

export const generateLiveReadiness = async ({
  backendReadiness: backendProofEnvelope,
  baseUrls,
  concurrency = 4,
  cutoverChainProof,
  fetchImpl = fetch,
  fixture,
  now = () => new Date(),
  proofHmacKey,
  proofMaxAgeMs = BACKEND_PROOF_MAX_AGE_MS,
  requestDelayMs = 75,
  readinessMode = "production",
  releaseIdentity,
  skBaseline,
  scopePlanArtifact,
  demoOmissionLedgerArtifact,
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: global readiness reconciles three entity kinds across both live markets in one immutable report
}) => {
  assertSkBaseline(skBaseline, baseUrls.sk)
  if (!(cutoverChainProof && validReleaseIdentity(releaseIdentity, baseUrls))) {
    throw new Error(
      "readiness: cutover chain and release identity are required"
    )
  }
  const scopePlan = parseRoCatalogScopePlanArtifact(scopePlanArtifact)
  if (readinessMode !== "production" && readinessMode !== "demo") {
    throw new Error("readiness: mode must be production or demo")
  }
  const demoOmissionLedger = demoOmissionLedgerArtifact
    ? parseRoDemoContentOmissionLedgerArtifact(demoOmissionLedgerArtifact)
    : undefined
  const [skSitemap, roSitemap] = await Promise.all(
    ["sk", "ro"].map((market) =>
      crawlSitemap({ baseUrl: baseUrls[market], fetchImpl })
    )
  )
  const backendReadiness = verifyBackendReadinessProof({
    baseUrls,
    cutoverChainProof,
    envelope: backendProofEnvelope,
    now,
    proofHmacKey,
    proofMaxAgeMs,
    releaseIdentity,
    roSitemap,
    scopePlan,
    skSitemap,
  })
  assertBackendProof(backendReadiness, readinessMode, demoOmissionLedger)
  assertScopePlanProof(backendReadiness, scopePlan, cutoverChainProof)
  if (
    skBaseline.provenance.backendSkBaseline.count !==
      backendReadiness.skBaseline.expected.count ||
    skBaseline.provenance.backendSkBaseline.sha256 !==
      backendReadiness.skBaseline.expected.sha256
  ) {
    throw new Error(
      "readiness: public SK baseline is not bound to Medusa baseline"
    )
  }
  const discoveredRecords = [
    ...skSitemap.records.map((record) => ({ market: "sk", ...record })),
    ...roSitemap.records.map((record) => ({ market: "ro", ...record })),
  ]
  for (const record of discoveredRecords) {
    const classified = entityKind(record.url, fixture[record.market].prefixes)
    const pairedCatalogUrl = Object.values(record.alternates).some((url) =>
      Object.values(fixture).some((marketFixture) =>
        entityKind(url, marketFixture.prefixes)
      )
    )
    if (!classified && pairedCatalogUrl) {
      throw new Error(
        `Unclassified catalog sitemap URL rejected: ${record.url}`
      )
    }
  }
  const allRecords = discoveredRecords.filter((record) =>
    entityKind(record.url, fixture[record.market].prefixes)
  )
  const uniqueUrls = [
    ...new Set(
      allRecords.flatMap((record) => [
        record.url,
        ...Object.values(record.alternates).filter((url) =>
          Object.values(baseUrls).some(
            (baseUrl) => new URL(url).origin === new URL(baseUrl).origin
          )
        ),
      ])
    ),
  ].sort()
  const evidenceValues = await mapLimit(uniqueUrls, concurrency, (url) =>
    pageEvidence({ fetchImpl, requestDelayMs, url })
  )
  const pages = new Map(
    evidenceValues.map((evidence) => [evidence.url, evidence])
  )
  for (const page of evidenceValues) {
    const market =
      new URL(page.url).origin === new URL(baseUrls.sk).origin ? "sk" : "ro"
    const expected = market === "sk" ? skSitemap : roSitemap
    if (
      !(page.buildHash && page.buildSlot) ||
      page.buildHash !== expected.buildHash ||
      page.buildSlot !== expected.buildSlot
    ) {
      throw new Error(
        `Mixed or missing page deployment identity at ${page.url}`
      )
    }
  }
  const localization = {}
  const failedUrls = evidenceValues.filter((page) => page.status !== 200)

  for (const kind of ["products", "categories", "brands", "collections"]) {
    const records = roSitemap.records.filter(
      (record) => entityKind(record.url, fixture.ro.prefixes) === kind
    )
    let identicalSlugsToSk = 0
    let identityComplete = 0
    let localized = 0
    let missingSlugs = 0
    let ronComplete = 0
    const identityOwners = new Map()
    for (const record of records) {
      const roPage = pages.get(record.url)
      const skUrl = record.alternates[fixture.sk.locale.toLowerCase()]
      const skPage = skUrl ? pages.get(skUrl) : undefined
      if (!(slug(record.url) && skUrl && skPage)) {
        missingSlugs += 1
        continue
      }
      const neutral = reviewedNeutral(fixture.ro, kind, record.url, skUrl)
      if (slug(record.url) === slug(skUrl) && !neutral) {
        identicalSlugsToSk += 1
      }
      const identityMatches = sameIdentities(
        roPage?.identities ?? [],
        skPage.identities
      )
      const primaryIdentities = primaryIdentityValues(
        roPage?.identities ?? [],
        kind
      )
      const identityCollision = primaryIdentities.some((identity) => {
        const owner = identityOwners.get(identity)
        identityOwners.set(identity, record.url)
        return owner && owner !== record.url
      })
      if (
        identityMatches &&
        primaryIdentities.length > 0 &&
        !identityCollision
      ) {
        identityComplete += 1
      }
      if (
        roPage?.currencyCodes.length === 1 &&
        roPage.currencyCodes[0] === "RON"
      ) {
        ronComplete += 1
      }
      if (
        roPage?.status === 200 &&
        skPage.status === 200 &&
        roPage.htmlLang.toLowerCase().startsWith("ro") &&
        roPage.canonical === record.url &&
        roPage.title &&
        (roPage.title !== skPage.title || neutral) &&
        ((roPage.description && roPage.description !== skPage.description) ||
          neutral) &&
        hasMeaningfulVisibleCatalogContent(roPage) &&
        !leaksSkVisibleContent(roPage, skPage) &&
        identityMatches &&
        !identityCollision &&
        roPage.currencyCodes.length === 1 &&
        roPage.currencyCodes[0] === "RON" &&
        (slug(record.url) !== slug(skUrl) || neutral)
      ) {
        localized += 1
      }
    }
    localization[kind] = {
      identicalSlugsToSk,
      identityComplete,
      localized,
      missingSlugs,
      ronComplete,
      total: records.length,
    }
  }

  const skErrors = allRecords.filter(
    (record) => record.market === "sk" && pages.get(record.url)?.status !== 200
  ).length
  const sameBuild =
    Boolean(skSitemap.buildHash) &&
    skSitemap.buildHash === roSitemap.buildHash &&
    ZANE_SLOT_PATTERN.test(skSitemap.buildSlot) &&
    skSitemap.buildSlot === roSitemap.buildSlot
  const releaseBuildMatched =
    skSitemap.buildHash === releaseIdentity.storefrontBuildHash &&
    skSitemap.buildSlot === releaseIdentity.storefrontSlot
  const actualSkPublicationHash = publicationHash(
    skSitemap.records.filter((record) =>
      entityKind(record.url, fixture.sk.prefixes)
    ),
    pages
  )
  const skUnchanged = actualSkPublicationHash === skBaseline.publicationHash
  const backendCounts = {
    brands: backendReadiness.roCatalogPublication.brandIds.length,
    categories: backendReadiness.roCatalogPublication.categoryIds.length,
    collections: backendReadiness.roCatalogPublication.collectionIds.length,
    products: backendReadiness.summary.products,
  }
  const backendCountIssues = [
    "products",
    "categories",
    "brands",
    "collections",
  ].filter((kind) => backendCounts[kind] !== localization[kind].total).length
  const authoritativeIdentitySets = {
    brands: backendReadiness.roCatalogPublication.brandIds,
    categories: backendReadiness.roCatalogPublication.categoryIds,
    collections: backendReadiness.roCatalogPublication.collectionIds,
  }
  const backendIdentityIssues = Object.entries(
    authoritativeIdentitySets
  ).filter(([kind, expected]) => {
    const observed = [
      ...new Set(
        roSitemap.records
          .filter(
            (record) => entityKind(record.url, fixture.ro.prefixes) === kind
          )
          .flatMap((record) =>
            primaryIdentityValues(pages.get(record.url)?.identities ?? [], kind)
          )
      ),
    ].sort()
    const normalizedExpected = [...new Set(expected)].sort()
    return (
      observed.length !== normalizedExpected.length ||
      observed.some((value, index) => value !== normalizedExpected[index])
    )
  }).length
  const issues =
    Object.values(localization).reduce(
      (sum, value) =>
        sum +
        (value.total - value.localized) +
        value.identicalSlugsToSk +
        value.missingSlugs,
      0
    ) +
    backendCountIssues +
    backendIdentityIssues
  const report = {
    schemaVersion: 1,
    market: "ro",
    ready:
      backendReadiness.ready === true &&
      failedUrls.length === 0 &&
      issues === 0 &&
      sameBuild &&
      releaseBuildMatched &&
      skUnchanged,
    generatedAt: now().toISOString(),
    origins: {
      ro: new URL(baseUrls.ro).origin,
      sk: new URL(baseUrls.sk).origin,
    },
    builds: {
      ro: { hash: roSitemap.buildHash, slot: roSitemap.buildSlot },
      sk: { hash: skSitemap.buildHash, slot: skSitemap.buildSlot },
    },
    evidenceSource: "live-sitemap-and-public-pages",
    backendProof: {
      algorithm: backendReadiness.roCompletenessProof.algorithm,
      authorityHash: createHash("sha256")
        .update(canonicalJson(backendProofEnvelope))
        .digest("hex"),
      dataHash: backendReadiness.roCompletenessProof.dataHash,
      generatedAt: backendReadiness.generatedAt,
      issuedAt: backendProofEnvelope.issuedAt,
      locale: backendReadiness.roCompletenessProof.locale,
      provenance: backendReadiness.roCompletenessProof.provenance,
      reportHash: createHash("sha256")
        .update(canonicalJson(backendReadiness))
        .digest("hex"),
      source: "medusa-ro-catalog-readiness",
    },
    summary: {
      errors: failedUrls.length + (backendReadiness.summary?.errors ?? 0),
      issues: issues + (backendReadiness.summary?.warnings ?? 0),
    },
    skBaseline: {
      actualPublicationHash: actualSkPublicationHash,
      expectedPublicationHash: skBaseline.publicationHash,
      provenance: skBaseline.provenance,
      unchanged: skUnchanged,
    },
    sharedInventoryBaseline: backendReadiness.sharedInventoryBaseline,
    skPublication: { errors: skErrors },
    sitemap: {
      checkedProductUrls: localization.products.total,
      failedUrls: failedUrls.map(({ status, url }) => ({ status, url })),
      productUrls: localization.products.total,
    },
    localization,
  }
  report.evidenceHash = liveReportHash(report)
  return report
}

export const assertLiveReportIntegrity = (report, baseUrls) => {
  if (report.evidenceSource !== "live-sitemap-and-public-pages") {
    throw new Error("readiness: evidence is not live")
  }
  if (
    report.origins?.ro !== new URL(baseUrls.ro).origin ||
    report.origins?.sk !== new URL(baseUrls.sk).origin
  ) {
    throw new Error(
      "readiness: evidence origins do not match configured origins"
    )
  }
  if (report.evidenceHash !== liveReportHash(report)) {
    throw new Error("readiness: evidence hash mismatch")
  }
}
