import { beforeEach, describe, expect, it, vi } from "vitest"

const { measurementService } = vi.hoisted(() => ({
  measurementService: {
    listProductMeasurements: vi.fn(),
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

  it("pushes active filtering, ordering, count, and pagination into the Index Module", async () => {
    const index = vi.fn().mockResolvedValue({
      data: [
        {
          handle: "alpha",
          id: "prod_1",
          status: "published",
          title: "Alpha",
          updated_at: "2026-07-27T00:00:00.000Z",
        },
      ],
      metadata: {
        estimate_count: 42,
        skip: 20,
        take: 10,
      },
    })
    const scope = {
      resolve: vi.fn(() => ({ index })),
    }
    const { listMeasurementUnitAssignedProducts } = await import(
      "../../../../../../src/api/admin/measurement-units/utils"
    )
    const result = await listMeasurementUnitAssignedProducts({
      limit: 10,
      offset: 20,
      orderBy: "-updated_at",
      q: "50%_off",
      scope: scope as never,
      status: "active",
      unitId: "unit_1",
    })

    expect(index).toHaveBeenCalledWith({
      entity: "product",
      fields: ["id", "title", "handle", "status", "updated_at"],
      filters: {
        product_measurement: {
          measurement_unit_id: "unit_1",
        },
        $or: [
          { title: { $ilike: "%50\\%\\_off%" } },
          { handle: { $ilike: "%50\\%\\_off%" } },
        ],
      },
      pagination: {
        order: { updated_at: "DESC" },
        skip: 20,
        take: 10,
      },
    })
    expect(measurementService.listProductMeasurements).not.toHaveBeenCalled()
    expect(result).toEqual({
      count: 42,
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
      ],
    })
  })

  it("prefers an active assignment over newer deleted history", async () => {
    const { getCanonicalAssignmentByProductId } = await import(
      "../../../../../../src/api/admin/measurement-units/utils"
    )
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
