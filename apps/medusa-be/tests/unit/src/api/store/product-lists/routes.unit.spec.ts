import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

const workflowMocks = vi.hoisted(() => {
  const createCustomerProductListRun = vi.fn()
  const createProductListItemRun = vi.fn()
  const addFavoriteProductListItemRun = vi.fn()
  const incrementProductListItemRun = vi.fn()

  return {
    addFavoriteProductListItemRun,
    addFavoriteProductListItemWorkflow: vi.fn(() => ({
      run: addFavoriteProductListItemRun,
    })),
    createCustomerProductListRun,
    createCustomerProductListWorkflow: vi.fn(() => ({
      run: createCustomerProductListRun,
    })),
    createProductListItemRun,
    createProductListItemWorkflow: vi.fn(() => ({
      run: createProductListItemRun,
    })),
    incrementProductListItemRun,
    incrementProductListItemWorkflow: vi.fn(() => ({
      run: incrementProductListItemRun,
    })),
  }
})

vi.mock("../../../../../../src/links/customer-product-list", () => ({
  CustomerProductListLink: { entryPoint: "customer_product_list" },
}))

vi.mock("../../../../../../src/links/product-list-item-product", () => ({
  ProductListItemProductLink: { entryPoint: "product_list_item_product" },
}))

vi.mock("../../../../../../src/links/product-list-item-variant", () => ({
  ProductListItemVariantLink: { entryPoint: "product_list_item_variant" },
}))

vi.mock(
  "../../../../../../src/workflows/product-list/workflows/add-favorite-product-list-item",
  () => ({
    addFavoriteProductListItemWorkflow:
      workflowMocks.addFavoriteProductListItemWorkflow,
  })
)

vi.mock(
  "../../../../../../src/workflows/product-list/workflows/create-customer-product-list",
  () => ({
    createCustomerProductListWorkflow:
      workflowMocks.createCustomerProductListWorkflow,
  })
)

vi.mock(
  "../../../../../../src/workflows/product-list/workflows/create-product-list-item",
  () => ({
    createProductListItemWorkflow: workflowMocks.createProductListItemWorkflow,
  })
)

vi.mock(
  "../../../../../../src/workflows/product-list/workflows/increment-product-list-item",
  () => ({
    incrementProductListItemWorkflow:
      workflowMocks.incrementProductListItemWorkflow,
  })
)

const PRODUCT_LIST_MODULE = "product_list"

type ProductListServiceMock = {
  listAndCountProductLists: ReturnType<typeof vi.fn>
  listProductListItems: ReturnType<typeof vi.fn>
  retrieveProductList: ReturnType<typeof vi.fn>
}

const createProductList = (
  overrides: Partial<Record<string, unknown>> = {}
) => ({
  access_type: "private",
  created_at: "2026-01-01T00:00:00.000Z",
  description: null,
  handle: "spring-picks",
  id: "plist_1",
  metadata: null,
  title: "Spring Picks",
  type: "custom",
  updated_at: "2026-01-02T00:00:00.000Z",
  ...overrides,
})

const createProductListItem = (
  overrides: Partial<Record<string, unknown>> = {}
) => ({
  created_at: "2026-01-03T00:00:00.000Z",
  id: "pli_1",
  list_id: "plist_1",
  metadata: null,
  note: null,
  quantity: 1,
  sort_order: 0,
  updated_at: "2026-01-04T00:00:00.000Z",
  ...overrides,
})

const createProductListService = (
  overrides: Partial<ProductListServiceMock> = {}
): ProductListServiceMock => ({
  listAndCountProductLists: vi.fn(),
  listProductListItems: vi.fn().mockResolvedValue([]),
  retrieveProductList: vi.fn(),
  ...overrides,
})

const createGraphMock = ({
  customerLinks = [],
  productLinks = [],
  variantLinks = [],
}: {
  customerLinks?: Record<string, unknown>[]
  productLinks?: Record<string, unknown>[]
  variantLinks?: Record<string, unknown>[]
} = {}) =>
  vi.fn(async ({ entity }: { entity: string }) => {
    if (entity === "customer_product_list") {
      return { data: customerLinks }
    }

    if (entity === "product_list_item_product") {
      return { data: productLinks }
    }

    if (entity === "product_list_item_variant") {
      return { data: variantLinks }
    }

    throw new Error(`Unexpected graph entity: ${entity}`)
  })

