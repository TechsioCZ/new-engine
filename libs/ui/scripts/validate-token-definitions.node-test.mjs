import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import test from "node:test"
import { fileURLToPath } from "node:url"
import postcss from "postcss"
import { findUndefinedReferences } from "./validate-token-definitions.js"

const NONZERO_TOKEN_COUNT = /Found [1-9]\d+ total tokens/

test("undefined references include shared, primitive and brand declarations", () => {
  const missing = findUndefinedReferences([
    [
      "shared.css",
      ":root { --font-label: var(--font-bold); --ok: var(--weight); }",
    ],
    ["figma.css", "@theme static { --weight: 700; }"],
    ["brand.css", '[data-theme="akros"] { --brand: var(--missing); }'],
  ])
  assert.deepEqual(
    missing.map(({ token }) => token),
    ["--font-bold", "--missing"]
  )
})

test("optional fallbacks and documented runtime variables are allowed", () => {
  assert.deepEqual(
    findUndefinedReferences([
      [
        "popup.css",
        ":root { --a: var(--layer-index, 0); --b: var(--available-height); }",
      ],
    ]),
    []
  )
})

test("commented definitions do not hide missing tokens", () => {
  const missing = findUndefinedReferences([
    ["shared.css", "/* --ghost: red; */\n:root { --real: var(--ghost); }"],
  ])
  assert.equal(missing[0].line, 2)
  assert.equal(missing[0].token, "--ghost")
})

test("definition validator scans package tokens from an unrelated cwd", () => {
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(
        new URL("./validate-token-definitions.js", import.meta.url)
      ),
    ],
    { cwd: "/", encoding: "utf8" }
  )
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, NONZERO_TOKEN_COUNT)
})

test("brand-local corrections resolve inside nested scheme scopes without replacing other brands", () => {
  const css = postcss.parse(
    readFileSync(
      new URL("../src/tokens/_scheme-scopes.css", import.meta.url),
      "utf8"
    )
  )
  const foregrounds = new Map()
  css.walkAtRules("scope", (scope) => {
    const entries = new Map()
    scope.walkDecls((decl) => entries.set(decl.prop, decl.value))
    foregrounds.set(scope.params, entries)
  })
  const business = foregrounds.get(
    '([data-theme="business"]) to ([data-theme])'
  )
  assert.equal(
    business.get("--color-fg-on-primary-solid"),
    "var(--color-white)"
  )
  assert.equal(
    business.get("--color-fg-on-primary-solid-neo"),
    "var(--color-white)"
  )
  const neo = foregrounds.get('([data-theme="neo"]) to ([data-theme])')
  assert.match(neo.get("--color-fg-on-primary-solid"), /light-dark/)
})
