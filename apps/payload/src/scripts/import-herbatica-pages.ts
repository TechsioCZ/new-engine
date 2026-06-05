import { createRequire } from "node:module"
import { readFile, writeFile } from "node:fs/promises"
import { getPayload, type PayloadRequest } from "payload"
import type { Page } from "../payload-types"

const require = createRequire(import.meta.url)
const { JSDOM } = require("jsdom") as {
  JSDOM: new (html: string) => { window: { document: Document } }
}

type Payload = Awaited<ReturnType<typeof getPayload>>
type PayloadId = number
type PayloadLocale = PayloadRequest["locale"]
type WriteLocale = Exclude<PayloadLocale, "all" | undefined>
type PageContent = Page["content"]
type TextBlockKind = "heading" | "paragraph"
type TextBlock = {
  kind: TextBlockKind
  text: string
}
type SourcePage = {
  sourcePath: string
  slug: string
  title: string
  category: "important" | "company" | "partners"
}
type ImportResult = {
  action: "created" | "skipped" | "updated"
  sourceUrl: string
  slug: string
  title: string
}
type ResolvedSourcePage = SourcePage & {
  blocks: TextBlock[]
  description?: string
  sourceUrl: string
  importedTitle: string
}

const BASE_URL = "https://www.herbatica.sk"
const DEFAULT_LOCALE = "sk"
const DEFAULT_CATEGORY_SLUG = "informacie"
const SNAPSHOT_URL = new URL("./herbatica-pages.snapshot.json", import.meta.url)

const SOURCE_PAGES: SourcePage[] = [
  {
    category: "important",
    sourcePath: "/doprava_platby/",
    slug: "doprava-a-platby",
    title: "Doprava a platby",
  },
  {
    category: "important",
    sourcePath: "/reklamacny-poriadok/",
    slug: "reklamacia-a-vratenie",
    title: "Reklamácia a vrátenie",
  },
  {
    category: "important",
    sourcePath: "/obchodne-podmienky/",
    slug: "obchodne-podmienky",
    title: "Obchodné podmienky",
  },
  {
    category: "important",
    sourcePath: "/poou/",
    slug: "ochrana-osobnych-udajov",
    title: "Ochrana osobných údajov",
  },
  {
    category: "important",
    sourcePath: "/cookies/",
    slug: "cookies",
    title: "Cookies",
  },
  {
    category: "company",
    sourcePath: "/o-nas/",
    slug: "o-nas",
    title: "O nás",
  },
  {
    category: "company",
    sourcePath: "/faq/",
    slug: "faq",
    title: "Časté otázky",
  },
  {
    category: "company",
    sourcePath: "/kontakt/",
    slug: "kontakt",
    title: "Kontakt",
  },
  {
    category: "company",
    sourcePath: "/predajne/",
    slug: "predajne",
    title: "Predajne",
  },
  {
    category: "company",
    sourcePath: "/vernost/",
    slug: "vernost",
    title: "Vernostný program",
  },
  {
    category: "company",
    sourcePath: "/certifikaty/",
    slug: "certifikaty",
    title: "Certifikáty",
  },
  {
    category: "company",
    sourcePath: "/newsletter/",
    slug: "newsletter",
    title: "Newsletter",
  },
  {
    category: "company",
    sourcePath: "/obaly-v-herbatica/",
    slug: "obaly-v-herbatica",
    title: "Obaly v Herbatica",
  },
  {
    category: "company",
    sourcePath: "/slovnik-pojmov/",
    slug: "slovnik-pojmov",
    title: "Slovník pojmov",
  },
  {
    category: "partners",
    sourcePath: "/velkoobchod/",
    slug: "velkoobchod",
    title: "Veľkoobchod",
  },
  {
    category: "partners",
    sourcePath: "/dropshipping/",
    slug: "dropshipping",
    title: "Dropshipping",
  },
  {
    category: "partners",
    sourcePath: "/private-label/",
    slug: "private-label",
    title: "Private label",
  },
]

const hasFlag = (flag: string) => process.argv.includes(flag)

const getValueArg = (flag: string) => {
  const index = process.argv.indexOf(flag)
  if (index === -1) {
    return
  }

  const value = process.argv[index + 1]
  if (!value || value.startsWith("--")) {
    return
  }

  return value
}

const normalizeText = (value: string) =>
  value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim()

const toPlainText = (element: Element) => normalizeText(element.textContent ?? "")

const textNode = (text: string) => ({
  type: "text",
  detail: 0,
  format: 0,
  mode: "normal",
  style: "",
  text,
  version: 1,
})

const paragraphNode = (text: string) => ({
  type: "paragraph",
  format: "",
  indent: 0,
  version: 1,
  textFormat: 0,
  textStyle: "",
  children: [textNode(text)],
})

