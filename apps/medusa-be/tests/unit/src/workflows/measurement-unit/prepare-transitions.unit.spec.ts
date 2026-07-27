import { MedusaError } from "@medusajs/framework/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { helpers, service } = vi.hoisted(() => ({
  helpers: {
    ensureProductExists: vi.fn(),
    ensureProductVariantBelongsToProduct: vi.fn(),
    getCanonicalProductMeasurement: vi.fn(),
    getCanonicalProductVariantMeasurement: vi.fn(),
    getCurrentProductMeasurement: vi.fn(),
    listProductMeasurementsForProduct: vi.fn(),
    retrieveActiveUnitOrThrow: vi.fn(),
  },
  service: {
    listProductVariantMeasurements: vi.fn(),
  },
}))

vi.mock("@medusajs/framework/workflows-sdk", () => ({
  createStep: vi.fn((_name, invoke) => invoke),
  StepResponse: class StepResponse<TPayload = unknown> {
    payload: TPayload

    constructor(payload: TPayload) {
      this.payload = payload
    }
  },
}))

vi.mock("../../../../../src/links/product-measurement", () => ({
  ProductMeasurementLink: { entryPoint: "product_product_measurement" },
}))

vi.mock("../../../../../src/links/product-variant-measurement", () => ({
  ProductVariantMeasurementLink: {
    entryPoint: "product_variant_product_variant_measurement",
  },
}))

vi.mock(
  "../../../../../src/workflows/measurement-unit/steps/helpers",
  async () => {
    const actual = await vi.importActual<
      typeof import("../../../../../src/workflows/measurement-unit/steps/helpers")
    >("../../../../../src/workflows/measurement-unit/steps/helpers")

    return {
      ...actual,
      ...helpers,
    }
  }
)

vi.mock("../../../../../src/utils/measurement-units", () => ({
  getMeasurementUnitService: vi.fn(() => service),
  toNumber: (value: unknown) => Number(value),
}))

type MockStep = (
  input: unknown,
  context: {
    container: {
      resolve: ReturnType<typeof vi.fn>
    }
  }
) => Promise<{ payload: any }>

const container = {
  resolve: vi.fn(),
}

