import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { runInNewContext } from "node:vm"
import * as utilityPrefixes from "../scripts/token-utility-prefixes.js"
import {
  findMissingTokens,
  mapClassToPossibleTokens,
} from "../scripts/validate-token-usage.js"

const { SINGLE_PREFIX_NAMESPACES } = utilityPrefixes

// The definition checker's mapper is private. Exercise its actual namespace
// table and function without adding a test-only production export.
const definitions = readFileSync(
  new URL("../scripts/validate-token-definitions.js", import.meta.url),
  "utf8"
)
const mapper = definitions.match(
  /const INSET = [\s\S]*?function tokenToUtilityClasses\(tokenName\) \{[\s\S]*?\n\}/
)?.[0]
const tokenToUtilityClasses = runInNewContext(
  `${mapper}\ntokenToUtilityClasses`,
  { ...utilityPrefixes }
)

test("the shared border namespace is canonical border-width, not legacy border", () => {
  assert.ok(mapper, "definition checker retains its token-to-utility mapper")
  assert.deepEqual(SINGLE_PREFIX_NAMESPACES["border-width"], ["border"])
  assert.equal(Object.hasOwn(SINGLE_PREFIX_NAMESPACES, "border"), false)
})

test("usage and definition validators agree on canonical border width utilities", () => {
  for (const key of ["card", "card-focus", "1"]) {
    const token = `--border-width-${key}`
    const utility = `border-${key}`
    assert.deepEqual([...tokenToUtilityClasses(token)], [utility])
    assert.ok(mapClassToPossibleTokens(utility).includes(token))
    assert.deepEqual(
      findMissingTokens(utility, new Set([token]), new Set()),
      []
    )
  }
})

test("neither validator interprets legacy --border-* tokens as width utilities", () => {
  assert.deepEqual([...tokenToUtilityClasses("--border-card")], [])
  const candidates = mapClassToPossibleTokens("border-card")
  assert.ok(candidates.includes("--border-width-card"))
  assert.equal(candidates.includes("--border-card"), false)
  assert.deepEqual(
    findMissingTokens("border-card", new Set(["--border-card"]), new Set()),
    candidates
  )
  assert.deepEqual(
    findMissingTokens("border-card", new Set(["--color-card"]), new Set()),
    []
  )
})
