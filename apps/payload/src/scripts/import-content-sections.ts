/**
 * Import official Herbatica content sections (magazin CZ/SK, slovnik-pojmov SK)
 * that are not yet modeled in the platform, as Payload Articles.
 *
 * These sections have no equivalent official RO/HU content and are not scraped.
 *
 * This script wraps the existing article import pipeline rather than
 * forking its HTML->Lexical conversion or upsert logic:
 *   1. Builds one raw-HTML XLSX per section from pre-scraped JSON (see
 *      `usage` below for the expected JSON shape).
 *   2. Shells out to `convert-article-xlsx-html-to-richtext.ts` (unchanged)
 *      to get a `.richtext.xlsx` + `.media.json` per section.
 *   3. Merges each item's hero image URL into that media manifest so
 *      `featuredImage` resolves via the same `featured_image_path` lookup
 *      used by `import-articles.ts`.
 *   4. Calls `runImportFromFile` (imported, not forked) from
 *      `import-articles.ts` for each section, sharing one Payload
 *      instance. Upsert-by-slug+title, category creation, default author,
 *      and media handling are all the existing pipeline's behavior.
 *
 * Usage:
 *   pnpm payload run src/scripts/import-content-sections.ts
 *
 * Env:
 *   CONTENT_SECTIONS_DIR      (required) directory containing
 *                             sk-magazin.json, cz-magazin.json,
 *                             sk-slovnik.json (scraped item arrays; each
 *                             item: { slug, title, metaDescription?,
 *                             publishedDate?, heroImage?, contentHtml }).
 *   CONTENT_SECTIONS_APPLY    "1" to write; otherwise dry-run (default).
 *   CONTENT_SECTIONS_SECTIONS optional comma list to filter sections, e.g.
 *                             "sk-magazin" (default: all three).
 *   CONTENT_SECTIONS_LIMIT    optional per-section item cap, for pilots.
 *
 * Idempotent: re-running is safe. `runImportFromFile` skips rows whose
 * slug+title already match an existing article (unless --overwrite,
 * which this script does not pass).
 */
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import ExcelJS from "exceljs"
import { getPayload } from "payload"
import config from "../payload.config"
import { runImportFromFile } from "./import-articles"

type ScrapedItem = {
  url: string
  slug: string
  listTitle?: string
  title: string
  metaDescription?: string
  publishedDate?: string | null
  heroImage?: string | null
  contentHtml: string
}

type SectionConfig = {
  key: string
  jsonFile: string
  locale: string
  categoryTitle: string
  categorySlug: string
  origin: string
}

type MediaManifestEntry = { url: string; alt?: string; filename?: string }

const SECTIONS: SectionConfig[] = [
  {
    key: "sk-magazin",
    jsonFile: "sk-magazin.json",
    locale: "sk",
    categoryTitle: "Magazín",
    categorySlug: "magazin",
    origin: "https://www.herbatica.sk",
  },
  {
    key: "cz-magazin",
    jsonFile: "cz-magazin.json",
    locale: "cs",
    categoryTitle: "Magazín",
    categorySlug: "magazin",
    origin: "https://www.herbatica.cz",
  },
  {
    key: "sk-slovnik",
    jsonFile: "sk-slovnik.json",
    locale: "sk",
    categoryTitle: "Slovník pojmov",
    categorySlug: "slovnik-pojmov",
    origin: "https://www.herbatica.sk",
  },
]