const headingNode = (text: string) => ({
  type: "heading",
  tag: "h2",
  format: "",
  indent: 0,
  version: 1,
  direction: "ltr",
  children: [textNode(text)],
})

const toRichText = (blocks: TextBlock[]): PageContent => ({
  root: {
    type: "root",
    format: "",
    indent: 0,
    version: 1,
    direction: "ltr",
    children: blocks.map((block) =>
      block.kind === "heading" ? headingNode(block.text) : paragraphNode(block.text)
    ),
  },
})

const isBlockElement = (element: Element) =>
  [
    "ADDRESS",
    "ARTICLE",
    "ASIDE",
    "BLOCKQUOTE",
    "DIV",
    "DL",
    "FIELDSET",
    "FIGCAPTION",
    "FIGURE",
    "FOOTER",
    "FORM",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "HEADER",
    "HR",
    "LI",
    "MAIN",
    "NAV",
    "OL",
    "P",
    "SECTION",
    "TABLE",
    "TBODY",
    "TD",
    "TFOOT",
    "TH",
    "THEAD",
    "TR",
    "UL",
  ].includes(element.tagName)

const hasNestedBlockElement = (element: Element) =>
  Array.from(element.children).some((child) => isBlockElement(child))

const pushBlock = (blocks: TextBlock[], block: TextBlock) => {
  const previous = blocks.at(-1)
  if (previous?.kind === block.kind && previous.text === block.text) {
    return
  }

  blocks.push(block)
}

const extractBlocks = (root: Element) => {
  const blocks: TextBlock[] = []

  const walk = (element: Element) => {
    if (
      ["SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "META", "LINK"].includes(
        element.tagName
      )
    ) {
      return
    }

    if (/^H[1-6]$/.test(element.tagName)) {
      const text = toPlainText(element)
      if (text) {
        pushBlock(blocks, { kind: "heading", text })
      }
      return
    }

    if (element.tagName === "LI") {
      const text = toPlainText(element)
      if (text) {
        pushBlock(blocks, { kind: "paragraph", text: `• ${text}` })
      }
      return
    }

    if (element.tagName === "TR") {
      const cells = Array.from(element.querySelectorAll("th,td"))
        .map(toPlainText)
        .filter(Boolean)
      if (cells.length > 0) {
        pushBlock(blocks, { kind: "paragraph", text: cells.join(" | ") })
      }
      return
    }

    if (["P", "BLOCKQUOTE"].includes(element.tagName)) {
      const text = toPlainText(element)
      if (text) {
        pushBlock(blocks, { kind: "paragraph", text })
      }
      return
    }

    if (["DIV", "SECTION", "ARTICLE"].includes(element.tagName)) {
      if (!hasNestedBlockElement(element)) {
        const text = toPlainText(element)
        if (text) {
          pushBlock(blocks, { kind: "paragraph", text })
        }
        return
      }
    }

    for (const child of Array.from(element.children)) {
      walk(child)
    }
  }

  walk(root)

  return blocks.length > 0
    ? blocks
    : [{ kind: "paragraph" as const, text: toPlainText(root) || " " }]
}

const extractDescription = (document: Document) =>
  document
    .querySelector('meta[name="description"], meta[property="og:description"]')
    ?.getAttribute("content")
    ?.trim()

const extractTitle = (document: Document, fallbackTitle: string) => {
  const h1 = document.querySelector("article.pageArticleDetail h1")
  const title = h1 ? toPlainText(h1) : ""

  return title || fallbackTitle
}

