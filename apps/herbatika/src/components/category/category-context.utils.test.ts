import type { HttpTypes } from "@medusajs/types"
import { describe, expect, it } from "vitest"
import {
  resolveCategoryBottomHtml,
  resolveCategoryContextImageTiles,
  resolveCategoryIntroHtml,
} from "./category-context.utils"

const input = (
  market: "ro" | "sk",
  category: HttpTypes.StoreProductCategory
) => ({
  activeCategory: category,
  categoryByHandle: new Map([[category.handle, category]]),
  market,
  publicSlugsById: { [category.id]: category.handle },
})

describe("localized category rich content", () => {
  it("renders exact Romanian content instead of Slovak metadata", () => {
    const category = {
      id: "pcat_1",
      handle: "suplimente",
      name: "Suplimente",
      metadata: {
        top_description_html: "<p>Slovenský horný text</p>",
        bottom_description_html: "<p>Slovenský spodný text</p>",
      },
      localized_content: {
        top_description_html: "<p>Text superior românesc</p>",
        bottom_description_html: "<p>Text inferior românesc</p>",
      },
    } as unknown as HttpTypes.StoreProductCategory

    expect(resolveCategoryIntroHtml(input("ro", category))).toContain(
      "Text superior românesc"
    )
    expect(resolveCategoryBottomHtml(input("ro", category))).toContain(
      "Text inferior românesc"
    )
  })

  it("does not leak Slovak metadata when Romanian content is absent", () => {
    const category = {
      id: "pcat_1",
      handle: "suplimente",
      name: "Suplimente",
      metadata: {
        top_description_html: "<p>Slovenský horný text</p>",
      },
    } as unknown as HttpTypes.StoreProductCategory

    expect(resolveCategoryIntroHtml(input("ro", category))).toBeNull()
  })

  it("preserves the Slovak metadata fallback during rollout", () => {
    const category = {
      id: "pcat_1",
      handle: "doplnky",
      name: "Doplnky",
      metadata: {
        top_description_html: "<p>Slovenský horný text</p>",
      },
    } as unknown as HttpTypes.StoreProductCategory

    expect(resolveCategoryIntroHtml(input("sk", category))).toContain(
      "Slovenský horný text"
    )
  })
})

describe("localized category ordering", () => {
  const rootCategory = {
    id: "pcat_root",
    handle: "plante",
    name: "Plante",
  } as HttpTypes.StoreProductCategory
  const children = [
    {
      id: "pcat_s_cedilla",
      handle: "salvie",
      name: "Șalvie",
      parent_category_id: rootCategory.id,
    },
    {
      id: "pcat_s",
      handle: "sare",
      name: "Sare",
      parent_category_id: rootCategory.id,
    },
  ] as HttpTypes.StoreProductCategory[]
  const categoryById = new Map(
    [rootCategory, ...children].map((category) => [category.id, category])
  )
  const publicSlugsById = Object.fromEntries(
    children.map((category) => [category.id, category.handle])
  )

  const labelsForMarket = (market: "ro" | "sk") =>
    resolveCategoryContextImageTiles({
      activeCategory: rootCategory,
      activeCategoryFilterIds: [],
      categories: children,
      categoryById,
      market,
      publicSlugsById,
    }).map((tile) => tile.label)

  it("orders Romanian diacritics with the exact ro-RO collation", () => {
    expect(labelsForMarket("ro")).toEqual(["Sare", "Șalvie"])
  })

  it("preserves the existing Slovak collation", () => {
    expect(labelsForMarket("sk")).toEqual(["Șalvie", "Sare"])
  })
})
