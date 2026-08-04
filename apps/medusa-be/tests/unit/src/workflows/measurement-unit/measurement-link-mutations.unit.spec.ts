import { beforeEach, describe, expect, it, vi } from "vitest"

const { link } = vi.hoisted(() => ({
  link: {
    dismiss: vi.fn(),
    restore: vi.fn(),
  },
}))

vi.mock("@medusajs/framework/workflows-sdk", () => ({
  createStep: vi.fn((_name, invoke, compensate) =>
    Object.assign(invoke, { compensate })
  ),
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
}))

vi.mock("../../../../../src/modules/measurement-unit", () => ({
  MEASUREMENT_UNIT_MODULE: "measurement_unit",
}))

vi.mock("../../../../../src/workflows/measurement-unit/steps/helpers", () => ({
  productMeasurementLink: (
    productId: string,
    productMeasurementId: string
  ) => ({
    measurement_unit: { product_measurement_id: productMeasurementId },
    product: { product_id: productId },
  }),
  productVariantMeasurementLink: (
    productVariantId: string,
    productVariantMeasurementId: string
  ) => ({
    measurement_unit: {
      product_variant_measurement_id: productVariantMeasurementId,
    },
    product: { product_variant_id: productVariantId },
  }),
}))

type MockStep = {
  (
    input: unknown,
    context: { container: { resolve: ReturnType<typeof vi.fn> } }
  ): Promise<{
    compensateInput: unknown
  }>
  compensate: (
    input: unknown,
    context: { container: { resolve: ReturnType<typeof vi.fn> } }
  ) => Promise<void>
}

const container = {
  resolve: vi.fn(() => link),
}

describe("measurement link mutation compensation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("restores dismissed product-measurement links on rollback", async () => {
    const { dismissProductMeasurementLinksStep } =
      await import("../../../../../src/workflows/measurement-unit/steps/measurement-link-mutations")
    const step = dismissProductMeasurementLinksStep as MockStep
    const links = [
      {
        product_id: "prod_1",
        product_measurement_id: "pm_1",
      },
    ]
    const result = await step(links, { container })

    expect(link.dismiss).toHaveBeenCalledWith([
      {
        measurement_unit: { product_measurement_id: "pm_1" },
        product: { product_id: "prod_1" },
      },
    ])

    await step.compensate(result.compensateInput, { container })

    expect(link.restore).toHaveBeenCalledWith({
      measurement_unit: {
        product_measurement_id: ["pm_1"],
      },
    })
  })

  it("dismisses restored variant links again on rollback", async () => {
    const { restoreProductVariantMeasurementLinksStep } =
      await import("../../../../../src/workflows/measurement-unit/steps/measurement-link-mutations")
    const step = restoreProductVariantMeasurementLinksStep as MockStep
    const links = [
      {
        product_variant_id: "variant_1",
        product_variant_measurement_id: "pvm_1",
      },
    ]
    const result = await step(links, { container })

    expect(link.restore).toHaveBeenCalledWith({
      measurement_unit: {
        product_variant_measurement_id: ["pvm_1"],
      },
    })

    await step.compensate(result.compensateInput, { container })

    expect(link.dismiss).toHaveBeenCalledWith([
      {
        measurement_unit: {
          product_variant_measurement_id: "pvm_1",
        },
        product: { product_variant_id: "variant_1" },
      },
    ])
  })
})