const createMockRequest = ({
  actorId = "cus_1",
  graph = createGraphMock(),
  params = {},
  productListService = createProductListService(),
  validatedBody = {},
  validatedQuery = {},
}: {
  actorId?: string | undefined
  graph?: ReturnType<typeof createGraphMock>
  params?: Record<string, string | undefined>
  productListService?: ProductListServiceMock
  validatedBody?: Record<string, unknown>
  validatedQuery?: Record<string, unknown>
} = {}) =>
  ({
    auth_context: actorId === undefined ? undefined : { actor_id: actorId },
    params,
    scope: {
      resolve: vi.fn((key: string) => {
        if (key === PRODUCT_LIST_MODULE) {
          return productListService
        }

        if (key === ContainerRegistrationKeys.QUERY) {
          return { graph }
        }
      }),
    },
    validatedBody,
    validatedQuery,
  }) as any

const createMockResponse = () =>
  ({
    json: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  }) as any

describe("Store product-list routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("GET /store/product-lists", () => {
    it("returns an empty customer-scoped result without querying product lists when no linked lists exist", async () => {
      const { GET } = await import(
        "../../../../../../src/api/store/product-lists/route"
      )
      const productListService = createProductListService()
      const graph = createGraphMock()
      const req = createMockRequest({
        actorId: "cus_1",
        graph,
        productListService,
        validatedQuery: { limit: 20, offset: 0 },
      })
      const res = createMockResponse()

      await GET(req, res)

      expect(graph).toHaveBeenCalledOnce()
      expect(graph).toHaveBeenCalledWith({
        entity: "customer_product_list",
        fields: ["product_list_id"],
        filters: { customer_id: "cus_1" },
        pagination: { skip: 0, take: 1000 },
      })
      expect(productListService.listAndCountProductLists).not.toHaveBeenCalled()
      expect(productListService.listProductListItems).not.toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith({
        count: 0,
        limit: 20,
        offset: 0,
        product_lists: [],
      })
    })

    it("scopes product-list listing to current customer link ids and enriches inline items", async () => {
      const { GET } = await import(
        "../../../../../../src/api/store/product-lists/route"
      )
      const list = createProductList({ id: "plist_1" })
      const item = createProductListItem({
        id: "pli_1",
        list_id: "plist_1",
        quantity: 2,
      })
      const productListService = createProductListService({
        listAndCountProductLists: vi.fn().mockResolvedValue([[list], 1]),
        listProductListItems: vi.fn().mockResolvedValue([item]),
      })
      const graph = createGraphMock({
        customerLinks: [
          { product_list_id: "plist_1" },
          { product_list_id: "plist_2" },
        ],
        productLinks: [
          { product_id: "prod_persisted", product_list_item_id: "pli_1" },
        ],
        variantLinks: [
          {
            product_list_item_id: "pli_1",
            product_variant_id: "variant_persisted",
          },
        ],
      })
      const req = createMockRequest({
        actorId: "cus_1",
        graph,
        productListService,
        validatedQuery: {
          handle: "spring-picks",
          limit: 10,
          offset: 5,
          type: "custom",
        },
      })
      const res = createMockResponse()

      await GET(req, res)

      expect(productListService.listAndCountProductLists).toHaveBeenCalledWith(
        {
          handle: "spring-picks",
          id: { $in: ["plist_1", "plist_2"] },
          type: "custom",
        },
        {
          order: { created_at: "DESC" },
          skip: 5,
          take: 10,
        }
      )
      expect(productListService.listProductListItems).toHaveBeenCalledWith(
        { list_id: "plist_1" },
        {
          order: { created_at: "ASC", list_id: "ASC", sort_order: "ASC" },
          take: 100,
        }
      )
      expect(res.json).toHaveBeenCalledWith({
        count: 1,
        limit: 10,
        offset: 5,
        product_lists: [
          expect.objectContaining({
            id: "plist_1",
            items: [
              expect.objectContaining({
                id: "pli_1",
                product_id: "prod_persisted",
                variant_id: "variant_persisted",
              }),
            ],
          }),
        ],
      })
    })
  })

  describe("GET /store/product-lists/:id", () => {
    it("allows unauthenticated access to public lists", async () => {
      const { GET } = await import(
        "../../../../../../src/api/store/product-lists/[id]/route"
      )
      const publicList = createProductList({
        access_type: "public",
        id: "plist_public",
      })
      const item = createProductListItem({
        id: "pli_public",
        list_id: "plist_public",
      })
      const productListService = createProductListService({
        listProductListItems: vi.fn().mockResolvedValue([item]),
        retrieveProductList: vi.fn().mockResolvedValue(publicList),
      })
      const graph = createGraphMock({
        productLinks: [
          { product_id: "prod_public", product_list_item_id: "pli_public" },
        ],
        variantLinks: [
          {
            product_list_item_id: "pli_public",
            product_variant_id: "variant_public",
          },
        ],
      })
      const req = createMockRequest({
        actorId: undefined,
        graph,
        params: { id: "plist_public" },
        productListService,
      })
      const res = createMockResponse()

      await GET(req, res)

      expect(productListService.retrieveProductList).toHaveBeenCalledWith(
        "plist_public"
      )
      expect(graph).not.toHaveBeenCalledWith(
        expect.objectContaining({ entity: "customer_product_list" })
      )
      expect(res.json).toHaveBeenCalledWith({
        product_list: expect.objectContaining({
          access_type: "public",
          id: "plist_public",
          items: [
            expect.objectContaining({
              product_id: "prod_public",
              variant_id: "variant_public",
            }),
          ],
        }),
      })
    })

    it("rejects unauthenticated access to private lists as not found", async () => {
      const { GET } = await import(
        "../../../../../../src/api/store/product-lists/[id]/route"
      )
      const productListService = createProductListService({
        retrieveProductList: vi
          .fn()
          .mockResolvedValue(createProductList({ id: "plist_private" })),
      })
      const req = createMockRequest({
        actorId: undefined,
        params: { id: "plist_private" },
        productListService,
      })
      const res = createMockResponse()

      await expect(GET(req, res)).rejects.toMatchObject({
        message: "Product list plist_private was not found",
        type: MedusaError.Types.NOT_FOUND,
      })
      expect(productListService.listProductListItems).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })

    it("rejects authenticated non-owners of private lists as not found", async () => {
      const { GET } = await import(
        "../../../../../../src/api/store/product-lists/[id]/route"
      )
      const productListService = createProductListService({
        retrieveProductList: vi
          .fn()
          .mockResolvedValue(createProductList({ id: "plist_private" })),
      })
      const graph = createGraphMock()
      const req = createMockRequest({
        actorId: "cus_other",
        graph,
        params: { id: "plist_private" },
        productListService,
      })
      const res = createMockResponse()

      await expect(GET(req, res)).rejects.toMatchObject({
        message: "Product list plist_private was not found",
        type: MedusaError.Types.NOT_FOUND,
      })
      expect(graph).toHaveBeenCalledWith({
        entity: "customer_product_list",
        fields: ["product_list_id"],
        filters: {
          customer_id: "cus_other",
          product_list_id: "plist_private",
        },
        pagination: { take: 1 },
      })
      expect(productListService.listProductListItems).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })
  })

  describe("POST product-list creation routes", () => {
    it.each([
      {
        expectedType: "custom",
        importPath:
          "../../../../../../src/api/store/product-lists/custom/route",
        validatedBody: {
          access_type: "public",
          handle: "garden-kit",
          title: "Garden Kit",
        },
      },
      {
        expectedType: "favorite",
        importPath:
          "../../../../../../src/api/store/product-lists/favorites/route",
        validatedBody: {
          metadata: { origin: "header" },
        },
      },
    ])("delegates $expectedType creation to the customer product-list workflow", async ({
      expectedType,
      importPath,
      validatedBody,
    }) => {
      const { POST } = await import(importPath)
      const productList = createProductList({
        id: `plist_${expectedType}`,
        type: expectedType,
      })
      workflowMocks.createCustomerProductListRun.mockResolvedValue({
        result: {
          created: expectedType === "custom",
          product_list: productList,
        },
      })
      const req = createMockRequest({
        actorId: "cus_1",
        validatedBody,
      })
      const res = createMockResponse()

      await POST(req, res)

      expect(
        workflowMocks.createCustomerProductListWorkflow
      ).toHaveBeenCalledWith(req.scope)
      expect(workflowMocks.createCustomerProductListRun).toHaveBeenCalledWith({
        input: {
          customer_id: "cus_1",
          data: validatedBody,
          type: expectedType,
        },
      })
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        created: expectedType === "custom",
        product_list: expect.objectContaining({
          id: `plist_${expectedType}`,
          type: expectedType,
        }),
      })
    })
  })

  describe("POST /store/product-lists/:id/items", () => {
    it("delegates to the create item workflow and returns persisted product and variant links", async () => {
      const { POST } = await import(
        "../../../../../../src/api/store/product-lists/[id]/items/route"
      )
      const item = createProductListItem({
        id: "pli_created",
        list_id: "plist_1",
        product_id: null,
        variant_id: null,
      })
      workflowMocks.createProductListItemRun.mockResolvedValue({
        result: item,
      })
      const graph = createGraphMock({
        productLinks: [
          {
            product_id: "prod_persisted",
            product_list_item_id: "pli_created",
          },
        ],
        variantLinks: [
          {
            product_list_item_id: "pli_created",
            product_variant_id: "variant_persisted",
          },
        ],
      })
      const req = createMockRequest({
        actorId: "cus_1",
        graph,
        params: { id: "plist_1" },
        validatedBody: {
          metadata: { source: "detail" },
          note: "Restock",
          product_id: "prod_requested",
          quantity: 3,
          sort_order: 4,
          variant_id: "variant_requested",
        },
      })
      const res = createMockResponse()

      await POST(req, res)

      expect(workflowMocks.createProductListItemWorkflow).toHaveBeenCalledWith(
        req.scope
      )
      expect(workflowMocks.createProductListItemRun).toHaveBeenCalledWith({
        input: {
          customer_id: "cus_1",
          list_id: "plist_1",
          metadata: { source: "detail" },
          note: "Restock",
          product_id: "prod_requested",
          quantity: 3,
          sort_order: 4,
          variant_id: "variant_requested",
        },
      })
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        item: expect.objectContaining({
          id: "pli_created",
          product_id: "prod_persisted",
          variant_id: "variant_persisted",
        }),
      })
    })
  })

  describe("POST /store/product-lists/favorites/items", () => {
    it("returns the created favorite item and favorite list with enriched items", async () => {
      const { POST } = await import(
        "../../../../../../src/api/store/product-lists/favorites/items/route"
      )
      const item = createProductListItem({
        id: "pli_favorite",
        list_id: "plist_favorites",
        product_id: null,
        variant_id: null,
      })
      const favoriteList = createProductList({
        id: "plist_favorites",
        type: "favorite",
      })
      const productListService = createProductListService({
        listProductListItems: vi.fn().mockResolvedValue([item]),
      })
      workflowMocks.addFavoriteProductListItemRun.mockResolvedValue({
        result: { item, product_list: favoriteList },
      })
      const graph = createGraphMock({
        productLinks: [
          {
            product_id: "prod_favorite",
            product_list_item_id: "pli_favorite",
          },
        ],
        variantLinks: [
          {
            product_list_item_id: "pli_favorite",
            product_variant_id: "variant_favorite",
          },
        ],
      })
      const req = createMockRequest({
        actorId: "cus_1",
        graph,
        productListService,
        validatedBody: {
          metadata: { source: "heart" },
          note: "Buy later",
          product_id: "prod_requested",
          sort_order: 9,
          variant_id: "variant_requested",
        },
      })
      const res = createMockResponse()

      await POST(req, res)

      expect(
        workflowMocks.addFavoriteProductListItemWorkflow
      ).toHaveBeenCalledWith(req.scope)
      expect(workflowMocks.addFavoriteProductListItemRun).toHaveBeenCalledWith({
        input: {
          customer_id: "cus_1",
          metadata: { source: "heart" },
          note: "Buy later",
          product_id: "prod_requested",
          sort_order: 9,
          variant_id: "variant_requested",
        },
      })
      expect(productListService.listProductListItems).toHaveBeenCalledWith(
        { list_id: "plist_favorites" },
        {
          order: { created_at: "ASC", list_id: "ASC", sort_order: "ASC" },
          take: 100,
        }
      )
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        item: expect.objectContaining({
          id: "pli_favorite",
          product_id: "prod_favorite",
          variant_id: "variant_favorite",
        }),
        product_list: expect.objectContaining({
          id: "plist_favorites",
          items: [
            expect.objectContaining({
              id: "pli_favorite",
              product_id: "prod_favorite",
              variant_id: "variant_favorite",
            }),
          ],
        }),
      })
    })
  })

  describe("POST /store/product-lists/items/:id/increment", () => {
    it("delegates to the increment workflow and returns an enriched item response", async () => {
      const { POST } = await import(
        "../../../../../../src/api/store/product-lists/items/[id]/increment/route"
      )
      const item = createProductListItem({
        id: "pli_incremented",
        product_id: null,
        variant_id: null,
      })
      workflowMocks.incrementProductListItemRun.mockResolvedValue({
        result: item,
      })
      const graph = createGraphMock({
        productLinks: [
          {
            product_id: "prod_incremented",
            product_list_item_id: "pli_incremented",
          },
        ],
        variantLinks: [
          {
            product_list_item_id: "pli_incremented",
            product_variant_id: "variant_incremented",
          },
        ],
      })
      const req = createMockRequest({
        actorId: "cus_1",
        graph,
        params: { id: "pli_incremented" },
        validatedBody: { quantity: 2 },
      })
      const res = createMockResponse()

      await POST(req, res)

      expect(
        workflowMocks.incrementProductListItemWorkflow
      ).toHaveBeenCalledWith(req.scope)
      expect(workflowMocks.incrementProductListItemRun).toHaveBeenCalledWith({
        input: {
          customer_id: "cus_1",
          item_id: "pli_incremented",
          quantity: 2,
        },
      })
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        item: expect.objectContaining({
          id: "pli_incremented",
          product_id: "prod_incremented",
          variant_id: "variant_incremented",
        }),
      })
    })
  })
})
