import { beforeEach, describe, expect, it, vi } from "vitest"

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

interface MockContext {
  container: { resolve: (name: string) => unknown }
}
type MockInvoke = (
  input: unknown,
  context: MockContext,
) => Promise<{ compensateInput: unknown }>
type MockCompensate = (input: unknown, context: MockContext) => Promise<void>
type MockStep = MockInvoke & { compensate: MockCompensate }

const { link } = vi.hoisted(() => ({
  link: {
    dismiss: vi
      .fn<(input: unknown) => Promise<void>>()
      .mockImplementation(async () => {}),
    restore: vi
      .fn<(input: unknown) => Promise<void>>()
      .mockImplementation(async () => {}),
  },
}))

vi.mock(import("@medusajs/framework/workflows-sdk"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
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
    createStep: vi.fn<
      (name: string, invoke: MockInvoke, compensate: MockCompensate) => MockStep
    >((_name, invoke, compensate) => Object.assign(invoke, { compensate })),
  }),
)

vi.mock(
  import("../../../../../src/modules/measurement-unit"),
  async (importOriginal) =>
    overrideModule(await importOriginal(), {
      MEASUREMENT_UNIT_MODULE: "measurement_unit",
    }),
)

vi.mock(
  import("../../../../../src/workflows/measurement-unit/steps/helpers"),
  async (importOriginal) =>
    overrideModule(await importOriginal(), {
      productMeasurementLink: (
        productId: string,
        productMeasurementId: string,
      ) => ({
        measurement_unit: { product_measurement_id: productMeasurementId },
        product: { product_id: productId },
      }),
      productVariantMeasurementLink: (
        productVariantId: string,
        productVariantMeasurementId: string,
      ) => ({
        measurement_unit: {
          product_variant_measurement_id: productVariantMeasurementId,
        },
        product: { product_variant_id: productVariantId },
      }),
    }),
)

const isMockStep = (candidate: unknown): candidate is MockStep =>
  typeof candidate === "function" &&
  "compensate" in candidate &&
  typeof candidate.compensate === "function"

const asMockStep = (candidate: unknown): MockStep => {
  if (!isMockStep(candidate)) {
    throw new TypeError(
      "Expected the imported workflow step to be a mocked function",
    )
  }

  return candidate
}

const container = {
  resolve: vi.fn<(name: string) => unknown>(() => link),
}

describe("measurement link mutation compensation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("restores dismissed product-measurement links on rollback", async () => {
    const { dismissProductMeasurementLinksStep } =
      await import("../../../../../src/workflows/measurement-unit/steps/measurement-link-mutations")
    const step = asMockStep(dismissProductMeasurementLinksStep)
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
    const step = asMockStep(restoreProductVariantMeasurementLinksStep)
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
