import { MedusaError } from "@medusajs/framework/utils"
import { moduleIntegrationTestRunner } from "@medusajs/test-utils"
import { describe, expect, it, vi } from "vitest"
import { PRODUCT_LIST_MODULE } from "../constants"
import ProductList from "../models/product-list"
import ProductListItem from "../models/product-list-item"
import type ProductListModuleService from "../service"

moduleIntegrationTestRunner<ProductListModuleService>({
  moduleName: PRODUCT_LIST_MODULE,
  moduleModels: [ProductList, ProductListItem],
  resolve: "./src/modules/product-list",
  testSuite: ({ service }) => {
    describe("createFavoriteProductList", () => {
      it("creates a favorite list with default display fields and nullable fields", async () => {
        const result = await service.createFavoriteProductList()
        const stored = await service.retrieveProductList(result.id)

        expect(stored).toEqual(
          expect.objectContaining({
            title: "Favorites",
            handle: "favorites",
            type: "favorite",
            access_type: "private",
            description: null,
            metadata: null,
          })
        )
      })
    })

    describe("createCustomProductList", () => {
      it("trims titles, generates handles, and defaults private access", async () => {
        const result = await service.createCustomProductList({
          title: "  Summer Picks  ",
        })

        expect(result).toEqual(
          expect.objectContaining({
            title: "Summer Picks",
            handle: "summer-picks",
            type: "custom",
            access_type: "private",
            description: null,
            metadata: null,
          })
        )
      })

      it("normalizes custom handles and preserves explicit public access", async () => {
        const result = await service.createCustomProductList({
          title: "Public Shelf",
          handle: "  Featured Products  ",
          access_type: "public",
          description: "Visible product list",
          metadata: { source: "test" },
        })

        expect(result).toEqual(
          expect.objectContaining({
            title: "Public Shelf",
            handle: "featured-products",
            type: "custom",
            access_type: "public",
            description: "Visible product list",
            metadata: { source: "test" },
          })
        )
      })

      it("preserves explicit private access", async () => {
        const result = await service.createCustomProductList({
          title: "Private Shelf",
          access_type: "private",
        })

        expect(result.access_type).toBe("private")
      })

      it("rejects invalid access values", async () => {
        await expect(
          service.createCustomProductList({
            title: "Shared Shelf",
            access_type: "shared" as never,
          })
        ).rejects.toMatchObject({
          type: MedusaError.Types.INVALID_DATA,
          message: "Unsupported product list access type: shared",
        })
      })
    })

    describe("createProductListItemForList", () => {
      it("persists favorite item quantity", async () => {
        const list = await service.createFavoriteProductList()

        const item = await service.createProductListItemForList({
          list_id: list.id,
          list_type: "favorite",
          quantity: 9,
          sort_order: 3,
          note: "Already owned",
          metadata: { source: "favorite-test" },
        })

        expect(item).toEqual(
          expect.objectContaining({
            list_id: list.id,
            quantity: 9,
            sort_order: 3,
            note: "Already owned",
            metadata: { source: "favorite-test" },
          })
        )
      })

      it("persists custom item quantity and increments it", async () => {
        const list = await service.createCustomProductList({
          title: "Cart Candidates",
        })

        const item = await service.createProductListItemForList({
          list_id: list.id,
          list_type: "custom",
          quantity: 2,
          sort_order: 4,
          note: "Compare later",
          metadata: { source: "custom-test" },
        })

        expect(item).toEqual(
          expect.objectContaining({
            list_id: list.id,
            quantity: 2,
            sort_order: 4,
            note: "Compare later",
            metadata: { source: "custom-test" },
          })
        )

        const incremented = await service.incrementProductListItemQuantity(
          item.id,
          3
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

        expect(item).toEqual(
          expect.objectContaining({
            list_id: list.id,
            quantity: 1,
            sort_order: 0,
            note: null,
            metadata: null,
          })
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
          })
        ).rejects.toMatchObject({
          type: MedusaError.Types.INVALID_DATA,
          message: "quantity must be a positive integer",
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
          })
        ).rejects.toMatchObject({
          type: MedusaError.Types.INVALID_DATA,
          message: "sort_order must be a non-negative integer",
        })
      })
    })
  },
})

vi.setConfig({ testTimeout: 60_000 })
