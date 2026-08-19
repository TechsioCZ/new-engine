import { describe, expect, it } from "vitest"
import {
  CmsArticleSchema,
  CmsHeroCarouselSchema,
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

  it("accepts stable hero entity and static targets", () => {
    const entity = CmsHeroCarouselSchema.parse({
      id: 1,
      image: 2,
      buttonTarget: {
        targetType: "entity",
        sourceSystem: "medusa",
        sourceType: "product",
        sourceId: "prod_123",
      },
    })
    const staticTarget = CmsHeroCarouselSchema.parse({
      id: 2,
      image: 3,
      buttonTarget: {
        targetType: "static",
        staticRouteKey: "root:about",
      },
    })

    expect(entity.buttonTarget).toMatchObject({ sourceId: "prod_123" })
    expect(staticTarget.buttonTarget).toMatchObject({
      staticRouteKey: "root:about",
    })
  })

  it("rejects hero targets that mismatch source ownership or carry a path", () => {
    const wrongOwner = CmsHeroCarouselSchema.safeParse({
      id: 1,
      image: 2,
      buttonTarget: {
        targetType: "entity",
        sourceSystem: "payload",
        sourceType: "product",
        sourceId: "prod_123",
      },
    })
    const pathTarget = CmsHeroCarouselSchema.safeParse({
      id: 2,
      image: 3,
      buttonTarget: {
        targetType: "static",
        staticRouteKey: "/arbitrary-path",
      },
    })

    expect(wrongOwner.success).toBe(false)
    expect(pathTarget.success).toBe(false)
  })
})
