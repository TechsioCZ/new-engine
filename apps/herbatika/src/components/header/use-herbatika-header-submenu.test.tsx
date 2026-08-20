import type { HttpTypes } from "@medusajs/types"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  useCategories: vi.fn(),
  useMarketContext: vi.fn(),
}))

vi.mock("@/lib/category-images", () => ({
  resolveCategoryImage: vi.fn(),
}))
vi.mock("@/lib/storefront/categories", () => ({
  useCategories: mocks.useCategories,
}))
vi.mock("@/lib/storefront/market-context-provider", () => ({
  useMarketContext: mocks.useMarketContext,
}))
vi.mock("@/lib/url/link-projections/projected-entity-link", () => ({
  buildProjectedEntityPath: (
    _kind: string,
    projection: { publicSlug?: string },
    market: string
  ) => (projection.publicSlug ? `/${market}/${projection.publicSlug}` : null),
}))

import { useHerbatikaHeaderSubmenu } from "./use-herbatika-header-submenu"

const rootCategory = {
  id: "pcat_root",
  handle: "trapi-ma",
  name: "Ce mă preocupă",
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
const publicSlugsById = Object.fromEntries(
  [rootCategory, ...children].map((category) => [category.id, category.handle])
)

let submenu: ReturnType<typeof useHerbatikaHeaderSubmenu> | null = null

const Harness = () => {
  submenu = useHerbatikaHeaderSubmenu(publicSlugsById)
  return null
}

const labelsForLocale = (market: "ro" | "sk", locale: "ro-RO" | "sk-SK") => {
  mocks.useMarketContext.mockReturnValue({ code: market, locale })
  renderToStaticMarkup(<Harness />)

  return (
    submenu?.groupsByRootHandle
      .get("trapi-ma")
      ?.featuredItems.map((item) => item.label) ?? []
  )
}

describe("Herbatika header category ordering", () => {
  beforeEach(() => {
    submenu = null
    mocks.useCategories.mockReturnValue({
      categories: [rootCategory, ...children],
    })
  })

  it("orders Romanian diacritics with the exact ro-RO collation", () => {
    expect(labelsForLocale("ro", "ro-RO")).toEqual(["Sare", "Șalvie"])
  })

  it("preserves the existing Slovak collation", () => {
    expect(labelsForLocale("sk", "sk-SK")).toEqual(["Șalvie", "Sare"])
  })
})
