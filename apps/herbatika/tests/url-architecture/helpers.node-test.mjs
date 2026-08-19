import assert from "node:assert/strict"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { loadReleaseFixture } from "./config.mjs"
import { REQUIRED_ROWS } from "./contract-matrix.mjs"
import {
  inspectHtml,
  jsonLdContainsUrl,
  xmlLocations,
} from "./html-evidence.mjs"

test("contract row cardinality is 42 unit, 44 integration, and 30 wire", () => {
  assert.equal(REQUIRED_ROWS.filter((row) => row.startsWith("U")).length, 42)
  assert.equal(REQUIRED_ROWS.filter((row) => row.startsWith("I")).length, 44)
  assert.equal(REQUIRED_ROWS.filter((row) => row.startsWith("E")).length, 30)
})

test("HTML evidence extracts canonical SEO, alternates, anchors, and nested JSON-LD", () => {
  const canonical = "https://herbatica.sk/produkty/fixture-produkt"
  const html = inspectHtml(`<!doctype html><html lang="sk-SK"><head>
    <link rel="canonical" href="${canonical}">
    <link rel="alternate" hreflang="sk-SK" href="${canonical}">
    <meta property="og:url" content="${canonical}">
    <script type="application/ld+json">{"@graph":[{"@id":"${canonical}"}]}</script>
    </head><body><a href="/produkty/fixture-produkt">Product</a></body></html>`)

  assert.equal(html.canonical, canonical)
  assert.equal(html.ogUrl, canonical)
  assert.equal(html.htmlLang, "sk-SK")
  assert.deepEqual(html.alternates, [{ href: canonical, hreflang: "sk-SK" }])
  assert.deepEqual(html.anchors, ["/produkty/fixture-produkt"])
  assert.equal(jsonLdContainsUrl(html.jsonLd, canonical), true)
})

test("XML evidence returns only loc entries", () => {
  assert.deepEqual(
    xmlLocations(
      "<urlset><url><loc>https://herbatica.sk/</loc></url><image:image><image:loc>https://cdn.invalid/a.jpg</image:loc></image:image></urlset>"
    ),
    ["https://herbatica.sk/"]
  )
})

test("committed example satisfies the strict four-market fixture schema", async () => {
  const previous = process.env.URL_ARCHITECTURE_FIXTURE
  process.env.URL_ARCHITECTURE_FIXTURE = fileURLToPath(
    new URL("./fixture.example.json", import.meta.url)
  )
  try {
    const fixture = await loadReleaseFixture()
    assert.deepEqual(fixture.markets.map(({ market }) => market).sort(), [
      "cz",
      "hu",
      "ro",
      "sk",
    ])
    assert.equal(
      fixture.lifecycle.tokenEnvironmentVariable,
      "URL_ARCHITECTURE_LIFECYCLE_TOKEN"
    )
    assert.deepEqual(
      Object.fromEntries(
        fixture.markets.map((market) => [
          market.market,
          {
            canonical: market.aboutPathCase.canonical,
            status: market.aboutPathCase.status,
          },
        ])
      ),
      {
        cz: { canonical: "https://herbatica.cz/o-nas", status: 200 },
        hu: { canonical: null, status: 404 },
        ro: { canonical: null, status: 404 },
        sk: { canonical: "https://herbatica.sk/o-nas", status: 200 },
      }
    )
  } finally {
    if (previous === undefined) {
      Reflect.deleteProperty(process.env, "URL_ARCHITECTURE_FIXTURE")
    } else {
      process.env.URL_ARCHITECTURE_FIXTURE = previous
    }
  }
})
