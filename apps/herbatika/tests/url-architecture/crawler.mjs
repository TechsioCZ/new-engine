// biome-ignore-all lint/suspicious/noMisplacedAssertion: these helpers run only inside node:test cases
import assert from "node:assert/strict"
import { inspectHtml } from "./html-evidence.mjs"

const TRACKING_KEY = /^(?:utm_[^=]*|gclid|fbclid)$/i
const HTML_CONTENT_TYPE = /text\/html/i

const isLegacyPath = (pathname, legacyPaths) =>
  legacyPaths.some(
    (legacy) => pathname === legacy || pathname.startsWith(`${legacy}/`)
  )

const normalizedTarget = (href, origin) => {
  try {
    const target = new URL(href, origin)
    target.hash = ""
    return target
  } catch {
    return
  }
}

const isCrawlablePath = (pathname, prefixes) =>
  prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: the bounded crawl keeps validation beside traversal
export const crawlInternalLinks = async ({ client, fixture, market }) => {
  const origin = `https://${market.host}`
  const knownHosts = new Set(fixture.markets.map(({ host }) => host))
  const queue = market.crawlRoots.map((path) => new URL(path, origin))
  const visited = new Set()
  const discovered = new Set()

  while (queue.length > 0) {
    assert.ok(
      visited.size < fixture.maxCrawlUrls,
      `crawl exceeded ${fixture.maxCrawlUrls} URLs`
    )
    const url = queue.shift()
    const key = `${url.pathname}${url.search}`
    if (visited.has(key)) {
      continue
    }
    visited.add(key)

    const response = await client.request({
      host: market.host,
      path: key,
    })
    assert.equal(
      response.status,
      200,
      `internal document is not current: ${key}`
    )
    assert.equal(
      response.headers.location,
      undefined,
      `redirecting link: ${key}`
    )
    const contentType = response.headers["content-type"] ?? ""
    assert.match(contentType, HTML_CONTENT_TYPE, `non-document link: ${key}`)
    const evidence = inspectHtml(response.body.toString("utf8"))

    if (!evidence.noindex) {
      assert.equal(evidence.canonical, url.href)
    }

    for (const href of evidence.anchors) {
      assert.ok(
        !href.includes("/_next/data/"),
        "public link uses Next data URL"
      )
      const target = normalizedTarget(href, origin)
      if (!(target && knownHosts.has(target.hostname))) {
        continue
      }
      assert.ok(
        !isLegacyPath(target.pathname, fixture.legacyPaths),
        `legacy internal link discovered: ${target.pathname}`
      )
      assert.ok(
        !target.pathname.toLowerCase().startsWith("/~sf"),
        "internal namespace leaked into a public link"
      )
      for (const keyName of target.searchParams.keys()) {
        assert.ok(
          !TRACKING_KEY.test(keyName),
          "tracking leaked into internal link"
        )
      }
      if (target.hostname !== market.host) {
        continue
      }
      discovered.add(`${target.pathname}${target.search}`)
      if (
        isCrawlablePath(target.pathname, market.crawlPrefixes) &&
        !visited.has(`${target.pathname}${target.search}`)
      ) {
        queue.push(target)
      }
    }
  }

  assert.ok(
    discovered.has(market.currentProduct),
    "bounded crawl did not discover the seeded canonical product"
  )
  return Object.freeze({ discovered, visited })
}
