import { MedusaError } from "@medusajs/framework/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type {
  ensureProductExists,
  ensureProductVariantBelongsToProduct,
  getCanonicalProductMeasurement,
  getCanonicalProductVariantMeasurement,
  getCurrentProductMeasurement,
  retrieveActiveUnitOrThrow,
} from "../../../../../src/workflows/measurement-unit/steps/helpers"
import type { ProductMeasurementLinkIds } from "../../../../../src/workflows/measurement-unit/steps/measurement-link-mutations"
import type {
  ProductMeasurementLinkPlan,
  ProductMeasurementTransitionPlan,
  SetVariantMeasurementPlan,
  VariantMeasurementMigrationPlan,
} from "../../../../../src/workflows/measurement-unit/steps/prepare-measurement-transitions"
import type {
  SetProductMeasurementWorkflowInput,
  SetProductVariantMeasurementWorkflowInput,
} from "../../../../../src/workflows/measurement-unit/types"

const { overrideModule } = vi.hoisted(() => ({
  overrideModule: <Module extends object>(
    original: Module,
    replacements: object,
  ): Module =>
    Object.defineProperties(
      { ...original },
      Object.getOwnPropertyDescriptors(replacements),
    ),
}))

interface ProductVariantMeasurementFixture {
  deleted_at?: Date | null
  id: string
  product_measurement_id?: string
  product_unit_quantity: number | string
  product_variant_id: string
}

interface ProductMeasurementFixture {
  deleted_at?: Date | null
  id: string
  measurement_unit_id: string
  product_id: string
  variant_measurements: ProductVariantMeasurementFixture[]
}

interface VariantMeasurementMigrationInput {
  previous_variant_measurements: ProductVariantMeasurementFixture[]
  source_target_same: boolean
  target_product_measurement_id: string
}

type ListProductMeasurementsFn = (
  container: unknown,
  productId: string,
  options?: unknown,
) => Promise<ProductMeasurementFixture[]>

type ListProductVariantMeasurementsFn = (
  filters: unknown,
  options?: unknown,
) => Promise<ProductVariantMeasurementFixture[]>

type StepImplementation = (...args: unknown[]) => unknown

type CreateStepFn = (
  name: string,
  invoke: StepImplementation,
) => StepImplementation

const { helpers, service } = vi.hoisted(() => ({
  helpers: {
    ensureProductExists: vi.fn<typeof ensureProductExists>(),
    ensureProductVariantBelongsToProduct:
      vi.fn<typeof ensureProductVariantBelongsToProduct>(),
    getCanonicalProductMeasurement:
      vi.fn<typeof getCanonicalProductMeasurement>(),
    getCanonicalProductVariantMeasurement:
      vi.fn<typeof getCanonicalProductVariantMeasurement>(),
    getCurrentProductMeasurement: vi.fn<typeof getCurrentProductMeasurement>(),
    listProductMeasurementsForProduct: vi.fn<ListProductMeasurementsFn>(),
    retrieveActiveUnitOrThrow: vi.fn<typeof retrieveActiveUnitOrThrow>(),
  },
  service: {
    listProductVariantMeasurements: vi.fn<ListProductVariantMeasurementsFn>(),
  },
}))

vi.mock(import("@medusajs/framework/workflows-sdk"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    StepResponse: class StepResponse<TPayload = unknown> {
      payload: TPayload

      constructor(payload: TPayload) {
        this.payload = payload
      }
    },
    createStep: vi.fn<CreateStepFn>((_name, invoke) => invoke),
  }),
)

vi.mock(
  import("../../../../../src/links/product-measurement"),
  async (importOriginal) =>
    overrideModule(await importOriginal(), {
      ProductMeasurementLink: { entryPoint: "product_product_measurement" },
    }),
)

vi.mock(
  import("../../../../../src/links/product-variant-measurement"),
  async (importOriginal) =>
    overrideModule(await importOriginal(), {
      ProductVariantMeasurementLink: {
        entryPoint: "product_variant_product_variant_measurement",
      },
    }),
)

