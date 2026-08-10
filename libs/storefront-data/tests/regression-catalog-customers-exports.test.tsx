import { readFileSync } from "node:fs"
import path from "node:path"

import type { HttpTypes } from "@medusajs/types"
import { QueryClient } from "@tanstack/react-query"
import { hasTrimmedString } from "@techsio/std/string"
import type { Mock } from "vitest"
import { describe, expect, it, vi } from "vitest"

import { createCatalogHooks } from "../src/catalog/hooks"
import { createMedusaCatalogService } from "../src/catalog/medusa-service"
import type { MedusaCatalogListQuery } from "../src/catalog/medusa-service"
import { createCatalogQueryKeys } from "../src/catalog/query-keys"
import { createMedusaCustomerService } from "../src/customers/medusa-service"
import {
  createStoreCustomer,
  createStoreCustomerAddress,
  createTestMedusaSdk,
} from "./medusa-fixtures"

interface CatalogProduct {
  id: string
}
interface CatalogFacets {
  status: string[]
}
interface CatalogListInput {
  page: number
  limit: number
  region_id?: string
  country_code?: string
  enabled?: boolean
}
interface CatalogListParams {
  page: number
  limit: number
  region_id?: string
  country_code?: string
}

interface CatalogListResult {
  count: number
  facets: CatalogFacets
  limit: number
  page: number
  products: CatalogProduct[]
  totalPages: number
}

type GetCatalogProducts = (
  params: CatalogListParams,
) => Promise<CatalogListResult>

interface CatalogClientFetchResponse {
  count?: number
  facets?: unknown
  limit?: number
  page?: number
  products?: unknown[]
  search?: unknown
  totalPages?: number
}

type CatalogClientFetch = (
  path: string,
  init?: {
    query?: MedusaCatalogListQuery
    signal?: AbortSignal | null
  },
) => Promise<CatalogClientFetchResponse>

const createCatalogProductResponse = (
  product: unknown,
): CatalogClientFetchResponse => ({
  count: 1,
  facets: {
    brand: [],
    form: [],
    ingredient: [],
    price: { max: null, min: null },
    status: [],
  },
  limit: 12,
  page: 1,
  products: [product],
  search: {
    degraded: false,
    exactIdentifierMatch: false,
    profile: "default",
  },
  totalPages: 1,
})

type ListAddress = (
  query?: HttpTypes.SelectParams,
) => Promise<{ addresses: HttpTypes.StoreCustomerAddress[]; count?: number }>

type CreateAddress = (
  body: HttpTypes.StoreCreateCustomerAddress,
) => Promise<HttpTypes.StoreCustomerResponse>

type UpdateAddress = (
  addressId: string,
  body: HttpTypes.StoreUpdateCustomerAddress,
) => Promise<HttpTypes.StoreCustomerResponse>

type DeleteAddress = (
  addressId: string,
) => Promise<HttpTypes.StoreCustomerAddressDeleteResponse>

type UpdateCustomer = (
  body: HttpTypes.StoreUpdateCustomer,
) => Promise<HttpTypes.StoreCustomerResponse>

interface CustomerSdkSpies {
  createAddress: Mock<CreateAddress>
  deleteAddress: Mock<DeleteAddress>
  listAddress: Mock<ListAddress>
  update: Mock<UpdateCustomer>
  updateAddress: Mock<UpdateAddress>
}

const createCustomerSdkMock = () => {
  const sdk = createTestMedusaSdk()
  const spies: CustomerSdkSpies = {
    createAddress: vi.fn<CreateAddress>(),
    deleteAddress: vi.fn<DeleteAddress>(),
    listAddress: vi.fn<ListAddress>(),
    update: vi.fn<UpdateCustomer>(),
    updateAddress: vi.fn<UpdateAddress>(),
  }

  Object.defineProperties(sdk.store.customer, {
    createAddress: { value: spies.createAddress },
    deleteAddress: { value: spies.deleteAddress },
    listAddress: { value: spies.listAddress },
    update: { value: spies.update },
    updateAddress: { value: spies.updateAddress },
  })

  return { sdk, spies }
}

const readPackageJson = (): string =>
  readFileSync(path.join(process.cwd(), "package.json"), "utf-8")

