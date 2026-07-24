import assert from "node:assert/strict"
import { test } from "node:test"

import config from "../../oxlint.config.ts"

void test("correctness is blocking with no rule exceptions", () => {
  assert.equal(config.categories?.correctness, "error")

  const disabledRules = Object.entries(config.rules ?? {})
    .filter(([, setting]) => setting === "off")
    .map(([rule]) => rule)

  assert.deepEqual(disabledRules, [])
})
