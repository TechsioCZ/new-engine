import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type {
  StoreCreateFavoriteProductListItemSchemaType,
  StoreCreateProductListItemSchemaType,
  StoreGetProductListsSchemaType,
  StoreIncrementProductListItemQuantitySchemaType,
} from "../../../../../../src/api/store/product-lists/validators"
import { PRODUCT_LIST_MODULE } from "../../../../../../src/modules/product-list/constants"

const workflowMocks = vi.hoisted(() => {
  const createCustomerProductListRun = vi.fn<() => Promise<unknown>>()
  const createProductListItemRun = vi.fn<() => Promise<unknown>>()
  const addFavoriteProductListItemRun = vi.fn<() => Promise<unknown>>()
  const incrementProductListItemRun = vi.fn<() => Promise<unknown>>()

  return {
    addFavoriteProductListItemRun,
    addFavoriteProductListItemWorkflow: vi.fn<
      () => { run: typeof addFavoriteProductListItemRun }
    >(() => ({
      run: addFavoriteProductListItemRun,
    })),
    createCustomerProductListRun,
    createCustomerProductListWorkflow: vi.fn<
      () => { run: typeof createCustomerProductListRun }
    >(() => ({
      run: createCustomerProductListRun,
    })),
    createProductListItemRun,
    createProductListItemWorkflow: vi.fn<
      () => { run: typeof createProductListItemRun }
    >(() => ({
      run: createProductListItemRun,
    })),
    incrementProductListItemRun,
    incrementProductListItemWorkflow: vi.fn<
      () => { run: typeof incrementProductListItemRun }
    >(() => ({
      run: incrementProductListItemRun,
    })),
  }
})

const { overrideModule } = vi.hoisted(() => ({
  overrideModule: <Module extends object>(
    original: Module,
    replacements: Record<PropertyKey, unknown>,
  ): Module =>
    Object.defineProperties(
      { ...original },
      Object.getOwnPropertyDescriptors(replacements),
    ),
}))

vi.mock(
  import("../../../../../../src/links/customer-product-list"),
  async () => {
    const medusaUtils = await import("@medusajs/utils")
    return {
      CustomerProductListLink: {
        [medusaUtils.DefineLinkSymbol]: true,
        entryPoint: "customer_product_list",
        serviceName: "CustomerProductListLink",
      },
    }
  },
)

vi.mock(
  import("../../../../../../src/links/product-list-item-product"),
  async () => {
    const medusaUtils = await import("@medusajs/utils")
    return {
      ProductListItemProductLink: {
        [medusaUtils.DefineLinkSymbol]: true,
        entryPoint: "product_list_item_product",
        serviceName: "ProductListItemProductLink",
      },
    }
  },
)

vi.mock(
  import("../../../../../../src/links/product-list-item-variant"),
  async () => {
    const medusaUtils = await import("@medusajs/utils")
    return {
      ProductListItemVariantLink: {
        [medusaUtils.DefineLinkSymbol]: true,
        entryPoint: "product_list_item_variant",
        serviceName: "ProductListItemVariantLink",
      },
    }
  },
)

vi.mock(
  import("../../../../../../src/workflows/product-list/workflows/add-favorite-product-list-item"),
  async (importOriginal) =>
    overrideModule(await importOriginal(), {
      addFavoriteProductListItemWorkflow:
        workflowMocks.addFavoriteProductListItemWorkflow,
    }),
)

vi.mock(
  import("../../../../../../src/workflows/product-list/workflows/create-customer-product-list"),
  async (importOriginal) =>
    overrideModule(await importOriginal(), {
      createCustomerProductListWorkflow:
        workflowMocks.createCustomerProductListWorkflow,
    }),
)

vi.mock(
  import("../../../../../../src/workflows/product-list/workflows/create-product-list-item"),
  async (importOriginal) =>
    overrideModule(await importOriginal(), {
      createProductListItemWorkflow:
        workflowMocks.createProductListItemWorkflow,
    }),
)

vi.mock(
  import("../../../../../../src/workflows/product-list/workflows/increment-product-list-item"),
  async (importOriginal) =>
    overrideModule(await importOriginal(), {
      incrementProductListItemWorkflow:
        workflowMocks.incrementProductListItemWorkflow,
    }),
)