describe("phase 1 regressions", () => {
  it("applies region input to standalone catalog prefetch keys and params", async () => {
    const seenParams: CatalogListParams[] = []

    const service = {
      getCatalogProducts: vi.fn<GetCatalogProducts>(async (params) => {
        seenParams.push(params)
        await Promise.resolve()
        return {
          count: 1,
          facets: { status: [] },
          limit: params.limit,
          page: params.page,
          products: [{ id: "prod_1" }],
          totalPages: 1,
        }
      }),
    }

    const namespace = "phase1-regression-catalog"
    const { prefetchCatalogProducts } = createCatalogHooks<
      CatalogProduct,
      CatalogListInput,
      CatalogListParams,
      CatalogFacets
    >({
      buildListParams: (input) => ({
        limit: input.limit ?? 12,
        page: input.page ?? 1,
        ...(hasTrimmedString(input.region_id)
          ? { region_id: input.region_id }
          : {}),
        ...(hasTrimmedString(input.country_code)
          ? { country_code: input.country_code }
          : {}),
      }),
      fallbackFacets: { status: [] },
      queryKeyNamespace: namespace,
      requireRegion: true,
      service,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const region = { country_code: "cz", region_id: "reg_cz" }
    await prefetchCatalogProducts(queryClient, { limit: 2, page: 1 }, region)

    expect(seenParams).toHaveLength(1)
    expect(seenParams[0]).toStrictEqual({
      country_code: "cz",
      limit: 2,
      page: 1,
      region_id: "reg_cz",
    })

    const queryKeys = createCatalogQueryKeys<CatalogListParams>(namespace)
    const queryKey = queryKeys.list({
      country_code: "cz",
      limit: 2,
      page: 1,
      region_id: "reg_cz",
    })
    expect(queryClient.getQueryData(queryKey)).toBeTruthy()
  })

  it("ignores non-string facet values in Medusa catalog list normalization", async () => {
    const sdk = createTestMedusaSdk()
    const clientFetch = vi.fn<CatalogClientFetch>().mockResolvedValue({
      count: 0,
      facets: {
        brand: [],
        form: [],
        ingredient: [],
        price: { max: null, min: null },
        status: [],
      },
      limit: 12,
      page: 1,
      products: [],
      search: {
        degraded: true,
        exactIdentifierMatch: false,
        profile: "default",
      },
      totalPages: 0,
    })
    Object.defineProperty(sdk.client, "fetch", { value: clientFetch })

    const service = createMedusaCatalogService(sdk)

    const malformedInput = {
      limit: 12,
      locale: "sk-SK",
      page: 1,
      status: [" active ", null, 5, "draft", ""],
    }

    await expect(
      Reflect.apply(service.getCatalogProducts, service, [malformedInput]),
    ).resolves.toBeTruthy()

    expect(clientFetch).toHaveBeenCalledWith("/store/catalog/products", {
      query: {
        limit: 12,
        locale: "sk-SK",
        page: 1,
        sort: "recommended",
        status: "active,draft",
      },
      signal: null,
    })
  })

  it("propagates degraded catalog search metadata after runtime validation", async () => {
    const sdk = createTestMedusaSdk()
    const clientFetch = vi.fn<CatalogClientFetch>().mockResolvedValue({
      count: 0,
      facets: {
        brand: [],
        form: [],
        ingredient: [],
        price: { max: null, min: null },
        status: [],
      },
      limit: 12,
      page: 1,
      products: [],
      search: {
        degraded: true,
        exactIdentifierMatch: false,
        profile: "default",
      },
      totalPages: 0,
    })
    Object.defineProperty(sdk.client, "fetch", { value: clientFetch })

    const result = await createMedusaCatalogService(sdk).getCatalogProducts({})
    if (result.search === undefined) {
      throw new TypeError("Catalog search metadata is missing")
    }
    expect(result.search.degraded).toBeTruthy()
  })

  it("rejects malformed catalog products and scalar pagination", async () => {
    const sdk = createTestMedusaSdk()
    const clientFetch = vi.fn<CatalogClientFetch>().mockResolvedValue({
      count: -1,
      facets: {
        brand: [],
        form: [],
        ingredient: [],
        price: { max: null, min: null },
        status: [],
      },
      limit: 12,
      page: 1,
      products: [{ handle: "invalid", id: 7, title: "Invalid" }],
      search: {
        degraded: false,
        exactIdentifierMatch: false,
        profile: "default",
      },
      totalPages: 0,
    })
    Object.defineProperty(sdk.client, "fetch", { value: clientFetch })

    await expect(
      createMedusaCatalogService(sdk).getCatalogProducts({}),
    ).rejects.toMatchObject({ code: "INVALID_MEDUSA_CATALOG_RESPONSE" })
  })

  it("preserves validated catalog product identity and status", async () => {
    const sdk = createTestMedusaSdk()
    const product = {
      handle: "identity-product",
      id: "prod_identity",
      status: "rejected",
      title: "Identity product",
    }
    const clientFetch = vi
      .fn<CatalogClientFetch>()
      .mockResolvedValue(createCatalogProductResponse(product))
    Object.defineProperty(sdk.client, "fetch", { value: clientFetch })

    const response = await createMedusaCatalogService(sdk).getCatalogProducts(
      {},
    )

    expect(response.products[0]).toBe(product)
    expect(response.products[0]?.status).toBe("rejected")
  })

  it("accepts catalog products without an optional status", async () => {
    const sdk = createTestMedusaSdk()
    const product = {
      handle: "missing-status",
      id: "prod_1",
      title: "Missing status",
    }
    const clientFetch = vi
      .fn<CatalogClientFetch>()
      .mockResolvedValue(createCatalogProductResponse(product))
    Object.defineProperty(sdk.client, "fetch", { value: clientFetch })

    await expect(
      createMedusaCatalogService(sdk).getCatalogProducts({}),
    ).resolves.toMatchObject({ products: [product] })
  })

  it("rejects an unrecognized catalog product status", async () => {
    const sdk = createTestMedusaSdk()
    const product = {
      handle: "invalid-status",
      id: "prod_1",
      status: "active",
      title: "Invalid status",
    }
    const clientFetch = vi
      .fn<CatalogClientFetch>()
      .mockResolvedValue(createCatalogProductResponse(product))
    Object.defineProperty(sdk.client, "fetch", { value: clientFetch })

    await expect(
      createMedusaCatalogService(sdk).getCatalogProducts({}),
    ).rejects.toMatchObject({ code: "INVALID_MEDUSA_CATALOG_RESPONSE" })
  })

  it("rejects malformed nested catalog product fields", async () => {
    const sdk = createTestMedusaSdk()
    const clientFetch = vi.fn<CatalogClientFetch>().mockResolvedValue({
      count: 1,
      facets: {
        brand: [],
        form: [],
        ingredient: [],
        price: { max: 20, min: 10 },
        status: [],
      },
      limit: 12,
      page: 1,
      products: [
        {
          brand: {},
          handle: "invalid-brand",
          id: "prod_1",
          images: [{}],
          title: "Invalid brand",
        },
      ],
      search: {
        degraded: false,
        exactIdentifierMatch: false,
        profile: "default",
      },
      totalPages: 1,
    })
    Object.defineProperty(sdk.client, "fetch", { value: clientFetch })

    await expect(
      createMedusaCatalogService(sdk).getCatalogProducts({}),
    ).rejects.toMatchObject({ code: "INVALID_MEDUSA_CATALOG_RESPONSE" })
  })

  it("rejects inconsistent catalog pagination and price bounds", async () => {
    const sdk = createTestMedusaSdk()
    const clientFetch = vi.fn<CatalogClientFetch>().mockResolvedValue({
      count: 13,
      facets: {
        brand: [],
        form: [],
        ingredient: [],
        price: { max: 10, min: 20 },
        status: [],
      },
      limit: 12,
      page: 1,
      products: [],
      search: {
        degraded: false,
        exactIdentifierMatch: false,
        profile: "default",
      },
      totalPages: 1,
    })
    Object.defineProperty(sdk.client, "fetch", { value: clientFetch })

    await expect(
      createMedusaCatalogService(sdk).getCatalogProducts({}),
    ).rejects.toMatchObject({ code: "INVALID_MEDUSA_CATALOG_RESPONSE" })
  })

  it("rejects a product page that contradicts its count", async () => {
    const sdk = createTestMedusaSdk()
    const clientFetch = vi.fn<CatalogClientFetch>().mockResolvedValue({
      count: 0,
      facets: {
        brand: [],
        form: [],
        ingredient: [],
        price: { max: null, min: null },
        status: [],
      },
      limit: 12,
      page: 1,
      products: [{ handle: "unexpected", id: "prod_1", title: "Unexpected" }],
      search: {
        degraded: false,
        exactIdentifierMatch: false,
        profile: "default",
      },
      totalPages: 0,
    })
    Object.defineProperty(sdk.client, "fetch", { value: clientFetch })

    await expect(
      createMedusaCatalogService(sdk).getCatalogProducts({}),
    ).rejects.toMatchObject({ code: "INVALID_MEDUSA_CATALOG_RESPONSE" })
  })

  it("selects newly created customer address by id diff instead of array order", async () => {
    const { sdk, spies } = createCustomerSdkMock()
    const createdAddress = createStoreCustomerAddress("addr_new", {
      address_1: "New",
    })
    spies.createAddress.mockResolvedValue({
      customer: createStoreCustomer("cus_1", {
        addresses: [
          createStoreCustomerAddress("addr_old_1", { address_1: "Old 1" }),
          createdAddress,
          createStoreCustomerAddress("addr_old_2", { address_1: "Old 2" }),
        ],
      }),
    })
    spies.listAddress.mockResolvedValue({
      addresses: [
        createStoreCustomerAddress("addr_old_1"),
        createStoreCustomerAddress("addr_old_2"),
      ],
    })

    const service = createMedusaCustomerService(sdk)

    const created = await service.createAddress({
      address_1: "New",
      city: "Prague",
    })

    expect(created).toBe(createdAddress)
  })

  it("loads all address pages before id diff in createAddress", async () => {
    const { sdk, spies } = createCustomerSdkMock()
    spies.createAddress.mockResolvedValue({
      customer: createStoreCustomer("cus_1", {
        addresses: [
          createStoreCustomerAddress("addr_old_1", { address_1: "Old 1" }),
          createStoreCustomerAddress("addr_old_2", { address_1: "Old 2" }),
          createStoreCustomerAddress("addr_old_3", { address_1: "Old 3" }),
          createStoreCustomerAddress("addr_new", { address_1: "New" }),
        ],
      }),
    })
    spies.listAddress
      .mockResolvedValueOnce({
        addresses: [
          createStoreCustomerAddress("addr_old_1"),
          createStoreCustomerAddress("addr_old_2"),
        ],
        count: 3,
      })
      .mockResolvedValueOnce({
        addresses: [createStoreCustomerAddress("addr_old_3")],
        count: 3,
      })

    const service = createMedusaCustomerService(sdk)

    const created = await service.createAddress({
      address_1: "New",
      city: "Prague",
    })

    expect(created.id).toBe("addr_new")
    expect(spies.listAddress).toHaveBeenCalledTimes(2)
    expect(spies.listAddress).toHaveBeenNthCalledWith(1, {
      limit: 100,
      offset: 0,
    })
    expect(spies.listAddress).toHaveBeenNthCalledWith(2, {
      limit: 100,
      offset: 2,
    })
  })

  it("falls back to newest matching address when pre-list fails", async () => {
    const { sdk, spies } = createCustomerSdkMock()
    spies.createAddress.mockResolvedValue({
      customer: createStoreCustomer("cus_1", {
        addresses: [
          createStoreCustomerAddress("addr_other", {
            address_1: "Other",
            city: "Brno",
            created_at: "2026-02-20T10:00:00.000Z",
          }),
          createStoreCustomerAddress("addr_match_old", {
            address_1: "Main",
            city: "Prague",
            created_at: "2026-02-20T12:00:00.000Z",
          }),
          createStoreCustomerAddress("addr_match_new", {
            address_1: "Main",
            city: "Prague",
            created_at: "2026-02-20T13:00:00.000Z",
          }),
        ],
      }),
    })
    spies.listAddress.mockRejectedValue(new Error("not available"))

    const service = createMedusaCustomerService(sdk)

    const created = await service.createAddress({
      address_1: "Main",
      city: "Prague",
    })

    expect(created.id).toBe("addr_match_new")
  })

  it("defines explicit package exports for client, server, and product-lists entry points", () => {
    const packageJson: unknown = JSON.parse(readPackageJson())

    expect(packageJson).toMatchObject({
      exports: {
        ".": null,
        "./client/provider": {
          import: "./dist/client/provider.js",
          types: "./dist/src/client/provider.d.ts",
        },
        "./server/get-query-client": {
          import: "./dist/server/get-query-client.js",
          types: "./dist/src/server/get-query-client.d.ts",
        },
      },
    })
  })

  it("blocks root export aliases and undocumented product-lists wildcard", () => {
    const packageJson = readPackageJson()
    const parsedPackageJson: unknown = JSON.parse(packageJson)

    expect(parsedPackageJson).toMatchObject({
      exports: {
        "./product-lists/query-options": {
          import: "./dist/product-lists/query-options.js",
          types: "./dist/src/product-lists/query-options.d.ts",
        },
      },
    })
    expect(packageJson).not.toContain('"./get-query-client"')
    expect(packageJson).not.toContain('"./medusa/cart-flow"')
    expect(packageJson).not.toContain('"./*"')
  })
})
