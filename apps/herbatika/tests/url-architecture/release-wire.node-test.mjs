// biome-ignore-all lint/suspicious/noMisplacedAssertion: assertion helpers execute only from node:test cases
import assert from "node:assert/strict"
import { test } from "node:test"
import { setTimeout as delay } from "node:timers/promises"
import { loadReleaseFixture } from "./config.mjs"
import { crawlInternalLinks } from "./crawler.mjs"
import {
  inspectHtml,
  jsonLdContainsUrl,
  xmlLocations,
} from "./html-evidence.mjs"
import { createHttpClient } from "./http-client.mjs"

const fixture = await loadReleaseFixture()
const client = createHttpClient(fixture)
const RSC_HEADERS = Object.freeze({
  rsc: "1",
  "next-router-prefetch": "1",
  "next-router-segment-prefetch": "/_tree",
  "next-router-state-tree": "%5B%22%22%5D",
  "next-url": "/attacker-controlled",
  "x-canonical-origin": "https://attacker.invalid",
  "x-market-code": "xx",
  "x-nextjs-data": "1",
  "x-sales-channel-id": "sc_attacker",
  "x-sf-canonical-origin": "https://attacker.invalid",
  "x-sf-market": "xx",
  "x-sf-public-path": "/attacker-controlled",
})
const ERROR_NO_INDEX = /(?:^|,)\s*noindex(?:\s*,|$)/i
const NO_STORE = /no-store/i
const RETRY_AFTER = /^[1-9][0-9]*$/
const HTML_CONTENT_TYPE = /text\/html/i
const DOCUMENT_HEAD = /<head\b[^>]*>([\s\S]*?)<\/head>/i

const publicUrl = (market, path) => new URL(path, `https://${market.host}`).href

const semanticHeaders = ({ headers }) => ({
  allow: headers.allow,
  "cache-control": headers["cache-control"],
  "content-type": headers["content-type"],
  location: headers.location,
  "retry-after": headers["retry-after"],
  "x-robots-tag": headers["x-robots-tag"],
})

const requestPair = async ({ headers = {}, host, path }) => {
  const [get, head] = await Promise.all([
    client.request({ headers, host, method: "GET", path }),
    client.request({ headers, host, method: "HEAD", path }),
  ])
  assert.equal(head.status, get.status)
  assert.equal(head.body.byteLength, 0)
  assert.deepEqual(semanticHeaders(head), semanticHeaders(get))
  return { get, head }
}

const assertHardError = (response, expectedStatus) => {
  assert.equal(response.status, expectedStatus)
  assert.match(response.headers["cache-control"] ?? "", NO_STORE)
  assert.match(response.headers["x-robots-tag"] ?? "", ERROR_NO_INDEX)
  assert.equal(response.headers.location, undefined)
  if (expectedStatus === 503) {
    assert.match(response.headers["retry-after"] ?? "", RETRY_AFTER)
  }
}

const assertIndexableHtml = ({ expectedUrl, locale, response }) => {
  assert.equal(response.status, 200)
  assert.match(response.headers["content-type"] ?? "", HTML_CONTENT_TYPE)
  const html = inspectHtml(response.body.toString("utf8"))
  assert.equal(html.htmlLang, locale)
  assert.equal(html.canonical, expectedUrl)
  assert.equal(html.ogUrl, expectedUrl)
  assert.equal(html.noindex, false)
  assert.ok(jsonLdContainsUrl(html.jsonLd, expectedUrl))
  return html
}

const assertRedirect = (response, status, location) => {
  assert.equal(response.status, status)
  assert.equal(response.headers.location, location)
  assert.equal(response.body.includes(Buffer.from("http-equiv", "utf8")), false)
}

