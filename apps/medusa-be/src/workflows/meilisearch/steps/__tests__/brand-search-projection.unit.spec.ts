import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  SearchUtils,
} from "@medusajs/framework/utils"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  BRAND_SEARCH_PROJECTION_EVENT_OPTIONS,
  buildBrandSearchProjectionEventData,
} from "../../events"
import { reconcileBrandSearchProjection } from "../reconcile-brand-search-projection"
import { resolveBrandSearchProjectionTargets } from "../resolve-brand-search-projection-targets"

vi.mock("../../../../links/product-brand", () => ({
  ProductBrandLink: {
    entryPoint: "product_brand",
  },
}))

const asContainer = (resolve: (key: string) => unknown): MedusaContainer =>
  ({
    resolve: vi.fn(resolve),
  }) as unknown as MedusaContainer

describe("Brand search projection", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("deduplicates event targets and configures retryable delivery", () => {
    expect(
      buildBrandSearchProjectionEventData({
        brandIds: ["brand_1", "brand_1"],
        productIds: ["prod_1", "prod_1"],
      })
    ).toEqual({
      brand_ids: ["brand_1"],
      product_ids: ["prod_1"],
    })
    expect(BRAND_SEARCH_PROJECTION_EVENT_OPTIONS).toEqual({
      attempts: 5,
      backoff: {
        delay: 1000,
        type: "exponential",
      },
    })
  })

  it("expands changed Brands to their currently linked products", async () => {
    vi.stubEnv("MEILISEARCH_ENABLED", "1")
    const graph = vi.fn().mockResolvedValue({
      data: [{ product_id: "prod_linked" }, { product_id: "prod_explicit" }],
    })
    const container = asContainer((key) =>
      key === ContainerRegistrationKeys.QUERY ? { graph } : undefined
    )

    const targets = await resolveBrandSearchProjectionTargets(
      {
        brand_ids: ["brand_1", "brand_1"],
        product_ids: ["prod_explicit"],
      },
      container
    )

    expect(targets).toEqual({
      brand_ids: ["brand_1"],
      product_ids: ["prod_explicit", "prod_linked"],
      lock_keys: ["brand-search-projection"],
    })
  })

  it("upserts current active documents and deletes stale or non-published targets", async () => {
    vi.stubEnv("MEILISEARCH_ENABLED", "1")
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ handle: "active", id: "brand_active", title: "Active" }],
      })
      .mockResolvedValueOnce({
        data: [
          { id: "prod_published", status: "published" },
          { id: "prod_draft", status: "draft" },
        ],
      })
    const meilisearch = {
      addDocuments: vi.fn().mockResolvedValue(undefined),
      deleteDocuments: vi.fn().mockResolvedValue(undefined),
      getFieldsForType: vi
        .fn()
        .mockResolvedValueOnce(["id", "title", "handle"])
        .mockResolvedValueOnce(["id", "status", "brand.id"]),
      getIndexesByType: vi
        .fn()
        .mockResolvedValueOnce(["brands"])
        .mockResolvedValueOnce(["products"]),
    }
    const container = asContainer((key) => {
      if (key === ContainerRegistrationKeys.QUERY) {
        return { graph }
      }
      if (key === "meilisearch") {
        return meilisearch
      }
      return
    })

    const result = await reconcileBrandSearchProjection(
      {
        brand_ids: ["brand_active", "brand_deleted"],
        lock_keys: [],
        product_ids: ["prod_published", "prod_draft", "prod_missing"],
      },
      container
    )

    expect(meilisearch.addDocuments).toHaveBeenNthCalledWith(
      1,
      "brands",
      [
        {
          handle: "/store/brands/active/products",
          id: "brand_active",
          title: "Active",
        },
      ],
      "brands",
      { container }
    )
    expect(meilisearch.deleteDocuments).toHaveBeenNthCalledWith(1, "brands", [
      "brand_deleted",
    ])
    expect(meilisearch.addDocuments).toHaveBeenNthCalledWith(
      2,
      "products",
      [{ id: "prod_published", status: "published" }],
      SearchUtils.indexTypes.PRODUCTS,
      { container }
    )
    expect(meilisearch.deleteDocuments).toHaveBeenNthCalledWith(2, "products", [
      "prod_draft",
      "prod_missing",
    ])
    expect(result).toEqual({
      brands_deleted: 1,
      brands_upserted: 1,
      products_deleted: 2,
      products_upserted: 1,
    })
  })

  it("does not resolve services when Meilisearch is disabled", async () => {
    vi.stubEnv("MEILISEARCH_ENABLED", "0")
    const resolve = vi.fn()
    const container = asContainer(resolve)

    await expect(
      reconcileBrandSearchProjection(
        {
          brand_ids: ["brand_1"],
          lock_keys: [],
          product_ids: ["prod_1"],
        },
        container
      )
    ).resolves.toEqual({
      brands_deleted: 0,
      brands_upserted: 0,
      products_deleted: 0,
      products_upserted: 0,
    })
    expect(resolve).not.toHaveBeenCalled()
  })
})
