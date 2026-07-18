import assert from "node:assert/strict"
import { test } from "node:test"

import config from "../../dependency-cruiser.config.cjs"

const rules = new Map(config.forbidden.map((rule) => [rule.name, rule]))

const matches = (pattern, value) =>
  pattern !== undefined &&
  (Array.isArray(pattern)
    ? pattern.some((entry) => new RegExp(entry, "u").test(value))
    : new RegExp(pattern, "u").test(value))

const catches = (rule, from, to) =>
  (rule.from.path === undefined || matches(rule.from.path, from)) &&
  !matches(rule.from.pathNot, from) &&
  (rule.to.path === undefined || matches(rule.to.path, to)) &&
  !matches(rule.to.pathNot, to)

test("application boundaries allow own files and libraries, not other apps", () => {
  const rule = rules.get("app-depends-on-libraries-apps-n1")
  assert.ok(rule)
  assert.equal(
    catches(rule, "apps/n1/src/page.tsx", "apps/n1/src/lib.ts"),
    false
  )
  assert.equal(
    catches(rule, "apps/n1/src/page.tsx", "libs/ui/src/button.tsx"),
    false
  )
  assert.equal(
    catches(rule, "apps/n1/src/page.tsx", "apps/medusa-be/src/index.ts"),
    true
  )
})

test("library boundaries reject application dependencies", () => {
  const rule = rules.get("libraries-do-not-import-applications")
  assert.ok(rule)
  assert.equal(
    catches(rule, "libs/storefront-data/src/index.ts", "apps/n1/src/page.tsx"),
    true
  )
})

test("platform boundaries reject web to backend imports", () => {
  const rule = rules.get("web-does-not-import-backend")
  assert.ok(rule)
  assert.equal(
    catches(rule, "apps/n1/src/page.tsx", "apps/medusa-be/src/index.ts"),
    true
  )
  assert.equal(
    catches(rule, "apps/n1/src/page.tsx", "libs/storefront-data/src/index.ts"),
    false
  )
})
