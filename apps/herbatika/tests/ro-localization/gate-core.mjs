// biome-ignore-all lint/suspicious/noMisplacedAssertion: release-gate assertion helpers are invoked by the CLI and node:test cases
import assert from "node:assert/strict"

const HTTP_PROTOCOL_PATTERN = /^https?:$/
const REGEX_SPECIAL_PATTERN = /[.*+?^${}()|[\]\\]/g
const TRAILING_SLASH_PATTERN = /\/$/
const WHITESPACE_PATTERN = /\s+/g
const VISIBLE_AMOUNT_PATTERN =
  "(?:\\d{1,3}(?:[ .]\\d{3})*|\\d+)(?:[,.]\\d{1,2})?"
const SHA256_PATTERN = /^[a-f0-9]{64}$/
const ZANE_SLOT_PATTERN = /^(?:blue|green)$/

const trimTrailingSlash = (value) => value.replace(TRAILING_SLASH_PATTERN, "")

export const normalizeBaseUrl = (value, label) => {
  const url = new URL(value)
  assert.match(
    url.protocol,
    HTTP_PROTOCOL_PATTERN,
    `${label} must use http or https`
  )
  assert.equal(url.username, "", `${label} must not contain credentials`)
  assert.equal(url.password, "", `${label} must not contain credentials`)
  assert.equal(url.search, "", `${label} must not contain a query`)
  assert.equal(url.hash, "", `${label} must not contain a fragment`)
  url.pathname = "/"
  return trimTrailingSlash(url.href)
}

export const publicUrl = (baseUrl, path) =>
  new URL(path, `${trimTrailingSlash(baseUrl)}/`).href

export const normalizeText = (value) =>
  value.normalize("NFC").replace(WHITESPACE_PATTERN, " ").trim()

const assertContains = (haystack, needle, message) =>
  assert.ok(haystack.includes(normalizeText(needle)), message)

const assertRootContent = (bodyText, marketFixture) => {
  for (const label of marketFixture.rootLabels) {
    assertContains(bodyText, label, `root: missing navigation label ${label}`)
  }
  for (const label of marketFixture.forbiddenRootLabels ?? []) {
    assert.ok(
      !bodyText.includes(normalizeText(label)),
      `root: leaked label ${label}`
    )
  }
}

const assertCatalogContent = ({ bodyText, evidence, pageFixture, pageKey }) => {
  assert.equal(
    decodeURIComponent(new URL(evidence.url).pathname).replace(
      TRAILING_SLASH_PATTERN,
      ""
    ),
    pageFixture.path,
    `${pageKey}: final localized path mismatch`
  )
  assert.ok(
    new URL(evidence.url).pathname.includes(`/${pageFixture.slug}`),
    `${pageKey}: localized slug is missing from final URL`
  )
  assertContains(
    bodyText,
    pageFixture.title,
    `${pageKey}: localized title is missing`
  )
  for (const identifier of pageFixture.identifiers ?? []) {
    assertContains(
      bodyText,
      identifier,
      `${pageKey}: expected product identifier is missing`
    )
  }
  for (const slug of pageFixture.forbiddenSlugs ?? []) {
    assert.ok(
      !evidence.url.includes(slug),
      `${pageKey}: leaked forbidden slug ${slug}`
    )
  }
}

const currencyAmountPattern = (token) => {
  const escapedToken = token.replace(REGEX_SPECIAL_PATTERN, "\\$&")
  return new RegExp(
    `(?:${VISIBLE_AMOUNT_PATTERN}\\s*(?<!\\p{L})${escapedToken}(?!\\p{L})|(?<!\\p{L})${escapedToken}(?!\\p{L})\\s*${VISIBLE_AMOUNT_PATTERN})`,
    "iu"
  )
}

const hasVisibleCurrencyAmount = (bodyText, displayTokens) =>
  displayTokens.some((token) => currencyAmountPattern(token).test(bodyText))

const assertCurrency = ({ bodyText, evidence, marketFixture, pageKey }) => {
  const currency = marketFixture.currency
  const structuredCodes = (evidence.priceCurrencies ?? []).map((code) =>
    code.toUpperCase()
  )
  const hasStructuredCurrency = structuredCodes.includes(currency.code)
  const hasVisiblePrice = hasVisibleCurrencyAmount(
    bodyText,
    currency.displayTokens
  )
  assert.ok(
    hasStructuredCurrency || hasVisiblePrice,
    `${pageKey}: missing structured ${currency.code} or visible amount with currency`
  )
  for (const code of currency.forbiddenCodes ?? []) {
    assert.ok(
      !structuredCodes.includes(code),
      `${pageKey}: leaked structured currency ${code}`
    )
  }
  for (const token of currency.forbiddenDisplayTokens ?? []) {
    assert.ok(
      !hasVisibleCurrencyAmount(bodyText, [token]),
      `${pageKey}: leaked visible price currency ${token}`
    )
  }
}

