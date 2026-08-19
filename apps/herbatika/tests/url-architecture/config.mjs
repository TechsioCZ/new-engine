import { readFile } from "node:fs/promises"
import { isAbsolute, resolve } from "node:path"

const EXPECTED_MARKETS = Object.freeze({
  cz: { aboutPathStatus: 200, host: "herbatica.cz", locale: "cs-CZ" },
  hu: { aboutPathStatus: 404, host: "herbatica.hu", locale: "hu-HU" },
  ro: { aboutPathStatus: 404, host: "herbatica.ro", locale: "ro-RO" },
  sk: { aboutPathStatus: 200, host: "herbatica.sk", locale: "sk-SK" },
})
const TOKEN_ENVIRONMENT_VARIABLE = /^URL_ARCHITECTURE_[A-Z0-9_]+$/

const requiredString = (value, label) => {
  if (!(typeof value === "string" && value.length > 0)) {
    throw new Error(`${label} must be a non-empty string`)
  }
  return value
}

const requiredPath = (value, label) => {
  const path = requiredString(value, label)
  if (!(path.startsWith("/") && !path.startsWith("//"))) {
    throw new Error(`${label} must be an absolute-path reference`)
  }
  return path
}

const resolveInheritance = (markets) => {
  const byMarket = new Map(markets.map((market) => [market.market, market]))
  return markets.map((market) => {
    if (!market.inheritFixtureFrom) {
      return market
    }
    const parent = byMarket.get(market.inheritFixtureFrom)
    if (!parent || parent.inheritFixtureFrom) {
      throw new Error(
        `${market.market}.inheritFixtureFrom must name one concrete market fixture`
      )
    }
    return {
      ...structuredClone(parent),
      ...market,
      alias: market.alias ?? structuredClone(parent.alias),
      outages: market.outages ?? structuredClone(parent.outages),
      queryCases: market.queryCases ?? structuredClone(parent.queryCases),
      superseded: market.superseded ?? structuredClone(parent.superseded),
      temporaryRedirect:
        market.temporaryRedirect ?? structuredClone(parent.temporaryRedirect),
      token: market.token ?? structuredClone(parent.token),
    }
  })
}

const validateRedirect = (value, label, expectedStatus, expectedHost) => {
  if (!value || typeof value !== "object") {
    throw new Error(`${label} is required`)
  }
  requiredPath(value.path, `${label}.path`)
  const location = new URL(requiredString(value.location, `${label}.location`))
  if (
    location.protocol !== "https:" ||
    location.host !== expectedHost ||
    location.hash
  ) {
    throw new Error(`${label}.location must use the canonical market origin`)
  }
  return { ...value, expectedStatus }
}

const validateTokenPaths = (market) => {
  if (
    !(
      Array.isArray(market.token?.invalidPaths) &&
      market.token.invalidPaths.length === 3
    )
  ) {
    throw new Error(
      `${market.market}.token.invalidPaths must cover invalid, used, and expired`
    )
  }
  market.token.invalidPaths.forEach((path, index) => {
    requiredPath(path, `${market.market}.token.invalidPaths[${index}]`)
    requiredString(
      path.split("/").at(-1),
      `${market.market}.token.invalidPaths[${index}] token segment`
    )
  })
}

const validateAboutPathCase = (market, expected) => {
  const pathCase = market.aboutPathCase
  if (!pathCase || typeof pathCase !== "object") {
    throw new Error(`${market.market}.aboutPathCase is required`)
  }
  if (
    requiredPath(pathCase.path, `${market.market}.aboutPathCase.path`) !==
    "/o-nas"
  ) {
    throw new Error(`${market.market}.aboutPathCase.path must be /o-nas`)
  }
  if (pathCase.status !== expected.aboutPathStatus) {
    throw new Error(
      `${market.market}.aboutPathCase.status must be ${expected.aboutPathStatus}`
    )
  }
  if (pathCase.status === 404) {
    if (pathCase.canonical !== null) {
      throw new Error(
        `${market.market}.aboutPathCase.canonical must be null for 404`
      )
    }
    return
  }
  const canonical = new URL(
    requiredString(
      pathCase.canonical,
      `${market.market}.aboutPathCase.canonical`
    )
  )
  if (canonical.href !== `https://${market.host}/o-nas`) {
    throw new Error(
      `${market.market}.aboutPathCase.canonical must be its canonical /o-nas URL`
    )
  }
}

