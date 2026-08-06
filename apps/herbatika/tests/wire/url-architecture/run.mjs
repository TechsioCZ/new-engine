import assert from "node:assert/strict"
import { spawn, spawnSync } from "node:child_process"
import { once } from "node:events"
import { readdirSync, readFileSync } from "node:fs"
import { createServer, request as httpRequest } from "node:http"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, "../../..")
const repoRoot = resolve(appRoot, "../..")
const fixturePath = join(here, "registry-fixture.json")
const markets = {
  sk: {
    host: "herbatica.sk",
    prefix: "informacie",
    slug: "wire-stranka",
    alias: "stara-wire-stranka",
    gone: "zrusena-wire-stranka",
    locale: "sk-SK",
  },
  cz: {
    host: "herbatica.cz",
    prefix: "informace",
    slug: "wire-stranka-cz",
    alias: "stara-wire-stranka-cz",
    gone: "zrusena-wire-stranka-cz",
    locale: "cs-CZ",
  },
  hu: {
    host: "herbatica.hu",
    prefix: "informaciok",
    slug: "wire-oldal",
    alias: "regi-wire-oldal",
    gone: "torolt-wire-oldal",
    locale: "hu-HU",
  },
  ro: {
    host: "herbatica.ro",
    prefix: "informatii",
    slug: "wire-pagina",
    alias: "veche-wire-pagina",
    gone: "stearsa-wire-pagina",
    locale: "ro-RO",
  },
}
const results = []
const processes = new Set()
let fakeServer
let app

const test = async (name, fn) => {
  try {
    await fn()
    results.push({ name, ok: true })
    console.log(`PASS ${name}`)
  } catch (error) {
    results.push({ name, ok: false, error })
    console.error(`FAIL ${name}\n  ${error.stack ?? error}`)
  }
}
const listenRandom = async (server) => {
  server.listen(0, "127.0.0.1")
  await once(server, "listening")
  return server.address().port
}
const closeServer = async (server) => {
  if (!server?.listening) return
  const closed = new Promise((done) => server.close(done))
  server.closeAllConnections?.()
  await closed
}
const terminate = async (child) => {
  if (!child || child.exitCode !== null) return
  child.kill("SIGTERM")
  await Promise.race([
    once(child, "exit"),
    new Promise((done) => setTimeout(done, 5000)),
  ])
  if (child.exitCode === null) child.kill("SIGKILL")
}
const wireRequest = ({
  port,
  host,
  path = "/",
  method = "GET",
  headers = {},
}) =>
  new Promise((resolveRequest, reject) => {
    const req = httpRequest(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method,
        headers: { Host: host, ...headers },
      },
      (res) => {
        const chunks = []
        res.on("data", (chunk) => chunks.push(chunk))
        res.on("end", () =>
          resolveRequest({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          })
        )
      }
    )
    req.on("error", reject)
    req.end()
  })
