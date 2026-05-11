import { vi } from "vitest"

const frameworkMocks = vi.hoisted(() => ({
  Module: vi.fn(() => ({ __module: true })),
  MedusaService: vi.fn(() => class {}),
  PayloadModuleService: vi.fn(),
}))

vi.mock("@medusajs/framework/utils", () => ({
  Module: frameworkMocks.Module,
  MedusaService: frameworkMocks.MedusaService,
  MedusaError: class MedusaError extends Error {
    static Types = {
      INVALID_DATA: "invalid_data",
      UNEXPECTED_STATE: "unexpected_state",
    }
    constructor(_type: string, message: string) {
      super(message)
    }
  },
  Modules: { CACHING: "caching" },
}))

vi.mock("../service", () => ({
  default: frameworkMocks.PayloadModuleService,
}))

describe("payload module", () => {
  it("registers the module with the payload service", async () => {
    vi.resetModules()
    frameworkMocks.Module.mockClear()

    const payloadModule = await import("../index")

    expect(frameworkMocks.Module).toHaveBeenCalledWith(
      payloadModule.PAYLOAD_MODULE,
      {
        service: frameworkMocks.PayloadModuleService,
      }
    )
    expect(payloadModule.default).toBe(
      frameworkMocks.Module.mock.results[0]?.value
    )
  })
})
