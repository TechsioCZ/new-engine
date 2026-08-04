import { beforeEach, describe, expect, it, vi } from "vitest"

const { measurementService, productService } = vi.hoisted(() => ({
  measurementService: {
    listProductMeasurements: vi.fn(),
  },
  productService: {
    listAndCountProducts: vi.fn(),
  },
}))

vi.mock("../../../../../../src/utils/measurement-units", () => ({
  getMeasurementUnitActiveProductCounts: vi.fn(),
  getMeasurementUnitService: vi.fn(() => measurementService),
  toMeasurementUnitResponse: vi.fn(),
  toProductMeasurementResponse: vi.fn(),
  toProductVariantMeasurementResponse: vi.fn(),
}))

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
      resolve: vi.fn(() => productService),
    }
    const { listMeasurementUnitAssignedProducts } =
      await import("../../../../../../src/api/admin/measurement-units/utils")
    const result = await listMeasurementUnitAssignedProducts({
      limit: 10,
      offset: 20,
      orderBy: "-updated_at",
      q: "50%_off",
      scope: scope as never,
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
      }
    )
    expect(productService.listAndCountProducts).toHaveBeenCalledWith(
      {
        id: { $in: ["prod_1", "prod_2"] },
        $or: [
          { title: { $ilike: "%50\\%\\_off%" } },
          { handle: { $ilike: "%50\\%\\_off%" } },
        ],
      },
      {
        order: { updated_at: "DESC" },
        select: ["id", "title", "handle", "status", "updated_at"],
        skip: 20,
        take: 10,
        withDeleted: true,
      }
    )
    expect(result).toEqual({
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
    const active = {
      deleted_at: null,
      id: "pm_active",
      product_id: "prod_1",
      updated_at: new Date("2026-01-01"),
    }
    const deleted = {
      deleted_at: new Date("2026-07-01"),
      id: "pm_deleted",
      product_id: "prod_1",
      updated_at: new Date("2026-07-01"),
    }

    expect(
      getCanonicalAssignmentByProductId([active, deleted] as never).get(
        "prod_1"
      )
    ).toBe(active)
  })
})