const IMPORT_TAG = "oficialny-obsah"
const ABSOLUTE_HREF_PATTERN = /^(?:https?:|mailto:|tel:|#)/i

const dirName = path.dirname(fileURLToPath(import.meta.url))
const payloadRoot = path.resolve(dirName, "../..")

const readSectionItems = (
  dir: string,
  section: SectionConfig
): ScrapedItem[] => {
  const filePath = path.join(dir, section.jsonFile)
  if (!existsSync(filePath)) {
    throw new Error(`Missing scraped JSON for ${section.key}: ${filePath}`)
  }
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as unknown
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected an array in ${filePath}`)
  }
  return parsed as ScrapedItem[]
}

/**
 * Absolutize relative hrefs against the item's origin site so links to
 * official pages we have not migrated remain valid external links,
 * instead of becoming broken relative links on our own domain (the
 * conversion pipeline resolves bare "/..." hrefs against its own
 * default base URL, which is not what we want for scraped content).
 */
const absolutizeHrefs = (html: string, origin: string): string =>
  html.replace(/href="([^"]*)"/g, (match, href: string) => {
    if (!href || ABSOLUTE_HREF_PATTERN.test(href)) {
      return match
    }
    try {
      return `href="${new URL(href, origin).toString()}"`
    } catch {
      return match
    }
  })

const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const excerptFor = (item: ScrapedItem): string => {
  const desc = (item.metaDescription ?? "").trim()
  if (desc) {
    return desc.slice(0, 300)
  }
  return stripHtml(item.contentHtml).slice(0, 300)
}

const filenameForHeroImage = (item: ScrapedItem): string => {
  try {
    const ext =
      path.extname(new URL(item.heroImage as string).pathname) || ".jpg"
    return `${item.slug}-hero${ext}`
  } catch {
    return `${item.slug}-hero.jpg`
  }
}

const workDir = (dir: string) => path.join(dir, "generated")

const rawXlsxPath = (dir: string, section: SectionConfig) =>
  path.join(workDir(dir), `${section.key}.raw.xlsx`)

const richtextXlsxPath = (dir: string, section: SectionConfig) =>
  path.join(workDir(dir), `${section.key}.raw.richtext.xlsx`)

const mediaManifestPathFor = (dir: string, section: SectionConfig) =>
  path.join(workDir(dir), `${section.key}.raw.richtext.media.json`)

const buildRawWorkbook = async (
  dir: string,
  section: SectionConfig,
  items: ScrapedItem[]
): Promise<string> => {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Articles")
  sheet.columns = [
    { header: "title", key: "title" },
    { header: "content", key: "content" },
    { header: "excerpt", key: "excerpt" },
    { header: "slug", key: "slug" },
    { header: "category", key: "category" },
    { header: "category_slug", key: "category_slug" },
    { header: "tags", key: "tags" },
    { header: "status", key: "status" },
    { header: "publishedDate", key: "publishedDate" },
    { header: "featured_image_path", key: "featured_image_path" },
  ]

  for (const item of items) {
    sheet.addRow({
      title: item.title,
      content: absolutizeHrefs(item.contentHtml, section.origin),
      excerpt: excerptFor(item),
      slug: item.slug,
      category: section.categoryTitle,
      category_slug: section.categorySlug,
      tags: `${IMPORT_TAG},${section.categorySlug}`,
      status: "published",
      publishedDate: item.publishedDate ?? "",
      featured_image_path: item.heroImage ?? "",
    })
  }

  mkdirSync(workDir(dir), { recursive: true })
  const outPath = rawXlsxPath(dir, section)
  await workbook.xlsx.writeFile(outPath)
  return outPath
}

const runConversion = (dir: string, section: SectionConfig): void => {
  const payloadBin = path.join(payloadRoot, "node_modules/.bin/payload")
  execFileSync(
    payloadBin,
    [
      "run",
      "src/scripts/convert-article-xlsx-html-to-richtext.ts",
      rawXlsxPath(dir, section),
      richtextXlsxPath(dir, section),
    ],
    {
      cwd: payloadRoot,
      stdio: "inherit",
      env: { ...process.env, NODE_OPTIONS: "--no-deprecation" },
    }
  )
}

const mergeHeroImagesIntoManifest = (
  dir: string,
  section: SectionConfig,
  items: ScrapedItem[]
): void => {
  const manifestPath = mediaManifestPathFor(dir, section)
  const manifest: { media: MediaManifestEntry[] } = existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, "utf8")) as {
        media: MediaManifestEntry[]
      })
    : { media: [] }

  const seen = new Set(manifest.media.map((entry) => entry.url))
  for (const item of items) {
    if (!item.heroImage || seen.has(item.heroImage)) {
      continue
    }
    manifest.media.push({
      url: item.heroImage,
      alt: item.title,
      filename: filenameForHeroImage(item),
    })
    seen.add(item.heroImage)
  }

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
}

type SectionResult = {
  section: string
  locale: string
  total: number
  imported: number
  skipped: number
}

export const runContentSectionsImport = async (): Promise<SectionResult[]> => {
  const dir = process.env.CONTENT_SECTIONS_DIR
  if (!dir) {
    throw new Error(
      "CONTENT_SECTIONS_DIR is required (directory with sk-magazin.json, cz-magazin.json, sk-slovnik.json)"
    )
  }

  const apply = process.env.CONTENT_SECTIONS_APPLY === "1"
  const sectionFilter = process.env.CONTENT_SECTIONS_SECTIONS
    ? new Set(
        process.env.CONTENT_SECTIONS_SECTIONS.split(",").map((s) => s.trim())
      )
    : undefined
  const limitRaw = process.env.CONTENT_SECTIONS_LIMIT
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined

  const activeSections = SECTIONS.filter(
    (section) => !sectionFilter || sectionFilter.has(section.key)
  )
  if (activeSections.length === 0) {
    throw new Error(
      `CONTENT_SECTIONS_SECTIONS matched no known section (known: ${SECTIONS.map((s) => s.key).join(", ")})`
    )
  }

  const itemsBySection = new Map<string, ScrapedItem[]>()
  for (const section of activeSections) {
    const items = readSectionItems(dir, section)
    const limited =
      limit && limit > 0 && limit < items.length ? items.slice(0, limit) : items
    itemsBySection.set(section.key, limited)
    console.log(
      `[${section.key}] ${limited.length}/${items.length} item(s) selected (locale=${section.locale}, category="${section.categoryTitle}")`
    )
  }

  for (const section of activeSections) {
    const items = itemsBySection.get(section.key) as ScrapedItem[]
    console.log(`[${section.key}] building raw XLSX...`)
    await buildRawWorkbook(dir, section, items)
    console.log(`[${section.key}] converting HTML -> Lexical richtext...`)
    runConversion(dir, section)
    console.log(`[${section.key}] merging hero images into media manifest...`)
    mergeHeroImagesIntoManifest(dir, section, items)
  }

  console.log(
    `${apply ? "Applying" : "Dry-run"} import for sections: ${activeSections.map((s) => s.key).join(", ")}`
  )

  const payload = await getPayload({ config })
  const results: SectionResult[] = []
  try {
    for (const section of activeSections) {
      const result = await runImportFromFile({
        filePath: richtextXlsxPath(dir, section),
        locale: section.locale,
        status: "published",
        dryRun: !apply,
        overwrite: false,
        translate: false,
        payload,
        mediaManifestPath: mediaManifestPathFor(dir, section),
      })
      results.push({
        section: section.key,
        locale: result.locale ?? section.locale,
        total: result.total,
        imported: result.imported,
        skipped: result.skipped,
      })
    }
  } finally {
    await payload.destroy()
  }

  console.log(JSON.stringify(results, null, 2))
  return results
}

// `payload run <file>` dynamically imports this module and treats the
// import() promise's resolution as "done" — it never awaits work chained
// via `.then()`, and its own CLI wrapper calls `process.exit(0)`
// immediately after the import resolves. A `process.argv[1] === this
// file` CLI guard would also never fire here (argv[1] stays
// `.../payload/bin.js`). So: use a top-level `await` (this file is an
// entry point, not a module meant to be imported elsewhere) matching
// this repo's other `payload run` scripts (e.g. `run-cms-outbox.ts`) —
// that keeps the dynamic import pending until the work actually
// finishes, and lets `payload run`'s own top-level error handler set a
// non-zero exit code on failure.
await runContentSectionsImport()
