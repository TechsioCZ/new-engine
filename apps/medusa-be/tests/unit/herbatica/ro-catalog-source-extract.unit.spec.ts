import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { parseRoSourceExtractArgs } from "../../../src/scripts/ro-catalog-source-extract"
import {
  candidateHash,
  findRoSourceDuplicates,
  parseRoSourcePage,
  parseRoSourceSitemap,
  toOfficialPublicUrl,
} from "../../../src/scripts/ro-catalog-source-extract-parser"
import {
  parseRobotsTxt,
  robotsAllows,
  runRoCatalogSourceExtract,
} from "../../../src/scripts/ro-catalog-source-extract-runtime"
import type {
  RoSourceExtractOptions,
  RoSourceProductCandidate,
} from "../../../src/scripts/ro-catalog-source-extract-types"

const PRODUCT_URL =
  "https://www.herbatica.ro/extracte-din-plante/befungin-tinctura-cu-extract-de-chaga-siberian-100-ml-herbatica/"
const SITEMAP_URL = "https://www.herbatica.ro/sitemap.xml"
const ROBOTS_URL = "https://www.herbatica.ro/robots.txt"
const fixturePath = resolve(
  process.cwd(),
  "tests/fixtures/ro-catalog-source-extract/befungin-minimal.html"
)

