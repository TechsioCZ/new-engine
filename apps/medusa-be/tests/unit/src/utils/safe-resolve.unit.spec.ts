import { describe, expect, it, vi } from "vitest"
import { safeResolve } from "../../../../src/utils/safe-resolve"

describe("safeResolve", () => {
  it("returns a registered dependency", () => {
    const dependency = { get: vi.fn() }

    expect(safeResolve<typeof dependency>({ cache: dependency }, "cache")).toBe(
      dependency
    )
  })

  it("returns null when the dependency is missing", () => {
    expect(safeResolve({ logger: {} }, "cache")).toBeNull()
  })

  it("returns null when container access throws", () => {
    const container = {}
    Object.defineProperty(container, "cache", {
      get() {
        throw new Error("resolution failed")
      },
    })

    expect(safeResolve(container, "cache")).toBeNull()
  })

  it("uses an injected dependency when generic resolution fails", () => {
    const dependency = { get: vi.fn() }
    const container = {
      cache: dependency,
      resolve: vi.fn(() => {
        throw new Error("generic resolution failed")
      }),
    }

    expect(safeResolve<typeof dependency>(container, "cache")).toBe(dependency)
    expect(container.resolve).not.toHaveBeenCalled()
  })

  it("falls back to explicit container resolution", () => {
    const dependency = { get: vi.fn() }
    const container = {
      resolve: vi.fn(() => dependency),
    }

    expect(safeResolve<typeof dependency>(container, "cache")).toBe(dependency)
    expect(container.resolve).toHaveBeenCalledWith("cache")
  })
})