interface ProductListServiceMock {
  listAndCountProductLists: ReturnType<typeof vi.fn>
  listProductListItems: ReturnType<typeof vi.fn>
  retrieveProductList: ReturnType<typeof vi.fn>
}

/**
 * Asserts that a plain mock object contains the given keys before narrowing
 * it to a framework type. Building the mock as `unknown` first (instead of
 * the target type) avoids requiring every property of the huge Node
 * request/response interfaces while still validating the shape the route
 * handler actually reads from at runtime.
 */
const assertMockShape: <T>(
  candidate: unknown,
  requiredKeys: readonly (keyof T)[],
) => asserts candidate is T = (candidate, requiredKeys) => {
  if (typeof candidate !== "object" || candidate === null) {
    throw new TypeError("Expected a mock object")
  }

  for (const key of requiredKeys) {
    if (!(key in candidate)) {
      throw new TypeError(`Mock object missing required key: ${String(key)}`)
    }
  }
}

const AUTHENTICATED_REQUEST_KEYS = [
  "auth_context",
  "params",
  "scope",
  "validatedBody",
  "validatedQuery",
] as const

/**
 * Wraps `expect.objectContaining` with an explicit `unknown` return type.
 * Vitest types this matcher factory as `any`, so using it directly as a
 * nested object-literal property value trips `no-unsafe-assignment`.
 */
const objectContaining = (value: Record<string, unknown>): unknown =>
  expect.objectContaining(value)

type MockMedusaResponse = MedusaResponse & {
  json: ReturnType<typeof vi.fn>
  status: ReturnType<typeof vi.fn>
}

interface ProductListCreationModule {
  POST: (
    req: AuthenticatedMedusaRequest<Record<string, unknown>>,
    res: MockMedusaResponse,
  ) => Promise<void>
}

