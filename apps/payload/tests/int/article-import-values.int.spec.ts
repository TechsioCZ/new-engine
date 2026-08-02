import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { gzipSync } from "node:zlib"
import ExcelJS from "exceljs"
import { afterEach, describe, expect, it } from "vitest"
import { Articles } from "@/collections/articles"
import {
  extractProductExternalIdFromHtml,
  extractProductWidgetReferences,
  extractLegacyArticleMetadata,
  inspectArticleWorkbook,
  normalizeLegacyArticleHtml,
  resolveProductWidgetUrl,
  shouldUnwrapEmptyCustomLink,
} from "@/scripts/article-xlsx-converter"
import {
  parseArticleDate,
  parseRelatedArticleSlugs,
  sanitizeArticleTitle,
} from "@/scripts/article-importer"

const tempDirectories: string[] = []

const createWorkbook = async (content: string) => {
  const directory = await mkdtemp(path.join(tmpdir(), "article-import-test-"))
  tempDirectories.push(directory)
  const filePath = path.join(directory, "articles.xlsx")
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Articles")
  worksheet.addRow(["Title", "post-content", "post-url-href"])
  worksheet.addRow(["Article", content, "article"])
  await workbook.xlsx.writeFile(filePath)
  return filePath
}

const encodeRichText = (content: string) =>
  `payload-richtext+gzip-base64:${gzipSync(
    JSON.stringify({
      root: {
        type: "root",
        children: [{ type: "paragraph", children: [{ type: "text", text: content }] }],
      },
    })
  ).toString("base64")}`

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true })
    )
  )
})