const requestPublicUrl = (port, value, method = "GET") => {
  const url = new URL(value)
  return wireRequest({
    port,
    host: url.host,
    path: `${url.pathname}${url.search}`,
    method,
  })
}
const tag = (html, pattern, label) => {
  const match = html.match(pattern)
  assert.ok(match, `missing ${label}`)
  return match[1]
}
const canonical = (html) =>
  tag(
    html,
    /<link[^>]+rel="canonical"[^>]+href="([^"]+)"|<link[^>]+href="([^"]+)"[^>]+rel="canonical"/,
    "canonical"
  )
const canonicalValue = (html) => {
  const match = html.match(
    /<link[^>]+rel="canonical"[^>]+href="([^"]+)"|<link[^>]+href="([^"]+)"[^>]+rel="canonical"/
  )
  return match?.[1] ?? match?.[2]
}
const robots = (html) =>
  tag(
    html,
    /<meta[^>]+name="robots"[^>]+content="([^"]+)"|<meta[^>]+content="([^"]+)"[^>]+name="robots"/,
    "robots"
  )
const robotsValue = (html) => {
  const match = html.match(
    /<meta[^>]+name="robots"[^>]+content="([^"]+)"|<meta[^>]+content="([^"]+)"[^>]+name="robots"/
  )
  return match?.[1] ?? match?.[2]
}
const waitForApp = async (port, child) => {
  let last
  for (let i = 0; i < 120; i += 1) {
    if (child.exitCode !== null)
      throw new Error(`production server exited early with ${child.exitCode}`)
    if (i === 10) {
      console.error(
        spawnSync(
          "lsof",
          ["-nP", "-a", "-p", String(child.pid), "-iTCP", "-sTCP:LISTEN"],
          { encoding: "utf8" }
        ).stdout
      )
      console.error(
        spawnSync(
          "curl",
          [
            "-sv",
            "--max-time",
            "2",
            "-H",
            "Host: herbatica.sk",
            `http://127.0.0.1:${port}/robots.txt`,
          ],
          { encoding: "utf8" }
        ).stderr
      )
    }
    try {
      const response = await wireRequest({
        port,
        host: markets.sk.host,
        path: "/robots.txt",
      })
      if (response.status === 200) return
    } catch (error) {
      last = error
    }
    await new Promise((done) => setTimeout(done, 250))
  }
  throw new Error(
    `production server did not become ready: ${last ?? "timeout"}`
  )
}

const readMessages = () => {
  const directory = join(
    repoRoot,
    "apps/medusa-be/src/modules/storefront-text/definitions"
  )
  const messages = {}
  for (const file of readdirSync(directory)) {
    const text = readFileSync(join(directory, file), "utf8")
    for (const match of text.matchAll(/key:\s*"([^"]+)"/g))
      messages[match[1]] = "Wire text"
  }
  return messages
}
const messages = readMessages()
const regions = Object.keys(markets).map((market) => ({
  id: `reg-${market}`,
  name: `Wire ${market}`,
  currency_code:
    market === "cz"
      ? "czk"
      : market === "hu"
        ? "huf"
        : market === "ro"
          ? "ron"
          : "eur",
  countries: [{ iso_2: market }],
}))
const productFor = (id) => ({
  id,
  title: `Wire product ${id}`,
  handle: id.replace("prod-", "handle-"),
  description: "Wire product",
  thumbnail: null,
  images: [],
  categories: [],
  options: [],
  metadata: {},
  variants: [
    {
      id: `variant-${id}`,
      title: "Default",
      sku: `SKU-${id}`,
      manage_inventory: false,
      allow_backorder: false,
      inventory_quantity: 10,
      calculated_price: {
        calculated_amount: 1000,
        original_amount: 1000,
        currency_code: "eur",
      },
    },
  ],
})
const json = (res, value, status = 200) => {
  res.writeHead(status, { "content-type": "application/json" })
  res.end(JSON.stringify(value))
}
const startFakeUpstream = async () => {
  fakeServer = createServer((req, res) => {
    const url = new URL(req.url, "http://upstream.invalid")
    if (url.pathname === "/store/storefront-texts")
      return json(res, {
        locale: url.searchParams.get("locale"),
        market: url.searchParams.get("market"),
        messages,
      })
    if (url.pathname === "/store/regions")
      return json(res, { regions, count: regions.length, limit: 50, offset: 0 })
    if (url.pathname === "/store/products") {
      const raw = [...url.searchParams.entries()]
        .map(([, value]) => value)
        .join(",")
      const id =
        raw.match(/prod-wire-(?:sk|cz|hu|ro)/)?.[0] ??
        raw
          .match(/handle-wire-(?:sk|cz|hu|ro)/)?.[0]
          ?.replace("handle-", "prod-")
      return json(res, {
        products: id ? [productFor(id)] : [],
        count: id ? 1 : 0,
        limit: 1,
        offset: 0,
      })
    }
    if (/\/store\/products\/[^/]+\/product-attributes$/.test(url.pathname))
      return json(res, {
        product_attributes: [],
        count: 0,
        limit: 100,
        offset: 0,
      })
    if (/\/store\/products\/[^/]+\/reviews$/.test(url.pathname))
      return json(res, {
        reviews: [],
        count: 0,
        limit: 10,
        offset: 0,
        summary: { average_rating: 0, count: 0 },
      })
    if (url.pathname.startsWith("/store/cms/pages/by-id/")) {
      const id = decodeURIComponent(url.pathname.split("/").at(-1))
      const market = id.split("-").at(-1)
      const config = markets[market] ?? markets.sk
      return json(res, {
        page: {
          id,
          slug: config.slug,
          title: `Wire page ${market}`,
          content: `<p>Wire localized content</p><a href="/${config.prefix}/${config.slug}">Canonical wire page</a>`,
        },
      })
    }
    return json(
      res,
      { message: `Unimplemented fake endpoint ${url.pathname}` },
      404
    )
  })
  return listenRandom(fakeServer)
}

const main = async () => {
  const upstreamPort = await startFakeUpstream()
  let appPort = Number(process.env.WIRE_APP_PORT)
  if (!Number.isInteger(appPort) || appPort < 1 || appPort > 65_535) {
    const reservation = createServer()
    appPort = await listenRandom(reservation)
    await closeServer(reservation)
  }
  await new Promise((done) => setTimeout(done, 1000))
  const env = {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(appPort),
    HOSTNAME: "127.0.0.1",
    URL_REGISTRY_DRIVER: "memory",
    URL_REGISTRY_MEMORY_FIXTURE_PATH: fixturePath,
    ALLOWED_MARKETS: "sk,cz,hu,ro",
    MEDUSA_BACKEND_URL_INTERNAL: `http://127.0.0.1:${upstreamPort}`,
    NEXT_PUBLIC_MEDUSA_BACKEND_URL: `http://127.0.0.1:${upstreamPort}`,
    NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "pk_wire",
  }
  for (const [market, config] of Object.entries(markets)) {
    env[`MARKET_SALES_CHANNEL_${market.toUpperCase()}`] = `sc-wire-${market}`
    env[`HERBATICA_ORIGIN_${market.toUpperCase()}`] = `https://${config.host}`
    env[`HERBATICA_ALLOWED_HOSTS_${market.toUpperCase()}`] =
      market === "sk" && process.env.WIRE_APP_PORT
        ? `www.${config.host},localhost,127.0.0.1`
        : `www.${config.host}`
  }
  const standaloneRoot = join(appRoot, ".next/standalone/apps/herbatika")
  app = spawn(process.execPath, [join(standaloneRoot, "server.js")], {
    cwd: standaloneRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  })
  processes.add(app)
  let logs = ""
  app.stdout.on("data", (chunk) => {
    logs += chunk
  })
  app.stderr.on("data", (chunk) => {
    logs += chunk
  })
  app.on("exit", (code) => {
    if (code && results.length === 0) console.error(logs)
  })
  await waitForApp(appPort, app)

  await test("421 unknown host has no Slovak fallback", async () => {
    const r = await wireRequest({
      port: appPort,
      host: "unknown.example",
      path: "/",
    })
    assert.equal(r.status, 421)
    assert.match(r.body, /Misdirected Request/)
    assert.doesNotMatch(r.body, /Herbatica e-shop|Slov/)
  })
  await test("421 malformed and forwarded-host-list authorities", async () => {
    for (const host of [
      "herbatica.sk:bad",
      "herbatica.sk,evil.example",
      "https://herbatica.sk",
    ])
      assert.equal(
        (await wireRequest({ port: appPort, host, path: "/" })).status,
        421
      )
  })
  await test("404 direct internal route probes", async () => {
    for (const path of ["/~sf/sk/home", "/sk", "/_next/data/wire.json"])
      assert.equal(
        (await wireRequest({ port: appPort, host: markets.sk.host, path }))
          .status,
        404
      )
  })
  await test("system routes never expose an internal rewrite", async () => {
    const r = await wireRequest({
      port: appPort,
      host: markets.sk.host,
      path: "/robots.txt",
    })
    assert.equal(r.status, 200)
    assert.equal(r.headers["x-middleware-rewrite"], undefined)
  })
  await test("404 unknown top-level route", async () => {
    assert.equal(
      (
        await wireRequest({
          port: appPort,
          host: markets.sk.host,
          path: "/wire-unknown",
        })
      ).status,
      404
    )
  })
  await test("400 unknown entity query", async () => {
    assert.equal(
      (
        await wireRequest({
          port: appPort,
          host: markets.sk.host,
          path: `/${markets.sk.prefix}/${markets.sk.slug}?evil=1`,
        })
      ).status,
      400
    )
  })
  await test("RSC cache key is stripped only for real RSC requests", async () => {
    const path = `/${markets.sk.prefix}/${markets.sk.slug}?_rsc=wire`
    const rsc = await wireRequest({
      port: appPort,
      host: markets.sk.host,
      path,
      headers: { RSC: "1" },
    })
    assert.notEqual(rsc.status, 400)
    const publicProbe = await wireRequest({
      port: appPort,
      host: markets.sk.host,
      path,
    })
    assert.equal(publicProbe.status, 400)
  })
  await test("404 missing registry slug is hard status", async () => {
    const r = await wireRequest({
      port: appPort,
      host: markets.sk.host,
      path: `/${markets.sk.prefix}/missing-wire`,
    })
    assert.equal(r.status, 404)
    assert.doesNotMatch(r.body, /<meta[^>]+http-equiv=["']refresh/i)
  })
  await test("404 tombstone is hard status", async () => {
    const r = await wireRequest({
      port: appPort,
      host: markets.sk.host,
      path: `/${markets.sk.prefix}/${markets.sk.gone}`,
    })
    assert.equal(r.status, 404)
  })
  for (const method of ["GET", "HEAD"])
    await test(`308 alias ${method}`, async () => {
      const r = await wireRequest({
        port: appPort,
        host: markets.sk.host,
        path: `/${markets.sk.prefix}/${markets.sk.alias}`,
        method,
      })
      assert.equal(r.status, 308)
      assert.equal(
        r.headers.location,
        `https://${markets.sk.host}/${markets.sk.prefix}/${markets.sk.slug}`
      )
    })
  await test("POST alias never redirects", async () => {
    const r = await wireRequest({
      port: appPort,
      host: markets.sk.host,
      path: `/${markets.sk.prefix}/${markets.sk.alias}`,
      method: "POST",
    })
    assert.equal(r.status, 405)
    assert.equal(r.headers.allow, "GET, HEAD")
    assert.equal(r.headers.location, undefined)
  })
  await test("host + case + slash + alias canonicalize in one 308", async () => {
    const source = await wireRequest({
      port: appPort,
      host: `www.${markets.sk.host}`,
      path: `/${markets.sk.prefix.toUpperCase()}/${markets.sk.alias.toUpperCase()}/`,
    })
    assert.equal(source.status, 308)
    assert.equal(
      source.headers.location,
      `https://${markets.sk.host}/${markets.sk.prefix}/${markets.sk.slug}`
    )
    const target = await requestPublicUrl(appPort, source.headers.location)
    assert.ok(
      ![300, 301, 302, 303, 307, 308].includes(target.status),
      `target chained with ${target.status}`
    )
    assert.equal(target.status, 200)
  })
  for (const [market, config] of Object.entries(markets))
    await test(`200 current Payload page ${market}`, async () => {
      const r = await wireRequest({
        port: appPort,
        host: config.host,
        path: `/${config.prefix}/${config.slug}`,
      })
      assert.equal(r.status, 200)
      assert.match(r.body, new RegExp(`Wire page ${market}`))
    })
  await test("product variant is 200 noindex with clean product canonical", async () => {
    const r = await wireRequest({
      port: appPort,
      host: markets.sk.host,
      path: "/produkty/wire-product-sk?varianta=SKU-WIRE-1",
    })
    assert.equal(r.status, 200)
    assert.match(robotsValue(r.body), /noindex/)
    assert.equal(
      canonicalValue(r.body),
      `https://${markets.sk.host}/produkty/wire-product-sk`
    )
  })
  await test("category page=2 is indexable and self-canonical", async () => {
    const r = await wireRequest({
      port: appPort,
      host: markets.sk.host,
      path: "/kategorie?strana=2",
    })
    assert.equal(r.status, 200)
    assert.match(robotsValue(r.body), /^index/)
    assert.equal(
      canonicalValue(r.body),
      `https://${markets.sk.host}/kategorie?strana=2`
    )
  })
  await test("category sort is noindex with clean canonical", async () => {
    const r = await wireRequest({
      port: appPort,
      host: markets.sk.host,
      path: "/kategorie?razeni=cena",
    })
    assert.equal(r.status, 200)
    assert.match(robotsValue(r.body), /noindex/)
    assert.equal(canonicalValue(r.body), `https://${markets.sk.host}/kategorie`)
  })
  await test("category multiple filters are noindex with clean canonical", async () => {
    const r = await wireRequest({
      port: appPort,
      host: markets.sk.host,
      path: "/kategorie?znacka=a&kategorie=b",
    })
    assert.equal(r.status, 200)
    assert.match(robotsValue(r.body), /noindex/)
    assert.equal(canonicalValue(r.body), `https://${markets.sk.host}/kategorie`)
  })
  await test("tracking query is ignored in canonical without redirect", async () => {
    const r = await wireRequest({
      port: appPort,
      host: markets.sk.host,
      path: "/kategorie?utm_source=wire",
    })
    assert.equal(r.status, 200)
    assert.equal(canonicalValue(r.body), `https://${markets.sk.host}/kategorie`)
  })
  await test("canonical and reciprocal four-market hreflang; no x-default", async () => {
    const r = await wireRequest({
      port: appPort,
      host: markets.sk.host,
      path: `/${markets.sk.prefix}/${markets.sk.slug}`,
    })
    assert.equal(
      canonicalValue(r.body),
      `https://${markets.sk.host}/${markets.sk.prefix}/${markets.sk.slug}`
    )
    for (const config of Object.values(markets))
      assert.match(
        r.body,
        new RegExp(
          `href[Ll]ang="${config.locale}"[^>]+href="https://${config.host}/${config.prefix}/${config.slug}"|href="https://${config.host}/${config.prefix}/${config.slug}"[^>]+href[Ll]ang="${config.locale}"`
        )
      )
    assert.doesNotMatch(r.body, /hreflang="x-default"/)
  })
  for (const [market, config] of Object.entries(markets)) {
    await test(`robots and sitemap index ${market}`, async () => {
      const robotsTxt = await wireRequest({
        port: appPort,
        host: config.host,
        path: "/robots.txt",
      })
      assert.equal(robotsTxt.status, 200)
      assert.match(robotsTxt.headers["content-type"], /^text\/plain/)
      assert.match(robotsTxt.body, /Disallow: \/~sf\//)
      assert.match(robotsTxt.body, /Disallow: \/api\//)
      assert.match(robotsTxt.body, /Disallow: \/(?:kosik|kosik-cz|kosar|cos)/)
      assert.match(
        robotsTxt.body,
        new RegExp(`Sitemap: https://${config.host}/sitemap\\.xml`)
      )
      const index = await wireRequest({
        port: appPort,
        host: config.host,
        path: "/sitemap.xml",
      })
      assert.equal(index.status, 200)
      assert.match(index.headers["content-type"], /^application\/xml/)
      assert.match(
        index.body,
        new RegExp(`https://${config.host}/sitemaps/page-1\\.xml`)
      )
    })
    await test(`page sitemap shard current-only own-host ${market}`, async () => {
      const shard = await wireRequest({
        port: appPort,
        host: config.host,
        path: "/sitemaps/page-1.xml",
      })
      assert.equal(shard.status, 200)
      assert.match(shard.body, /<urlset/)
      const locations = [...shard.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
        (match) => match[1]
      )
      assert.deepEqual(locations, [
        `https://${config.host}/${config.prefix}/${config.slug}`,
      ])
      assert.ok(locations.every((location) => !location.includes("?")))
      assert.doesNotMatch(
        shard.body,
        new RegExp(`${config.alias}|${config.gone}`)
      )
    })
  }
  await test("public links are ASCII document anchors with no internal route leak", async () => {
    const r = await wireRequest({
      port: appPort,
      host: markets.sk.host,
      path: `/${markets.sk.prefix}/${markets.sk.slug}`,
    })
    const hrefs = [...r.body.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(
      (match) => match[1]
    )
    assert.ok(hrefs.includes(`/${markets.sk.prefix}/${markets.sk.slug}`))
    assert.ok(
      hrefs.every(
        (href) => !(href.startsWith("/~sf") || href.startsWith("/_next/data"))
      )
    )
    assert.ok(
      hrefs
        .filter((href) => href.startsWith("/"))
        .every((href) => /^[\x20-\x7e]+$/.test(href))
    )
  })
  await test("unsupported campaign records stay out of the public surface", async () => {
    const r = await wireRequest({
      port: appPort,
      host: markets.sk.host,
      path: "/akcie/wire-akcia",
    })
    assert.equal(r.status, 404)
  })
  if (process.env.WIRE_HOLD === "1") {
    console.log(`BROWSER HARNESS READY: http://localhost:${appPort}`)
    await new Promise(() => {})
  }
  await closeServer(fakeServer)
  await test("real unavailable upstream produces hard 500", async () => {
    const r = await wireRequest({
      port: appPort,
      host: markets.sk.host,
      path: "/produkty/upstream-down",
    })
    assert.equal(r.status, 500)
  })

  const failed = results.filter((result) => !result.ok)
  console.log(
    `\nWIRE MATRIX: ${results.length - failed.length}/${results.length} passed`
  )
  if (failed.length) {
    console.log(`FAILED: ${failed.map((result) => result.name).join(", ")}`)
    process.exitCode = 1
  }
}

const cleanup = async () => {
  await closeServer(fakeServer).catch(() => {})
  await Promise.all([...processes].map(terminate))
}
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => {
    cleanup().finally(() => process.exit(128))
  })
try {
  await main()
} finally {
  await cleanup()
}
