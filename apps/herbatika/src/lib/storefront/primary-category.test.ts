import { describe, expect, it } from "vitest"
import { resolvePrimaryCategory } from "./primary-category"

type Category = {
  id: string
  parent_category_id?: string | null
  rank?: number | null
}

const product = (categories: Category[], primaryCategoryId?: unknown) => ({
  categories,
  metadata:
    primaryCategoryId === undefined
      ? {}
      : { primary_category_id: primaryCategoryId },
})

describe("resolvePrimaryCategory", () => {
  it("uses a valid explicit metadata category before every fallback tier", () => {
    const root = { id: "cat_root", rank: 99 }
    const leaf = {
      id: "cat_leaf",
      parent_category_id: "cat_root",
      rank: 1,
    }

    expect(resolvePrimaryCategory(product([root, leaf], "cat_root"))).toBe(root)
  })

  it("ignores an explicit ID that is not assigned to the product", () => {
    const root = { id: "cat_root", rank: 1 }
    const leaf = {
      id: "cat_leaf",
      parent_category_id: "cat_root",
      rank: 50,
    }

    expect(resolvePrimaryCategory(product([root, leaf], "cat_other"))?.id).toBe(
      "cat_leaf"
    )
  })

  it("selects the deepest available leaf category", () => {
    const categories = [
      { id: "cat_root" },
      { id: "cat_shallow", parent_category_id: "cat_root", rank: 1 },
      { id: "cat_branch", parent_category_id: "cat_root" },
      { id: "cat_deep", parent_category_id: "cat_branch", rank: 99 },
    ]

    expect(resolvePrimaryCategory(product(categories))?.id).toBe("cat_deep")
  })

  it("uses lower rank when leaf depth is equal", () => {
    const categories = [
      { id: "cat_root" },
      { id: "cat_high_rank", parent_category_id: "cat_root", rank: 20 },
      { id: "cat_low_rank", parent_category_id: "cat_root", rank: 2 },
    ]

    expect(resolvePrimaryCategory(product(categories))?.id).toBe("cat_low_rank")
  })

  it("uses the lowest stable ID when depth and rank are equal", () => {
    const categories = [
      { id: "cat_z", rank: 5 },
      { id: "cat_a", rank: 5 },
    ]

    expect(resolvePrimaryCategory(product(categories))?.id).toBe("cat_a")
  })

  it("returns null when the product has no valid category IDs", () => {
    expect(resolvePrimaryCategory({ categories: [], metadata: {} })).toBeNull()
  })
})
