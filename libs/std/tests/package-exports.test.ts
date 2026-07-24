import { createRequire } from "node:module"

import { describe, expect, it } from "vitest"

const require = createRequire(import.meta.url)
const packageExports = [
  "@techsio/std/array",
  "@techsio/std/async",
  "@techsio/std/function",
  "@techsio/std/number",
  "@techsio/std/object",
  "@techsio/std/string",
] as const

describe("package exports", () => {
  it.each(packageExports)(
    "loads %s through import and require",
    async (moduleId) => {
      const importedModule: unknown = await import(moduleId)
      const requiredModule: unknown = require(moduleId)

      expect(importedModule).toBeTypeOf("object")
      expect(requiredModule).toBeTypeOf("object")
    }
  )
})