const validateQueryCase = (market, queryCase, index) => {
  const label = `${market.market}.queryCases[${index}]`
  requiredPath(queryCase.path, `${label}.path`)
  if (![200, 308, 404].includes(queryCase.status)) {
    throw new Error(`${label}.status is invalid`)
  }
  if (queryCase.status === 308) {
    const location = new URL(
      requiredString(queryCase.location, `${label}.location`)
    )
    if (location.protocol !== "https:" || location.host !== market.host) {
      throw new Error(`${label}.location must use the canonical market origin`)
    }
  }
  if (queryCase.status !== 200) {
    return
  }
  if (
    typeof queryCase.indexable !== "boolean" ||
    typeof queryCase.hreflang !== "boolean"
  ) {
    throw new Error(`${label} must declare indexable and hreflang`)
  }
  if (queryCase.indexable) {
    const canonical = new URL(
      requiredString(queryCase.canonical, `${label}.canonical`)
    )
    if (canonical.protocol !== "https:" || canonical.host !== market.host) {
      throw new Error(`${label}.canonical must use the canonical market origin`)
    }
  } else if (queryCase.canonical !== null) {
    throw new Error(`${label}.canonical must be null when noindex`)
  }
}

const validateQueryCases = (market) => {
  if (!(Array.isArray(market.queryCases) && market.queryCases.length >= 4)) {
    throw new Error(
      `${market.market}.queryCases must cover at least four cases`
    )
  }
  for (const [index, queryCase] of market.queryCases.entries()) {
    validateQueryCase(market, queryCase, index)
  }
}

const validateCrawlLists = (market) => {
  for (const [field, minimum] of [
    ["crawlRoots", 5],
    ["crawlPrefixes", 4],
  ]) {
    if (!(Array.isArray(market[field]) && market[field].length >= minimum)) {
      throw new Error(`${market.market}.${field} has too few paths`)
    }
    market[field].forEach((path, index) => {
      requiredPath(path, `${market.market}.${field}[${index}]`)
    })
  }
}

const validateMarketLists = (market) => {
  validateTokenPaths(market)
  validateQueryCases(market)
  validateCrawlLists(market)
}

const validateMarket = (market) => {
  const expected = EXPECTED_MARKETS[market.market]
  if (!expected) {
    throw new Error(`unsupported market fixture ${String(market.market)}`)
  }
  if (market.host !== expected.host || market.locale !== expected.locale) {
    throw new Error(
      `${market.market} must use ${expected.host} and ${expected.locale}`
    )
  }
  validateAboutPathCase(market, expected)
  const browserOrigin = new URL(
    requiredString(market.browserOrigin, `${market.market}.browserOrigin`)
  )
  if (browserOrigin.href !== `https://${market.host}/`) {
    throw new Error(
      `${market.market}.browserOrigin must be the canonical HTTPS origin`
    )
  }

  for (const field of [
    "home",
    "currentProduct",
    "currentCategory",
    "currentCms",
    "unassignedProduct",
    "missingProduct",
    "missingCategory",
    "missingCms",
    "gone",
  ]) {
    requiredPath(market[field], `${market.market}.${field}`)
  }
  for (const outcome of [
    "current",
    "alias",
    "missing",
    "gone",
    "unavailable",
  ]) {
    requiredPath(
      market.statusProbe?.[outcome],
      `${market.market}.statusProbe.${outcome}`
    )
  }
  validateRedirect(market.alias, `${market.market}.alias`, 308, market.host)
  validateRedirect(
    market.superseded,
    `${market.market}.superseded`,
    308,
    market.host
  )
  validateRedirect(
    market.temporaryRedirect,
    `${market.market}.temporaryRedirect`,
    307,
    market.host
  )

  for (const source of ["urlRegistry", "medusa", "cms"]) {
    requiredPath(market.outages?.[source], `${market.market}.outages.${source}`)
  }
  requiredPath(market.token?.path, `${market.market}.token.path`)
  requiredString(market.token?.secret, `${market.market}.token.secret`)
  validateMarketLists(market)
  return market
}

