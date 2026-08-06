import { describe, expect, it, vi } from "vitest"

type UnknownMock = (...args: unknown[]) => unknown

const assertMockShape: <T>(
  candidate: unknown,
  requiredKeys: readonly (keyof T)[],
) => asserts candidate is T = (candidate, requiredKeys) => {
  if (typeof candidate !== "object" || candidate === null) {
    throw new TypeError("Expected a mock object")
  }
  for (const key of requiredKeys) {
    if (!(key in candidate)) {
      throw new TypeError(`Mock object missing required key: ${String(key)}`)
    }
  }
}

const objectContaining = (value: Record<string, unknown>): unknown =>
  expect.objectContaining(value)

const { createWorkflow, measurementService } = vi.hoisted(() => ({
  createWorkflow: vi.fn<UnknownMock>(),
  measurementService: {
    retrieveMeasurementUnit: vi.fn<UnknownMock>(),
  },
}))

vi.mock(import("../../../../../../src/utils/measurement-units"), () => ({
  getMeasurementUnitActiveProductCounts: vi.fn<UnknownMock>(),
  getMeasurementUnitService: vi.fn<() => typeof measurementService>(
    () => measurementService,
  ),
  toMeasurementUnitResponse: vi.fn<(unit: unknown) => unknown>((unit) => unit),
}))

vi.mock(
  import("../../../../../../src/workflows/measurement-unit/workflows/create-measurement-units"),
  () => ({
    createMeasurementUnitsWorkflow: createWorkflow,
  }),
)

describe("POST /admin/measurement-units", () => {
  it("returns 201 when the measurement unit is created", async () => {
    const run = vi
      .fn<() => Promise<{ result: { id: string }[] }>>()
      .mockResolvedValue({
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
      json: vi.fn<UnknownMock>(),
      status: vi.fn<UnknownMock>(),
    }
    response.status.mockReturnValue(response)
    const { POST } =
      await import("../../../../../../src/api/admin/measurement-units/route")

    const request: unknown = {
      scope: {},
      validatedBody: {
        base_quantity: 1,
        code: "kg",
        description: null,
        name: "Kilogram",
        symbol: "kg",
      },
    }
    assertMockShape<Parameters<typeof POST>[0]>(request, [
      "scope",
      "validatedBody",
    ])
    assertMockShape<Parameters<typeof POST>[1]>(response, ["json", "status"])

    await POST(request, response)

    expect(response.status).toHaveBeenCalledWith(201)
    expect(response.json).toHaveBeenCalledWith({
      measurement_unit: objectContaining({ id: "unit_1" }),
    })
  })
})