describe("article import source values", () => {
  it("removes only the trailing Herbatica.sk title suffix", () => {
    expect(
      sanitizeArticleTitle("  Zdravý článok – Herbatica.sk  ")
    ).toBe("Zdravý článok")
    expect(sanitizeArticleTitle("Herbatica.sk radí")).toBe(
      "Herbatica.sk radí"
    )
  })

  it("parses Slovak dates without relying on the host timezone", () => {
    expect(parseArticleDate("23. 7. 2026")).toBe(
      "2026-07-23T00:00:00.000Z"
    )
  })

  it("rejects missing and impossible publication dates", () => {
    expect(() => parseArticleDate("")).toThrow("Published date is required")
    expect(() => parseArticleDate("31. 2. 2026")).toThrow(
      "Invalid published date"
    )
  })

  it("parses and limits deterministic related article slugs", () => {
    expect(
      parseRelatedArticleSlugs(
        '["first", "second", "first", "third", "fourth", "fifth"]'
      )
    ).toEqual(["first", "second", "third", "fourth"])
  })

  it("extracts stable product IDs from form and script markup", () => {
    expect(
      extractProductExternalIdFromHtml(
        '<input name="productId" value="4428" type="hidden">'
      )
    ).toBe("4428")
    expect(
      extractProductExternalIdFromHtml(
        "<script>config.product = { id: '13577', name: 'Mumio' }</script>"
      )
    ).toBe("13577")
  })

  it("does not infer an ID from unrelated numbers", () => {
    expect(
      extractProductExternalIdFromHtml(
        "<script>const article = { id: 4428 }</script>"
      )
    ).toBeUndefined()
  })

  it("allows only known ProductWidgets script URLs", () => {
    expect(
      resolveProductWidgetUrl("https://app.productwidgets.cz/e/33568.js")
        .href
    ).toBe("https://app.productwidgets.cz/e/33568.js")
    expect(() =>
      resolveProductWidgetUrl("http://127.0.0.1/e/33568.js")
    ).toThrow("Unsupported product widget URL")
  })

  it("extracts stable product IDs directly from ProductWidgets media paths", () => {
    expect(
      extractProductWidgetReferences(`
        <div class=item>
          <a href="https://www.herbatica.sk/oleje/cedrovy-olej/">
            <img src="https://cdn.example.com/user/shop/detail/4407-3_cedrovy-olej.jpg">
          </a>
        </div>
      `)
    ).toEqual({
      articleLinkCount: 0,
      relatedArticleSlugs: [],
      productReferences: [
        {
          productExternalId: "4407",
          url: "https://www.herbatica.sk/oleje/cedrovy-olej/",
        },
      ],
    })
  })

  it("extracts an article author before removing the legacy author block", () => {
    const metadata = extractLegacyArticleMetadata(`
      <p>Article body remains.</p>
      <p>Článok si pre vás pripravila&nbsp;</p>
      <p>
        <img src="https://cdn.example.com/foto-gabi.jpg" alt="foto Gabi Herbatica">
        <strong>Gabriela Volfová</strong><br>
        Člen tímu Herbatica.<br>
        Milovníčka prírody a vedomého života.<br>
        Kontakt: <a href="mailto:gabriela@example.com">gabriela@example.com</a>
      </p>
    `)

    expect(metadata.author).toEqual({
      displayName: "Gabriela Volfová",
      role: "Článok pre vás pripravila",
      bio: "Člen tímu Herbatica. Milovníčka prírody a vedomého života.",
      portraitUrl: "https://cdn.example.com/foto-gabi.jpg",
    })
  })

  it("extracts simple author cards and related article links", () => {
    const metadata = extractLegacyArticleMetadata(`
      <p>Článok pre vás pripravil,</p>
      <p>Juraj</p>
      <p><img src="/juraj-profil.jpg" alt="Juraj profil"></p>
      <p>Prečítajte si aj ďalšie články:</p>
      <p><a href="/blog/prvy-clanok/">Prvý článok</a></p>
      <p><a href="https://www.herbatica.sk/blog/druhy-clanok/">Druhý článok</a></p>
      <p><a href="/blog/prvy-clanok/">Duplicitný odkaz</a></p>
    `)

    expect(metadata.author).toEqual({
      displayName: "Juraj",
      role: "Článok pre vás pripravil",
      portraitUrl: "https://www.herbatica.sk/juraj-profil.jpg",
    })
    expect(metadata.relatedArticleSlugs).toEqual([
      "prvy-clanok",
      "druhy-clanok",
    ])
  })

  it("does not attribute copyeditor details to the team author", () => {
    const metadata = extractLegacyArticleMetadata(`
      <p>Článok bol pripravený naším tímom</p>
      <p>
        <img src="/copyeditor-profile.jpg" alt="copyeditor profil">
        Copyediting: Gabriela Volfová
      </p>
    `)

    expect(metadata.author).toEqual({
      displayName: "Herbatika redakcia",
      role: "Článok pre vás pripravila",
    })
  })

  it("unwraps empty custom links while preserving valid links", () => {
    expect(
      shouldUnwrapEmptyCustomLink({
        type: "link",
        fields: { linkType: "custom", url: "" },
      })
    ).toBe(true)
    expect(
      shouldUnwrapEmptyCustomLink({
        type: "link",
        fields: { linkType: "custom", url: "/blog/" },
      })
    ).toBe(false)
  })

  it("removes known legacy author and footer structures", () => {
    const normalized = normalizeLegacyArticleHtml(`
      <p>Article body remains.</p>
      <p>Článok si pre vás pripravila</p>
      <p><img src="/foto-Barbora.jpg" alt="foto Barbora" width="100" height="133"></p>
      <p>Člen <a href="/o-nas/">tímu Herbatica</a>. Kontakt: <a href="mailto:test@herbatica.sk">test@herbatica.sk</a></p>
      <p>
        <a href="https://facebook.com/herbatica"><img src="/ikona-herbatica-FB.jpg"></a>
        <a href="https://instagram.com/herbatica"><img src="/ikona-herbatica-IG.jpg"></a>
      </p>
      <hr>
      <p>Nenašli ste, čo ste hľadali? Alebo si potrebujete doplniť ďalšie informácie?
        <a href="/vyhladavanie/?string=migrena">migréna</a>
        <a href="/vyhladavanie/?string=ekzem">ekzém</a>
      </p>
      <p>Páčil sa vám náš článok? Zdieľajte ho, urobíte nám radosť :)</p>
      <p>&nbsp;</p>
    `)

    expect(normalized).toContain("Article body remains.")
    expect(normalized).not.toContain("Článok si pre vás")
    expect(normalized).not.toContain("ikona-herbatica")
    expect(normalized).not.toContain("Nenašli ste")
    expect(normalized).not.toContain("Páčil sa vám")
    expect(normalized).not.toContain("<hr")
  })

  it("moves legacy related links out of rich text without removing article links", () => {
    const normalized = normalizeLegacyArticleHtml(`
      <p><a href="/blog/inline-reference/">Relevant inline reference</a></p>
      <p>Prečítajte si aj ďalšie články:</p>
      <p>#<a href="/blog/related-one/">Related one</a></p>
      <p>#<a href="/blog/related-two/">Related two</a></p>
    `)

    expect(normalized).toContain("Relevant inline reference")
    expect(normalized).toContain("/blog/inline-reference/")
    expect(normalized).not.toContain("Prečítajte si")
    expect(normalized).not.toContain("related-one")
    expect(normalized).not.toContain("related-two")
  })

  it("removes legacy author content appended to the final paragraph", () => {
    const normalized = normalizeLegacyArticleHtml(`
      <p>Article body remains.<br><br>Článok si pre vás pripravila,<br>Barbora</p>
      <p><img src="/barborafotka.jpg" alt="barbora fotka Herbatica" width="150" height="144"></p>
    `)

    expect(normalized).toContain("Article body remains.")
    expect(normalized).not.toContain("Článok si pre vás")
    expect(normalized).not.toContain("Barbora")
    expect(normalized).not.toContain("barborafotka")
  })

  it("removes legacy team credits and truncated footer variants", () => {
    const normalized = normalizeLegacyArticleHtml(`
      <p>Article body remains.</p>
      <p>Článok bol pripravený naším tímom.</p>
      <p>Copyediting a korektúra: Gabriela Volfová</p>
      <p><img src="/foto-Gabi.jpg" alt="foto Gabi Herbatica" width="100" height="133">Kontakt: <a href="mailto:test@herbatica.sk">test@herbatica.sk</a></p>
      <p>
        <a href="https://facebook.com/herbatica"><img src="/ikona-herbatica-FB.jpg"></a>
        <a href="https://instagram.com/herbatica"><img src="/ikona-herbatica-IG.jpg"></a>
      </p>
      <hr>
      <p>Nenašli ste, čo ste hľadali? Alebo si potrebujete doplniť ďalšie informácie?</p>
      <p>Páčil sa vám náš článok? Zdie</p>
    `)

    expect(normalized).toContain("Article body remains.")
    expect(normalized).not.toContain("Gabriela")
    expect(normalized).not.toContain("ikona-herbatica")
    expect(normalized).not.toContain("Nenašli ste")
    expect(normalized).not.toContain("Páčil sa vám")
    expect(normalized).not.toContain("<hr")
  })

  it("keeps content that does not match a complete legacy signature", () => {
    const html = '<p>Kontakt: redakcia</p><p><a href="/blog/example/">Related reading</a></p>'
    expect(normalizeLegacyArticleHtml(html)).toContain("Kontakt: redakcia")
    expect(normalizeLegacyArticleHtml(html)).toContain("/blog/example/")
  })

  it("configures related articles as a localized native relationship", () => {
    const field = Articles.fields.find(
      (candidate) => "name" in candidate && candidate.name === "relatedArticles"
    )

    expect(field).toMatchObject({
      type: "relationship",
      relationTo: "articles",
      hasMany: true,
      localized: true,
      maxRows: 4,
      maxDepth: 2,
      admin: { isSortable: true },
    })
  })

  it("distinguishes raw and explicitly converted workbooks", async () => {
    const rawPath = await createWorkbook("<p>Raw HTML</p>")
    const richTextPath = await createWorkbook(encodeRichText("Converted"))

    await expect(inspectArticleWorkbook(rawPath)).resolves.toMatchObject({
      format: "raw",
      sheetName: "Articles",
    })
    await expect(inspectArticleWorkbook(richTextPath)).resolves.toMatchObject({
      format: "richtext",
      requiresMediaManifest: false,
    })
  })

  it("rejects workbooks that mix raw and converted content", async () => {
    const filePath = await createWorkbook("<p>Raw HTML</p>")
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.readFile(filePath)
    workbook.getWorksheet("Articles")?.addRow([
      "Article 2",
      encodeRichText("Converted"),
      "article-2",
    ])
    await workbook.xlsx.writeFile(filePath)

    await expect(inspectArticleWorkbook(filePath)).rejects.toThrow(
      "mixes raw article HTML and converted Payload rich text"
    )
  })
})
