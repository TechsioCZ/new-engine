import { describe, expect, it, vi } from "vitest"
import { PRODUCT_REVIEW_MODULE } from "../../../../../src/modules/product-review"

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

type ReviewService = {
  createReviews: ReturnType<typeof vi.fn>
  deleteReviews: ReturnType<typeof vi.fn>
}

const makeContainer = (service: ReviewService) => ({
  resolve: vi.fn((key) => {
    if (key === PRODUCT_REVIEW_MODULE) {
      return service
    }

    throw new Error(`Unexpected dependency: ${String(key)}`)
  }),
})

describe("createImportedReviewsStep", () => {
  it("creates a batch and returns its ids for compensation", async () => {
    const service: ReviewService = {
      createReviews: vi
        .fn()
        .mockResolvedValue([{ id: "review_1" }, { id: "review_2" }]),
      deleteReviews: vi.fn(),
    }
    const container = makeContainer(service)
    const { createImportedReviewsStep } = await import(
      "../../../../../src/workflows/product-review/steps/create-imported-reviews"
    )
    const input = {
      reviews: [
        {
          content: "Useful",
          customer_id: "source_1",
          product_id: "prod_1",
          rating: 5,
          status: "approved" as const,
          title: "Imported review",
        },
      ],
    }

    const result = await createImportedReviewsStep(input, {
      container,
    } as never)

    expect(service.createReviews).toHaveBeenCalledWith(input.reviews)
    expect(result).toEqual({
      compensateInput: ["review_1", "review_2"],
      payload: [{ id: "review_1" }, { id: "review_2" }],
    })
  })

  it("deletes the created reviews during compensation", async () => {
    const service: ReviewService = {
      createReviews: vi.fn(),
      deleteReviews: vi.fn().mockResolvedValue(undefined),
    }
    const container = makeContainer(service)
    const { createImportedReviewsStep } = await import(
      "../../../../../src/workflows/product-review/steps/create-imported-reviews"
    )
    const compensate = (
      createImportedReviewsStep as typeof createImportedReviewsStep & {
        compensate: (
          reviewIds: string[],
          context: { container: ReturnType<typeof makeContainer> }
        ) => Promise<void>
      }
    ).compensate

    await compensate(["review_1", "review_2"], { container })

    expect(service.deleteReviews).toHaveBeenCalledWith(["review_1", "review_2"])
  })
})
