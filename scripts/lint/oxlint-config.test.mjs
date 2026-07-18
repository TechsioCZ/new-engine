import assert from "node:assert/strict"
import { test } from "node:test"

import config from "../../oxlint.config.ts"

const expectedCorrectnessExceptions = new Set([
  "no-unused-vars",
  "typescript/await-thenable",
  "typescript/no-base-to-string",
  "typescript/no-duplicate-type-constituents",
  "typescript/no-floating-promises",
  "typescript/no-implied-eval",
  "typescript/no-misused-spread",
  "typescript/no-redundant-type-constituents",
  "typescript/no-useless-default-assignment",
  "typescript/require-array-sort-compare",
  "typescript/restrict-template-expressions",
  "typescript/unbound-method",
  "unicorn/no-new-array",
  "unicorn/no-useless-fallback-in-spread",
])

test("correctness is blocking with only documented rule exceptions", () => {
  assert.equal(config.categories?.correctness, "error")

  const disabledRules = Object.entries(config.rules ?? {})
    .filter(([, setting]) => setting === "off")
    .map(([rule]) => rule)

  assert.deepEqual(new Set(disabledRules), expectedCorrectnessExceptions)
})