const readSitemapUrls = async (market) => {
  const index = await client.request({
    host: market.host,
    path: "/sitemap.xml",
  })
  assert.equal(index.status, 200)
  const shardUrls = xmlLocations(index.body.toString("utf8"))
  assert.ok(shardUrls.length > 0)
  assert.ok(shardUrls.length <= fixture.maxCrawlUrls)
  const pageUrls = []
  for (const shardValue of shardUrls) {
    const shardUrl = new URL(shardValue)
    assert.equal(shardUrl.hostname, market.host)
    assert.equal(shardUrl.search, "")
    const shard = await client.request({
      host: market.host,
      path: shardUrl.pathname,
    })
    assert.equal(shard.status, 200)
    pageUrls.push(...xmlLocations(shard.body.toString("utf8")))
    assert.ok(pageUrls.length <= fixture.maxCrawlUrls)
  }
  return pageUrls
}

test("wire.host-method-and-spoofing", async () => {
  for (const market of fixture.markets) {
    const ordinary = await client.request({
      host: market.host,
      path: market.home,
    })
    const spoofed = await client.request({
      headers: RSC_HEADERS,
      host: market.host,
      path: market.home,
    })
    assert.equal(ordinary.status, 200)
    assert.equal(spoofed.status, 200)
    assert.equal(
      inspectHtml(spoofed.body.toString("utf8")).htmlLang,
      market.locale
    )

    const options = await client.request({
      host: market.host,
      method: "OPTIONS",
      path: market.alias.path,
    })
    assert.equal(options.status, 204)
    assert.equal(options.body.byteLength, 0)
    assert.equal(options.headers.allow, "GET, HEAD")
    assert.equal(options.headers.location, undefined)

    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const response = await client.request({
        body: "acceptance-body",
        host: market.host,
        method,
        path: market.alias.path,
      })
      assert.equal(response.status, 405)
      assert.equal(response.headers.allow, "GET, HEAD")
      assert.equal(response.headers.location, undefined)
    }
  }

  for (const headers of [{}, RSC_HEADERS]) {
    const { get: unknown } = await requestPair({
      headers,
      host: fixture.unknownHost,
      path: "/",
    })
    assert.equal(unknown.status, 421)
    assert.equal(unknown.headers.location, undefined)
  }
})

test("wire.raw-request-boundary", async () => {
  const market = fixture.markets[0]
  for (const entry of fixture.raw400Targets) {
    for (const method of ["GET", "HEAD"]) {
      const raw = await client.rawRequest({
        host: market.host,
        method,
        requestTarget: entry.target,
      })
      assert.equal(raw.status, entry.status)
    }
  }
  for (const entry of fixture.rawAuthorities) {
    for (const method of ["GET", "HEAD"]) {
      const raw = await client.rawRequest({
        authority: entry.authority,
        host: market.host,
        method,
        requestTarget: "/",
      })
      assert.equal(raw.status, entry.status)
    }
  }
  const tooLong = `/${"a".repeat(2048)}`
  for (const method of ["GET", "HEAD"]) {
    assert.equal(
      (
        await client.rawRequest({
          host: market.host,
          method,
          requestTarget: tooLong,
        })
      ).status,
      414
    )
  }
  for (const path of fixture.internalNamespacePaths) {
    const response = await client.request({ host: market.host, path })
    assert.equal(response.status, 404)
    assert.equal(response.headers.location, undefined)
  }
})

test("wire.query-normalization", async () => {
  for (const market of fixture.markets) {
    for (const queryCase of market.queryCases) {
      const { get: response } = await requestPair({
        host: market.host,
        path: queryCase.path,
      })
      assert.equal(response.status, queryCase.status)
      assert.equal(response.headers.location, queryCase.location)
      if (queryCase.status !== 200) {
        continue
      }
      const html = inspectHtml(response.body.toString("utf8"))
      assert.equal(html.canonical, queryCase.canonical ?? undefined)
      assert.equal(html.noindex, queryCase.indexable === false)
      assert.equal(html.alternates.length > 0, queryCase.hreflang === true)
    }
  }
})

