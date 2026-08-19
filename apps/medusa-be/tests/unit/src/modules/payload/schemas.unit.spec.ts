import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import {
  CMS_FOOTER_COLUMN_SLOTS,
  CMS_FOOTER_ITEM_SLOTS,
  CmsArticleSchema,
  CmsFooterNavigationGlobalSchema,
  CmsLexicalContentSchema,
} from "../../../../../src/modules/payload/schemas"

const appsRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../../.."
)

const readAppSource = (...segments: string[]) =>
  readFileSync(resolve(appsRoot, ...segments), "utf8")

const extractConstStringArray = (source: string, exportName: string) => {
  const match = source.match(
    new RegExp(`export const ${exportName} = \\[([\\s\\S]*?)\\] as const`)
  )

  if (!match?.[1]) {
    throw new Error(`Expected ${exportName} const string array export`)
  }

  return Array.from(match[1].matchAll(/"([^"]+)"/g), (item) => {
    const value = item[1]
    if (!value) {
      throw new Error(`Expected ${exportName} to contain string values`)
    }
    return value
  })
}

const extractSlotOptionValues = (source: string, exportName: string) => {
  const match = source.match(
    new RegExp(`export const ${exportName} = \\[([\\s\\S]*?)\\]`)
  )

  if (!match?.[1]) {
    throw new Error(`Expected ${exportName} slot options export`)
  }

  return Array.from(match[1].matchAll(/value: "([^"]+)"/g), (item) => {
    const value = item[1]
    if (!value) {
      throw new Error(`Expected ${exportName} to contain option values`)
    }
    return value
  })
}

const createLexicalContent = (fields: Record<string, unknown>) => ({
  root: {
    type: "root",
    children: [
      {
        type: "block",
        version: 2,
        fields,
      },
    ],
    direction: null,
    format: "",
    indent: 0,
    version: 1,
  },
})

describe("Payload CMS schemas", () => {
  it("keeps footer slots aligned across Payload, Medusa, and the storefront", () => {
    const payloadSource = readAppSource(
      "payload",
      "src/globals/footer-navigation-slots.ts"
    )
    const storefrontSource = readAppSource(
      "herbatika",
      "src/lib/storefront/cms-types.ts"
    )

    const payloadColumnSlots = extractSlotOptionValues(
      payloadSource,
      "FOOTER_COLUMN_SLOT_OPTIONS"
    )
    const payloadItemSlots = extractSlotOptionValues(
      payloadSource,
      "FOOTER_ITEM_SLOT_OPTIONS"
    )
    const storefrontColumnSlots = extractConstStringArray(
      storefrontSource,
      "CMS_FOOTER_COLUMN_SLOTS"
    )
    const storefrontItemSlots = extractConstStringArray(
      storefrontSource,
      "CMS_FOOTER_ITEM_SLOTS"
    )

    expect(CMS_FOOTER_COLUMN_SLOTS).toEqual(payloadColumnSlots)
    expect(CMS_FOOTER_ITEM_SLOTS).toEqual(payloadItemSlots)
    expect(storefrontColumnSlots).toEqual(payloadColumnSlots)
    expect(storefrontItemSlots).toEqual(payloadItemSlots)
  })

  it("preserves structured article content and generated HTML", () => {
    const content = createLexicalContent({
      blockType: "productCarousel",
      products: [
        {
          productExternalId: "4428",
        },
      ],
    })

    const parsed = CmsArticleSchema.parse({
      id: 1,
      slug: "article",
      title: "Article",
      content,
      contentHTML: "<p>Article</p>",
    })

    expect(parsed.content).toEqual(content)
    expect(parsed.contentHTML).toBe("<p>Article</p>")
  })

  it("accepts rendered article HTML used by search indexing", () => {
    const parsed = CmsArticleSchema.parse({
      id: 1,
      slug: "article",
      title: "Article",
      content: "<p>Article</p>",
    })

    expect(parsed.content).toBe("<p>Article</p>")
  })

  it("rejects malformed supported blocks", () => {
    const parsed = CmsLexicalContentSchema.safeParse(
      createLexicalContent({
        blockType: "productCarousel",
        products: [{ productExternalId: "  ", productSlug: "  " }],
      })
    )

    expect(parsed.success).toBe(false)
  })

  it("allows future block types to pass through", () => {
    const parsed = CmsLexicalContentSchema.parse(
      createLexicalContent({
        blockType: "futureBlock",
        value: "kept",
      })
    )

    expect(parsed.root.children[0]?.fields).toEqual({
      blockType: "futureBlock",
      value: "kept",
    })
  })

  it("rejects product carousel entries without a usable reference", () => {
    const parsed = CmsLexicalContentSchema.safeParse(
      createLexicalContent({
        blockType: "productCarousel",
        products: [{ id: "row-id" }],
      })
    )

    expect(parsed.success).toBe(false)
  })

  it("accepts the temporary legacy product slug fallback", () => {
    const parsed = CmsLexicalContentSchema.safeParse(
      createLexicalContent({
        blockType: "productCarousel",
        products: [{ productSlug: "legacy-product" }],
      })
    )

    expect(parsed.success).toBe(true)
  })

  it("validates footer navigation block targets", () => {
    const invalidInternalPath = CmsFooterNavigationGlobalSchema.safeParse({
      columns: [
        {
          slot: "information",
          items: [
            {
              blockType: "appRouteLink",
              slot: "blog",
              path: "https://example.com/not-internal",
            },
          ],
        },
      ],
    })

    const invalidExternalUrl = CmsFooterNavigationGlobalSchema.safeParse({
      columns: [
        {
          slot: "information",
          items: [
            {
              blockType: "externalLink",
              slot: "reviews",
              url: "not-a-url",
            },
          ],
        },
      ],
    })

    const unsafeInternalPath = CmsFooterNavigationGlobalSchema.safeParse({
      columns: [
        {
          slot: "information",
          items: [
            {
              blockType: "appRouteLink",
              slot: "blog",
              path: "/\\example.com",
            },
          ],
        },
      ],
    })

    expect(invalidInternalPath.success).toBe(false)
    expect(invalidExternalUrl.success).toBe(false)
    expect(unsafeInternalPath.success).toBe(false)
  })
})
