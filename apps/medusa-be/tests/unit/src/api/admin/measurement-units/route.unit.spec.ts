import { describe, expect, it, vi } from "vitest"

const { createWorkflow, measurementService } = vi.hoisted(() => ({
  createWorkflow: vi.fn(),
  measurementService: {
    retrieveMeasurementUnit: vi.fn(),
  },
}))

vi.mock(import("../../../../../../src/utils/measurement-units"), () => ({
  getMeasurementUnitActiveProductCounts: vi.fn(),
  getMeasurementUnitService: vi.fn(() => measurementService),
  toMeasurementUnitResponse: vi.fn((unit) => unit),
}))

vi.mock(
  import("../../../../../../src/workflows/measurement-unit/workflows/create-measurement-units"),
  () => ({
    createMeasurementUnitsWorkflow: createWorkflow,
  }),
)

describe("POST /admin/measurement-units", () => {
  it("returns 201 when the measurement unit is created", async () => {
    const run = vi.fn().mockResolvedValue({
      result: [{ id: "unit_1" }],
    })
    createWorkflow.mockReturnValue({ run })
    measurementService.retrieveMeasurementUnit.mockResolvedValue({
      base_quantity: 1,
      code: "kg",
      id: "unit_1",
      name: "Kilogram",
      symbol: "kg",
    })
    const response = {
      json: vi.fn(),
      status: vi.fn(),
    }
    response.status.mockReturnValue(response)
    const { POST } =
      await import("../../../../../../src/api/admin/measurement-units/route")

    await POST(
      {
        scope: {},
        validatedBody: {
          base_quantity: 1,
          code: "kg",
          description: null,
          name: "Kilogram",
          symbol: "kg",
        },
      } as never,
      response as never,
    )

    expect(response.status).toHaveBeenCalledWith(201)
    expect(response.json).toHaveBeenCalledWith({
      measurement_unit: expect.objectContaining({ id: "unit_1" }),
    })
  })
})
