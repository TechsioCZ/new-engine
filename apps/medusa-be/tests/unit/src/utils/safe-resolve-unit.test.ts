import { describe, expect, it, vi } from "vitest"

import { safeResolve } from "../../../../src/utils/safe-resolve"

interface Dependency {
  get: () => unknown
}

const isDependency = (value: unknown): value is Dependency =>
  typeof value === "object" &&
  value !== null &&
  "get" in value &&
  typeof value.get === "function"

describe(safeResolve, () => {
  it("returns a registered dependency", () => {
    const dependency = { get: vi.fn<() => unknown>() }
    expect(safeResolve({ cache: dependency }, "cache", isDependency)).toBe(
      dependency,
    )
  })

  it("returns null when the dependency is missing or invalid", () => {
    expect(safeResolve({ logger: {} }, "cache", isDependency)).toBeNull()
    expect(safeResolve({ cache: {} }, "cache", isDependency)).toBeNull()
  })

  it("returns null when container access throws", () => {
    const container = {}
    Object.defineProperty(container, "cache", {
      get() {
        throw new Error("resolution failed")
      },
    })
    expect(safeResolve(container, "cache", isDependency)).toBeNull()
  })
})