vi.mock(
  import("../../../../../src/workflows/measurement-unit/steps/helpers"),
  async (importOriginal) => overrideModule(await importOriginal(), helpers),
)

vi.mock(
  import("../../../../../src/utils/measurement-units"),
  async (importOriginal) =>
    overrideModule(await importOriginal(), {
      getMeasurementUnitService: vi.fn<() => typeof service>(() => service),
      toNumber: Number,
    }),
)

const container = {
  resolve: vi.fn<(key: unknown) => unknown>(),
}

type MockStep<TInput, TOutput> = (
  input: TInput,
  context: { container: typeof container },
) => Promise<{ payload: TOutput }>

type GraphQueryFn = (input: unknown) => Promise<{ data: unknown[] }>

const isMockStep = <TInput, TOutput>(
  candidate: unknown,
): candidate is MockStep<TInput, TOutput> => typeof candidate === "function"

const asMockStep = <TInput, TOutput>(
  candidate: unknown,
): MockStep<TInput, TOutput> => {
  if (!isMockStep<TInput, TOutput>(candidate)) {
    throw new TypeError(
      "Expected the imported workflow step to be a mocked function",
    )
  }

  return candidate
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
    const { prepareProductMeasurementTransitionStep } =
      await import("../../../../../src/workflows/measurement-unit/steps/prepare-measurement-transitions")
    const result = await asMockStep<
      SetProductMeasurementWorkflowInput,
      ProductMeasurementTransitionPlan
    >(prepareProductMeasurementTransitionStep)(
      {
        measurement_unit_id: "unit_new",
        product_id: "prod_1",
      },
      { container },
    )

    expect(result.payload.previous?.id).toBe("pm_current")
    expect(result.payload.existing_target?.id).toBe("pm_target")
    expect(result.payload.previous_variant_measurements).toStrictEqual([
      expect.objectContaining({ id: "pvm_live" }),
    ])
    expect(result.payload.source_target_same).toBeFalsy()
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
    const { prepareVariantMeasurementMigrationStep } =
      await import("../../../../../src/workflows/measurement-unit/steps/prepare-measurement-transitions")
    const result = await asMockStep<
      VariantMeasurementMigrationInput,
      VariantMeasurementMigrationPlan
    >(prepareVariantMeasurementMigrationStep)(
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
      { container },
    )

    expect(service.listProductVariantMeasurements).toHaveBeenCalledOnce()
    expect(result.payload.records_to_restore).toStrictEqual([
      expect.objectContaining({ id: "pvm_reused" }),
    ])
    expect(result.payload.updates).toStrictEqual([
      {
        id: "pvm_reused",
        product_measurement_id: "pm_target",
        product_unit_quantity: 2,
        product_variant_id: "variant_1",
      },
    ])
    expect(result.payload.creates).toStrictEqual([
      {
        product_measurement_id: "pm_target",
        product_unit_quantity: 3,
        product_variant_id: "variant_2",
      },
    ])
  })

  it("rejects an invalid stored quantity instead of propagating NaN", async () => {
    service.listProductVariantMeasurements.mockResolvedValue([])
    const { prepareVariantMeasurementMigrationStep } =
      await import("../../../../../src/workflows/measurement-unit/steps/prepare-measurement-transitions")

    await expect(
      asMockStep<
        VariantMeasurementMigrationInput,
        VariantMeasurementMigrationPlan
      >(prepareVariantMeasurementMigrationStep)(
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
        { container },
      ),
    ).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
    })
  })

  it("enforces quantity invariants for direct workflow callers", async () => {
    const { prepareSetProductVariantMeasurementStep } =
      await import("../../../../../src/workflows/measurement-unit/steps/prepare-measurement-transitions")

    await expect(
      asMockStep<
        SetProductVariantMeasurementWorkflowInput,
        SetVariantMeasurementPlan
      >(prepareSetProductVariantMeasurementStep)(
        {
          product_id: "prod_1",
          product_unit_quantity: Number.NaN,
          product_variant_id: "variant_1",
        },
        { container },
      ),
    ).rejects.toMatchObject({
      type: MedusaError.Types.INVALID_DATA,
    })
    expect(helpers.ensureProductVariantBelongsToProduct).not.toHaveBeenCalled()
  })

  it("returns a validation error when the product has no measurement unit", async () => {
    helpers.getCanonicalProductMeasurement.mockImplementation(async () => {})
    const { prepareSetProductVariantMeasurementStep } =
      await import("../../../../../src/workflows/measurement-unit/steps/prepare-measurement-transitions")

    await expect(
      asMockStep<
        SetProductVariantMeasurementWorkflowInput,
        SetVariantMeasurementPlan
      >(prepareSetProductVariantMeasurementStep)(
        {
          product_id: "prod_1",
          product_unit_quantity: 2,
          product_variant_id: "variant_1",
        },
        { container },
      ),
    ).rejects.toMatchObject({
      type: MedusaError.Types.INVALID_DATA,
    })
  })

  it("creates the target link and dismisses another active link", async () => {
    container.resolve.mockReturnValue({
      graph: vi.fn<GraphQueryFn>().mockResolvedValue({
        data: [
          {
            deleted_at: null,
            product_id: "prod_1",
            product_measurement_id: "pm_old",
          },
        ],
      }),
    })
    const { prepareProductMeasurementLinkPlanStep } =
      await import("../../../../../src/workflows/measurement-unit/steps/prepare-measurement-transitions")
    const result = await asMockStep<
      ProductMeasurementLinkIds,
      ProductMeasurementLinkPlan
    >(prepareProductMeasurementLinkPlanStep)(
      {
        product_id: "prod_1",
        product_measurement_id: "pm_target",
      },
      { container },
    )

    expect(result.payload.links_to_create).toStrictEqual([
      {
        product_id: "prod_1",
        product_measurement_id: "pm_target",
      },
    ])
    expect(result.payload.links_to_dismiss).toStrictEqual([
      {
        product_id: "prod_1",
        product_measurement_id: "pm_old",
      },
    ])
    expect(result.payload.links_to_restore).toStrictEqual([])
  })

  it("restores a soft-deleted target link", async () => {
    container.resolve.mockReturnValue({
      graph: vi.fn<GraphQueryFn>().mockResolvedValue({
        data: [
          {
            deleted_at: new Date("2026-01-01"),
            product_id: "prod_1",
            product_measurement_id: "pm_target",
          },
        ],
      }),
    })
    const { prepareProductMeasurementLinkPlanStep } =
      await import("../../../../../src/workflows/measurement-unit/steps/prepare-measurement-transitions")
    const result = await asMockStep<
      ProductMeasurementLinkIds,
      ProductMeasurementLinkPlan
    >(prepareProductMeasurementLinkPlanStep)(
      {
        product_id: "prod_1",
        product_measurement_id: "pm_target",
      },
      { container },
    )

    expect(result.payload.links_to_create).toStrictEqual([])
    expect(result.payload.links_to_dismiss).toStrictEqual([])
    expect(result.payload.links_to_restore).toStrictEqual([
      {
        product_id: "prod_1",
        product_measurement_id: "pm_target",
      },
    ])
  })

  it("rejects malformed custom-link query results", async () => {
    container.resolve.mockReturnValue({
      graph: vi.fn<GraphQueryFn>().mockResolvedValue({
        data: [{ product_id: "prod_1" }],
      }),
    })
    const { prepareProductMeasurementLinkPlanStep } =
      await import("../../../../../src/workflows/measurement-unit/steps/prepare-measurement-transitions")

    await expect(
      asMockStep<ProductMeasurementLinkIds, ProductMeasurementLinkPlan>(
        prepareProductMeasurementLinkPlanStep,
      )(
        {
          product_id: "prod_1",
          product_measurement_id: "pm_1",
        },
        { container },
      ),
    ).rejects.toMatchObject({
      type: MedusaError.Types.UNEXPECTED_STATE,
    })
  })
})
