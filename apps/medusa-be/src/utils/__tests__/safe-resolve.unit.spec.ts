import { vi } from "vitest"
import { safeResolve } from "../safe-resolve"

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
})
