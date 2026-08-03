import { describe, expect, it } from "vitest"
import {
  CmsArticleSchema,
  CmsLexicalContentSchema,
} from "../../../../../src/modules/payload/schemas"

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
})