const validateGlobalFixture = (fixture) => {
  for (const listName of [
    "legacyPaths",
    "internalNamespacePaths",
    "raw400Targets",
    "rawAuthorities",
  ]) {
    if (!(Array.isArray(fixture[listName]) && fixture[listName].length > 0)) {
      throw new Error(`${listName} must be a non-empty array`)
    }
  }
  for (const [index, raw] of fixture.raw400Targets.entries()) {
    requiredPath(raw?.target, `raw400Targets[${index}].target`)
    if (![400, 404].includes(raw?.status)) {
      throw new Error(`raw400Targets[${index}].status must be 400 or 404`)
    }
  }
  for (const [index, raw] of fixture.rawAuthorities.entries()) {
    requiredString(raw?.authority, `rawAuthorities[${index}].authority`)
    if (raw?.status !== 400) {
      throw new Error(`rawAuthorities[${index}].status must be 400`)
    }
  }
  fixture.legacyPaths.forEach((path, index) => {
    requiredPath(path, `legacyPaths[${index}]`)
  })
  fixture.internalNamespacePaths.forEach((path, index) => {
    requiredPath(path, `internalNamespacePaths[${index}]`)
  })
  const unknownHost = requiredString(fixture.unknownHost, "unknownHost")
  if (
    Object.values(EXPECTED_MARKETS).some(({ host }) => host === unknownHost)
  ) {
    throw new Error("unknownHost must not be a canonical market host")
  }
}

const validateLifecycle = (fixture) => {
  const lifecycle = fixture.lifecycle
  if (!lifecycle || typeof lifecycle !== "object") {
    throw new Error("lifecycle fixture is required")
  }
  if (!EXPECTED_MARKETS[lifecycle.market]) {
    throw new Error("lifecycle.market is invalid")
  }
  for (const field of ["oldPath", "newPath", "endpoint"]) {
    requiredPath(lifecycle[field], `lifecycle.${field}`)
  }
  requiredString(
    lifecycle.tokenEnvironmentVariable,
    "lifecycle.tokenEnvironmentVariable"
  )
  if (!TOKEN_ENVIRONMENT_VARIABLE.test(lifecycle.tokenEnvironmentVariable)) {
    throw new Error("lifecycle token environment variable is not scoped")
  }
  if (!(lifecycle.delivery && typeof lifecycle.delivery === "object")) {
    throw new Error("lifecycle.delivery is required")
  }
  lifecycle.convergenceTimeoutMs = positiveInteger(
    lifecycle.convergenceTimeoutMs,
    10_000,
    "lifecycle.convergenceTimeoutMs"
  )
}

export const loadReleaseFixture = async () => {
  const fixturePath = process.env.URL_ARCHITECTURE_FIXTURE
  if (!fixturePath) {
    throw new Error(
      "URL_ARCHITECTURE_FIXTURE is required; release evidence may not silently skip"
    )
  }
  if (!isAbsolute(fixturePath)) {
    throw new Error("URL_ARCHITECTURE_FIXTURE must be an absolute path")
  }
  const fixture = JSON.parse(await readFile(resolve(fixturePath), "utf8"))
  if (fixture.schemaVersion !== 2) {
    throw new Error("URL architecture fixture schemaVersion must be 2")
  }
  const baseUrl = new URL(requiredString(fixture.baseUrl, "baseUrl"))
  if (!(baseUrl.protocol === "http:" || baseUrl.protocol === "https:")) {
    throw new Error("baseUrl must use http or https")
  }
  if (baseUrl.pathname !== "/" || baseUrl.search || baseUrl.hash) {
    throw new Error("baseUrl must not contain a path, query, or fragment")
  }

  const markets = resolveInheritance(fixture.markets ?? []).map(validateMarket)
  assertExactMarkets(markets)
  validateGlobalFixture(fixture)
  validateLifecycle(fixture)

  return Object.freeze({
    ...fixture,
    baseUrl,
    markets,
    maxCrawlUrls: positiveInteger(fixture.maxCrawlUrls, 200, "maxCrawlUrls"),
    requestTimeoutMs: positiveInteger(
      fixture.requestTimeoutMs,
      10_000,
      "requestTimeoutMs"
    ),
  })
}

const assertExactMarkets = (markets) => {
  const actual = markets.map(({ market }) => market).sort()
  const expected = Object.keys(EXPECTED_MARKETS).sort()
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`markets must be exactly ${expected.join(", ")}`)
  }
}

const positiveInteger = (value, fallback, label) => {
  const result = value ?? fallback
  if (!(Number.isInteger(result) && result > 0)) {
    throw new Error(`${label} must be a positive integer`)
  }
  return result
}
