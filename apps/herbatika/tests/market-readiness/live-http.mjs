// biome-ignore-all lint/suspicious/noMisplacedAssertion: live-gate assertions are invoked by the CLI and node:test cases
import assert from "node:assert/strict"
import { MARKET_CODES, MARKET_LOCALES } from "./gate-core.mjs"

const MAX_RESPONSE_BYTES = 8 * 1024 * 1024
const MAX_SITEMAPS = 256
const MAX_PAGE_URLS = 50_000
const SITEMAP_LOCATION_PATTERN = /<loc\b[^>]*>([\s\S]*?)<\/loc>/giu
const URL_BLOCK_PATTERN = /<url\b[^>]*>([\s\S]*?)<\/url>/giu
const ATTRIBUTE_PATTERN = /([\w:-]+)=["']([^"']*)["']/gu
const ALTERNATE_PATTERN = /<link\b(?=[^>]*\brel=["']alternate["'])[^>]*>/giu
const CANONICAL_PATTERN = /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/iu
const HTML_LANG_PATTERN = /<html\b[^>]*\blang=["']([^"']+)["']/iu
const BODY_PATTERN = /<body\b[^>]*>([\s\S]*?)<\/body>/iu
const SCRIPT_STYLE_PATTERN =
  /<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/giu
const TAG_PATTERN = /<[^>]*>/gu
const JSON_LD_PATTERN =
  /<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/giu
const CURRENCY_ELEMENT_PATTERN =
  /<(?:meta|data|span|div)\b[^>]*(?:\bitemprop=["']priceCurrency["']|\bproperty=["']product:price:currency["']|\bdata-price-currency=["'][A-Z]{3}["'])[^>]*>/giu
const SLOT_PATTERN = /^(?:blue|green)$/
const SITEMAP_INDEX_PATTERN = /<sitemapindex\b/iu
const URLSET_PATTERN = /<urlset\b/iu
const TRAILING_SLASH_PATTERN = /\/$/u
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/u

const decodeXml = (value) =>
  value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")

const attributes = (tag) =>
  Object.fromEntries(
    [...tag.matchAll(ATTRIBUTE_PATTERN)].map((match) => [
      match[1].toLowerCase(),
      decodeXml(match[2]),
    ])
  )

const visibleText = (html) =>
  decodeXml(
    (html.match(BODY_PATTERN)?.[1] ?? "")
      .replace(SCRIPT_STYLE_PATTERN, " ")
      .replace(TAG_PATTERN, " ")
  )
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim()

const responseText = async (response, label) => {
  const advertisedLength = Number(response.headers.get("content-length") ?? 0)
  assert.ok(
    advertisedLength <= MAX_RESPONSE_BYTES,
    `${label}: response too large`
  )
  const text = await response.text()
  assert.ok(
    Buffer.byteLength(text, "utf8") <= MAX_RESPONSE_BYTES,
    `${label}: response too large`
  )
  return text
}

const deploymentIdentity = (response, label) => {
  const hash = response.headers.get("x-zane-dpl-hash") ?? ""
  const slot = response.headers.get("x-zane-dpl-slot") ?? ""
  assert.ok(hash.length > 0, `${label}: missing x-zane-dpl-hash`)
  assert.match(slot, SLOT_PATTERN, `${label}: invalid x-zane-dpl-slot`)
  return { hash, slot }
}

const assertExpectedDeployment = (observed, expected, label) => {
  assert.deepEqual(
    observed,
    {
      hash: expected.storefront.buildHash,
      slot: expected.storefront.slot,
    },
    `${label}: storefront deployment identity mismatch`
  )
}

const finalUrl = (response, requestedUrl) => response.url || requestedUrl

const parseSitemap = (xml, sitemapUrl, origin) => {
  const locations = [...xml.matchAll(SITEMAP_LOCATION_PATTERN)].map((match) =>
    decodeXml(match[1].trim())
  )
  assert.ok(locations.length > 0, `${sitemapUrl}: sitemap has no locations`)
  const urls = locations.map((location) => {
    const url = new URL(location)
    assert.equal(url.origin, origin, `${sitemapUrl}: cross-origin location`)
    assert.equal(url.search, "", `${sitemapUrl}: location query is forbidden`)
    assert.equal(url.hash, "", `${sitemapUrl}: location fragment is forbidden`)
    return url.href
  })
  const isIndex = SITEMAP_INDEX_PATTERN.test(xml)
  if (isIndex) {
    assert.ok(
      !URLSET_PATTERN.test(xml),
      `${sitemapUrl}: mixed sitemap document`
    )
    return { pageUrls: [], sitemapUrls: urls }
  }
  assert.ok(
    URLSET_PATTERN.test(xml),
    `${sitemapUrl}: unsupported sitemap document`
  )
  assert.equal(
    [...xml.matchAll(URL_BLOCK_PATTERN)].length,
    urls.length,
    `${sitemapUrl}: malformed urlset`
  )
  return { pageUrls: urls, sitemapUrls: [] }
}

const collectJsonCurrencies = (value, currencies) => {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectJsonCurrencies(item, currencies)
    }
    return
  }
  if (!(value && typeof value === "object")) {
    return
  }
  for (const [key, item] of Object.entries(value)) {
    if (
      (key === "priceCurrency" || key === "currencyCode") &&
      typeof item === "string"
    ) {
      if (CURRENCY_CODE_PATTERN.test(item)) {
        currencies.add(item)
      }
    } else {
      collectJsonCurrencies(item, currencies)
    }
  }
}