const createProductList = (
  overrides: Partial<Record<string, unknown>> = {},
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
  overrides: Partial<Record<string, unknown>> = {},
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
  overrides: Partial<ProductListServiceMock> = {},
): ProductListServiceMock => ({
  listAndCountProductLists: vi.fn<() => unknown>(),
  listProductListItems: vi.fn<() => Promise<unknown>>().mockResolvedValue([]),
  retrieveProductList: vi.fn<() => unknown>(),
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
  vi.fn<(args: { entity: string }) => unknown>(({ entity }) => {
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

const createMockRequest = <T>(
  options: {
    actorId?: string | null
    graph?: ReturnType<typeof createGraphMock>
    params?: Record<string, string | undefined>
    productListService?: ProductListServiceMock
    validatedBody?: Record<string, unknown>
    validatedQuery?: Record<string, unknown>
  },
  requiredKeys: readonly (keyof T)[],
): T => {
  const {
    actorId = "cus_1",
    graph = createGraphMock(),
    params = {},
    productListService = createProductListService(),
    validatedBody = {},
    validatedQuery = {},
  } = options

  const candidate: unknown = {
    auth_context: actorId === null ? undefined : { actor_id: actorId },
    params,
    scope: {
      resolve: vi.fn<(key: string) => unknown>((key) => {
        if (key === PRODUCT_LIST_MODULE) {
          return productListService
        }

        if (key === ContainerRegistrationKeys.QUERY) {
          return { graph }
        }

        throw new Error(`Unexpected container key: ${key}`)
      }),
    },
    validatedBody,
    validatedQuery,
  }

  assertMockShape<T>(candidate, requiredKeys)
  return candidate
}

const createMockResponse = (): MockMedusaResponse => {
  const candidate: unknown = {
    json: vi.fn<(body?: unknown) => unknown>().mockReturnThis(),
    status: vi.fn<(code?: number) => unknown>().mockReturnThis(),
  }

  assertMockShape<MockMedusaResponse>(candidate, ["json", "status"])
  return candidate
}

describe("Store product-list routes", () => {
  beforeEach(() => {
    workflowMocks.addFavoriteProductListItemRun.mockReset()
    workflowMocks.addFavoriteProductListItemWorkflow.mockReset()
    workflowMocks.addFavoriteProductListItemWorkflow.mockReturnValue({
      run: workflowMocks.addFavoriteProductListItemRun,
    })
    workflowMocks.createCustomerProductListRun.mockReset()
    workflowMocks.createCustomerProductListWorkflow.mockReset()
    workflowMocks.createCustomerProductListWorkflow.mockReturnValue({
      run: workflowMocks.createCustomerProductListRun,
    })
    workflowMocks.createProductListItemRun.mockReset()
    workflowMocks.createProductListItemWorkflow.mockReset()
    workflowMocks.createProductListItemWorkflow.mockReturnValue({
      run: workflowMocks.createProductListItemRun,
    })
    workflowMocks.incrementProductListItemRun.mockReset()
    workflowMocks.incrementProductListItemWorkflow.mockReset()
    workflowMocks.incrementProductListItemWorkflow.mockReturnValue({
      run: workflowMocks.incrementProductListItemRun,
    })
  })

  describe("GET /store/product-lists", () => {
    it("returns an empty customer-scoped result without querying product lists when no linked lists exist", async () => {
      const { GET } =
        await import("../../../../../../src/api/store/product-lists/route")
      const productListService = createProductListService()
      const graph = createGraphMock()
      const req = createMockRequest<
        AuthenticatedMedusaRequest<unknown, StoreGetProductListsSchemaType>
      >(
        {
          actorId: "cus_1",
          graph,
          productListService,
          validatedQuery: { limit: 20, offset: 0 },
        },
        AUTHENTICATED_REQUEST_KEYS,
      )
      const res = createMockResponse()

      await GET(req, res)

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
      const { GET } =
        await import("../../../../../../src/api/store/product-lists/route")
      const list = createProductList({ id: "plist_1" })
      const item = createProductListItem({
        id: "pli_1",
        list_id: "plist_1",
        quantity: 2,
      })
      const productListService = createProductListService({
        listAndCountProductLists: vi
          .fn<() => Promise<unknown>>()
          .mockResolvedValue([[list], 1]),
        listProductListItems: vi
          .fn<() => Promise<unknown>>()
          .mockResolvedValue([item]),
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
      const req = createMockRequest<
        AuthenticatedMedusaRequest<unknown, StoreGetProductListsSchemaType>
      >(
        {
          actorId: "cus_1",
          graph,
          productListService,
          validatedQuery: {
            handle: "spring-picks",
            limit: 10,
            offset: 5,
            type: "custom",
          },
        },
        AUTHENTICATED_REQUEST_KEYS,
      )
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
        },
      )
      expect(productListService.listProductListItems).toHaveBeenCalledWith(
        { list_id: "plist_1" },
        {
          order: { created_at: "ASC", list_id: "ASC", sort_order: "ASC" },
          take: 100,
        },
      )
      expect(res.json).toHaveBeenCalledWith({
        count: 1,
        limit: 10,
        offset: 5,
        product_lists: [
          objectContaining({
            id: "plist_1",
            items: [
              objectContaining({
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
      const { GET } =
        await import("../../../../../../src/api/store/product-lists/[id]/route")
      const publicList = createProductList({
        access_type: "public",
        id: "plist_public",
      })
      const item = createProductListItem({
        id: "pli_public",
        list_id: "plist_public",
      })
      const productListService = createProductListService({
        listProductListItems: vi
          .fn<() => Promise<unknown>>()
          .mockResolvedValue([item]),
        retrieveProductList: vi
          .fn<() => Promise<unknown>>()
          .mockResolvedValue(publicList),
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
      const req = createMockRequest<AuthenticatedMedusaRequest>(
        {
          actorId: null,
          graph,
          params: { id: "plist_public" },
          productListService,
        },
        AUTHENTICATED_REQUEST_KEYS,
      )
      const res = createMockResponse()

      await GET(req, res)

      expect(productListService.retrieveProductList).toHaveBeenCalledWith(
        "plist_public",
      )
      expect(res.json).toHaveBeenCalledWith({
        product_list: objectContaining({
          access_type: "public",
          id: "plist_public",
          items: [
            objectContaining({
              product_id: "prod_public",
              variant_id: "variant_public",
            }),
          ],
        }),
      })
    })

    it("rejects unauthenticated access to private lists as not found", async () => {
      const { GET } =
        await import("../../../../../../src/api/store/product-lists/[id]/route")
      const productListService = createProductListService({
        retrieveProductList: vi
          .fn<() => Promise<unknown>>()
          .mockResolvedValue(createProductList({ id: "plist_private" })),
      })
      const req = createMockRequest<AuthenticatedMedusaRequest>(
        {
          actorId: null,
          params: { id: "plist_private" },
          productListService,
        },
        AUTHENTICATED_REQUEST_KEYS,
      )
      const res = createMockResponse()

      await expect(GET(req, res)).rejects.toMatchObject({
        message: "Product list plist_private was not found",
        type: MedusaError.Types.NOT_FOUND,
      })
      expect(productListService.listProductListItems).not.toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })

    it("rejects authenticated non-owners of private lists as not found", async () => {
      const { GET } =
        await import("../../../../../../src/api/store/product-lists/[id]/route")
      const productListService = createProductListService({
        retrieveProductList: vi
          .fn<() => Promise<unknown>>()
          .mockResolvedValue(createProductList({ id: "plist_private" })),
      })
      const graph = createGraphMock()
      const req = createMockRequest<AuthenticatedMedusaRequest>(
        {
          actorId: "cus_other",
          graph,
          params: { id: "plist_private" },
          productListService,
        },
        AUTHENTICATED_REQUEST_KEYS,
      )
      const res = createMockResponse()

      await expect(GET(req, res)).rejects.toMatchObject({
        message: "Product list plist_private was not found",
        type: MedusaError.Types.NOT_FOUND,
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
    ])(
      "delegates $expectedType creation to the customer product-list workflow",
      async ({ expectedType, importPath, validatedBody }) => {
        const routeModule: unknown = await import(importPath)
        assertMockShape<ProductListCreationModule>(routeModule, ["POST"])
        const { POST } = routeModule
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
        const req = createMockRequest<
          AuthenticatedMedusaRequest<Record<string, unknown>>
        >(
          {
            actorId: "cus_1",
            validatedBody,
          },
          AUTHENTICATED_REQUEST_KEYS,
        )
        const res = createMockResponse()

        await POST(req, res)

        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.json).toHaveBeenCalledWith({
          created: expectedType === "custom",
          product_list: objectContaining({
            id: `plist_${expectedType}`,
            type: expectedType,
          }),
        })
      },
    )
  })

  describe("POST /store/product-lists/:id/items", () => {
    it("delegates to the create item workflow and returns persisted product and variant links", async () => {
      const { POST } =
        await import("../../../../../../src/api/store/product-lists/[id]/items/route")
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
      const req = createMockRequest<
        AuthenticatedMedusaRequest<StoreCreateProductListItemSchemaType>
      >(
        {
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
        },
        AUTHENTICATED_REQUEST_KEYS,
      )
      const res = createMockResponse()

      await POST(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        item: objectContaining({
          id: "pli_created",
          product_id: "prod_persisted",
          variant_id: "variant_persisted",
        }),
      })
    })
  })

  describe("POST /store/product-lists/favorites/items", () => {
    it("returns the created favorite item and favorite list with enriched items", async () => {
      const { POST } =
        await import("../../../../../../src/api/store/product-lists/favorites/items/route")
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
        listProductListItems: vi
          .fn<() => Promise<unknown>>()
          .mockResolvedValue([item]),
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
      const req = createMockRequest<
        AuthenticatedMedusaRequest<StoreCreateFavoriteProductListItemSchemaType>
      >(
        {
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
        },
        AUTHENTICATED_REQUEST_KEYS,
      )
      const res = createMockResponse()

      await POST(req, res)

      expect(productListService.listProductListItems).toHaveBeenCalledWith(
        { list_id: "plist_favorites" },
        {
          order: { created_at: "ASC", list_id: "ASC", sort_order: "ASC" },
          take: 100,
        },
      )
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        item: objectContaining({
          id: "pli_favorite",
          product_id: "prod_favorite",
          variant_id: "variant_favorite",
        }),
        product_list: objectContaining({
          id: "plist_favorites",
          items: [
            objectContaining({
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
      const { POST } =
        await import("../../../../../../src/api/store/product-lists/items/[id]/increment/route")
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
      const req = createMockRequest<
        AuthenticatedMedusaRequest<StoreIncrementProductListItemQuantitySchemaType>
      >(
        {
          actorId: "cus_1",
          graph,
          params: { id: "pli_incremented" },
          validatedBody: { quantity: 2 },
        },
        AUTHENTICATED_REQUEST_KEYS,
      )
      const res = createMockResponse()

      await POST(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        item: objectContaining({
          id: "pli_incremented",
          product_id: "prod_incremented",
          variant_id: "variant_incremented",
        }),
      })
    })
  })
})
