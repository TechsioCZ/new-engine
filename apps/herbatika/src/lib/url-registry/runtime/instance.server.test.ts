import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createUrlRegistryRuntime: vi.fn(),
}))

vi.mock("./factory.server", () => ({
  createUrlRegistryRuntime: mocks.createUrlRegistryRuntime,
}))

const enabledRuntime = Object.freeze({
  close: vi.fn(() => Promise.resolve()),
  enabled: true as const,
  productLifecycleConsumer: Object.freeze({ label: "consumer" }),
  registry: Object.freeze({ label: "registry" }),
})

describe("getUrlRegistryRuntime", () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.createUrlRegistryRuntime.mockReset()
  })

  it("deduplicates concurrent initialization", async () => {
    let resolveRuntime: ((value: typeof enabledRuntime) => void) | undefined
    const initialization = new Promise<typeof enabledRuntime>((resolve) => {
      resolveRuntime = resolve
    })
    mocks.createUrlRegistryRuntime.mockReturnValue(initialization)
    const { getUrlRegistryRuntime } = await import("./instance.server")

    const first = getUrlRegistryRuntime()
    const second = getUrlRegistryRuntime()

    expect(first).toBe(second)
    expect(mocks.createUrlRegistryRuntime).toHaveBeenCalledOnce()
    resolveRuntime?.(enabledRuntime)
    await expect(first).resolves.toBe(enabledRuntime)
  })

  it("allows a later request to retry after initialization rejects", async () => {
    const transientFailure = new Error("database temporarily unavailable")
    mocks.createUrlRegistryRuntime
      .mockRejectedValueOnce(transientFailure)
      .mockResolvedValueOnce(enabledRuntime)
    const { getUrlRegistryRuntime } = await import("./instance.server")

    await expect(getUrlRegistryRuntime()).rejects.toBe(transientFailure)
    await expect(getUrlRegistryRuntime()).resolves.toBe(enabledRuntime)
    expect(mocks.createUrlRegistryRuntime).toHaveBeenCalledTimes(2)
  })
})