const pageCurrencies = (html) => {
  const currencies = new Set()
  for (const match of html.matchAll(JSON_LD_PATTERN)) {
    let value
    try {
      value = JSON.parse(match[1])
    } catch {
      throw new Error("page contains invalid application/ld+json")
    }
    collectJsonCurrencies(value, currencies)
  }
  for (const match of html.matchAll(CURRENCY_ELEMENT_PATTERN)) {
    const attrs = attributes(match[0])
    const currency =
      attrs["data-price-currency"] ??
      (attrs.itemprop === "priceCurrency" ||
      attrs.property === "product:price:currency"
        ? attrs.content
        : undefined)
    if (currency && CURRENCY_CODE_PATTERN.test(currency)) {
      currencies.add(currency)
    }
  }
  return [...currencies].sort()
}

const parsePage = (html, label) => {
  const canonicalTag = html.match(CANONICAL_PATTERN)?.[0] ?? ""
  const canonical = attributes(canonicalTag).href ?? ""
  const alternates = {}
  for (const match of html.matchAll(ALTERNATE_PATTERN)) {
    const { href, hreflang } = attributes(match[0])
    if (!(href && hreflang)) {
      continue
    }
    const key = hreflang.toLowerCase()
    assert.equal(
      alternates[key],
      undefined,
      `${label}: duplicate ${key} hreflang`
    )
    const target = new URL(href)
    assert.equal(target.protocol, "https:", `${label}: ${key} must use https`)
    assert.equal(target.username, "", `${label}: ${key} credentials`)
    assert.equal(target.password, "", `${label}: ${key} credentials`)
    assert.equal(target.search, "", `${label}: ${key} query`)
    assert.equal(target.hash, "", `${label}: ${key} fragment`)
    alternates[key] = target.href
  }
  return {
    alternates,
    canonical,
    currencies: pageCurrencies(html),
    htmlLang: html.match(HTML_LANG_PATTERN)?.[1] ?? "",
    visibleText: visibleText(html),
  }
}

const localeKeyByMarket = Object.freeze(
  Object.fromEntries(
    MARKET_CODES.map((market) => [market, MARKET_LOCALES[market].toLowerCase()])
  )
)

const assertPageSeo = ({
  evidence,
  fixture,
  market,
  markets,
  requestedUrl,
  xDefaultMarket,
}) => {
  const canonicalUrl = new URL(evidence.canonical)
  assert.equal(
    canonicalUrl.href,
    requestedUrl,
    `${market}:${requestedUrl}: canonical`
  )
  assert.equal(
    evidence.htmlLang,
    fixture.htmlLang,
    `${market}:${requestedUrl}: html lang`
  )
  for (const alternateMarket of MARKET_CODES) {
    const hreflang = localeKeyByMarket[alternateMarket]
    const href = evidence.alternates[hreflang]
    assert.ok(href, `${market}:${requestedUrl}: missing ${hreflang} hreflang`)
    assert.equal(
      new URL(href).origin,
      markets[alternateMarket].origin,
      `${market}:${requestedUrl}: ${hreflang} origin`
    )
  }
  assert.equal(
    evidence.alternates[localeKeyByMarket[market]],
    requestedUrl,
    `${market}:${requestedUrl}: self hreflang`
  )
  assert.equal(
    evidence.alternates["x-default"],
    evidence.alternates[localeKeyByMarket[xDefaultMarket]],
    `${market}:${requestedUrl}: x-default`
  )
}

const hasPathPrefix = (path, prefixes) =>
  prefixes.some(
    (prefix) =>
      path === prefix.replace(TRAILING_SLASH_PATTERN, "") ||
      path.startsWith(prefix)
  )

const assertCurrency = (evidence, fixture, label) => {
  assert.ok(
    evidence.currencies.includes(fixture.currencyCode),
    `${label}: missing ${fixture.currencyCode} currency evidence`
  )
  for (const forbidden of fixture.forbiddenCurrencyCodes) {
    assert.ok(
      !evidence.currencies.includes(forbidden),
      `${label}: leaked forbidden currency ${forbidden}`
    )
  }
}