test("wire.html-and-system-seo", async () => {
  const expectedProductAlternates = new Map(
    fixture.markets.map((market) => [
      market.locale,
      publicUrl(market, market.currentProduct),
    ])
  )

  for (const market of fixture.markets) {
    for (const path of [
      market.home,
      market.currentProduct,
      market.currentCategory,
      market.currentCms,
    ]) {
      const { get: response } = await requestPair({
        host: market.host,
        path,
      })
      const html = assertIndexableHtml({
        expectedUrl: publicUrl(market, path),
        locale: market.locale,
        response,
      })
      assert.equal(
        html.alternates.some(({ hreflang }) => hreflang === "x-default"),
        false
      )
    }

    const productResponse = await client.request({
      host: market.host,
      path: market.currentProduct,
    })
    const productHtml = inspectHtml(productResponse.body.toString("utf8"))
    assert.deepEqual(
      new Map(
        productHtml.alternates.map(({ href, hreflang }) => [hreflang, href])
      ),
      expectedProductAlternates
    )
    for (const equivalent of fixture.markets) {
      const href = publicUrl(equivalent, equivalent.currentProduct)
      assert.ok(
        href === publicUrl(market, market.currentProduct) ||
          productHtml.anchors.includes(href),
        `market switcher omitted ${equivalent.market}`
      )
    }

    const robots = await client.request({
      host: market.host,
      path: "/robots.txt",
    })
    assert.equal(robots.status, 200)
    const robotsText = robots.body.toString("utf8")
    assert.deepEqual(
      robotsText.match(/^Disallow: .*$/gm)?.sort(),
      ["Disallow: /api/", "Disallow: /~sf/"].sort()
    )
    assert.match(
      robotsText,
      new RegExp(`Sitemap: https://${market.host}/sitemap\\.xml`)
    )

    const manifest = await client.request({
      host: market.host,
      path: "/manifest.webmanifest",
    })
    assert.equal(manifest.status, 200)
    const manifestBody = JSON.parse(manifest.body.toString("utf8"))
    assert.equal(manifestBody.lang, market.locale)
    assert.equal(manifestBody.start_url, `https://${market.host}/`)
    assert.ok(manifestBody.icons.length > 0)
    assert.ok(
      manifestBody.icons.every(
        ({ src }) => new URL(src).hostname === market.host
      )
    )

    for (const path of [
      "/favicon.ico",
      "/feeds/products.xml",
      "/sitemap.xml",
    ]) {
      assert.equal(
        (await client.request({ host: market.host, path })).status,
        200
      )
    }
    const feed = await client.request({
      host: market.host,
      path: "/feeds/products.xml",
    })
    const feedUrls = [
      ...feed.body.toString("utf8").matchAll(/<URL>(https:\/\/[^<]+)<\/URL>/g),
    ].map((match) => match[1].replaceAll("&amp;", "&"))
    assert.ok(feedUrls.length > 0)
    for (const value of feedUrls) {
      const url = new URL(value)
      assert.equal(url.hostname, market.host)
      assert.equal(url.search, "")
      assert.equal(
        fixture.legacyPaths.some(
          (legacy) =>
            url.pathname === legacy || url.pathname.startsWith(`${legacy}/`)
        ),
        false
      )
    }
    assert.equal(
      (
        await client.request({
          host: market.host,
          path: "/.well-known/not-registered",
        })
      ).status,
      404
    )
  }
})

test("wire.dependency-outages", async () => {
  for (const market of fixture.markets) {
    for (const path of Object.values(market.outages)) {
      for (const headers of [{}, RSC_HEADERS]) {
        const { get } = await requestPair({ headers, host: market.host, path })
        assertHardError(get, 503)
      }
    }
  }
})

test("wire.redirect-and-method-contract", async () => {
  for (const market of fixture.markets) {
    for (const headers of [{}, RSC_HEADERS]) {
      for (const redirect of [market.alias, market.superseded]) {
        const { get } = await requestPair({
          headers,
          host: market.host,
          path: redirect.path,
        })
        assertRedirect(get, 308, redirect.location)
        const destination = new URL(redirect.location)
        const current = await client.request({
          host: destination.host,
          path: `${destination.pathname}${destination.search}`,
        })
        assert.equal(current.status, 200)
        assert.equal(current.headers.location, undefined)
      }
      const temporary = await requestPair({
        headers,
        host: market.host,
        path: market.temporaryRedirect.path,
      })
      assertRedirect(temporary.get, 307, market.temporaryRedirect.location)
    }
  }
})