describe("Romanian public catalog source extractor", () => {
  const temporaryDirectories: string[] = []

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { force: true, recursive: true }))
    )
    vi.restoreAllMocks()
  })

  it("parses official product identity, Romanian content, breadcrumbs, and RON price", async () => {
    const html = await readFile(fixturePath, "utf8")
    const parsed = parseRoSourcePage(html, PRODUCT_URL)

    expect(parsed.kind).toBe("product")
    if (parsed.kind !== "product") {
      throw new Error("Expected the saved fixture to parse as a product")
    }
    expect(parsed.candidate).toMatchObject({
      canonicalSlug:
        "befungin-tinctura-cu-extract-de-chaga-siberian-100-ml-herbatica",
      categoryBreadcrumbs: [
        {
          name: "Suplimente nutritive",
          slug: "suplimente-nutritive",
          url: "https://www.herbatica.ro/suplimente-nutritive/",
        },
        {
          name: "Extracte din plante",
          slug: "extracte-din-plante",
          url: "https://www.herbatica.ro/extracte-din-plante/",
        },
      ],
      ean: "8586021132118",
      price: { amount: 120, currency: "RON" },
      sku: "4868",
      title:
        "Befungin - tinctură cu extract de chaga siberiană - 100 ml - Herbatica",
    })
    expect(parsed.candidate.descriptions.short.text).toContain(
      "imunitatea, digestia și vitalitatea"
    )
    expect(parsed.candidate.descriptions.long.text).toContain(
      "Mod de utilizare"
    )
    expect(parsed.warnings).toEqual([])
  })

  it("prioritizes product sitemap records and rejects forbidden or foreign URLs", () => {
    const sitemap = `<?xml version="1.0"?>
      <urlset xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
        <url><loc>https://www.herbatica.ro/suplimente-nutritive/</loc></url>
        <url><loc>${PRODUCT_URL}</loc><image:image><image:title>Befungin</image:title></image:image></url>
        <url><loc>https://example.com/copied-product/</loc></url>
        <url><loc>https://www.herbatica.ro/export/products.xml</loc></url>
      </urlset>`

    expect(parseRoSourceSitemap(sitemap)).toEqual([
      { productHint: true, url: PRODUCT_URL },
      {
        productHint: false,
        url: "https://www.herbatica.ro/suplimente-nutritive/",
      },
    ])
    expect(() =>
      toOfficialPublicUrl("https://www.herbatica.ro/api/products")
    ).toThrow("forbidden")
    expect(() => toOfficialPublicUrl("https://evil.example/product")).toThrow(
      "must stay"
    )
  })

  it("honors the most specific robots group, longest rule, allow ties, and crawl blocks", () => {
    const policy = parseRobotsTxt(`
      User-agent: *
      Disallow: /blocked/
      Disallow: /private/*
      Allow: /private/public$

      User-agent: HerbatikaCatalogAudit
      Disallow: /limited/
      Sitemap: ${SITEMAP_URL}
    `)

    expect(
      robotsAllows(policy, "SomeBot", "https://www.herbatica.ro/blocked/page/")
    ).toBe(false)
    expect(
      robotsAllows(policy, "SomeBot", "https://www.herbatica.ro/private/public")
    ).toBe(true)
    expect(
      robotsAllows(
        policy,
        "HerbatikaCatalogAudit/1.0",
        "https://www.herbatica.ro/blocked/page/"
      )
    ).toBe(true)
    expect(
      robotsAllows(
        policy,
        "HerbatikaCatalogAudit/1.0",
        "https://www.herbatica.ro/limited/page/"
      )
    ).toBe(false)
  })

  it("flags SK/CZ placeholders and duplicate identity/content", async () => {
    const html = (await readFile(fixturePath, "utf8"))
      .replace(
        "Befungin este un supliment",
        "TODO: Zloženie produktu. Befungin je doplnok"
      )
      .replace('content="8586021132118"', 'content="1111111111111"')
    const parsed = parseRoSourcePage(html, PRODUCT_URL)
    if (parsed.kind !== "product") {
      throw new Error("Expected product")
    }
    expect(parsed.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining(["placeholder", "possible-sk-cz"])
    )

    const base: RoSourceProductCandidate = {
      ...parsed.candidate,
      approvalStatus: "unapproved",
      candidateSha256: "a".repeat(64),
      source: {
        htmlSha256: "b".repeat(64),
        retrievedAt: "2026-08-20T10:00:00.000Z",
        url: PRODUCT_URL,
      },
      warnings: parsed.warnings,
    }
    const second = {
      ...base,
      source: { ...base.source, url: `${PRODUCT_URL}copie/` },
    }
    expect(
      findRoSourceDuplicates([base, second]).map((group) => group.field)
    ).toEqual(expect.arrayContaining(["content", "ean", "sku", "slug"]))
    const {
      candidateSha256: _candidateSha256,
      warnings: _warnings,
      ...hashInput
    } = base
    expect(candidateHash(hashInput)).toBe(
      candidateHash({
        ...hashInput,
        source: {
          ...hashInput.source,
          retrievedAt: "2026-08-21T12:00:00.000Z",
        },
      })
    )
  })

  it("writes an explicitly unapproved manifest and resumes entirely from local cache", async () => {
    const root = await mkdtemp(join(tmpdir(), "ro-source-extract-"))
    temporaryDirectories.push(root)
    const html = await readFile(fixturePath, "utf8")
    const robots = `User-agent: *\nDisallow: /api/\nDisallow: /export/\nSitemap: ${SITEMAP_URL}\n`
    const sitemap = `<urlset xmlns:image="x"><url><loc>${PRODUCT_URL}</loc><image:image><image:title>Befungin</image:title></image:image></url></urlset>`
    const bodies = new Map([
      [ROBOTS_URL, { body: robots, type: "text/plain" }],
      [SITEMAP_URL, { body: sitemap, type: "application/xml" }],
      [PRODUCT_URL, { body: html, type: "text/html" }],
    ])
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input)
      const record = bodies.get(url)
      if (!record) {
        return new Response("missing", { status: 404 })
      }
      return new Response(record.body, {
        headers: { "content-type": record.type },
        status: 200,
      })
    })
    const options: RoSourceExtractOptions = {
      cacheDir: join(root, "cache"),
      checkpointPath: join(root, "checkpoint.json"),
      concurrency: 1,
      delayMs: 1000,
      maxBodyBytes: 1_000_000,
      maxPages: 1,
      outputPath: join(root, "candidates.json"),
      refresh: false,
      requestTimeoutMs: 5000,
      sitemapUrl: SITEMAP_URL,
      userAgent: "HerbatikaCatalogAudit/1.0",
    }
    let clock = 0
    const dependencies = {
      fetch: fetchMock,
      now: () => {
        const value = new Date(Date.UTC(2026, 7, 20, 10, 0, clock))
        clock += 1
        return value
      },
      sleep: vi.fn(async () => {
        // The fake clock advances independently; no wall-clock delay in tests.
      }),
    }

    const first = await runRoCatalogSourceExtract(options, dependencies)
    expect(first.manifest.approval.status).toBe("unapproved")
    expect(first.manifest.products).toHaveLength(1)
    expect(first.manifest.products[0]).toMatchObject({
      approvalStatus: "unapproved",
      ean: "8586021132118",
      sku: "4868",
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)

    fetchMock.mockRejectedValue(new Error("network must not be used on resume"))
    const second = await runRoCatalogSourceExtract(options, dependencies)
    expect(second.manifest.products).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(
      JSON.parse(await readFile(options.checkpointPath, "utf8"))
    ).toMatchObject({ completedUrls: [PRODUCT_URL], pendingUrls: [] })
  })

  it("blocks approval when a product-hinted URL returns changed markup or a challenge page", async () => {
    const root = await mkdtemp(join(tmpdir(), "ro-source-challenge-"))
    temporaryDirectories.push(root)
    const sitemap = `<urlset xmlns:image="x"><url><loc>${PRODUCT_URL}</loc><image:image><image:title>Befungin</image:title></image:image></url></urlset>`
    const pages = new Map([
      [ROBOTS_URL, `User-agent: *\nDisallow: /api/\nSitemap: ${SITEMAP_URL}\n`],
      [SITEMAP_URL, sitemap],
      [
        PRODUCT_URL,
        "<!doctype html><html><head><title>Just a moment...</title></head><body>Checking your browser</body></html>",
      ],
    ])
    const options = parseRoSourceExtractArgs(
      [
        `--output=${join(root, "candidates.json")}`,
        `--cache-dir=${join(root, "cache")}`,
        `--checkpoint=${join(root, "checkpoint.json")}`,
        "--max-pages=1",
        "--delay-ms=1000",
      ],
      root
    )
    if (options === "help") {
      throw new Error("Expected options")
    }
    const result = await runRoCatalogSourceExtract(options, {
      fetch: vi.fn(async (input) => {
        const body = pages.get(String(input))
        return body === undefined
          ? new Response("missing", { status: 404 })
          : new Response(body, { status: 200 })
      }),
      now: () => new Date("2026-08-20T12:00:00.000Z"),
      sleep: vi.fn(async () => {
        // No wall-clock delay in the isolated fixture test.
      }),
    })

    expect(result.manifest.products).toEqual([])
    expect(result.manifest.approval).toMatchObject({
      blocked: true,
      status: "unapproved",
    })
    expect(result.manifest.coverage).toMatchObject({
      classifiedProductPages: 0,
      complete: false,
      expectedProductPages: 1,
    })
    expect(result.manifest.coverage.entries).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining("did not match"),
        status: "other",
        url: PRODUCT_URL,
      })
    )
    expect(result.manifest.approval.blockingIssues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("blocking status other"),
        expect.stringContaining("expected 1 product page"),
      ])
    )
  })

  it("keeps category-discovered URLs blocking while pending and after failed classification", async () => {
    const root = await mkdtemp(join(tmpdir(), "ro-source-discovery-"))
    temporaryDirectories.push(root)
    const categoryUrl = "https://www.herbatica.ro/extracte-din-plante/"
    const sitemap = `<urlset><url><loc>${categoryUrl}</loc></url></urlset>`
    const categoryHtml = `<html><body class="type-category"><a class="name" href="${PRODUCT_URL}">Befungin</a></body></html>`
    const pages = new Map([
      [ROBOTS_URL, `User-agent: *\nSitemap: ${SITEMAP_URL}\n`],
      [SITEMAP_URL, sitemap],
      [categoryUrl, categoryHtml],
      [
        PRODUCT_URL,
        "<!doctype html><html><head><title>Challenge</title></head><body>Access denied</body></html>",
      ],
    ])
    const options = parseRoSourceExtractArgs(
      [
        `--output=${join(root, "candidates.json")}`,
        `--cache-dir=${join(root, "cache")}`,
        `--checkpoint=${join(root, "checkpoint.json")}`,
        "--max-pages=1",
        "--delay-ms=1000",
      ],
      root
    )
    if (options === "help") {
      throw new Error("Expected options")
    }
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const body = pages.get(String(input))
      return body === undefined
        ? new Response("missing", { status: 404 })
        : new Response(body, { status: 200 })
    })
    const dependencies = {
      fetch: fetchMock,
      now: () => new Date("2026-08-20T12:30:00.000Z"),
      sleep: vi.fn(async () => {
        // No wall-clock delay in the isolated fixture test.
      }),
    }

    const bounded = await runRoCatalogSourceExtract(options, dependencies)
    expect(bounded.manifest.approval).toMatchObject({ blocked: true })
    expect(bounded.manifest.coverage.entries).toContainEqual(
      expect.objectContaining({
        source: "category-discovery",
        status: "pending",
        url: PRODUCT_URL,
      })
    )
    expect(bounded.manifest.approval.blockingIssues).toContain(
      "1 coverage URL(s) have blocking status pending"
    )

    const resumed = await runRoCatalogSourceExtract(options, dependencies)
    expect(resumed.manifest.approval).toMatchObject({ blocked: true })
    expect(resumed.manifest.coverage.entries).toContainEqual(
      expect.objectContaining({
        source: "category-discovery",
        status: "other",
        url: PRODUCT_URL,
      })
    )
    expect(resumed.manifest.approval.blockingIssues).toContain(
      "1 coverage URL(s) have blocking status other"
    )
    expect(resumed.manifest.coverage.complete).toBe(false)
  })

  it("keeps conservative CLI defaults and rejects unsafe crawl settings", () => {
    const parsed = parseRoSourceExtractArgs([], "/tmp/ro-source-test")
    expect(parsed).not.toBe("help")
    if (parsed === "help") {
      throw new Error("Expected options")
    }
    expect(parsed).toMatchObject({
      concurrency: 1,
      delayMs: 1500,
      maxPages: 25,
    })
    expect(() => parseRoSourceExtractArgs(["--concurrency=3"])).toThrow(
      "from 1 to 2"
    )
    expect(() => parseRoSourceExtractArgs(["--delay-ms=999"])).toThrow(
      "from 1000"
    )
  })
})