const mapConcurrent = async (values, concurrency, callback) => {
  const results = new Array(values.length)
  let cursor = 0
  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    async () => {
      while (cursor < values.length) {
        const index = cursor
        cursor += 1
        results[index] = await callback(values[index], index)
      }
    }
  )
  await Promise.all(workers)
  return results
}

export const probeHostRecognition = async ({
  fetchImpl,
  market,
  markets,
  releaseId,
  releaseIdentity,
}) => {
  const binding = markets[market]
  const observations = []
  for (const host of binding.acceptedHosts) {
    const url = `${binding.origin}/`
    const response = await fetchImpl(url, {
      headers: { host },
      redirect: "manual",
    })
    const isCanonical = host === new URL(binding.origin).hostname
    assert.ok(
      response.status === 200 ||
        (!isCanonical && [301, 308].includes(response.status)),
      `${market}:${host}: accepted Host must return 200 or an alias redirect`
    )
    const deployment = deploymentIdentity(response, `${market}:${host}`)
    assertExpectedDeployment(deployment, releaseIdentity, `${market}:${host}`)
    if (response.status === 200) {
      const html = await responseText(response, `${market}:${host}`)
      const page = parsePage(html, `${market}:${host}`)
      assert.equal(
        page.htmlLang,
        MARKET_LOCALES[market],
        `${market}:${host}: wrong market recognition`
      )
      assert.equal(
        page.canonical,
        `${binding.origin}/`,
        `${market}:${host}: wrong canonical market origin`
      )
    } else {
      assert.equal(
        response.headers.get("location"),
        `${binding.origin}/`,
        `${market}:${host}: alias redirect target`
      )
    }
    observations.push({ host, status: response.status })
  }

  const releaseToken = Buffer.from(releaseId, "utf8")
    .toString("hex")
    .slice(0, 24)
  const allAccepted = new Set(
    Object.values(markets).flatMap(({ acceptedHosts }) => acceptedHosts)
  )
  const candidates = new Set([`unroutable-${market}-${releaseToken}.invalid`])
  for (const host of binding.acceptedHosts) {
    const labels = host.split(".")
    candidates.add(`unroutable-${releaseToken}.${host}`)
    if (labels.length > 1) {
      candidates.add(`unroutable-${releaseToken}.${labels.slice(1).join(".")}`)
    }
  }
  const unknown = []
  for (const host of candidates) {
    if (allAccepted.has(host)) {
      continue
    }
    const unknownResponse = await fetchImpl(`${binding.origin}/`, {
      headers: { host },
      redirect: "manual",
    })
    assert.equal(
      unknownResponse.status,
      421,
      `${market}:${host}: unknown Host must return 421`
    )
    unknown.push({ host, status: 421 })
  }
  return { accepted: observations, unknown }
}

