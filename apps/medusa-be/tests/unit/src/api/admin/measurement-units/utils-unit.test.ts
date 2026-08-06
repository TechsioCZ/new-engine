import type { MedusaContainer } from "@medusajs/framework/types"
import { beforeEach, describe, expect, it, vi } from "vitest"

type UnknownMock = (...args: unknown[]) => unknown

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

const { measurementService, productService } = vi.hoisted(() => ({
  measurementService: {
    listProductMeasurements: vi.fn<UnknownMock>(),
  },
  productService: {
    listAndCountProducts: vi.fn<UnknownMock>(),
  },
}))

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
  import("../../../../../../src/utils/measurement-units"),
  async (importOriginal) =>
    overrideModule(await importOriginal(), {
      getMeasurementUnitActiveProductCounts: vi.fn<UnknownMock>(),
      getMeasurementUnitService: vi.fn<() => typeof measurementService>(
        () => measurementService,
      ),
      toMeasurementUnitResponse: vi.fn<UnknownMock>(),
      toProductMeasurementResponse: vi.fn<UnknownMock>(),
      toProductVariantMeasurementResponse: vi.fn<UnknownMock>(),
    }),
)

describe("measurement unit assigned-product queries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("lists active assignments from the owning module with an exact product count", async () => {
    measurementService.listProductMeasurements.mockResolvedValue([
      {
        deleted_at: null,
        id: "pm_1",
        product_id: "prod_1",
        updated_at: "2026-07-27T00:00:00.000Z",
      },
      {
        deleted_at: null,
        id: "pm_2",
        product_id: "prod_2",
        updated_at: "2026-07-27T00:00:00.000Z",
      },
    ])
    productService.listAndCountProducts.mockResolvedValue([
      [
        {
          handle: "alpha",
          id: "prod_1",
          status: "published",
          title: "Alpha",
          updated_at: "2026-07-27T00:00:00.000Z",
        },
        {
          handle: "beta",
          id: "prod_2",
          status: "draft",
          title: "Beta",
          updated_at: "2026-07-27T00:00:00.000Z",
        },
      ],
      2,
    ])
    const scope = {
      resolve: vi.fn<(key: string) => unknown>(() => productService),
    }
    assertMockShape<MedusaContainer>(scope, ["resolve"])
    const { listMeasurementUnitAssignedProducts } =
      await import("../../../../../../src/api/admin/measurement-units/utils")
    const result = await listMeasurementUnitAssignedProducts({
      limit: 10,
      offset: 20,
      orderBy: "-updated_at",
      q: "50%_off",
      scope,
      status: "active",
      unitId: "unit_1",
    })

    expect(measurementService.listProductMeasurements).toHaveBeenCalledWith(
      {
        deleted_at: null,
        measurement_unit_id: "unit_1",
      },
      {
        order: { id: "ASC" },
        select: ["id", "product_id", "deleted_at", "updated_at"],
        skip: 0,
        take: 500,
        withDeleted: true,
      },
    )
    expect(productService.listAndCountProducts).toHaveBeenCalledWith(
      {
        $or: [
          { title: { $ilike: "%50\\%\\_off%" } },
          { handle: { $ilike: "%50\\%\\_off%" } },
        ],
        id: { $in: ["prod_1", "prod_2"] },
      },
      {
        order: { updated_at: "DESC" },
        select: ["id", "title", "handle", "status", "updated_at"],
        skip: 20,
        take: 10,
        withDeleted: true,
      },
    )
    expect(result).toStrictEqual({
      count: 2,
      products: [
        {
          deleted_at: null,
          handle: "alpha",
          id: "prod_1",
          product_id: "prod_1",
          status: "published",
          title: "Alpha",
          updated_at: "2026-07-27T00:00:00.000Z",
        },
        {
          deleted_at: null,
          handle: "beta",
          id: "prod_2",
          product_id: "prod_2",
          status: "draft",
          title: "Beta",
          updated_at: "2026-07-27T00:00:00.000Z",
        },
      ],
    })
  })

  it("prefers an active assignment over newer deleted history", async () => {
    const { getCanonicalAssignmentByProductId } =
      await import("../../../../../../src/api/admin/measurement-units/utils")
    const createdAt = new Date("2025-01-01")
    const measurementUnit = {
      base_quantity: 1,
      code: "piece",
      created_at: createdAt,
      deleted_at: null,
      description: null,
      id: "unit_1",
      name: "Piece",
      product_measurements: [],
      raw_base_quantity: {},
      symbol: "pc",
      updated_at: createdAt,
    }
    const active = {
      created_at: createdAt,
      deleted_at: null,
      id: "pm_active",
      measurement_unit: measurementUnit,
      measurement_unit_id: measurementUnit.id,
      product_id: "prod_1",
      updated_at: new Date("2026-01-01"),
      variant_measurements: [],
    }
    const deleted = {
      created_at: createdAt,
      deleted_at: new Date("2026-07-01"),
      id: "pm_deleted",
      measurement_unit: measurementUnit,
      measurement_unit_id: measurementUnit.id,
      product_id: "prod_1",
      updated_at: new Date("2026-07-01"),
      variant_measurements: [],
    }

    expect(
      getCanonicalAssignmentByProductId([active, deleted]).get("prod_1"),
    ).toBe(active)
  })
})