const fetchSourcePage = async (source: SourcePage) => {
  const sourceUrl = new URL(source.sourcePath, BASE_URL).toString()
  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 HerbaticaLocalDemoImporter/1.0 (+local demo content import)",
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch ${sourceUrl}: ${response.status}`)
  }

  const html = await response.text()
  const dom = new JSDOM(html)
  const document = dom.window.document
  const article = document.querySelector("article.pageArticleDetail")
  const body =
    article?.querySelector('[itemprop="about"]') ??
    article ??
    document.querySelector(".content-inner") ??
    document.querySelector("main#content")

  if (!body) {
    throw new Error(`No Shoptet article content found at ${sourceUrl}`)
  }

  return {
    ...source,
    blocks: extractBlocks(body),
    description: extractDescription(document),
    importedTitle: extractTitle(document, source.title),
    sourceUrl,
  }
}

const readSnapshotPages = async () => {
  const raw = await readFile(SNAPSHOT_URL, "utf8")
  return JSON.parse(raw) as ResolvedSourcePage[]
}

const writeSnapshotPages = async (pages: ResolvedSourcePage[]) => {
  await writeFile(`${SNAPSHOT_URL.pathname}`, `${JSON.stringify(pages, null, 2)}\n`)
}

const resolveSourcePages = async ({
  refreshLive,
  writeSnapshot,
}: {
  refreshLive: boolean
  writeSnapshot: boolean
}) => {
  if (!refreshLive) {
    return readSnapshotPages()
  }

  const pages: ResolvedSourcePage[] = []
  for (const source of SOURCE_PAGES) {
    pages.push(await fetchSourcePage(source))
  }

  if (writeSnapshot) {
    await writeSnapshotPages(pages)
  }

  return pages
}

const findBySlug = async (
  payload: Payload,
  collection: "page-categories" | "pages",
  slug: string,
  locale: WriteLocale
) => {
  const result = await payload.find({
    collection,
    depth: 0,
    limit: 1,
    locale,
    overrideAccess: true,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs[0] as { id: PayloadId } | undefined
}

const ensureCategory = async (payload: Payload, locale: WriteLocale) => {
  const existing = await findBySlug(
    payload,
    "page-categories",
    DEFAULT_CATEGORY_SLUG,
    locale
  )
  if (existing) {
    return existing.id
  }

  const category = await payload.create({
    collection: "page-categories",
    data: {
      slug: DEFAULT_CATEGORY_SLUG,
      title: "Informácie",
      translationSync: false,
    },
    locale,
    overrideAccess: true,
  })

  return category.id as PayloadId
}

const upsertPage = async ({
  categoryId,
  dryRun,
  locale,
  overwrite,
  payload,
  source,
}: {
  categoryId: PayloadId
  dryRun: boolean
  locale: WriteLocale
  overwrite: boolean
  payload: Payload
  source: ResolvedSourcePage
}): Promise<ImportResult> => {
  const existing = await findBySlug(payload, "pages", source.slug, locale)
  const data = {
    title: source.importedTitle,
    slug: source.slug,
    category: categoryId,
    content: toRichText(source.blocks),
    visibility: "public" as const,
    status: "published" as const,
    publishedDate: new Date().toISOString(),
    translationSync: false,
    meta: {
      title: source.importedTitle,
      description:
        source.description ??
        `Obsah stránky ${source.importedTitle} importovaný z Herbatica.sk.`,
    },
  }

  if (dryRun) {
    return {
      action: existing ? "updated" : "created",
      slug: source.slug,
      sourceUrl: source.sourceUrl,
      title: source.importedTitle,
    }
  }

  if (existing && !overwrite) {
    return {
      action: "skipped",
      slug: source.slug,
      sourceUrl: source.sourceUrl,
      title: source.importedTitle,
    }
  }

  if (existing) {
    await payload.update({
      collection: "pages",
      id: existing.id,
      data,
      locale,
      overrideAccess: true,
    })

    return {
      action: "updated",
      slug: source.slug,
      sourceUrl: source.sourceUrl,
      title: source.importedTitle,
    }
  }

  await payload.create({
    collection: "pages",
    data,
    locale,
    overrideAccess: true,
  })

  return {
    action: "created",
    slug: source.slug,
    sourceUrl: source.sourceUrl,
    title: source.importedTitle,
  }
}

export const importHerbaticaPages = async ({
  dryRun = false,
  locale = DEFAULT_LOCALE,
  overwrite = true,
  payload: providedPayload,
  refreshLive = false,
  writeSnapshot = false,
}: {
  dryRun?: boolean
  locale?: string
  overwrite?: boolean
  payload?: Payload
  refreshLive?: boolean
  writeSnapshot?: boolean
} = {}) => {
  const { default: config } = await import("../payload.config")
  const payload = providedPayload ?? (await getPayload({ config }))
  const writeLocale = locale as WriteLocale
  const categoryId = await ensureCategory(payload, writeLocale)
  const results: ImportResult[] = []
  const sources = await resolveSourcePages({ refreshLive, writeSnapshot })

  for (const source of sources) {
    results.push(
      await upsertPage({
        categoryId,
        dryRun,
        locale: writeLocale,
        overwrite,
        payload,
        source,
      })
    )
  }

  return results
}

const main = async () => {
  const dryRun = hasFlag("--dry-run")
  const locale = getValueArg("--locale") ?? DEFAULT_LOCALE
  const overwrite = !hasFlag("--no-overwrite")
  const refreshLive = hasFlag("--refresh-live")
  const writeSnapshot = hasFlag("--write-snapshot")
  const results = await importHerbaticaPages({
    dryRun,
    locale,
    overwrite,
    refreshLive,
    writeSnapshot,
  })

  console.table(results)
  console.log(
    `${dryRun ? "Dry-run checked" : "Imported"} ${results.length} Herbatica pages for locale ${locale}`
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