test("wire.market-content-isolation", async () => {
  for (const market of fixture.markets) {
    const response = await client.request({
      headers: {
        "x-market-code": "sk",
        "x-sales-channel-id": "sc_attacker",
        "x-sf-market": "sk",
      },
      host: market.host,
      path: market.currentProduct,
    })
    const html = assertIndexableHtml({
      expectedUrl: publicUrl(market, market.currentProduct),
      locale: market.locale,
      response,
    })
    assert.equal(html.canonical, publicUrl(market, market.currentProduct))

    const unassigned = await client.request({
      host: market.host,
      path: market.unassignedProduct,
    })
    assertHardError(unassigned, 404)

    for (const other of fixture.markets.filter(
      ({ market: code }) => code !== market.market
    )) {
      const otherPath = other.currentProduct
      if (otherPath !== market.currentProduct) {
        const crossMarket = await client.request({
          host: market.host,
          path: otherPath,
        })
        assert.equal(crossMarket.status, 404)
      }
    }
  }
})

test("wire.secret-non-leakage", async () => {
  for (const market of fixture.markets) {
    const canaries = [
      market.token.secret,
      ...market.token.invalidPaths.map((path) => path.split("/").at(-1)),
    ]
    const response = await client.request({
      host: market.host,
      path: market.token.path,
    })
    assert.equal(response.status, 200)
    const body = response.body.toString("utf8")
    const head = body.match(DOCUMENT_HEAD)?.[1] ?? ""
    const headerText = JSON.stringify(response.headers)
    assert.equal(head.includes(market.token.secret), false)
    assert.equal(headerText.includes(market.token.secret), false)
    const html = inspectHtml(body)
    assert.equal(html.noindex, true)
    assert.equal(html.canonical, undefined)
    assert.equal(html.ogUrl, undefined)
    assert.equal(html.alternates.length, 0)
    assert.equal(html.jsonLd.length, 0)

    for (const path of market.token.invalidPaths) {
      const invalid = await client.request({ host: market.host, path })
      assertHardError(invalid, 404)
      const serialized = `${JSON.stringify(invalid.headers)}\n${invalid.body.toString("utf8")}`
      for (const canary of canaries) {
        assert.equal(serialized.includes(canary), false)
      }
    }

    const systemResponses = await Promise.all(
      ["/feeds/products.xml", "/robots.txt"].map((path) =>
        client.request({ host: market.host, path })
      )
    )
    const sitemapUrls = await readSitemapUrls(market)
    const publicEvidence = [
      ...systemResponses.map(
        (systemResponse) =>
          `${JSON.stringify(systemResponse.headers)}\n${systemResponse.body.toString("utf8")}`
      ),
      ...sitemapUrls,
    ].join("\n")
    for (const canary of canaries) {
      assert.equal(publicEvidence.includes(canary), false)
    }
  }
})

test("wire.sitemap-crawl", async () => {
  for (const market of fixture.markets) {
    const pageUrls = await readSitemapUrls(market)
    for (const pageValue of pageUrls) {
      const pageUrl = new URL(pageValue)
      assert.equal(pageUrl.hostname, market.host)
      assert.equal(pageUrl.search, "")
      const response = await client.request({
        host: market.host,
        path: pageUrl.pathname,
      })
      const html = assertIndexableHtml({
        expectedUrl: pageUrl.href,
        locale: market.locale,
        response,
      })
      assert.equal(html.noindex, false)
    }
  }
})

test("wire.four-host-parity", async () => {
  for (const path of [
    "/robots.txt",
    "/sitemap.xml",
    "/manifest.webmanifest",
    "/feeds/products.xml",
    "/favicon.ico",
  ]) {
    const responses = await Promise.all(
      fixture.markets.map((market) => requestPair({ host: market.host, path }))
    )
    assert.ok(responses.every(({ get }) => get.status === 200))
  }
})

