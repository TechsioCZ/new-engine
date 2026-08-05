import { MedusaError } from "@medusajs/framework/utils"
import { moduleIntegrationTestRunner } from "@medusajs/test-utils"
import { describe, expect, it, vi } from "vitest"

import { PRODUCT_LIST_MODULE } from "../constants"
import ProductList from "../models/product-list"
import ProductListItem from "../models/product-list-item"
import type ProductListModuleService from "../service"

moduleIntegrationTestRunner<ProductListModuleService>({
  moduleModels: [ProductList, ProductListItem],
  moduleName: PRODUCT_LIST_MODULE,
  resolve: "./src/modules/product-list",
  testSuite: ({ service }) => {
    describe("createFavoriteProductList", () => {
      it("creates a favorite list with default display fields and nullable fields", async () => {
        const result = await service.createFavoriteProductList()
        const stored = await service.retrieveProductList(result.id)

        expect(stored).toStrictEqual(
          expect.objectContaining({
            access_type: "private",
            description: null,
            handle: "favorites",
            metadata: null,
            title: "Favorites",
            type: "favorite",
          }),
        )
      })
    })

    describe("createCustomProductList", () => {
      it("trims titles, generates handles, and defaults private access", async () => {
        const result = await service.createCustomProductList({
          title: "  Summer Picks  ",
        })

        expect(result).toStrictEqual(
          expect.objectContaining({
            access_type: "private",
            description: null,
            handle: "summer-picks",
            metadata: null,
            title: "Summer Picks",
            type: "custom",
          }),
        )
      })

      it("normalizes custom handles and preserves explicit public access", async () => {
        const result = await service.createCustomProductList({
          access_type: "public",
          description: "Visible product list",
          handle: "  Featured Products  ",
          metadata: { source: "test" },
          title: "Public Shelf",
        })

        expect(result).toStrictEqual(
          expect.objectContaining({
            access_type: "public",
            description: "Visible product list",
            handle: "featured-products",
            metadata: { source: "test" },
            title: "Public Shelf",
            type: "custom",
          }),
        )
      })

      it("preserves explicit private access", async () => {
        const result = await service.createCustomProductList({
          access_type: "private",
          title: "Private Shelf",
        })

        expect(result.access_type).toBe("private")
      })

      it("rejects invalid access values", async () => {
        await expect(
          service.createCustomProductList({
            access_type: "shared" as never,
            title: "Shared Shelf",
          }),
        ).rejects.toMatchObject({
          message: "Unsupported product list access type: shared",
          type: MedusaError.Types.INVALID_DATA,
        })
      })
    })

    describe("createProductListItemForList", () => {
      it("persists favorite item quantity", async () => {
        const list = await service.createFavoriteProductList()

        const item = await service.createProductListItemForList({
          list_id: list.id,
          list_type: "favorite",
          metadata: { source: "favorite-test" },
          note: "Already owned",
          quantity: 9,
          sort_order: 3,
        })

        expect(item).toStrictEqual(
          expect.objectContaining({
            list_id: list.id,
            metadata: { source: "favorite-test" },
            note: "Already owned",
            quantity: 9,
            sort_order: 3,
          }),
        )
      })

      it("persists custom item quantity and increments it", async () => {
        const list = await service.createCustomProductList({
          title: "Cart Candidates",
        })

        const item = await service.createProductListItemForList({
          list_id: list.id,
          list_type: "custom",
          metadata: { source: "custom-test" },
          note: "Compare later",
          quantity: 2,
          sort_order: 4,
        })

        expect(item).toStrictEqual(
          expect.objectContaining({
            list_id: list.id,
            metadata: { source: "custom-test" },
            note: "Compare later",
            quantity: 2,
            sort_order: 4,
          }),
        )

        const incremented = await service.incrementProductListItemQuantity(
          item.id,
          3,
        )
        const stored = await service.retrieveProductListItem(item.id)

        expect(incremented.quantity).toBe(5)
        expect(stored.quantity).toBe(5)
      })

      it("defaults custom item quantity and sort order", async () => {
        const list = await service.createCustomProductList({
          title: "Default Item Fields",
        })

        const item = await service.createProductListItemForList({
          list_id: list.id,
          list_type: "custom",
        })

        expect(item).toStrictEqual(
          expect.objectContaining({
            list_id: list.id,
            metadata: null,
            note: null,
            quantity: 1,
            sort_order: 0,
          }),
        )
      })

      it("rejects non-positive custom item quantities", async () => {
        const list = await service.createCustomProductList({
          title: "Invalid Quantity",
        })

        await expect(
          service.createProductListItemForList({
            list_id: list.id,
            list_type: "custom",
            quantity: 0,
          }),
        ).rejects.toMatchObject({
          message: "quantity must be a positive integer",
          type: MedusaError.Types.INVALID_DATA,
        })
      })

      it("rejects negative sort order", async () => {
        const list = await service.createCustomProductList({
          title: "Invalid Sort Order",
        })

        await expect(
          service.createProductListItemForList({
            list_id: list.id,
            list_type: "custom",
            quantity: 1,
            sort_order: -1,
          }),
        ).rejects.toMatchObject({
          message: "sort_order must be a non-negative integer",
          type: MedusaError.Types.INVALID_DATA,
        })
      })
    })
  },
})

vi.setConfig({ testTimeout: 60_000 })