describe("measurement transition preparation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("moves only live variant measurements from the active assignment", async () => {
    helpers.listProductMeasurementsForProduct.mockResolvedValue([
      {
        deleted_at: null,
        id: "pm_current",
        measurement_unit_id: "unit_old",
        product_id: "prod_1",
        variant_measurements: [
          {
            deleted_at: null,
            id: "pvm_live",
            product_unit_quantity: 2,
            product_variant_id: "variant_live",
          },
          {
            deleted_at: new Date("2026-01-01"),
            id: "pvm_deleted",
            product_unit_quantity: 9,
            product_variant_id: "variant_deleted",
          },
        ],
      },
      {
        deleted_at: new Date("2026-01-02"),
        id: "pm_target",
        measurement_unit_id: "unit_new",
        product_id: "prod_1",
        variant_measurements: [],
      },
    ])
    const { prepareProductMeasurementTransitionStep } = await import(
      "../../../../../src/workflows/measurement-unit/steps/prepare-measurement-transitions"
    )
    const result = await (prepareProductMeasurementTransitionStep as MockStep)(
      {
        measurement_unit_id: "unit_new",
        product_id: "prod_1",
      },
      { container }
    )

    expect(result.payload.previous.id).toBe("pm_current")
    expect(result.payload.existing_target.id).toBe("pm_target")
    expect(result.payload.previous_variant_measurements).toEqual([
      expect.objectContaining({ id: "pvm_live" }),
    ])
    expect(result.payload.source_target_same).toBe(false)
  })

  it("partitions a unit change with one batch lookup and reuses deleted rows", async () => {
    service.listProductVariantMeasurements.mockResolvedValue([
      {
        deleted_at: new Date("2026-01-01"),
        id: "pvm_reused",
        product_measurement_id: "pm_target",
        product_unit_quantity: 1,
        product_variant_id: "variant_1",
      },
    ])
    const { prepareVariantMeasurementMigrationStep } = await import(
      "../../../../../src/workflows/measurement-unit/steps/prepare-measurement-transitions"
    )
    const result = await (prepareVariantMeasurementMigrationStep as MockStep)(
      {
        previous_variant_measurements: [
          {
            id: "pvm_old_1",
            product_measurement_id: "pm_old",
            product_unit_quantity: 2,
            product_variant_id: "variant_1",
          },
          {
            id: "pvm_old_2",
            product_measurement_id: "pm_old",
            product_unit_quantity: 3,
            product_variant_id: "variant_2",
          },
        ],
        source_target_same: false,
        target_product_measurement_id: "pm_target",
      },
      { container }
    )

    expect(service.listProductVariantMeasurements).toHaveBeenCalledOnce()
    expect(result.payload.records_to_restore).toEqual([
      expect.objectContaining({ id: "pvm_reused" }),
    ])
    expect(result.payload.updates).toEqual([
      {
        id: "pvm_reused",
        product_measurement_id: "pm_target",
        product_unit_quantity: 2,
        product_variant_id: "variant_1",
      },
    ])
    expect(result.payload.creates).toEqual([
      {
        product_measurement_id: "pm_target",
        product_unit_quantity: 3,
        product_variant_id: "variant_2",
      },
    ])
  })

  it("rejects an invalid stored quantity instead of propagating NaN", async () => {
    service.listProductVariantMeasurements.mockResolvedValue([])
    const { prepareVariantMeasurementMigrationStep } = await import(
      "../../../../../src/workflows/measurement-unit/steps/prepare-measurement-transitions"
    )

    await expect(
      (prepareVariantMeasurementMigrationStep as MockStep)(
        {
          previous_variant_measurements: [
            {
              id: "pvm_invalid",
              product_unit_quantity: "not-a-number",
              product_variant_id: "variant_1",
            },
          ],
          source_target_same: false,
          target_product_measurement_id: "pm_target",
        },
        { container }
      )
    ).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
    })
  })

  it("enforces quantity invariants for direct workflow callers", async () => {
    const { prepareSetProductVariantMeasurementStep } = await import(
      "../../../../../src/workflows/measurement-unit/steps/prepare-measurement-transitions"
    )

    await expect(
      (prepareSetProductVariantMeasurementStep as MockStep)(
        {
          product_id: "prod_1",
          product_unit_quantity: Number.NaN,
          product_variant_id: "variant_1",
        },
        { container }
      )
    ).rejects.toMatchObject({
      type: MedusaError.Types.INVALID_DATA,
    })
    expect(helpers.ensureProductVariantBelongsToProduct).not.toHaveBeenCalled()
  })

  it("returns a validation error when the product has no measurement unit", async () => {
    helpers.getCanonicalProductMeasurement.mockResolvedValue(undefined)
    const { prepareSetProductVariantMeasurementStep } = await import(
      "../../../../../src/workflows/measurement-unit/steps/prepare-measurement-transitions"
    )

    await expect(
      (prepareSetProductVariantMeasurementStep as MockStep)(
        {
          product_id: "prod_1",
          product_unit_quantity: 2,
          product_variant_id: "variant_1",
        },
        { container }
      )
    ).rejects.toMatchObject({
      type: MedusaError.Types.INVALID_DATA,
    })
  })

  it("creates the target link and dismisses another active link", async () => {
    container.resolve.mockReturnValue({
      graph: vi.fn().mockResolvedValue({
        data: [
          {
            deleted_at: null,
            product_id: "prod_1",
            product_measurement_id: "pm_old",
          },
        ],
      }),
    })
    const { prepareProductMeasurementLinkPlanStep } = await import(
      "../../../../../src/workflows/measurement-unit/steps/prepare-measurement-transitions"
    )
    const result = await (prepareProductMeasurementLinkPlanStep as MockStep)(
      {
        product_id: "prod_1",
        product_measurement_id: "pm_target",
      },
      { container }
    )

    expect(result.payload.links_to_create).toEqual([
      {
        product_id: "prod_1",
        product_measurement_id: "pm_target",
      },
    ])
    expect(result.payload.links_to_dismiss).toEqual([
      {
        product_id: "prod_1",
        product_measurement_id: "pm_old",
      },
    ])
    expect(result.payload.links_to_restore).toEqual([])
  })

  it("restores a soft-deleted target link", async () => {
    container.resolve.mockReturnValue({
      graph: vi.fn().mockResolvedValue({
        data: [
          {
            deleted_at: new Date("2026-01-01"),
            product_id: "prod_1",
            product_measurement_id: "pm_target",
          },
        ],
      }),
    })
    const { prepareProductMeasurementLinkPlanStep } = await import(
      "../../../../../src/workflows/measurement-unit/steps/prepare-measurement-transitions"
    )
    const result = await (prepareProductMeasurementLinkPlanStep as MockStep)(
      {
        product_id: "prod_1",
        product_measurement_id: "pm_target",
      },
      { container }
    )

    expect(result.payload.links_to_create).toEqual([])
    expect(result.payload.links_to_dismiss).toEqual([])
    expect(result.payload.links_to_restore).toEqual([
      {
        product_id: "prod_1",
        product_measurement_id: "pm_target",
      },
    ])
  })

  it("rejects malformed custom-link query results", async () => {
    container.resolve.mockReturnValue({
      graph: vi.fn().mockResolvedValue({
        data: [{ product_id: "prod_1" }],
      }),
    })
    const { prepareProductMeasurementLinkPlanStep } = await import(
      "../../../../../src/workflows/measurement-unit/steps/prepare-measurement-transitions"
    )

    await expect(
      (prepareProductMeasurementLinkPlanStep as MockStep)(
        {
          product_id: "prod_1",
          product_measurement_id: "pm_1",
        },
        { container }
      )
    ).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
    })
  })
})
