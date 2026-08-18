import { beforeEach, describe, expect, it, vi } from "vitest"

const { service } = vi.hoisted(() => ({
  service: {
    createProductContents: vi.fn(),
    deleteProductContents: vi.fn(),
    listProductContents: vi.fn(),
    updateProductContents: vi.fn(),
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

vi.mock("../../../src/utils/product-content-service", () => ({
  getProductContentService: vi.fn(() => service),
}))

type MockStep = {
  (
    stepInput: Record<string, string>,
    context: { container: Record<string, never> }
  ): Promise<{ compensateInput: unknown; payload: unknown }>
  compensate: (
    input: unknown,
    context: { container: Record<string, never> }
  ) => Promise<void>
}

const input = {
  composition: "<p>Composition</p>",
  other: "<p>Other</p>",
  product_id: "prod_1",
  usage: "<p>Usage</p>",
  warning: "<p>Warning</p>",
}

describe("upsertProductContentStep", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates missing content and deletes it on compensation", async () => {
    service.listProductContents.mockResolvedValue([])
    service.createProductContents.mockResolvedValue({
      id: "pcont_1",
      ...input,
    })
    const { upsertProductContentStep } = await import(
      "../../../src/workflows/product-content/steps/upsert-product-content"
    )
    const step = upsertProductContentStep as MockStep
    const result = await step(input, { container: {} })

    expect(service.createProductContents).toHaveBeenCalledWith(input)
    expect(result.compensateInput).toEqual({
      action: "created",
      id: "pcont_1",
    })

    await step.compensate(result.compensateInput, { container: {} })
    expect(service.deleteProductContents).toHaveBeenCalledWith("pcont_1")
  })

  it("updates existing content and restores the snapshot on compensation", async () => {
    const previous = {
      id: "pcont_1",
      ...input,
      usage: "<p>Previous usage</p>",
    }
    service.listProductContents.mockResolvedValue([previous])
    service.updateProductContents.mockResolvedValue({
      ...previous,
      ...input,
    })
    const { upsertProductContentStep } = await import(
      "../../../src/workflows/product-content/steps/upsert-product-content"
    )
    const step = upsertProductContentStep as MockStep
    const result = await step(input, { container: {} })

    expect(service.updateProductContents).toHaveBeenCalledWith({
      composition: input.composition,
      id: "pcont_1",
      other: input.other,
      usage: input.usage,
      warning: input.warning,
    })

    await step.compensate(result.compensateInput, { container: {} })
    expect(service.updateProductContents).toHaveBeenLastCalledWith(previous)
  })
})
