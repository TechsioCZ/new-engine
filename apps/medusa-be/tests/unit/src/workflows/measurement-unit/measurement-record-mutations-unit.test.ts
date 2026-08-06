import { beforeEach, describe, expect, it, vi } from "vitest"

type ServiceMethod = (...input: unknown[]) => Promise<unknown>
type StepInvoke = (input: unknown, context: unknown) => Promise<unknown>
type StepCompensate = (input: unknown, context: unknown) => Promise<void>
type CreateStep = (
  name: string,
  invoke: StepInvoke,
  compensate: StepCompensate,
) => StepInvoke & { compensate: StepCompensate }

const { service } = vi.hoisted(() => ({
  service: {
    createProductMeasurements: vi.fn<ServiceMethod>(),
    createProductVariantMeasurements: vi.fn<ServiceMethod>(),
    restoreProductMeasurements: vi.fn<ServiceMethod>(),
    softDeleteProductMeasurements: vi.fn<ServiceMethod>(),
    softDeleteProductVariantMeasurements: vi.fn<ServiceMethod>(),
  },
}))

vi.mock(import("@medusajs/framework/workflows-sdk"), () => ({
  StepResponse: class StepResponse<
    TPayload = unknown,
    TCompensationInput = unknown,
  > {
    compensateInput: TCompensationInput
    payload: TPayload

    constructor(payload: TPayload, compensateInput: TCompensationInput) {
      this.payload = payload
      this.compensateInput = compensateInput
    }
  },
  createStep: vi.fn<CreateStep>((_name, invoke, compensate) =>
    Object.assign(invoke, { compensate }),
  ),
}))

vi.mock(import("../../../../../src/utils/measurement-units"), () => ({
  getMeasurementUnitService: vi.fn<() => typeof service>(() => service),
}))

interface MockStep {
  (
    input: unknown,
    stepContext: { container: Record<string, never> },
  ): Promise<{
    compensateInput: unknown
    payload: unknown
  }>
  compensate: (
    input: unknown,
    stepContext: { container: Record<string, never> },
  ) => Promise<void>
}

const isMockStep = (candidate: unknown): candidate is MockStep =>
  typeof candidate === "function" &&
  "compensate" in candidate &&
  typeof candidate.compensate === "function"

const asMockStep = (candidate: unknown): MockStep => {
  if (!isMockStep(candidate)) {
    throw new TypeError(
      "Expected the imported workflow step to expose invoke and compensate functions",
    )
  }
  return candidate
}

const context = { container: {} }

describe("measurement record mutation compensation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("soft-deletes a newly created product measurement on rollback", async () => {
    service.createProductMeasurements.mockResolvedValue({
      id: "pm_new",
      measurement_unit_id: "unit_1",
      product_id: "prod_1",
    })
    const { activateProductMeasurementStep } =
      await import("../../../../../src/workflows/measurement-unit/steps/measurement-record-mutations")
    const step = asMockStep(activateProductMeasurementStep)
    const result = await step(
      {
        measurement_unit_id: "unit_1",
        product_id: "prod_1",
      },
      context,
    )

    expect(result.compensateInput).toStrictEqual({
      action: "created",
      id: "pm_new",
    })

    await step.compensate(result.compensateInput, context)

    expect(service.softDeleteProductMeasurements).toHaveBeenCalledWith([
      "pm_new",
    ])
  })

  it("returns an active target as a no-op and leaves it untouched on rollback", async () => {
    const existing = {
      deleted_at: null,
      id: "pm_active",
      measurement_unit_id: "unit_1",
      product_id: "prod_1",
    }
    const { activateProductMeasurementStep } =
      await import("../../../../../src/workflows/measurement-unit/steps/measurement-record-mutations")
    const step = asMockStep(activateProductMeasurementStep)
    const result = await step(
      {
        existing,
        measurement_unit_id: "unit_1",
        product_id: "prod_1",
      },
      context,
    )

    await step.compensate(result.compensateInput, context)

    expect(service.restoreProductMeasurements).not.toHaveBeenCalled()
    expect(service.softDeleteProductMeasurements).not.toHaveBeenCalled()
  })

  it("re-deletes a restored product measurement on rollback", async () => {
    const existing = {
      deleted_at: new Date("2026-01-01"),
      id: "pm_reused",
      measurement_unit_id: "unit_1",
      product_id: "prod_1",
    }
    const { activateProductMeasurementStep } =
      await import("../../../../../src/workflows/measurement-unit/steps/measurement-record-mutations")
    const step = asMockStep(activateProductMeasurementStep)
    const result = await step(
      {
        existing,
        measurement_unit_id: "unit_1",
        product_id: "prod_1",
      },
      context,
    )

    expect(service.restoreProductMeasurements).toHaveBeenCalledWith([
      "pm_reused",
    ])

    await step.compensate(result.compensateInput, context)

    expect(service.softDeleteProductMeasurements).toHaveBeenCalledWith([
      "pm_reused",
    ])
  })

  it("soft-deletes newly created variant measurements on rollback", async () => {
    service.createProductVariantMeasurements.mockResolvedValue([
      { id: "pvm_1" },
      { id: "pvm_2" },
    ])
    const { createProductVariantMeasurementsStep } =
      await import("../../../../../src/workflows/measurement-unit/steps/measurement-record-mutations")
    const step = asMockStep(createProductVariantMeasurementsStep)
    const result = await step(
      [
        {
          product_measurement_id: "pm_1",
          product_unit_quantity: 2,
          product_variant_id: "variant_1",
        },
        {
          product_measurement_id: "pm_1",
          product_unit_quantity: 3,
          product_variant_id: "variant_2",
        },
      ],
      context,
    )

    await step.compensate(result.compensateInput, context)

    expect(service.softDeleteProductVariantMeasurements).toHaveBeenCalledWith([
      "pvm_1",
      "pvm_2",
    ])
  })
})
