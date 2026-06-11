import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  excerptPlainText,
  parseHerbaticaCategoriesXmlFile,
  parseHerbaticaCategoriesXmlSource,
  stripHtmlToPlainText,
} from "../../../src/scripts/herbatica-category-export"
import { readXmlSource } from "../../../src/scripts/herbatica-xml-utils"

describe("Herbatica category export parser", () => {
  const xmlPath = resolve(
    process.cwd(),
    "src/scripts/seed-files/categories.xml"
  )
  const categories = parseHerbaticaCategoriesXmlFile(xmlPath)

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("parses the canonical category export snapshot", () => {
    expect(categories).toHaveLength(5)
  })

  it("preserves rich description and metadata for the Trápi ma root", () => {
    const category = categories.find((entry) => entry.id === "758")

    expect(category).toMatchObject({
      id: "758",
      title: "Trápi ma",
      url: "trapi-ma",
      metaTitle:
        "Trápi ma - prírodné riešenia a doplnky podľa problému | Herbatica",
      metaDescription: expect.stringContaining("imunita"),
      priority: 2,
      expandInMenu: false,
      isVisible: true,
    })
    expect(stripHtmlToPlainText(category?.topDescriptionHtml)).toContain(
      "Človek je neoddeliteľnou súčasťou prírody"
    )
    expect(stripHtmlToPlainText(category?.bottomDescriptionHtml)).toContain(
      "Liečebné smery a prístup k životu"
    )
    expect(stripHtmlToPlainText(category?.topDescriptionHtml)).toContain(
      "oslabená imunita"
    )
  })

  it("parses plain and empty content fields consistently", () => {
    const category = categories.find((entry) => entry.id === "1584")

    expect(category).toMatchObject({
      id: "1584",
      title: "Prírodná kozmetika",
      url: "prirodna-kozmetika",
      metaTitle: "Prírodná kozmetika - prehľad a porovnanie | Herbatica",
      metaDescription: expect.stringContaining("prehľad produktov"),
      bottomDescriptionHtml: undefined,
    })
    expect(stripHtmlToPlainText(category?.topDescriptionHtml)).toContain(
      "Kľúčom ku zdravej a krásnej pleti"
    )
  })

  it("keeps link text and builds safe excerpts", () => {
    const category = categories.find((entry) => entry.id === "4052")
    const trapiMa = categories.find((entry) => entry.id === "758")
    const excerpt = excerptPlainText(trapiMa?.topDescriptionHtml, 120)

    expect(category?.linkText).toBe("🔥 Zľavy")
    expect(excerpt).toBeDefined()
    expect(excerpt).toContain("Človek je neoddeliteľnou súčasťou prírody")
    expect(excerpt?.length).toBeLessThanOrEqual(123)
  })

  it("reads XML from a local source path", async () => {
    await expect(readXmlSource(xmlPath)).resolves.toBe(
      readFileSync(xmlPath, "utf8")
    )
  })

  it("parses categories from an HTTP XML source", async () => {
    const xml = readFileSync(xmlPath, "utf8")
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(xml))
    vi.stubGlobal("fetch", fetchMock)

    const result = await parseHerbaticaCategoriesXmlSource(
      "https://example.test/categories.xml"
    )

    expect(result).toHaveLength(5)
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/categories.xml"
    )
  })

  it("throws a useful error when HTTP XML loading fails", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("", {
        status: 404,
        statusText: "Not Found",
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(
      readXmlSource("https://example.test/missing.xml")
    ).rejects.toThrow(
      "Failed to fetch XML source https://example.test/missing.xml: 404 Not Found"
    )
  })
})