export const assertSeoEvidence = ({
  baseUrls,
  evidence,
  fixture,
  market,
  pageKey,
}) => {
  const pageFixture =
    pageKey === "root" ? { path: "/" } : fixture[market][pageKey]
  const expectedCanonical = publicUrl(baseUrls[market], pageFixture.path)
  assert.ok(
    evidence.htmlLang.toLowerCase().startsWith(fixture[market].language),
    `${market}.${pageKey}: html lang must start with ${fixture[market].language}`
  )
  const expectedTitle =
    pageKey === "root" ? fixture[market].rootTitle : pageFixture.title
  assertContains(
    normalizeText(evidence.title),
    expectedTitle,
    `${market}.${pageKey}: localized document title is missing`
  )
  assert.equal(
    evidence.canonical,
    expectedCanonical,
    `${market}.${pageKey}: canonical URL mismatch`
  )
  for (const alternateMarket of Object.keys(fixture)) {
    const alternateFixture =
      pageKey === "root" ? { path: "/" } : fixture[alternateMarket][pageKey]
    const expectedHref = publicUrl(
      baseUrls[alternateMarket],
      alternateFixture.path
    )
    assert.equal(
      evidence.alternates[fixture[alternateMarket].locale.toLowerCase()],
      expectedHref,
      `${market}.${pageKey}: missing ${alternateMarket} hreflang`
    )
  }
}

export const assertPageEvidence = ({ evidence, marketFixture, pageKey }) => {
  assert.equal(evidence.status, 200, `${pageKey}: expected HTTP 200`)
  const bodyText = normalizeText(evidence.bodyText)
  const pageFixture = pageKey === "root" ? undefined : marketFixture[pageKey]

  if (pageKey === "root") {
    assertRootContent(bodyText, marketFixture)
  } else {
    assertCatalogContent({ bodyText, evidence, pageFixture, pageKey })
  }

  assertCurrency({ bodyText, evidence, marketFixture, pageKey })
}

export const assertGlobalReadiness = (report) => {
  assert.equal(report.schemaVersion, 1, "readiness: unsupported schema")
  assert.equal(report.market, "ro", "readiness: market must be ro")
  assert.equal(report.ready, true, "readiness: report is not explicitly ready")
  assert.equal(report.summary?.errors, 0, "readiness: summary contains errors")
  assert.equal(report.summary?.issues, 0, "readiness: summary contains issues")
  assert.equal(
    report.skBaseline?.unchanged,
    true,
    "readiness: SK baseline changed"
  )
  assert.equal(
    report.skPublication?.errors,
    0,
    "readiness: SK publication contains errors"
  )
  assert.equal(
    report.sharedInventoryBaseline?.matched,
    true,
    "readiness: shared inventory baseline changed"
  )
  assert.match(
    report.backendProof?.dataHash ?? "",
    SHA256_PATTERN,
    "readiness: backend completeness proof is missing"
  )
  assert.match(
    report.backendProof?.authorityHash ?? "",
    SHA256_PATTERN,
    "readiness: signed backend authority is missing"
  )
  assert.equal(
    report.builds?.sk?.hash,
    report.builds?.ro?.hash,
    "readiness: SK and RO are not on the same build"
  )
  assert.equal(
    report.builds?.sk?.slot,
    report.builds?.ro?.slot,
    "readiness: SK and RO are not on the same deployment slot"
  )
  assert.match(
    report.builds?.sk?.slot ?? "",
    ZANE_SLOT_PATTERN,
    "readiness: deployment slot must be BLUE or GREEN"
  )
  const productUrls = report.sitemap?.productUrls
  assert.ok(
    Number.isSafeInteger(productUrls) && productUrls > 0,
    "readiness: sitemap.productUrls must be positive"
  )
  assert.equal(
    report.sitemap.checkedProductUrls,
    productUrls,
    "readiness: every sitemap product URL must be checked"
  )
  assert.deepEqual(
    report.sitemap.failedUrls,
    [],
    "readiness: sitemap contains failed product URLs"
  )
  for (const kind of ["products", "categories", "brands", "collections"]) {
    const evidence = report.localization?.[kind]
    const validTotal =
      Number.isSafeInteger(evidence?.total) &&
      (kind === "collections" ? evidence.total >= 0 : evidence.total > 0)
    assert.ok(validTotal, `readiness: ${kind}.total is invalid`)
    if (kind === "products") {
      assert.equal(
        evidence.total,
        productUrls,
        "readiness: product totals do not match the sitemap"
      )
    }
    assert.equal(
      evidence.localized,
      evidence.total,
      `readiness: ${kind} are not fully localized`
    )
    assert.equal(
      evidence.identityComplete,
      evidence.total,
      `readiness: ${kind} public identities are incomplete`
    )
    assert.equal(
      evidence.ronComplete,
      evidence.total,
      `readiness: ${kind} do not expose exact RON evidence`
    )
    assert.equal(
      evidence.identicalSlugsToSk,
      0,
      `readiness: ${kind} still reuse SK slugs`
    )
    assert.equal(
      evidence.missingSlugs,
      0,
      `readiness: ${kind} have missing slugs`
    )
  }
}

export const assertNoServerErrors = (serverErrors) => {
  assert.deepEqual(
    serverErrors,
    [],
    `Observed 5xx responses:\n${serverErrors
      .map(({ status, url }) => `${status} ${url}`)
      .join("\n")}`
  )
}