test("wire.empty-legacy-manifest", async () => {
  for (const market of fixture.markets) {
    for (const path of fixture.legacyPaths) {
      const response = await client.request({ host: market.host, path })
      assert.equal(response.status, 404)
      assert.equal(response.headers.location, undefined)
    }

    const { get: aboutPathResponse } = await requestPair({
      host: market.host,
      path: market.aboutPathCase.path,
    })
    assert.equal(aboutPathResponse.headers.location, undefined)
    if (market.aboutPathCase.status === 200) {
      assertIndexableHtml({
        expectedUrl: market.aboutPathCase.canonical,
        locale: market.locale,
        response: aboutPathResponse,
      })
    } else {
      assertHardError(aboutPathResponse, 404)
    }
  }
})

test("wire.pages-status-and-metadata", async () => {
  const outcomes = Object.freeze({
    alias: 308,
    current: 200,
    gone: 410,
    missing: 404,
    unavailable: 503,
  })
  for (const market of fixture.markets) {
    for (const headers of [{}, RSC_HEADERS]) {
      for (const [outcome, status] of Object.entries(outcomes)) {
        const { get } = await requestPair({
          headers,
          host: market.host,
          path: market.statusProbe[outcome],
        })
        assert.equal(get.status, status)
        if ([404, 410, 503].includes(status)) {
          assertHardError(get, status)
        }
      }
    }
    for (const path of [
      market.missingProduct,
      market.missingCategory,
      market.missingCms,
    ]) {
      assertHardError(await client.request({ host: market.host, path }), 404)
    }
    assertHardError(
      await client.request({ host: market.host, path: market.gone }),
      410
    )
  }
})

test("wire.internal-link-crawl", async () => {
  for (const market of fixture.markets) {
    await crawlInternalLinks({ client, fixture, market })
  }
})

test("wire.document-navigation", async () => {
  for (const market of fixture.markets) {
    const home = await client.request({ host: market.host, path: market.home })
    const homeHtml = inspectHtml(home.body.toString("utf8"))
    const expectedHref = market.currentProduct
    assert.ok(homeHtml.anchors.includes(expectedHref))
    assert.equal(home.body.includes(Buffer.from("/_next/data/", "utf8")), false)
    const destination = await client.request({
      host: market.host,
      path: expectedHref,
    })
    assert.match(destination.headers["content-type"] ?? "", HTML_CONTENT_TYPE)
    assertIndexableHtml({
      expectedUrl: publicUrl(market, expectedHref),
      locale: market.locale,
      response: destination,
    })
  }
})

test("wire.lifecycle-invalidation", async () => {
  const scenario = fixture.lifecycle
  const market = fixture.markets.find(
    ({ market: marketCode }) => marketCode === scenario.market
  )
  assert.ok(market)
  const token = process.env[scenario.tokenEnvironmentVariable]
  assert.ok(token, `${scenario.tokenEnvironmentVariable} is required`)

  const before = await client.request({
    host: market.host,
    path: scenario.oldPath,
  })
  assert.equal(before.status, 200)
  const delivery = await client.request({
    body: JSON.stringify(scenario.delivery),
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    host: market.host,
    method: "POST",
    path: scenario.endpoint,
  })
  assert.equal(delivery.status, 200)

  const deadline = Date.now() + scenario.convergenceTimeoutMs
  while (Date.now() < deadline) {
    const [oldResponse, newResponse] = await Promise.all([
      client.request({ host: market.host, path: scenario.oldPath }),
      client.request({ host: market.host, path: scenario.newPath }),
    ])
    if (
      oldResponse.status === 308 &&
      oldResponse.headers.location === publicUrl(market, scenario.newPath) &&
      newResponse.status === 200
    ) {
      const sitemapUrls = await readSitemapUrls(market)
      assert.ok(sitemapUrls.includes(publicUrl(market, scenario.newPath)))
      assert.equal(
        sitemapUrls.includes(publicUrl(market, scenario.oldPath)),
        false
      )
      const html = inspectHtml(newResponse.body.toString("utf8"))
      assert.equal(html.canonical, publicUrl(market, scenario.newPath))
      assert.equal(
        html.alternates.some(
          ({ href }) => href === publicUrl(market, scenario.oldPath)
        ),
        false
      )
      return
    }
    await delay(100)
  }
  assert.fail(
    "lifecycle invalidation did not converge before the bounded deadline"
  )
})