export const crawlMarket = async ({
  concurrency,
  fetchImpl,
  fixture,
  market,
  markets,
  releaseIdentity,
  xDefaultMarket,
}) => {
  const binding = markets[market]
  const origin = binding.origin
  const pending = [`${origin}/sitemap.xml`]
  const queued = new Set(pending)
  const seen = new Set()
  const pageUrls = new Set()
  const sitemapEvidence = []

  while (pending.length > 0) {
    const sitemapUrl = pending.shift()
    assert.ok(!seen.has(sitemapUrl), `${market}: duplicate sitemap traversal`)
    seen.add(sitemapUrl)
    assert.ok(
      seen.size <= MAX_SITEMAPS,
      `${market}: sitemap count exceeds ${MAX_SITEMAPS}`
    )
    const response = await fetchImpl(sitemapUrl, { redirect: "follow" })
    assert.equal(
      response.status,
      200,
      `${market}:${sitemapUrl}: sitemap status`
    )
    assert.equal(
      finalUrl(response, sitemapUrl),
      sitemapUrl,
      `${market}:${sitemapUrl}: sitemap redirect`
    )
    const deployment = deploymentIdentity(response, `${market}:${sitemapUrl}`)
    assertExpectedDeployment(
      deployment,
      releaseIdentity,
      `${market}:${sitemapUrl}`
    )
    const parsed = parseSitemap(
      await responseText(response, sitemapUrl),
      sitemapUrl,
      origin
    )
    sitemapEvidence.push({ pageUrls: parsed.pageUrls.length, url: sitemapUrl })
    for (const child of parsed.sitemapUrls) {
      assert.ok(!queued.has(child), `${market}: duplicate sitemap ${child}`)
      queued.add(child)
      pending.push(child)
    }
    for (const pageUrl of parsed.pageUrls) {
      assert.ok(
        !pageUrls.has(pageUrl),
        `${market}: duplicate page URL ${pageUrl}`
      )
      pageUrls.add(pageUrl)
      assert.ok(
        pageUrls.size <= MAX_PAGE_URLS,
        `${market}: page count exceeds ${MAX_PAGE_URLS}`
      )
    }
  }
  assert.ok(pageUrls.size > 0, `${market}: sitemap contains no page URLs`)

  const requiredByPath = new Map(
    fixture.requiredPages.map((page) => [page.path, page])
  )
  const seenRequired = new Set()
  const currencyPrefixesSeen = new Set()
  let currencyCheckedPageCount = 0
  const pages = await mapConcurrent(
    [...pageUrls],
    concurrency,
    async (pageUrl) => {
      const response = await fetchImpl(pageUrl, { redirect: "follow" })
      assert.equal(response.status, 200, `${market}:${pageUrl}: page status`)
      assert.equal(
        finalUrl(response, pageUrl),
        pageUrl,
        `${market}:${pageUrl}: page redirect`
      )
      const deployment = deploymentIdentity(response, `${market}:${pageUrl}`)
      assertExpectedDeployment(
        deployment,
        releaseIdentity,
        `${market}:${pageUrl}`
      )
      const evidence = parsePage(
        await responseText(response, pageUrl),
        `${market}:${pageUrl}`
      )
      assertPageSeo({
        evidence,
        fixture,
        market,
        markets,
        requestedUrl: pageUrl,
        xDefaultMarket,
      })
      const path = new URL(pageUrl).pathname
      if (hasPathPrefix(path, fixture.currencyPathPrefixes)) {
        assertCurrency(evidence, fixture, `${market}:${path}`)
        currencyCheckedPageCount += 1
        for (const prefix of fixture.currencyPathPrefixes) {
          if (
            path === prefix.replace(TRAILING_SLASH_PATTERN, "") ||
            path.startsWith(prefix)
          ) {
            currencyPrefixesSeen.add(prefix)
          }
        }
      }
      const requirement = requiredByPath.get(path)
      if (requirement) {
        seenRequired.add(path)
        for (const text of requirement.requiredText) {
          assert.ok(
            evidence.visibleText.includes(text.normalize("NFC")),
            `${market}:${path}: missing text ${text}`
          )
        }
      }
      return {
        alternates: evidence.alternates,
        canonical: evidence.canonical,
        currencies: evidence.currencies,
        path,
        url: pageUrl,
      }
    }
  )

  for (const required of fixture.requiredPages) {
    assert.ok(
      seenRequired.has(required.path),
      `${market}: required ${required.kind} page missing from sitemap: ${required.path}`
    )
  }
  assert.ok(
    currencyCheckedPageCount > 0,
    `${market}: no currency pages checked`
  )
  for (const prefix of fixture.currencyPathPrefixes) {
    assert.ok(
      currencyPrefixesSeen.has(prefix),
      `${market}: currency prefix has no sitemap page: ${prefix}`
    )
  }
  return {
    currencyCheckedPageCount,
    pageCount: pages.length,
    pages,
    sitemapCount: sitemapEvidence.length,
    sitemaps: sitemapEvidence,
  }
}

export const assertReciprocalHreflangGraph = ({ crawledByMarket, markets }) => {
  const pagesByMarket = Object.fromEntries(
    MARKET_CODES.map((market) => [
      market,
      new Map(crawledByMarket[market].pages.map((page) => [page.url, page])),
    ])
  )
  for (const sourceMarket of MARKET_CODES) {
    for (const sourcePage of crawledByMarket[sourceMarket].pages) {
      for (const targetMarket of MARKET_CODES) {
        const targetUrl = sourcePage.alternates[localeKeyByMarket[targetMarket]]
        assert.equal(
          new URL(targetUrl).origin,
          markets[targetMarket].origin,
          `${sourceMarket}:${sourcePage.url}: hreflang target origin`
        )
        const targetPage = pagesByMarket[targetMarket].get(targetUrl)
        assert.ok(
          targetPage,
          `${sourceMarket}:${sourcePage.url}: hreflang target missing from ${targetMarket} sitemap: ${targetUrl}`
        )
        assert.equal(
          targetPage.alternates[localeKeyByMarket[sourceMarket]],
          sourcePage.url,
          `${sourceMarket}:${sourcePage.url}: ${targetMarket} hreflang is not reciprocal`
        )
      }
      const xDefault = sourcePage.alternates["x-default"]
      assert.ok(
        MARKET_CODES.some((market) => pagesByMarket[market].has(xDefault)),
        `${sourceMarket}:${sourcePage.url}: x-default target missing from sitemaps`
      )
    }
  }
}
